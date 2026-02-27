"""
src/modes/streaming.py
───────────────────────
Streaming integration point.

Because Elasticsearch does not natively provide a "changes feed" like
Kafka or MongoDB Change Streams, this module provides two integration
strategies:

Strategy A – Kafka Consumer (recommended for production)
    Your log pipeline writes to Kafka → Logstash / Beats → ES
    AND directly to a Kafka topic.  We consume that topic here, parse
    the raw log line, and process it.

Strategy B – ES Watcher / Percolator  (simple, ES-native)
    Register an ES Watcher query that fires a webhook to this service
    when a new document arrives.  We expose an aiohttp endpoint to
    receive the webhook payloads.

Both strategies are provided as async generator adapters that yield
standard ES hit-shaped dicts, making them drop-in replacements for
the polling / scroll generators.

Usage
─────
# Kafka:
async for hit in kafka_stream(pipeline):
    ...

# Webhook receiver:
await start_webhook_receiver(pipeline, port=8090)
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncGenerator, Dict, Optional

import structlog

from config.settings import settings
from src.pipeline import Pipeline

log = structlog.get_logger(__name__)


# ─── Strategy A – Kafka consumer ─────────────────────────────────────────────

async def kafka_stream(
    pipeline: Pipeline,
    topic: Optional[str] = None,
    group_id: str = "ics-dc-detector",
) -> None:
    """
    Consume raw log messages from a Kafka topic and route them through
    the pipeline.

    Each message is expected to be a JSON object roughly shaped like
    an ES _source document.  We wrap it in a hit-shaped dict.
    """
    try:
        from aiokafka import AIOKafkaConsumer  # type: ignore
    except ImportError:
        log.error("streaming.kafka_unavailable", reason="aiokafka not installed")
        return

    topic = topic or settings.kafka_topic
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=group_id,
        enable_auto_commit=True,
        auto_offset_reset="latest",
        security_protocol=settings.kafka_security_protocol,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )

    await consumer.start()
    log.info("streaming.kafka.started", topic=topic, group=group_id)

    try:
        async for msg in consumer:
            payload = msg.value
            if not isinstance(payload, dict):
                continue
            # Wrap in hit-shaped dict
            hit: Dict[str, Any] = {
                "_id": f"kafka:{msg.offset}:{msg.partition}",
                "_index": topic,
                "_source": payload,
            }
            await pipeline.process_hit(hit)
    except asyncio.CancelledError:
        log.info("streaming.kafka.cancelled")
    finally:
        await consumer.stop()


# ─── Strategy B – Webhook receiver ───────────────────────────────────────────

async def start_webhook_receiver(
    pipeline: Pipeline,
    port: int = 8090,
    path: str = "/ingest",
) -> None:
    """
    Start a lightweight aiohttp server that accepts POST requests
    containing ES-watcher or raw log payloads.

    The body must be JSON; it is processed as an ES source document.
    """
    from aiohttp import web  # type: ignore

    async def _handle(request: web.Request) -> web.Response:
        try:
            body = await request.json()
        except Exception:
            return web.Response(status=400, text="invalid JSON")

        # Support both raw source and ES-watcher hit format
        if "_source" in body:
            hit = body
        else:
            hit = {
                "_id": body.get("id", "webhook-unknown"),
                "_index": body.get("_index", "webhook"),
                "_source": body,
            }
        await pipeline.process_hit(hit)
        return web.Response(status=202, text="accepted")

    app = web.Application()
    app.router.add_post(path, _handle)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    log.info("streaming.webhook.started", port=port, path=path)

    # Keep alive until cancelled
    try:
        await asyncio.Event().wait()
    except asyncio.CancelledError:
        await runner.cleanup()
        log.info("streaming.webhook.stopped")
