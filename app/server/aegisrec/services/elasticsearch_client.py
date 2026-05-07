"""Elasticsearch access for operator log monitoring (no JWT on ES; server-side only)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any


def _request_json(
    base_url: str,
    method: str,
    path: str,
    *,
    body: dict[str, Any] | None = None,
    timeout: float = 20.0,
) -> Any:
    url = f"{base_url.rstrip('/')}{path}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")
        raise RuntimeError(f"Elasticsearch HTTP {exc.code}: {detail[:500]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Elasticsearch unreachable: {exc}") from exc


def cluster_health(es_base: str) -> dict[str, Any]:
    return _request_json(es_base, "GET", "/_cluster/health?wait_for_status=yellow&timeout=5s")


def search_recent_logs(
    es_base: str,
    index_pattern: str,
    *,
    minutes: int,
    max_hits: int = 800,
) -> list[dict[str, Any]]:
    """Return ES hits as normalised dicts for the web UI (last ``minutes`` only)."""
    minutes = max(1, min(int(minutes or 5), 1440))
    body = {
        "size": max_hits,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "track_total_hits": False,
        "query": {
            "bool": {
                "filter": [
                    {"range": {"@timestamp": {"gte": f"now-{minutes}m", "lte": "now"}}},
                ],
            },
        },
    }
    # Comma index patterns must be URL-encoded in path
    from urllib.parse import quote

    path = f"/{quote(index_pattern, safe='*,')}/_search"
    data = _request_json(es_base, "POST", path, body=body)
    hits = (data.get("hits") or {}).get("hits") or []
    out: list[dict[str, Any]] = []
    for h in hits:
        src = h.get("_source") or {}
        doc_id = str(h.get("_id") or "")
        ts = src.get("@timestamp") or src.get("timestamp") or ""
        message = (
            src.get("message")
            or src.get("log", {}).get("message")
            or src.get("event", {}).get("original")
            or src.get("triggering_log")
            or json.dumps(src)[:280]
        )
        level = "info"
        msg_l = str(message).lower()
        if "alert" in msg_l or src.get("event", {}).get("kind") == "alert":
            level = "alert"
        elif "warn" in msg_l or "error" in msg_l:
            level = "warn"

        log_source = (
            src.get("log", {}).get("file", {}).get("path")
            or src.get("data_stream", {}).get("dataset")
            or src.get("observer", {}).get("name")
            or src.get("host", {}).get("name")
            or src.get("log_source_normalized")
            or "unknown"
        )
        asset_id = str(
            src.get("asset_id")
            or src.get("host", {}).get("name")
            or src.get("asset", {}).get("id")
            or "unknown",
        )
        dc = (
            src.get("datacomponent_id")
            or src.get("datacomponent")
            or src.get("mitre", {}).get("datacomponent_id")
        )
        alert_id = src.get("detection_id") or src.get("alert_id") or None

        out.append(
            {
                "id": doc_id or f"{ts}-{len(out)}",
                "timestamp": str(ts),
                "level": level,
                "source": str(log_source)[:160],
                "assetId": asset_id[:128],
                "message": str(message)[:2000],
                "datacomponent": str(dc) if dc else None,
                "alertId": str(alert_id) if alert_id else None,
            },
        )
    return out


def search_recent_alert_documents(
    es_base: str,
    index_pattern: str,
    *,
    minutes: int,
    max_hits: int = 500,
) -> list[dict[str, Any]]:
    """Return alert document bodies from ICS alert indices (``ics-alerts-*``), newest first."""
    minutes = max(1, min(int(minutes or 1440), 10080))
    body = {
        "size": max_hits,
        "sort": [
            {"timestamp": {"order": "desc", "missing": "_last", "unmapped_type": "date"}},
            {"@timestamp": {"order": "desc", "missing": "_last", "unmapped_type": "date"}},
        ],
        "track_total_hits": False,
        "query": {
            "bool": {
                "should": [
                    {"range": {"timestamp": {"gte": f"now-{minutes}m", "lte": "now"}}},
                    {"range": {"@timestamp": {"gte": f"now-{minutes}m", "lte": "now"}}},
                ],
                "minimum_should_match": 1,
            },
        },
    }
    from urllib.parse import quote

    path = f"/{quote(index_pattern, safe='*,')}/_search"
    data = _request_json(es_base, "POST", path, body=body)
    hits = (data.get("hits") or {}).get("hits") or []
    out: list[dict[str, Any]] = []
    for h in hits:
        src = dict(h.get("_source") or {})
        did = src.get("detection_id") or h.get("_id")
        if did:
            src["id"] = str(did)
        out.append(src)
    return out


def search_recent_correlation_documents(
    es_base: str,
    index_pattern: str,
    *,
    minutes: int,
    max_hits: int = 200,
) -> list[dict[str, Any]]:
    """Return correlation group summaries from ``ics-correlations-*`` indices."""
    minutes = max(1, min(int(minutes or 1440), 10080))
    body = {
        "size": max_hits,
        "sort": [{"last_timestamp": {"order": "desc", "missing": "_last", "unmapped_type": "date"}}],
        "track_total_hits": False,
        "query": {
            "bool": {
                "should": [
                    {"range": {"last_timestamp": {"gte": f"now-{minutes}m", "lte": "now"}}},
                    {"range": {"first_timestamp": {"gte": f"now-{minutes}m", "lte": "now"}}},
                ],
                "minimum_should_match": 1,
            },
        },
    }
    from urllib.parse import quote

    path = f"/{quote(index_pattern, safe='*,')}/_search"
    data = _request_json(es_base, "POST", path, body=body)
    hits = (data.get("hits") or {}).get("hits") or []
    out: list[dict[str, Any]] = []
    for h in hits:
        src = dict(h.get("_source") or {})
        gid = src.get("group_id")
        if gid:
            src["id"] = str(gid)
            src.setdefault("status", "active")
            src.setdefault("name", f"Correlation group {gid}")
        out.append(src)
    return out
