"""
src/connector/elasticsearch_client.py
──────────────────────────────────────
Async Elasticsearch client wrapper.

Features
────────
• TLS / basic-auth from settings
• Connection health-check with tenacity retry/backoff
• Three query helpers aligned with runtime modes:
    - poll_new_docs()    → async generator (polling mode)
    - scroll_docs()      → async generator (batch / backfill mode)
    - async_search()     → fire-and-forget async search (large scans)
• search_after pagination for efficient deep paging
• Structured logging on every call
"""
from __future__ import annotations

import asyncio
import ssl
import time
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional

import structlog
from elasticsearch import AsyncElasticsearch, ConnectionError, NotFoundError
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from config.settings import settings

log = structlog.get_logger(__name__)


# ─── Index-pattern builder ────────────────────────────────────────────────────

def _build_index_pattern(platforms: Optional[List[str]] = None) -> str:
    """
    Return a comma-joined index pattern.

    Optionally narrows to platform-specific indices:
        windows  → winlogbeat-*, wineventlog-*
        linux    → syslog-*, auditd-*
        ics/scada→ ics-*, scada-*, historian-*
    """
    base = settings.es_index_list.copy()

    platform_map: Dict[str, List[str]] = {
        "windows": ["winlogbeat-*", "wineventlog-*"],
        "linux": ["syslog-*", "auditd-*", "linux-*"],
        "macos": ["macos-*"],
        "ics": ["ics-*", "historian-*", "hmi-*", "plc-*"],
        "scada": ["scada-*", "dnp3-*", "modbus-*"],
        "ot": ["ot-*", "ics-*"],
        "iot": ["iot-*"],
        "cloud": ["cloudtrail-*", "azure-*", "gcp-*"],
        "network": ["zeek-*", "netflow-*", "nsm-*"],
    }

    if platforms:
        extra: List[str] = []
        for plat in platforms:
            extra.extend(platform_map.get(plat.lower(), []))
        base = list(dict.fromkeys(base + extra))   # deduplicate, preserve order

    return ",".join(base)


# ─── Client factory ───────────────────────────────────────────────────────────

def _build_ssl_context() -> Optional[ssl.SSLContext]:
    if not settings.es_ssl:
        return None
    ctx = ssl.create_default_context()
    if settings.es_ca_certs:
        ctx.load_verify_locations(settings.es_ca_certs)
    if not settings.es_ssl_verify:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    return ctx


def make_client() -> AsyncElasticsearch:
    kwargs: Dict[str, Any] = {
        "hosts": [settings.es_host],
        "http_auth": (settings.es_user, settings.es_pass),
        "retry_on_timeout": True,
        "max_retries": 5,
        "request_timeout": 30,
    }
    ssl_ctx = _build_ssl_context()
    if ssl_ctx:
        kwargs["ssl_context"] = ssl_ctx
    return AsyncElasticsearch(**kwargs)


# ─── Main client class ────────────────────────────────────────────────────────

