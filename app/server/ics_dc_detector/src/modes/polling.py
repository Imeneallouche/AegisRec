"""
src/modes/polling.py
─────────────────────
Near-real-time polling mode.

Behaviour
─────────
• Loads the cursor position from the state backend.
• Every `settings.poll_interval_seconds`, queries ES for documents
  newer than the cursor.
• Processes each hit through the pipeline.
• After each poll, saves the updated cursor.
• Respects a configurable lookback window so no events are missed even
  if the service restarts.
"""
from __future__ import annotations

import asyncio
import time

import structlog

from config.settings import settings
from src.connector.elasticsearch_client import ESClient
from src.correlation.deduplicator import Deduplicator
from src.pipeline import Pipeline

log = structlog.get_logger(__name__)


async def run_polling(
    pipeline: Pipeline,
    dedup: Deduplicator,
    es: ESClient,
) -> None:
    """
    Main polling loop.  Runs indefinitely until cancelled.

    Parameters
    ──────────
    pipeline – the processing pipeline
    dedup    – deduplicator (carries cursor state)
    es       – async ES client
    """
    log.info(
        "polling.started",
        interval_s=settings.poll_interval_seconds,
        lookback_min=settings.lookback_window_minutes,
    )

    while True:
        poll_start = time.monotonic()

        # Determine the `gte` timestamp: either saved cursor or now-lookback
        after_ts = dedup.last_timestamp

        doc_count = 0
        alert_count = 0
        last_hit = None

        try:
            async for hit in es.poll_new_docs(
                after_timestamp=after_ts,
                lookback_minutes=settings.lookback_window_minutes,
                batch_size=200,
            ):
                alerts = await pipeline.process_hit(hit)
                doc_count += 1
                alert_count += len(alerts)
                last_hit = hit

            elapsed = round(time.monotonic() - poll_start, 2)
            log.info(
                "polling.cycle_done",
                docs=doc_count,
                alerts=alert_count,
                elapsed_s=elapsed,
            )

            # Advance cursor
            if last_hit is not None:
                ts = last_hit.get("_source", {}).get("@timestamp", "")
                sort = last_hit.get("sort")
                if ts:
                    await dedup.save_cursor(sort, ts)

        except asyncio.CancelledError:
            log.info("polling.cancelled")
            break
        except Exception as exc:
            log.error("polling.error", error=str(exc), exc_info=True)
            # Brief pause before retrying on unhandled error
            await asyncio.sleep(5)
            continue

        # Sleep until next poll cycle
        sleep_for = max(
            0, settings.poll_interval_seconds - (time.monotonic() - poll_start)
        )
        await asyncio.sleep(sleep_for)
