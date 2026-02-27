"""
src/pipeline.py
────────────────
Core processing pipeline.

Takes a raw ES hit dict → runs the matcher → applies temporal correlation
boost → deduplicates → emits Alert objects via SinkDispatcher.

All three runtime modes (polling, batch, streaming) delegate to
`Pipeline.process_hit()`.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import structlog

from config.settings import settings
from src.correlation.deduplicator import Deduplicator
from src.correlation.temporal_window import TemporalWindow
from src.engine.matcher import Matcher
from src.observability import metrics
from src.observability.healthcheck import update_state
from src.output.alert_model import Alert
from src.output.sink import SinkDispatcher

log = structlog.get_logger(__name__)


def _extract_asset_info(source: Dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
    """
    Best-effort extraction of (asset_id, asset_name) from an ES source.

    Tries multiple common field names used in ICS / IT logs.
    """
    ID_FIELDS = [
        "asset_id", "host.hostname", "host.name", "agent.hostname",
        "device_id", "src_ip", "source.ip", "hostname", "ComputerName",
        "workstation_name", "ControllerIP",
    ]
    NAME_FIELDS = [
        "asset_name", "host.name", "hostname", "ComputerName",
        "device_name", "Area", "Unit",
    ]

    def _deep_get(obj: Any, dotted_key: str) -> Optional[str]:
        parts = dotted_key.split(".")
        cur = obj
        for p in parts:
            if not isinstance(cur, dict):
                return None
            cur = cur.get(p)
        return str(cur) if cur else None

    asset_id = None
    for f in ID_FIELDS:
        v = _deep_get(source, f)
        if v:
            asset_id = v
            break

    asset_name = None
    for f in NAME_FIELDS:
        v = _deep_get(source, f)
        if v:
            asset_name = v
            break

    return asset_id, asset_name


def _extract_doc_timestamp(source: Dict[str, Any]) -> str:
    for field in ("@timestamp", "timestamp", "EventTime", "event.created"):
        val = source.get(field)
        if not val:
            parts = field.split(".")
            cur = source
            for p in parts:
                cur = cur.get(p, {}) if isinstance(cur, dict) else {}
            val = cur if isinstance(cur, str) else None
        if val:
            return str(val)
    return datetime.now(timezone.utc).isoformat()


class Pipeline:
    """
    Stateful pipeline instance.  Shared across all runtime modes.

    Lifecycle
    ─────────
    pipeline = Pipeline(matcher, deduplicator, window, dispatcher)
    await pipeline.process_hit(hit)
    """

    def __init__(
        self,
        matcher: Matcher,
        deduplicator: Deduplicator,
        window: TemporalWindow,
        dispatcher: SinkDispatcher,
    ) -> None:
        self.matcher = matcher
        self.dedup = deduplicator
        self.window = window
        self.dispatcher = dispatcher

    async def process_hit(self, hit: Dict[str, Any]) -> List[Alert]:
        """
        Process a single ES hit.

        Returns
        ───────
        List[Alert] – alerts emitted (empty if doc was skipped/deduped).
        """
        doc_id: str = hit.get("_id", "unknown")
        es_index: str = hit.get("_index", "unknown")
        source: Dict[str, Any] = hit.get("_source", {})

        # ── Deduplication (doc-level) ─────────────────────────────────────────
        if self.dedup.seen_doc(doc_id):
            return []
        self.dedup.mark_doc(doc_id)

        # ── Update metrics / state ────────────────────────────────────────────
        metrics.docs_processed.inc()
        doc_ts = _extract_doc_timestamp(source)
        update_state(last_processed_ts=doc_ts)

        # ── Asset extraction ──────────────────────────────────────────────────
        asset_id, asset_name = _extract_asset_info(source)

        # ── Matching (all stages) ─────────────────────────────────────────────
        t0 = time.monotonic()
        match_results = await self.matcher.match_doc(source)
        elapsed_ms = round((time.monotonic() - t0) * 1000, 1)

        if not match_results:
            return []

        log.debug(
            "pipeline.matches",
            doc_id=doc_id,
            index=es_index,
            match_count=len(match_results),
            elapsed_ms=elapsed_ms,
        )

        emitted_alerts: List[Alert] = []

        for mr in match_results:
            # ── Temporal correlation boost ────────────────────────────────────
            boost = 0.0
            if asset_id:
                boost = self.window.get_boost(asset_id, mr.dc_id)
            final_score = min(1.0, mr.similarity_score + boost)

            # ── Alert suppression ─────────────────────────────────────────────
            _asset_key = asset_id or "global"
            if self.dedup.suppressed(mr.dc_id, _asset_key):
                log.debug(
                    "pipeline.suppressed",
                    dc_id=mr.dc_id,
                    asset_id=asset_id,
                )
                continue

            # ── Build alert ───────────────────────────────────────────────────
            alert = Alert.from_match(
                dc_id=mr.dc_id,
                dc_name=mr.dc_name,
                es_index=es_index,
                document_id=doc_id,
                doc_timestamp=doc_ts,
                asset_id=asset_id,
                asset_name=asset_name,
                matched_fields=mr.matched_fields,
                similarity_score=mr.similarity_score,
                evidence_snippet=mr.evidence_snippet,
                rule_or_pattern=mr.rule_or_pattern,
                strategy=mr.strategy,
                threshold=mr.threshold_used,
                correlation_boost=boost,
            )

            # ── Emit ──────────────────────────────────────────────────────────
            await self.dispatcher.emit(alert)

            # ── Post-emit bookkeeping ─────────────────────────────────────────
            self.dedup.record_alert(mr.dc_id, _asset_key)
            if asset_id:
                self.window.add(asset_id, mr.dc_id, final_score)

            metrics.alerts_emitted.labels(dc_id=mr.dc_id).inc()
            metrics.similarity_histogram.observe(final_score)
            update_state(alerts_emitted=metrics.alerts_emitted._metrics)

            log.info(
                "pipeline.alert_emitted",
                detection_id=alert.detection_id,
                dc=mr.dc_name,
                dc_id=mr.dc_id,
                score=final_score,
                asset=asset_id,
                index=es_index,
            )
            emitted_alerts.append(alert)

        return emitted_alerts
