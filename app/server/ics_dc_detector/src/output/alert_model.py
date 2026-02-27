"""
src/output/alert_model.py
──────────────────────────
The canonical Alert dataclass.

This is the single source of truth for the output JSON schema described
in the task specification.  All sink implementations receive an Alert
object and call `alert.to_dict()` / `alert.to_json()`.
"""
from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import orjson


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Alert:
    # ── Identification ────────────────────────────────────────────────────────
    detection_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    datacomponent: str = ""
    datacomponent_id: Optional[str] = None

    # ── Asset context ─────────────────────────────────────────────────────────
    asset_id: Optional[str] = None
    asset_name: Optional[str] = None

    # ── Source document ───────────────────────────────────────────────────────
    es_index: str = ""
    document_id: str = ""
    timestamp: str = field(default_factory=_now_iso)

    # ── Detection evidence ────────────────────────────────────────────────────
    matched_fields: Dict[str, str] = field(default_factory=dict)
    similarity_score: float = 0.0
    evidence_snippet: str = ""
    rule_or_pattern: str = ""

    # ── Metadata ──────────────────────────────────────────────────────────────
    detection_metadata: Dict[str, Any] = field(default_factory=dict)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self) -> bytes:
        return orjson.dumps(self.to_dict())

    def to_json_str(self) -> str:
        return self.to_json().decode("utf-8")

    @classmethod
    def from_match(
        cls,
        *,
        dc_id: str,
        dc_name: str,
        es_index: str,
        document_id: str,
        doc_timestamp: str,
        asset_id: Optional[str],
        asset_name: Optional[str],
        matched_fields: Dict[str, str],
        similarity_score: float,
        evidence_snippet: str,
        rule_or_pattern: str,
        strategy: str,
        threshold: float,
        correlation_boost: float = 0.0,
    ) -> "Alert":
        return cls(
            datacomponent=dc_name,
            datacomponent_id=dc_id,
            asset_id=asset_id,
            asset_name=asset_name,
            es_index=es_index,
            document_id=document_id,
            timestamp=doc_timestamp,
            matched_fields=matched_fields,
            similarity_score=round(min(1.0, similarity_score + correlation_boost), 4),
            evidence_snippet=evidence_snippet,
            rule_or_pattern=rule_or_pattern,
            detection_metadata={
                "strategy": strategy,
                "threshold": threshold,
                "correlation_boost": correlation_boost,
                "base_score": round(similarity_score, 4),
            },
        )
