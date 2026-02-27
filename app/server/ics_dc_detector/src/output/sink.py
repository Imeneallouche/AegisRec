"""
src/output/sink.py
───────────────────
Output sink interface and the composite SinkDispatcher that fans alerts
out to all configured sinks in parallel.

Included sinks
──────────────
StdoutSink  – newline-delimited JSON to stdout
FileSink    – append-mode ndjson file
KafkaSink   – aiokafka async producer
WebhookSink – aiohttp POST to configured URL
"""
from __future__ import annotations

import asyncio
import sys
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional

import aiofiles
import structlog

from config.settings import settings
from src.output.alert_model import Alert

log = structlog.get_logger(__name__)


# ─── Abstract sink ────────────────────────────────────────────────────────────

class Sink(ABC):
    """All sinks implement this async interface."""

    @abstractmethod
    async def open(self) -> None:
        """Initialise resources (open file, connect producer, etc.)."""

    @abstractmethod
    async def emit(self, alert: Alert) -> None:
        """Emit a single alert."""

    @abstractmethod
    async def close(self) -> None:
        """Release resources."""

    async def __aenter__(self) -> "Sink":
        await self.open()
        return self

    async def __aexit__(self, *_) -> None:
        await self.close()


# ─── Stdout sink ──────────────────────────────────────────────────────────────

class StdoutSink(Sink):
    async def open(self) -> None:
        log.debug("sink.stdout.ready")

    async def emit(self, alert: Alert) -> None:
        print(alert.to_json_str(), flush=True)

    async def close(self) -> None:
        pass


# ─── File sink ────────────────────────────────────────────────────────────────

class FileSink(Sink):
    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = path or settings.alert_file_path
        self._fh = None

    async def open(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._fh = await aiofiles.open(self.path, "a", encoding="utf-8")
        log.info("sink.file.opened", path=str(self.path))

    async def emit(self, alert: Alert) -> None:
        await self._fh.write(alert.to_json_str() + "\n")
        await self._fh.flush()

    async def close(self) -> None:
        if self._fh:
            await self._fh.close()
            log.info("sink.file.closed", path=str(self.path))


# ─── Kafka sink ───────────────────────────────────────────────────────────────

class KafkaSink(Sink):
    """
    Async Kafka producer (aiokafka).

    Configuration is drawn from settings:
        KAFKA_BOOTSTRAP_SERVERS, KAFKA_TOPIC, KAFKA_SECURITY_PROTOCOL,
        KAFKA_SASL_MECHANISM, KAFKA_SASL_USERNAME, KAFKA_SASL_PASSWORD
    """

    def __init__(self) -> None:
        self._producer = None

    async def open(self) -> None:
        try:
            from aiokafka import AIOKafkaProducer  # type: ignore
        except ImportError:
            log.error("sink.kafka.unavailable", reason="aiokafka not installed")
            return

        kwargs = dict(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            security_protocol=settings.kafka_security_protocol,
            value_serializer=lambda v: v,  # raw bytes
        )
        if settings.kafka_sasl_mechanism:
            kwargs.update(
                sasl_mechanism=settings.kafka_sasl_mechanism,
                sasl_plain_username=settings.kafka_sasl_username,
                sasl_plain_password=settings.kafka_sasl_password,
            )

        self._producer = AIOKafkaProducer(**kwargs)
        await self._producer.start()
        log.info(
            "sink.kafka.connected",
            servers=settings.kafka_bootstrap_servers,
            topic=settings.kafka_topic,
        )

    async def emit(self, alert: Alert) -> None:
        if self._producer is None:
            return
        await self._producer.send_and_wait(
            settings.kafka_topic,
            alert.to_json(),
        )

    async def close(self) -> None:
        if self._producer:
            await self._producer.stop()
            log.info("sink.kafka.closed")


# ─── Webhook sink ─────────────────────────────────────────────────────────────

class WebhookSink(Sink):
    """HTTP POST each alert to the configured webhook URL."""

    def __init__(self) -> None:
        self._session = None

    async def open(self) -> None:
        import aiohttp  # type: ignore

        headers = {"Content-Type": "application/json"}
        if settings.webhook_auth_header:
            headers["Authorization"] = settings.webhook_auth_header

        timeout = aiohttp.ClientTimeout(total=settings.webhook_timeout_seconds)
        self._session = aiohttp.ClientSession(headers=headers, timeout=timeout)
        log.info("sink.webhook.ready", url=settings.webhook_url)

    async def emit(self, alert: Alert) -> None:
        if not self._session or not settings.webhook_url:
            return
        try:
            async with self._session.post(
                settings.webhook_url, data=alert.to_json()
            ) as resp:
                if resp.status >= 400:
                    log.warning(
                        "sink.webhook.error",
                        status=resp.status,
                        detection_id=alert.detection_id,
                    )
        except Exception as exc:
            log.error("sink.webhook.exception", error=str(exc))

    async def close(self) -> None:
        if self._session:
            await self._session.close()


# ─── Factory + Dispatcher ─────────────────────────────────────────────────────

def build_sinks(names: Optional[List[str]] = None) -> List[Sink]:
    names = names or settings.sink_list
    sinks: List[Sink] = []
    for name in names:
        if name == "stdout":
            sinks.append(StdoutSink())
        elif name == "file":
            sinks.append(FileSink())
        elif name == "kafka":
            sinks.append(KafkaSink())
        elif name == "webhook":
            sinks.append(WebhookSink())
        else:
            log.warning("sink.unknown", name=name)
    return sinks


class SinkDispatcher:
    """
    Fan-out alert to all configured sinks concurrently.

    Usage
    ─────
    async with SinkDispatcher() as dispatcher:
        await dispatcher.emit(alert)
    """

    def __init__(self, sinks: Optional[List[Sink]] = None) -> None:
        self._sinks = sinks or build_sinks()

    async def __aenter__(self) -> "SinkDispatcher":
        for sink in self._sinks:
            await sink.open()
        return self

    async def __aexit__(self, *_) -> None:
        for sink in self._sinks:
            await sink.close()

    async def emit(self, alert: Alert) -> None:
        tasks = [sink.emit(alert) for sink in self._sinks]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for sink, result in zip(self._sinks, results):
            if isinstance(result, Exception):
                log.error(
                    "sink_dispatcher.emit_error",
                    sink=type(sink).__name__,
                    error=str(result),
                )
