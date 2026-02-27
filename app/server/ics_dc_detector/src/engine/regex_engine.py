"""
src/engine/regex_engine.py
──────────────────────────
Stage 2 – HyperScan-inspired batch-compiled regex matching.

All DataComponent patterns are pre-compiled once at startup into a
pattern bank keyed by (pattern_str → {dc_id, field_hint, weight}).

Patterns cover:
  • Event-ID literals          (e.g. "EventCode=4624")
  • Log-source name + channel  (e.g. "auditd:SYSCALL", "WinEventLog:Security")
  • Field-presence check        (e.g. field "AlarmState" present in doc)
  • Keyword compound patterns   (word-boundary wrapped)
  • ICS-specific tag patterns   (TagName, SetpointLimit, etc.)

Each match returns a RegexMatch with a weight contribution so the
similarity engine can sum partial scores.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import structlog

from src.loaders.dc_loader import DataComponent, DataComponentRegistry

log = structlog.get_logger(__name__)

# Weight constants – tuned empirically
W_EVENT_ID = 0.35
W_LOG_SOURCE = 0.30
W_FIELD_NAME = 0.20
W_KEYWORD = 0.15
W_ICS_TAG = 0.25


@dataclass
class CompiledPattern:
    pattern: re.Pattern
    dc_id: str
    pattern_str: str
    weight: float
    hint: str   # human-readable label for evidence_snippet


@dataclass
class RegexMatch:
    dc_id: str
    pattern_str: str
    matched_value: str
    weight: float
    hint: str
    field_name: Optional[str] = None


# ─── Pattern builders ─────────────────────────────────────────────────────────

def _event_id_patterns(dc: DataComponent) -> List[Tuple[str, float, str]]:
    """
    Extract EventCode / event_id patterns from keywords like "4624", "7036",
    "sysmon event 5", "EventCode=4663".
    """
    pats: List[Tuple[str, float, str]] = []
    for kw in dc.keywords:
        # Bare numeric event IDs
        m = re.fullmatch(r"\d{4,5}", kw)
        if m:
            pats.append(
                (
                    r"(?i)(?:EventCode|event_id|EventID)\s*[=:]\s*" + re.escape(kw),
                    W_EVENT_ID,
                    f"EventID={kw}",
                )
            )
        # "sysmon event N"
        m2 = re.search(r"sysmon event (\d+)", kw, re.I)
        if m2:
            eid = m2.group(1)
            pats.append(
                (
                    r"(?i)(?:EventCode|event_id|EventID)\s*[=:]\s*" + re.escape(eid),
                    W_EVENT_ID,
                    f"Sysmon EventID={eid}",
                )
            )
    return pats


def _log_source_patterns(dc: DataComponent) -> List[Tuple[str, float, str]]:
    """Build patterns from log_sources (name:channel combos)."""
    pats: List[Tuple[str, float, str]] = []
    for ls in dc.log_sources:
        if not ls.name or ls.name in ("None", "Process", "Network Share",
                                       "Module", "File", "Firmware",
                                       "Logon Session"):
            continue
        # Escape and match "name" anywhere in the doc text
        pats.append(
            (
                r"(?i)" + re.escape(ls.name.replace(":", r"\s*:\s*")),
                W_LOG_SOURCE,
                f"LogSource={ls.name}",
            )
        )
        # If channel is non-trivial, add a compound pattern
        if ls.channel and ls.channel not in ("None", ""):
            # Use first 40 chars of channel to avoid over-fitting
            ch_snippet = ls.channel[:40].strip()
            if len(ch_snippet) > 4:
                pats.append(
                    (
                        r"(?i)" + re.escape(ch_snippet),
                        W_LOG_SOURCE * 0.6,
                        f"Channel={ch_snippet}",
                    )
                )
    return pats


def _field_name_patterns(dc: DataComponent) -> List[Tuple[str, float, str]]:
    """
    Match when a document contains a field with a name from the DC's fields list.
    We look for the field name as a key or as "field_name:" in serialised text.
    """
    pats: List[Tuple[str, float, str]] = []
    for fname in dc.fields:
        escaped = re.escape(fname)
        pats.append(
            (
                r"(?i)\b" + escaped + r"\b",
                W_FIELD_NAME,
                f"Field={fname}",
            )
        )
    return pats


def _keyword_patterns(dc: DataComponent) -> List[Tuple[str, float, str]]:
    """Word-boundary keyword patterns (supplements Aho-Corasick)."""
    pats: List[Tuple[str, float, str]] = []
    for kw in dc.keywords:
        # Skip bare numeric IDs (already handled in event_id_patterns)
        if re.fullmatch(r"\d{4,5}", kw):
            continue
        if len(kw) < 3:
            continue
        pats.append(
            (
                r"(?i)\b" + re.escape(kw) + r"\b",
                W_KEYWORD,
                f"Keyword={kw}",
            )
        )
    return pats


def _ics_field_patterns(dc: DataComponent) -> List[Tuple[str, float, str]]:
    """
    Extra ICS / SCADA specific field patterns drawn from ICS platform DCs
    (TagName, AlarmState, SetpointLimit, Severity, ControllerIP, …).
    """
    ICS_FIELDS = {
        "TagName": W_ICS_TAG,
        "CurrentValue": W_ICS_TAG,
        "SetpointLimit": W_ICS_TAG,
        "AlarmState": W_ICS_TAG,
        "ControllerIP": W_ICS_TAG,
        "ModbusException": W_ICS_TAG,
        "DNP3Response": W_ICS_TAG,
    }
    pats: List[Tuple[str, float, str]] = []
    if any(p in ("ics", "scada", "ot", "iot", "plc") for p in dc.platforms):
        for fname, w in ICS_FIELDS.items():
            if fname in dc.fields or fname.lower() in [f.lower() for f in dc.fields]:
                pats.append(
                    (
                        r"(?i)\b" + re.escape(fname) + r"\b",
                        w,
                        f"ICS_Field={fname}",
                    )
                )
    return pats


# ─── Engine ───────────────────────────────────────────────────────────────────

class RegexEngine:
    """
    Pre-compiles all DataComponent patterns into a single pattern bank.

    Thread-safe after `.build(registry)` – all subsequent calls are read-only.
    """

    def __init__(self) -> None:
        self._patterns: List[CompiledPattern] = []
        self._dc_patterns: Dict[str, List[CompiledPattern]] = {}  # dc_id → list

    def build(self, registry: DataComponentRegistry) -> None:
        for dc in registry.all:
            dc_pats: List[CompiledPattern] = []

            all_raw = (
                _event_id_patterns(dc)
                + _log_source_patterns(dc)
                + _field_name_patterns(dc)
                + _keyword_patterns(dc)
                + _ics_field_patterns(dc)
            )

            seen: set = set()
            for pat_str, weight, hint in all_raw:
                if pat_str in seen:
                    continue
                seen.add(pat_str)
                try:
                    compiled = re.compile(pat_str)
                except re.error as exc:
                    log.warning(
                        "regex_engine.compile_error",
                        dc=dc.id,
                        pattern=pat_str,
                        error=str(exc),
                    )
                    continue
                cp = CompiledPattern(
                    pattern=compiled,
                    dc_id=dc.id,
                    pattern_str=pat_str,
                    weight=weight,
                    hint=hint,
                )
                dc_pats.append(cp)
                self._patterns.append(cp)

            self._dc_patterns[dc.id] = dc_pats

        log.info(
            "regex_engine.built",
            total_patterns=len(self._patterns),
            dc_count=len(registry.all),
        )

    def search_text(self, text: str) -> List[RegexMatch]:
        """Run all patterns against a flat text string."""
        matches: List[RegexMatch] = []
        for cp in self._patterns:
            m = cp.pattern.search(text)
            if m:
                matches.append(
                    RegexMatch(
                        dc_id=cp.dc_id,
                        pattern_str=cp.pattern_str,
                        matched_value=m.group(0),
                        weight=cp.weight,
                        hint=cp.hint,
                    )
                )
        return matches

    def search_doc(
        self,
        source: Dict[str, Any],
        flat_text: Optional[str] = None,
    ) -> List[RegexMatch]:
        """
        Search a document (ES _source dict).

        1. Flatten all values to a single text string.
        2. Also check field names against field-name patterns.
        """
        if flat_text is None:
            flat_text = _flatten_to_text(source)

        text_matches = self.search_text(flat_text)

        # Additionally match field names present in the doc
        field_matches: List[RegexMatch] = []
        doc_field_names = set(_iter_keys(source))
        for cp in self._patterns:
            if "Field=" in cp.hint:
                fname = cp.hint.split("=", 1)[1]
                if fname in doc_field_names:
                    field_matches.append(
                        RegexMatch(
                            dc_id=cp.dc_id,
                            pattern_str=cp.pattern_str,
                            matched_value=fname,
                            weight=cp.weight,
                            hint=cp.hint,
                            field_name=fname,
                        )
                    )

        return text_matches + field_matches

    @property
    def ready(self) -> bool:
        return len(self._patterns) > 0


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _flatten_to_text(obj: Any, sep: str = " ", depth: int = 0) -> str:
    """Recursively flatten a nested dict/list to a single string."""
    if depth > 8:
        return ""
    if isinstance(obj, str):
        return obj
    if isinstance(obj, (int, float, bool)):
        return str(obj)
    if isinstance(obj, dict):
        parts = []
        for k, v in obj.items():
            parts.append(str(k))
            parts.append(_flatten_to_text(v, sep, depth + 1))
        return sep.join(parts)
    if isinstance(obj, (list, tuple)):
        return sep.join(_flatten_to_text(i, sep, depth + 1) for i in obj)
    return ""


def _iter_keys(obj: Any, prefix: str = "") -> List[str]:
    """Return all dot-notation keys of a nested dict."""
    keys: List[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            full = f"{prefix}.{k}" if prefix else k
            keys.append(full)
            keys.extend(_iter_keys(v, full))
    return keys
