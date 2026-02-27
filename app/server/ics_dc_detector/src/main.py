"""
src/main.py
────────────
CLI entry point.  Uses Click for subcommands.

Commands
────────
    python -m src.main poll     – near-real-time polling
    python -m src.main batch    – historical backfill
    python -m src.main stream   – streaming (Kafka or webhook receiver)
    python -m src.main replay   – replay a local NDJSON file (for testing)

All commands share the same service-startup logic:
    1. Configure logging
    2. Load DataComponent registry
    3. Build Matcher (all 3 engine stages)
    4. Load Deduplicator state
    5. Start Prometheus + Healthcheck servers
    6. Open SinkDispatcher
    7. Run mode-specific loop
"""
from __future__ import annotations

import asyncio
import signal
import sys
from pathlib import Path
from typing import Optional

import click
import structlog

from config.settings import settings
from src.correlation.deduplicator import Deduplicator
from src.correlation.temporal_window import TemporalWindow
from src.connector.elasticsearch_client import ESClient
from src.engine.matcher import Matcher
from src.loaders.dc_loader import DataComponentRegistry
from src.observability.healthcheck import start_healthcheck_server
from src.observability.logging_setup import configure_logging
from src.observability.metrics import start_metrics_server
from src.output.sink import SinkDispatcher
from src.pipeline import Pipeline

log = structlog.get_logger(__name__)


# ─── Shared service boot ──────────────────────────────────────────────────────

async def _boot() -> tuple[Pipeline, Deduplicator, TemporalWindow, SinkDispatcher, ESClient]:
    """
    Shared startup sequence.

    Returns a fully initialised (pipeline, dedup, window, dispatcher, es).
    Callers are responsible for opening the ES client context.
    """
    configure_logging(settings.log_level, settings.service_name)

    log.info(
        "service.booting",
        service=settings.service_name,
        mode=settings.mode,
        dc_dir=str(settings.dc_dir),
    )

    # Load DataComponent definitions
    registry = DataComponentRegistry(settings.dc_dir)
    if not registry.all:
        log.error("service.no_datacomponents", dir=str(settings.dc_dir))
        sys.exit(1)

    # Build matching engine
    matcher = Matcher()
    await matcher.build(registry)

    # Deduplication / cursor
    dedup = Deduplicator()
    await dedup.load()

    # Temporal correlation window
    window = TemporalWindow()

    # Start observability servers
    start_metrics_server(settings.prometheus_port)

    # Build sink dispatcher
    dispatcher = SinkDispatcher()

    # ES client
    es = ESClient()

    pipeline = Pipeline(matcher, dedup, window, dispatcher)

    return pipeline, dedup, window, dispatcher, es


# ─── CLI ──────────────────────────────────────────────────────────────────────

@click.group()
def cli() -> None:
    """ICS DataComponent Detection Engine – MITRE ATT&CK for ICS."""


@cli.command()
def poll() -> None:
    """Near-real-time polling mode (default)."""
    asyncio.run(_run_poll())


@cli.command()
@click.option("--start", default=None, help="ISO-8601 start timestamp")
@click.option("--end",   default=None, help="ISO-8601 end timestamp")
@click.option("--page-size", default=None, type=int, help="Scroll page size")
def batch(start: Optional[str], end: Optional[str], page_size: Optional[int]) -> None:
    """Historical backfill / batch mode."""
    asyncio.run(_run_batch(start, end, page_size))


@cli.command()
@click.option("--kafka/--webhook", default=True,
              help="Use Kafka consumer (default) or webhook receiver")
@click.option("--port", default=8090, help="Webhook receiver port")
def stream(kafka: bool, port: int) -> None:
    """Streaming mode via Kafka consumer or webhook receiver."""
    asyncio.run(_run_stream(kafka, port))


@cli.command()
@click.argument("ndjson_file", type=click.Path(exists=True))
def replay(ndjson_file: str) -> None:
    """Replay a local NDJSON log file (for testing)."""
    asyncio.run(_run_replay(ndjson_file))


# ─── Async runners ────────────────────────────────────────────────────────────

async def _run_poll() -> None:
    from src.modes.polling import run_polling

    pipeline, dedup, window, dispatcher, es = await _boot()
    loop = asyncio.get_running_loop()

    async with dispatcher, es:
        # FIX: run healthcheck server as a background task, not blocking await
        hc_task = asyncio.create_task(
            start_healthcheck_server(
                settings.service_name,
                settings.healthcheck_port,
                es_ping_fn=es.ping,
            )
        )

        poll_task = asyncio.create_task(run_polling(pipeline, dedup, es))

        def _shutdown(sig: signal.Signals) -> None:
            log.info("service.shutdown_signal", signal=sig.name)
            poll_task.cancel()
            hc_task.cancel()

        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, _shutdown, sig)

        try:
            await poll_task
        except asyncio.CancelledError:
            pass
        finally:
            hc_task.cancel()
            try:
                await hc_task
            except asyncio.CancelledError:
                pass

    log.info("service.stopped")


async def _run_batch(
    start: Optional[str],
    end: Optional[str],
    page_size: Optional[int],
) -> None:
    from src.modes.batch import run_batch

    pipeline, dedup, window, dispatcher, es = await _boot()

    async with dispatcher, es:
        await run_batch(pipeline, es, start=start, end=end, page_size=page_size)

    log.info("service.batch_complete")


async def _run_stream(use_kafka: bool, port: int) -> None:
    from src.modes.streaming import kafka_stream, start_webhook_receiver

    pipeline, dedup, window, dispatcher, es = await _boot()

    async with dispatcher, es:
        if use_kafka:
            await kafka_stream(pipeline)
        else:
            await start_webhook_receiver(pipeline, port=port)


async def _run_replay(ndjson_file: str) -> None:
    """
    Replay a local ndjson file through the pipeline.
    Each line is a JSON object treated as an ES _source document.
    """
    import json

    configure_logging(settings.log_level)
    registry = DataComponentRegistry(settings.dc_dir)
    matcher = Matcher()
    await matcher.build(registry)
    dedup = Deduplicator()
    await dedup.load()
    window = TemporalWindow()
    dispatcher = SinkDispatcher()

    async with dispatcher:
        pipeline = Pipeline(matcher, dedup, window, dispatcher)
        total = 0
        alerts = 0
        with open(ndjson_file, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    source = json.loads(line)
                except json.JSONDecodeError:
                    continue
                hit = {
                    "_id": f"replay-{total}",
                    "_index": "replay",
                    "_source": source,
                }
                emitted = await pipeline.process_hit(hit)
                total += 1
                alerts += len(emitted)

        log.info("replay.complete", total_docs=total, total_alerts=alerts)


# ─── Module entry ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli()
