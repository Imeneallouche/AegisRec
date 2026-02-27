"""
src/engine/matcher.py
─────────────────────
Orchestrates Stage 1 (Aho-Corasick), Stage 2 (Regex), and Stage 3
(Embeddings) into a single normalised similarity score per document.

Scoring model
─────────────
Each stage contributes a weighted partial score:

  Stage-1 (AC)  → 0.20 weight  – fast keyword presence
  Stage-2 (RE)  → 0.45 weight  – structural pattern richness
  Stage-3 (EMB) → 0.35 weight  – semantic drift tolerance

Final score = Σ(stage_weight × stage_score), capped at 1.0.

A document only fires an alert if final_score ≥ settings.similarity_threshold.

The Matcher also accumulates `matched_fields` (field→value evidence)
and `evidence_snippet` for the final alert payload.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

import structlog

from config.settings import settings
from src.engine.aho_corasick import AhoCorasickEngine
from src.engine.embedding_engine import EmbeddingEngine
from src.engine.regex_engine import RegexEngine, _flatten_to_text
from src.loaders.dc_loader import DataComponentRegistry

log = structlog.get_logger(__name__)

# Stage weights  (must sum to 1.0)
W_STAGE1 = 0.20
W_STAGE2 = 0.45
W_STAGE3 = 0.35


@dataclass
class MatchResult:
    dc_id: str
    dc_name: str
    similarity_score: float          # 0.0–1.0
    matched_fields: Dict[str, str]   # field → value
    evidence_snippet: str
    rule_or_pattern: str             # the highest-weight pattern that fired
    strategy: str                    # "regex|aho_corasick|embedding|combined"
    threshold_used: float


class Matcher:
    """
    Unified matcher.  Build once at startup; call `match_doc()` per document.

    Example
    ───────
    matcher = Matcher()
    await matcher.build(registry)

    results = await matcher.match_doc(hit["_source"])
    """

    def __init__(self) -> None:
        self._registry: Optional[DataComponentRegistry] = None
        self.ac = AhoCorasickEngine()
        self.re = RegexEngine()
        self.emb = EmbeddingEngine()

    async def build(self, registry: DataComponentRegistry) -> None:
        self._registry = registry

        # Stage 1 – Aho-Corasick
        self.ac.build(registry.all_keywords)

        # Stage 2 – Regex patterns
        self.re.build(registry)

        # Stage 3 – Embeddings (CPU-intensive; run in thread pool via build())
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.emb.build, registry)

        log.info(
            "matcher.ready",
            ac=self.ac.ready,
            regex=self.re.ready,
            embedding=self.emb.ready,
        )

    async def match_doc(
        self, source: Dict[str, Any]
    ) -> List[MatchResult]:
        """
        Run all three stages against an ES document source.

        Returns a list of MatchResult, one per DataComponent that scored
        above the similarity threshold.
        """
        flat_text = _flatten_to_text(source)

        # ── Stage 1 ───────────────────────────────────────────────────────────
        ac_hits: Dict[str, List[str]] = defaultdict(list)   # dc_id → [keywords]
        for m in self.ac.search(flat_text):
            ac_hits[m.dc_id].append(m.keyword)

        # ── Stage 2 ───────────────────────────────────────────────────────────
        re_hits: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {"total_weight": 0.0, "hints": [], "top_pattern": ""}
        )
        for m in self.re.search_doc(source, flat_text):
            re_hits[m.dc_id]["total_weight"] += m.weight
            re_hits[m.dc_id]["hints"].append(m.hint)
            if m.weight > re_hits[m.dc_id].get("best_weight", 0.0):
                re_hits[m.dc_id]["best_weight"] = m.weight
                re_hits[m.dc_id]["top_pattern"] = m.pattern_str

        # Candidate DC IDs = union of AC + RE hits (optimisation for Stage 3)
        candidate_ids: Set[str] = set(ac_hits.keys()) | set(re_hits.keys())

        # ── Stage 3 ───────────────────────────────────────────────────────────
        # If no candidates from Stage 1/2, run Stage 3 on all DCs
        emb_results = await self.emb.search(
            flat_text,
            candidate_dc_ids=list(candidate_ids) if candidate_ids else None,
        )
        emb_scores: Dict[str, float] = {e.dc_id: e.score for e in emb_results}

        # ── Score fusion ──────────────────────────────────────────────────────
        all_ids: Set[str] = (
            set(ac_hits.keys()) | set(re_hits.keys()) | set(emb_scores.keys())
        )
        results: List[MatchResult] = []

        for dc_id in all_ids:
            dc = self._registry.get(dc_id) if self._registry else None  # type: ignore[union-attr]
            if dc is None:
                continue

            # Stage-1 partial score (0–1): cap at 1 keyword = 1.0
            ac_kws = ac_hits.get(dc_id, [])
            stage1_score = min(1.0, len(ac_kws) * 0.5) if ac_kws else 0.0

            # Stage-2 partial score: normalise total_weight against ceiling
            re_info = re_hits.get(dc_id, {})
            raw_re_weight = re_info.get("total_weight", 0.0)
            # Ceiling = sum of all possible weights per DC (dynamic)
            ceiling = max(
                sum(cp.weight for cp in self.re._dc_patterns.get(dc_id, [])),
                0.001,
            )
            stage2_score = min(1.0, raw_re_weight / ceiling)

            # Stage-3 partial score
            stage3_score = emb_scores.get(dc_id, 0.0)

            final_score = (
                W_STAGE1 * stage1_score
                + W_STAGE2 * stage2_score
                + W_STAGE3 * stage3_score
            )
            final_score = round(min(1.0, final_score), 4)

            if final_score < settings.similarity_threshold:
                continue

            # ── Evidence assembly ─────────────────────────────────────────────
            matched_fields = _extract_matched_fields(
                source, ac_kws, re_info.get("hints", [])
            )
            evidence_snippet = _build_evidence_snippet(
                flat_text, ac_kws, re_info.get("hints", [])
            )
            top_pattern = re_info.get("top_pattern", "") or (
                ac_kws[0] if ac_kws else "embedding"
            )
            strategy = _choose_strategy(stage1_score, stage2_score, stage3_score)

            results.append(
                MatchResult(
                    dc_id=dc_id,
                    dc_name=dc.name,
                    similarity_score=final_score,
                    matched_fields=matched_fields,
                    evidence_snippet=evidence_snippet,
                    rule_or_pattern=top_pattern,
                    strategy=strategy,
                    threshold_used=settings.similarity_threshold,
                )
            )

        results.sort(key=lambda r: r.similarity_score, reverse=True)
        return results


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _extract_matched_fields(
    source: Dict[str, Any],
    ac_keywords: List[str],
    re_hints: List[str],
) -> Dict[str, str]:
    """
    Return a dict of { field_name: field_value } for fields that contributed
    to the match.  We walk the source looking for matching values.
    """
    matched: Dict[str, str] = {}

    def _walk(obj: Any, path: str = "") -> None:
        if len(matched) >= 10:
            return
        if isinstance(obj, dict):
            for k, v in obj.items():
                _walk(v, f"{path}.{k}" if path else k)
        elif isinstance(obj, (list, tuple)):
            for item in obj[:5]:
                _walk(item, path)
        elif isinstance(obj, str) and path:
            v_lower = obj.lower()
            for kw in ac_keywords:
                if kw.lower() in v_lower:
                    matched[path] = obj[:200]
                    return

    _walk(source)

    # Also add any hint-referenced fields
    for hint in re_hints[:5]:
        if "Field=" in hint:
            fname = hint.split("=", 1)[1]
            val = _deep_get(source, fname)
            if val is not None:
                matched[fname] = str(val)[:200]

    return matched


def _deep_get(obj: Any, key: str) -> Optional[Any]:
    """Simple dot-notation key lookup."""
    parts = key.split(".")
    cur = obj
    for p in parts:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(p)
    return cur


def _build_evidence_snippet(
    flat_text: str,
    ac_keywords: List[str],
    re_hints: List[str],
) -> str:
    """Build a short evidence string for the alert payload."""
    parts = []
    if ac_keywords:
        parts.append("AC_keywords: " + ", ".join(ac_keywords[:5]))
    if re_hints:
        parts.append("RE_hints: " + "; ".join(re_hints[:5]))
    snippet = " | ".join(parts)
    # Add a 160-char window from flat_text
    snippet += " | text_excerpt: " + flat_text[:160].replace("\n", " ")
    return snippet[:512]


def _choose_strategy(s1: float, s2: float, s3: float) -> str:
    stages = []
    if s1 > 0:
        stages.append("aho_corasick")
    if s2 > 0:
        stages.append("regex")
    if s3 > 0:
        stages.append("embedding")
    if len(stages) > 1:
        return "combined(" + "|".join(stages) + ")"
    return stages[0] if stages else "none"
