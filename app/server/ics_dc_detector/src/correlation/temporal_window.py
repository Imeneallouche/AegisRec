"""
src/correlation/temporal_window.py
────────────────────────────────────
Temporal sliding-window cross-DataComponent correlation.

Logic
─────
When a document matches DC-A, we record:
    (asset_id, dc_id, timestamp)

If within `window_seconds` another document on the **same asset_id**
matches a **correlated DC** (e.g. DC0067 Logon Session + DC0082 Network
Traffic), we BOOST both similarity scores by `settings.correlation_boost`.

Correlation pairs are drawn from a static knowledge base built from
MITRE ATT&CK for ICS tactic groupings.

Window entries expire automatically after `window_seconds * 2` to
prevent unbounded memory growth.
"""
from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

import structlog

from config.settings import settings

log = structlog.get_logger(__name__)


# ─── Correlation knowledge base ───────────────────────────────────────────────
# Format: frozenset({dc_id_a, dc_id_b})
# These pairs are known to be tactically adjacent and worth boosting when
# observed together on the same asset within the time window.

CORRELATED_PAIRS: List[frozenset] = [
    # Logon + Network Traffic (initial access / lateral movement)
    frozenset({"DC0067", "DC0082"}),
    # Logon + Process Creation (execution after login)
    frozenset({"DC0067", "DC0028"}),
    # Process Alarm + Network Traffic (ICS disruption + exfil)
    frozenset({"DC0109", "DC0082"}),
    # Process Alarm + Process Termination (safety trip + service kill)
    frozenset({"DC0109", "DC0033"}),
    # Logon Session Metadata + OS API Execution (privilege escalation)
    frozenset({"DC0088", "DC0021"}),
    # Module Load + Process Metadata (DLL injection)
    frozenset({"DC0016", "DC0034"}),
    # Firmware Modification + Process History (persistence footprint)
    frozenset({"DC0004", "DC0107"}),
    # File Deletion + Process Termination (cover-tracks pattern)
    frozenset({"DC0040", "DC0033"}),
    # Network Share Access + Logon Session Creation (share enum after auth)
    frozenset({"DC0102", "DC0067"}),
    # Process History + OS API Execution (execution reconstruction)
    frozenset({"DC0107", "DC0021"}),
]

# Build a fast lookup: dc_id → set of correlated dc_ids
_CORRELATION_MAP: Dict[str, Set[str]] = defaultdict(set)
for _pair in CORRELATED_PAIRS:
    ids = list(_pair)
    if len(ids) == 2:
        _CORRELATION_MAP[ids[0]].add(ids[1])
        _CORRELATION_MAP[ids[1]].add(ids[0])


# ─── Window entry ─────────────────────────────────────────────────────────────

@dataclass
class WindowEntry:
    asset_id: str
    dc_id: str
    timestamp: float   # monotonic time
    score: float


# ─── Window manager ───────────────────────────────────────────────────────────

class TemporalWindow:
    """
    In-memory sliding window for cross-DC correlation.

    Thread-safety: single-threaded asyncio use only.
    """

    def __init__(
        self,
        window_seconds: Optional[int] = None,
        boost: Optional[float] = None,
    ) -> None:
        self.window_seconds = window_seconds or settings.temporal_window_seconds
        self.boost = boost or settings.correlation_boost
        # asset_id → list[WindowEntry]
        self._entries: Dict[str, List[WindowEntry]] = defaultdict(list)

    def add(self, asset_id: str, dc_id: str, score: float) -> None:
        """Record a new detection event for (asset_id, dc_id)."""
        self._prune(asset_id)
        self._entries[asset_id].append(
            WindowEntry(
                asset_id=asset_id,
                dc_id=dc_id,
                timestamp=time.monotonic(),
                score=score,
            )
        )

    def get_boost(self, asset_id: str, new_dc_id: str) -> float:
        """
        Check if `new_dc_id` is correlated with any recent detections on
        `asset_id`.  Returns cumulative boost (0.0 if no correlation).
        """
        self._prune(asset_id)
        recent_dc_ids = {e.dc_id for e in self._entries.get(asset_id, [])}
        correlated = _CORRELATION_MAP.get(new_dc_id, set())
        matches = recent_dc_ids & correlated
        if matches:
            boost = self.boost * len(matches)
            log.debug(
                "temporal_window.boost",
                asset=asset_id,
                new_dc=new_dc_id,
                correlated_with=list(matches),
                boost=boost,
            )
            return min(boost, 0.30)   # hard cap at 0.30
        return 0.0

    def _prune(self, asset_id: str) -> None:
        """Remove expired entries for a given asset."""
        cutoff = time.monotonic() - self.window_seconds * 2
        if asset_id in self._entries:
            self._entries[asset_id] = [
                e for e in self._entries[asset_id] if e.timestamp >= cutoff
            ]
            if not self._entries[asset_id]:
                del self._entries[asset_id]

    def window_state(self, asset_id: str) -> List[Tuple[str, float]]:
        """Return current (dc_id, elapsed_seconds) tuples for debugging."""
        now = time.monotonic()
        return [
            (e.dc_id, round(now - e.timestamp, 1))
            for e in self._entries.get(asset_id, [])
        ]
