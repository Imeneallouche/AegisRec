"""
src/engine/aho_corasick.py
──────────────────────────
Stage 1 – Aho-Corasick multi-keyword matcher.

All DataComponent keywords are compiled into a single Aho-Corasick
automaton (via the `pyahocorasick` library).  This reduces matching
time to O(text_length) regardless of how many keywords exist.

Returned results carry the dc_id so the caller knows which
DataComponent(s) matched without a secondary lookup.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import structlog

try:
    import ahocorasick  # pyahocorasick
    _HAS_AC = True
except ImportError:
    _HAS_AC = False

log = structlog.get_logger(__name__)


@dataclass
class AhoCorasickMatch:
    keyword: str
    dc_id: str
    position: int           # end position in the text


@dataclass
class AhoCorasickEngine:
    """
    Wraps pyahocorasick.Automaton.

    Build once, reuse forever (thread-safe reads after make_automaton()).
    """
    _automaton: Optional[object] = field(default=None, init=False, repr=False)
    _keyword_count: int = field(default=0, init=False)

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    def build(self, keyword_dc_pairs: List[Tuple[str, str]]) -> None:
        """
        Compile all (keyword, dc_id) pairs into the automaton.

        Parameters
        ──────────
        keyword_dc_pairs : list of (keyword_string, dc_id)
        """
        if not _HAS_AC:
            log.warning(
                "aho_corasick.unavailable",
                reason="pyahocorasick not installed; Stage-1 disabled",
            )
            return

        A = ahocorasick.Automaton()  # type: ignore[attr-defined]

        for kw, dc_id in keyword_dc_pairs:
            kw_lower = kw.lower()
            if kw_lower in A:
                # Allow multiple DCs to share the same keyword
                existing = A.get(kw_lower)
                existing.append(dc_id)
            else:
                A.add_word(kw_lower, [dc_id, kw])

        if len(A) == 0:
            log.warning("aho_corasick.empty_automaton")
            return

        A.make_automaton()
        self._automaton = A
        self._keyword_count = len(A)
        log.info("aho_corasick.built", keywords=self._keyword_count)

    # ------------------------------------------------------------------
    # Matching
    # ------------------------------------------------------------------

    def search(self, text: str) -> List[AhoCorasickMatch]:
        """
        Return all keyword matches found in `text`.

        Parameters
        ──────────
        text : the log message / document string to search

        Returns
        ───────
        List of AhoCorasickMatch (keyword, dc_id, position)
        """
        if not _HAS_AC or self._automaton is None:
            return []

        text_lower = text.lower()
        matches: List[AhoCorasickMatch] = []

        for end_idx, (dc_ids_and_kw) in self._automaton.iter(text_lower):  # type: ignore[union-attr]
            # Stored value: [dc_id_1, ..., keyword_string] – last element is kw
            *dc_ids, kw = dc_ids_and_kw
            for dc_id in dc_ids:
                matches.append(
                    AhoCorasickMatch(keyword=kw, dc_id=dc_id, position=end_idx)
                )

        return matches

    def search_doc(self, doc_flat: Dict[str, str]) -> List[AhoCorasickMatch]:
        """
        Search all string values in a flattened document dict.

        Parameters
        ──────────
        doc_flat : { "field_name": "field_value_as_str", ... }
        """
        combined = " ".join(v for v in doc_flat.values() if v)
        return self.search(combined)

    @property
    def ready(self) -> bool:
        return self._automaton is not None
