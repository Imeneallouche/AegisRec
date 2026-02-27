"""
src/modes/batch.py
───────────────────
Historical batch / backfill mode.

Uses the Scroll API to iterate all documents in [BATCH_START, BATCH_END]
and process them through the pipeline.  Emits progress metrics every
1 000 documents.
"""
from __future__ import annotations

import time

import structlog

from config.settings import settings
from src.connector.elasticsearch_client import ESClient
from src.pipeline import Pipeline

log = structlog.get_logger(__name__)


async def run_batch(
    pipeline: Pipeline,
    es: ESClient,
    start: str | None = None,
    end: str | None = None,
    page_size: int | None = None,
) -> None:
    """
    Run a full historical backfill.

    Parameters
    ──────────
    pipeline  – the processing pipeline
    es        – async ES client
    start     – ISO-8601 start (defaults to settings.batch_start)
    end       – ISO-8601 end   (defaults to settings.batch_end)
    page_size – scroll page size
    """
    start = start or settings.batch_start or ""
    end   = end   or settings.batch_end   or ""
    page_size = page_size or settings.batch_page_size

    if not start or not end:
        raise ValueError("batch mode requires start and end timestamps")

    log.info("batch.started", start=start, end=end, page_size=page_size)
    t0 = time.monotonic()

    doc_count = 0
    alert_count = 0

    async for hit in es.scroll_docs(
        start=start,
        end=end,
        page_size=page_size,
    ):
        alerts = await pipeline.process_hit(hit)
        doc_count += 1
        alert_count += len(alerts)

        if doc_count % 1_000 == 0:
            elapsed = round(time.monotonic() - t0, 1)
            rate = round(doc_count / max(elapsed, 1), 1)
            log.info(
                "batch.progress",
                docs=doc_count,
                alerts=alert_count,
                elapsed_s=elapsed,
                docs_per_sec=rate,
            )

    elapsed = round(time.monotonic() - t0, 1)
    log.info(
        "batch.complete",
        total_docs=doc_count,
        total_alerts=alert_count,
        elapsed_s=elapsed,
    )
