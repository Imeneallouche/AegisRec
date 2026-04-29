"""Assistant / context reply generation (template; replace with LLM later)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from aegisrec.models.site import AlertRecord, AttackChainRecord, MitigationRecord, Site
from aegisrec.schemas.assistant import AssistantChatResponse


def build_chat_reply(db: Session, site: Site, user_message: str) -> AssistantChatResponse:
    reg = json.loads(site.asset_register_json or "{}")
    meta = reg.get("metadata") or {}
    n_assets = len(reg.get("assets") or [])
    sid = site.id
    n_chains = db.scalar(select(func.count()).select_from(AttackChainRecord).where(AttackChainRecord.site_id == sid)) or 0
    n_alerts = db.scalar(select(func.count()).select_from(AlertRecord).where(AlertRecord.site_id == sid)) or 0
    n_mit = db.scalar(select(func.count()).select_from(MitigationRecord).where(MitigationRecord.site_id == sid)) or 0
    n_mit_applied = (
        db.scalar(
            select(func.count())
            .select_from(MitigationRecord)
            .where(MitigationRecord.site_id == sid, MitigationRecord.applied.is_(True))
        )
        or 0
    )

    context_summary: dict[str, Any] = {
        "site_name": site.site_name,
        "location": site.location,
        "industry_sector": site.industry_sector,
        "register_assets": n_assets,
        "stored_attack_chains": n_chains,
        "stored_alerts": n_alerts,
        "stored_mitigations": n_mit,
        "mitigations_marked_applied": n_mit_applied,
        "ics_architecture": meta.get("ics_architecture") or site.ics_architecture,
        "register_description": meta.get("description") or site.description,
    }

    q = user_message.strip()
    q_short = q[:497] + "…" if len(q) > 500 else q

    reply = (
        f"Site context (from database)\n"
        f"- {context_summary['site_name']} — {n_assets} assets in the register; "
        f"{n_chains} attack chain record(s), {n_alerts} alert(s), {n_mit} mitigation plan(s) "
        f"({n_mit_applied} marked applied).\n"
    )
    arch = meta.get("ics_architecture") or site.ics_architecture
    if arch:
        reply += f"- Architecture: {arch}\n"
    reply += (
        f"\nYour question: {q_short}\n\n"
        "This build answers from structured site data in AegisRec (no external LLM). "
        "Connect an inference API to generate deeper analysis using the same database context."
    )

    return AssistantChatResponse(reply=reply, context_summary=context_summary)
