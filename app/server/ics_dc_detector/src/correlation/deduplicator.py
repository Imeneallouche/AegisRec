"""
src/correlation/deduplicator.py
────────────────────────────────
Deduplication / idempotency layer.

Responsibilities
────────────────
1. Track processed ES document IDs to avoid re-emitting alerts for the
   same raw event.  Uses a bounded LRU-style cache.
2. Persist the last-processed cursor (sort key + timestamp) so the
   polling loop resumes from the right position after a restart.
3. Detect near-duplicate alerts: same dc_id + asset_id within a
   short suppression window to prevent alert storms.

Backends
────────
FileStateCursor – JSON file on disk (default, zero deps)
RedisStateCursor – Redis HSET/GET (for multi-instance deployments)
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiofiles
import structlog

from config.settings import settings

log = structlog.get_logger(__name__)

# How long (seconds) to suppress identical (dc_id, asset_id) alerts
SUPPRESSION_TTL = 120

# Maximum doc IDs kept in memory
MAX_SEEN_IDS = 100_000


# ─── Cursor ABC ───────────────────────────────────────────────────────────────

class StateCursor(ABC):
    """Persist / retrieve the last-processed cursor."""

    @abstractmethod
    async def load(self) -> Dict[str, Any]:
        ...

    @abstractmethod
    async def save(self, state: Dict[str, Any]) -> None:
        ...


class FileStateCursor(StateCursor):
    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = path or settings.state_file_path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    async def load(self) -> Dict[str, Any]:
        if not self.path.exists():
            return {}
        async with aiofiles.open(self.path, "r") as f:
            content = await f.read()
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {}

    async def save(self, state: Dict[str, Any]) -> None:
        async with aiofiles.open(self.path, "w") as f:
            await f.write(json.dumps(state, indent=2))


class RedisStateCursor(StateCursor):
    """Redis-backed cursor for multi-process / multi-pod deployments."""

    def __init__(self) -> None:
        import aioredis  # type: ignore
        self._redis_url = settings.redis_url
        self._key = f"{settings.state_key_prefix}:cursor"
        self._redis: Optional[Any] = None

    async def _get_conn(self) -> Any:
        if self._redis is None:
            import aioredis  # type: ignore
            self._redis = await aioredis.from_url(self._redis_url)
        return self._redis

    async def load(self) -> Dict[str, Any]:
        r = await self._get_conn()
        raw = await r.get(self._key)
        if not raw:
            return {}
        try:
            return json.loads(raw)
        except Exception:
            return {}

    async def save(self, state: Dict[str, Any]) -> None:
        r = await self._get_conn()
        await r.set(self._key, json.dumps(state))


# ─── Deduplicator ─────────────────────────────────────────────────────────────

class Deduplicator:
    """
    Central deduplication controller.

    Usage
    ─────
    dup = Deduplicator()
    await dup.load()

    if not dup.seen_doc(doc_id):
        dup.mark_doc(doc_id)
        if not dup.suppressed(dc_id, asset_id):
            dup.record_alert(dc_id, asset_id)
            emit_alert(...)

    await dup.save_cursor(sort_key, timestamp)
    """

    def __init__(self, cursor: Optional[StateCursor] = None) -> None:
        if cursor is None:
            if settings.state_backend == "redis":
                cursor = RedisStateCursor()
            else:
                cursor = FileStateCursor()
        self._cursor = cursor
        # Rolling bounded set of seen document IDs
        self._seen_ids: Dict[str, float] = {}   # id → time.monotonic() inserted
        # Suppression map: (dc_id, asset_id) → expiry time.monotonic()
        self._suppression: Dict[str, float] = {}
        # Persisted state
        self._state: Dict[str, Any] = {}

    async def load(self) -> None:
        self._state = await self._cursor.load()
        log.info(
            "deduplicator.loaded",
            cursor_ts=self._state.get("last_timestamp"),
            backend=type(self._cursor).__name__,
        )

    @property
    def last_timestamp(self) -> Optional[str]:
        return self._state.get("last_timestamp")

    @property
    def last_sort_key(self) -> Optional[List[Any]]:
        return self._state.get("last_sort_key")

    async def save_cursor(
        self, sort_key: Optional[List[Any]], timestamp: str
    ) -> None:
        self._state["last_timestamp"] = timestamp
        self._state["last_sort_key"] = sort_key
        await self._cursor.save(self._state)

    # ── Doc-level deduplication ───────────────────────────────────────────────

    def seen_doc(self, doc_id: str) -> bool:
        self._evict_old_ids()
        return doc_id in self._seen_ids

    def mark_doc(self, doc_id: str) -> None:
        self._evict_old_ids()
        self._seen_ids[doc_id] = time.monotonic()

    def _evict_old_ids(self) -> None:
        if len(self._seen_ids) > MAX_SEEN_IDS:
            # Remove oldest 10%
            sorted_ids = sorted(self._seen_ids.items(), key=lambda x: x[1])
            for id_, _ in sorted_ids[: MAX_SEEN_IDS // 10]:
                del self._seen_ids[id_]

    # ── Alert-level suppression ───────────────────────────────────────────────

    def suppressed(self, dc_id: str, asset_id: str) -> bool:
        """True if we emitted the same (dc_id, asset_id) alert recently."""
        key = _suppress_key(dc_id, asset_id)
        expiry = self._suppression.get(key, 0.0)
        return time.monotonic() < expiry

    def record_alert(
        self, dc_id: str, asset_id: str, ttl: int = SUPPRESSION_TTL
    ) -> None:
        key = _suppress_key(dc_id, asset_id)
        self._suppression[key] = time.monotonic() + ttl
        # Prune expired keys periodically
        if len(self._suppression) > 10_000:
            now = time.monotonic()
            self._suppression = {
                k: v for k, v in self._suppression.items() if v > now
            }


def _suppress_key(dc_id: str, asset_id: str) -> str:
    return hashlib.sha1(f"{dc_id}:{asset_id}".encode()).hexdigest()