class ESClient:
    """
    High-level async wrapper around AsyncElasticsearch.

    Usage
    ─────
    async with ESClient() as es:
        async for doc in es.poll_new_docs(index_pattern="logs-*"):
            process(doc)
    """

    def __init__(self) -> None:
        self._client: Optional[AsyncElasticsearch] = None

    async def __aenter__(self) -> "ESClient":
        self._client = make_client()
        await self._healthcheck()
        return self

    async def __aexit__(self, *_) -> None:
        if self._client:
            await self._client.close()

    # ── Health check ──────────────────────────────────────────────────────────

    async def _healthcheck(self) -> None:
        log.info("es_client.connecting", host=settings.es_host)
        async for attempt in AsyncRetrying(
            retry=retry_if_exception_type((ConnectionError, OSError)),
            stop=stop_after_attempt(10),
            wait=wait_exponential(multiplier=1, min=2, max=30),
            reraise=True,
        ):
            with attempt:
                info = await self._client.info()  # type: ignore[union-attr]
                log.info(
                    "es_client.connected",
                    cluster=info.get("cluster_name"),
                    version=info["version"]["number"],
                )

    async def ping(self) -> bool:
        try:
            return await self._client.ping()  # type: ignore[union-attr]
        except Exception:
            return False

    # ── Base search ───────────────────────────────────────────────────────────

    async def _search(
        self,
        index: str,
        body: Dict[str, Any],
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Thin wrapper that adds structured logging + retry."""
        t0 = time.monotonic()
        async for attempt in AsyncRetrying(
            retry=retry_if_exception_type((ConnectionError, OSError)),
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=1, max=10),
            reraise=True,
        ):
            with attempt:
                resp = await self._client.search(index=index, body=body, **kwargs)  # type: ignore[union-attr]
        elapsed = time.monotonic() - t0
        hits = resp["hits"].get("total", {}).get("value", 0)
        log.debug(
            "es_client.search",
            index=index,
            hits=hits,
            elapsed_ms=round(elapsed * 1000, 1),
        )
        return resp

    # ── Polling mode ──────────────────────────────────────────────────────────

    async def poll_new_docs(
        self,
        *,
        index_pattern: Optional[str] = None,
        after_timestamp: Optional[str] = None,
        lookback_minutes: int = 5,
        timestamp_field: str = "@timestamp",
        platforms: Optional[List[str]] = None,
        batch_size: int = 200,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Yield documents newer than `after_timestamp` (or now-lookback_minutes).

        Uses `search_after` for efficient deep paging.
        Each yielded item is an ES hit dict:
            { "_index", "_id", "_source", "sort" }
        """
        index = index_pattern or _build_index_pattern(platforms)

        if after_timestamp:
            gte = after_timestamp
        else:
            from datetime import timedelta
            gte = (datetime.now(timezone.utc) - timedelta(minutes=lookback_minutes)).strftime("%Y-%m-%dT%H:%M:%S.000Z")


        search_after: Optional[List[Any]] = None

        while True:
            body: Dict[str, Any] = {
                "size": batch_size,
                "sort": [{timestamp_field: "asc"}, {"_id": "asc"}],
                "query": {
                    "range": {timestamp_field: {"gte": gte, "lte": "now"}}
                },
                "_source": True,
            }
            if search_after:
                body["search_after"] = search_after

            resp = await self._search(index, body)
            hits = resp["hits"].get("hits", [])
            if not hits:
                break

            for hit in hits:
                yield hit

            search_after = hits[-1].get("sort")
            if len(hits) < batch_size:
                break   # last page

    # ── Batch / scroll mode ───────────────────────────────────────────────────

    async def scroll_docs(
        self,
        *,
        index_pattern: Optional[str] = None,
        start: str,
        end: str,
        timestamp_field: str = "@timestamp",
        platforms: Optional[List[str]] = None,
        page_size: int = 500,
        scroll_ttl: str = "2m",
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Yield ALL documents in [start, end] using the Scroll API.

        Best for large historical back-fills where search_after is slow.
        """
        index = index_pattern or _build_index_pattern(platforms)

        body: Dict[str, Any] = {
            "size": page_size,
            "sort": [{timestamp_field: "asc"}],
            "query": {
                "range": {timestamp_field: {"gte": start, "lte": end}}
            },
        }

        resp = await self._client.search(  # type: ignore[union-attr]
            index=index, body=body, scroll=scroll_ttl
        )
        scroll_id = resp.get("_scroll_id")

        while True:
            hits = resp["hits"].get("hits", [])
            if not hits:
                break
            for hit in hits:
                yield hit

            if len(hits) < page_size:
                break

            resp = await self._client.scroll(  # type: ignore[union-attr]
                scroll_id=scroll_id, scroll=scroll_ttl
            )
            scroll_id = resp.get("_scroll_id")

        # Clean up scroll context
        if scroll_id:
            try:
                await self._client.clear_scroll(scroll_id=scroll_id)  # type: ignore[union-attr]
            except Exception:
                pass

    # ── Async search (large scan, non-blocking) ───────────────────────────────

    async def async_search_submit(
        self,
        *,
        index_pattern: Optional[str] = None,
        query_body: Dict[str, Any],
        platforms: Optional[List[str]] = None,
    ) -> str:
        """
        Submit an async search and return the async search ID.
        Poll the ID with `async_search_get()`.
        """
        index = index_pattern or _build_index_pattern(platforms)
        resp = await self._client.async_search.submit(  # type: ignore[union-attr]
            index=index, body=query_body, wait_for_completion_timeout="1s"
        )
        search_id: str = resp["id"]
        log.info("es_client.async_search_submitted", id=search_id)
        return search_id

    async def async_search_get(
        self, search_id: str, poll_interval: float = 2.0
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Poll an async search until complete, yielding hits as they arrive."""
        while True:
            resp = await self._client.async_search.get(id=search_id)  # type: ignore[union-attr]
            for hit in resp["response"]["hits"].get("hits", []):
                yield hit
            if resp.get("is_running") is False:
                break
            await asyncio.sleep(poll_interval)
        # Delete the async search
        try:
            await self._client.async_search.delete(id=search_id)  # type: ignore[union-attr]
        except Exception:
            pass
