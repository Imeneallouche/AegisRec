"""
src/loaders/dc_loader.py
────────────────────────
Loads every DataComponent JSON from the configured directory, normalises
the content, and builds in-memory indexes used by the matching engines.

Key exported object
───────────────────
DataComponentRegistry
    .all                    – list[DataComponent]
    .by_id                  – dict[str, DataComponent]
    .all_keywords           – flat list of (keyword, dc_id) tuples
    .all_field_names        – flat list of (field_name, dc_id) tuples
    .all_log_source_tuples  – flat list of (name, channel, dc_id) tuples
    .platform_index         – dict[platform, list[DataComponent]]
    .category_index         – dict[category, list[DataComponent]]
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import structlog

log = structlog.get_logger(__name__)


# ─── Data model ───────────────────────────────────────────────────────────────

@dataclass
class LogSource:
    name: str
    channel: str


@dataclass
class DataComponent:
    id: str
    name: str
    description: str
    platforms: List[str] = field(default_factory=list)
    log_source_types: List[str] = field(default_factory=list)
    indicator_types: List[str] = field(default_factory=list)
    categories: List[str] = field(default_factory=list)
    fields: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    log_sources: List[LogSource] = field(default_factory=list)
    raw: dict = field(default_factory=dict, repr=False)

    # Pre-compiled regex for each keyword (case-insensitive whole-word)
    keyword_patterns: List[re.Pattern] = field(default_factory=list, repr=False)

    def __post_init__(self) -> None:
        self.keyword_patterns = [
            re.compile(r"(?i)\b" + re.escape(kw) + r"\b") for kw in self.keywords
        ]


# ─── Loader ───────────────────────────────────────────────────────────────────

def _safe_list(obj: dict, *keys: str) -> list:
    """Traverse nested keys and return a list, or []."""
    cur = obj
    for k in keys:
        if not isinstance(cur, dict):
            return []
        cur = cur.get(k, [])
    return cur if isinstance(cur, list) else []


def _load_one(path: Path) -> Optional[DataComponent]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        log.warning("dc_loader.skip_file", path=str(path), reason=str(exc))
        return None

    if raw.get("type") != "DataComponent":
        return None

    si = raw.get("searchable_indexes", {})

    # Normalise log_sources – handle both dict-key casing variants
    raw_ls = raw.get("log_sources", [])
    log_sources = []
    for entry in raw_ls:
        name = entry.get("name") or entry.get("Name") or ""
        channel = entry.get("channel") or entry.get("Channel") or ""
        if name:
            log_sources.append(LogSource(name=name, channel=channel))

    dc = DataComponent(
        id=raw.get("id", "UNKNOWN"),
        name=raw.get("name", "Unknown"),
        description=raw.get("description", ""),
        platforms=_safe_list(si, "platforms"),
        log_source_types=_safe_list(si, "log_source_types"),
        indicator_types=_safe_list(si, "indicator_types"),
        categories=_safe_list(si, "categories"),
        fields=_safe_list(si, "fields"),
        keywords=_safe_list(si, "keywords"),
        log_sources=log_sources,
        raw=raw,
    )
    log.debug("dc_loader.loaded", id=dc.id, name=dc.name)
    return dc


# ─── Registry ─────────────────────────────────────────────────────────────────

class DataComponentRegistry:
    """Immutable registry built from a directory of DataComponent JSON files."""

    def __init__(self, directory: Path) -> None:
        self.all: List[DataComponent] = []
        self.by_id: Dict[str, DataComponent] = {}
        self.platform_index: Dict[str, List[DataComponent]] = {}
        self.category_index: Dict[str, List[DataComponent]] = {}

        self._load(directory)
        self._build_indexes()

        log.info(
            "dc_loader.registry_built",
            total=len(self.all),
            directory=str(directory),
        )

    # ── Internal ──────────────────────────────────────────────────────────────

    def _load(self, directory: Path) -> None:
        if not directory.exists():
            log.warning("dc_loader.dir_missing", path=str(directory))
            return
        for path in sorted(directory.glob("*.json")):
            dc = _load_one(path)
            if dc:
                self.all.append(dc)
                self.by_id[dc.id] = dc

    def _build_indexes(self) -> None:
        for dc in self.all:
            for plat in dc.platforms:
                self.platform_index.setdefault(plat, []).append(dc)
            for cat in dc.categories:
                self.category_index.setdefault(cat, []).append(dc)

    # ── Convenience iterators ─────────────────────────────────────────────────

    @property
    def all_keywords(self) -> List[Tuple[str, str]]:
        """Yield (keyword, dc_id) for every keyword across all DCs."""
        result = []
        for dc in self.all:
            for kw in dc.keywords:
                result.append((kw, dc.id))
        return result

    @property
    def all_field_names(self) -> List[Tuple[str, str]]:
        """Yield (field_name_lower, dc_id) for every field name."""
        result = []
        for dc in self.all:
            for f in dc.fields:
                result.append((f.lower(), dc.id))
        return result

    @property
    def all_log_source_tuples(self) -> List[Tuple[str, str, str]]:
        """Yield (ls_name, channel, dc_id)."""
        result = []
        for dc in self.all:
            for ls in dc.log_sources:
                result.append((ls.name, ls.channel, dc.id))
        return result

    def get(self, dc_id: str) -> Optional[DataComponent]:
        return self.by_id.get(dc_id)
