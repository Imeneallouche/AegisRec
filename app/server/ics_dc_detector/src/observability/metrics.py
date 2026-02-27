"""
src/observability/metrics.py
──────────────────────────────
Prometheus metrics registry.

Counters / Gauges exposed:
    ics_dc_docs_processed_total       – docs pulled from ES
    ics_dc_matches_total              – Stage-1/2/3 matches (labels: stage)
    ics_dc_alerts_emitted_total       – final alerts emitted (labels: dc_id)
    ics_dc_errors_total               – processing errors (labels: component)
    ics_dc_last_processed_timestamp   – Unix epoch of last processed doc
    ics_dc_active_window_entries      – entries in temporal correlation window
    ics_dc_similarity_score_histogram – distribution of final scores
"""
from __future__ import annotations

from prometheus_client import (
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    start_http_server,
)

import structlog

log = structlog.get_logger(__name__)

# ─── Create a named registry so tests can isolate metrics ────────────────────
REGISTRY = CollectorRegistry(auto_describe=True)

docs_processed = Counter(
    "ics_dc_docs_processed_total",
    "Total documents pulled from Elasticsearch",
    registry=REGISTRY,
)

matches_total = Counter(
    "ics_dc_matches_total",
    "Total pattern matches by engine stage",
    labelnames=["stage"],
    registry=REGISTRY,
)

alerts_emitted = Counter(
    "ics_dc_alerts_emitted_total",
    "Total alerts emitted, labelled by DataComponent ID",
    labelnames=["dc_id"],
    registry=REGISTRY,
)

errors_total = Counter(
    "ics_dc_errors_total",
    "Total errors by component",
    labelnames=["component"],
    registry=REGISTRY,
)

last_processed_ts = Gauge(
    "ics_dc_last_processed_timestamp",
    "Unix epoch of the last successfully processed document",
    registry=REGISTRY,
)

active_window_entries = Gauge(
    "ics_dc_active_window_entries",
    "Number of active entries in the temporal correlation window",
    registry=REGISTRY,
)

similarity_histogram = Histogram(
    "ics_dc_similarity_score_histogram",
    "Distribution of final similarity scores",
    buckets=[0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0],
    registry=REGISTRY,
)


def start_metrics_server(port: int) -> None:
    start_http_server(port, registry=REGISTRY)
    log.info("metrics.server_started", port=port)
