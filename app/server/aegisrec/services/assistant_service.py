"""Assistant / context reply generation (template; replace with LLM later)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from aegisrec.models.assistant import AssistantConversation, AssistantMessage
from aegisrec.models.site import AlertRecord, AttackChainRecord, MitigationRecord, Site
from aegisrec.schemas.assistant import (
    AssistantChatResponse,
    AssistantConversationListItem,
    AssistantConversationMessagesResponse,
    ChatMessagePublic,
)

_HISTORY_MAX_MESSAGES = 30


def _conversation_title_from_message(text: str) -> str:
    one = " ".join(text.strip().split())
    if len(one) <= 80:
        return one
    return one[:77] + "…"


def get_conversation(db: Session, site_id: int, conversation_id: int) -> AssistantConversation | None:
    return db.scalars(
        select(AssistantConversation).where(
            AssistantConversation.id == conversation_id,
            AssistantConversation.site_id == site_id,
        )
    ).first()


def list_conversations_with_counts(db: Session, site_id: int) -> list[AssistantConversationListItem]:
    stmt = (
        select(AssistantConversation, func.count(AssistantMessage.id))
        .outerjoin(
            AssistantMessage,
            AssistantMessage.conversation_id == AssistantConversation.id,
        )
        .where(AssistantConversation.site_id == site_id)
        .group_by(AssistantConversation.id)
        .order_by(AssistantConversation.updated_at.desc())
    )
    rows = db.execute(stmt).all()
    out: list[AssistantConversationListItem] = []
    for conv, msg_count in rows:
        out.append(
            AssistantConversationListItem(
                id=conv.id,
                title=conv.title,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                message_count=int(msg_count or 0),
            )
        )
    return out


def get_conversation_messages(
    db: Session, site_id: int, conversation_id: int
) -> AssistantConversationMessagesResponse | None:
    conv = get_conversation(db, site_id, conversation_id)
    if conv is None:
        return None
    msgs = db.scalars(
        select(AssistantMessage)
        .where(AssistantMessage.conversation_id == conversation_id)
        .order_by(AssistantMessage.created_at.asc(), AssistantMessage.id.asc())
    ).all()
    return AssistantConversationMessagesResponse(
        conversation_id=conversation_id,
        messages=[ChatMessagePublic.model_validate(m) for m in msgs],
    )


def delete_conversation(db: Session, site_id: int, conversation_id: int) -> bool:
    conv = get_conversation(db, site_id, conversation_id)
    if conv is None:
        return False
    db.delete(conv)
    db.commit()
    return True


def rename_conversation(
    db: Session, site_id: int, conversation_id: int, title: str
) -> AssistantConversationListItem | None:
    conv = get_conversation(db, site_id, conversation_id)
    if conv is None:
        return None
    conv.title = title
    db.add(conv)
    db.commit()
    db.refresh(conv)
    msg_count = (
        db.scalar(
            select(func.count()).select_from(AssistantMessage).where(
                AssistantMessage.conversation_id == conv.id
            )
        )
        or 0
    )
    return AssistantConversationListItem(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=int(msg_count),
    )


def _site_context_summary(db: Session, site: Site) -> dict[str, Any]:
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
    return {
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


def _format_history_for_prompt(prior: list[AssistantMessage]) -> str:
    if not prior:
        return ""
    tail = prior[-_HISTORY_MAX_MESSAGES:]
    lines: list[str] = []
    for m in tail:
        label = "User" if m.role == "user" else "Assistant"
        snippet = m.content.strip().replace("\r\n", "\n")
        if len(snippet) > 600:
            snippet = snippet[:597] + "…"
        lines.append(f"{label}: {snippet}")
    return "\n".join(lines)


def _build_reply_text(
    *,
    site: Site,
    context_summary: dict[str, Any],
    user_message: str,
    history_block: str,
) -> str:
    n_assets = context_summary["register_assets"]
    n_chains = context_summary["stored_attack_chains"]
    n_alerts = context_summary["stored_alerts"]
    n_mit = context_summary["stored_mitigations"]
    n_mit_applied = context_summary["mitigations_marked_applied"]

    q = user_message.strip()
    q_short = q[:497] + "…" if len(q) > 500 else q

    reply = (
        f"Site context (from database)\n"
        f"- {context_summary['site_name']} — {n_assets} assets in the register; "
        f"{n_chains} attack chain record(s), {n_alerts} alert(s), {n_mit} mitigation plan(s) "
        f"({n_mit_applied} marked applied).\n"
    )
    arch = context_summary.get("ics_architecture")
    if arch:
        reply += f"- Architecture: {arch}\n"
    if history_block:
        reply += f"\nEarlier in this discussion:\n{history_block}\n"
    reply += (
        f"\nYour question: {q_short}\n\n"
        "This build answers from structured site data in AegisRec (no external LLM). "
        "Connect an inference API to generate deeper analysis using the same database context."
    )
    return reply


def process_chat(
    db: Session,
    site: Site,
    user_message: str,
    conversation_id: int | None,
) -> AssistantChatResponse:
    context_summary = _site_context_summary(db, site)

    conv: AssistantConversation | None
    if conversation_id is not None:
        conv = get_conversation(db, site.id, conversation_id)
        if conv is None:
            raise ValueError("conversation_not_found")
    else:
        conv = AssistantConversation(site_id=site.id, title=None)
        db.add(conv)
        db.flush()

    prior = list(
        db.scalars(
            select(AssistantMessage)
            .where(AssistantMessage.conversation_id == conv.id)
            .order_by(AssistantMessage.created_at.asc(), AssistantMessage.id.asc())
        ).all()
    )

    history_block = _format_history_for_prompt(prior)

    user_row = AssistantMessage(conversation_id=conv.id, role="user", content=user_message.strip())
    db.add(user_row)
    db.flush()

    if conv.title is None or conv.title == "":
        conv.title = _conversation_title_from_message(user_message)

    reply_body = _build_reply_text(
        site=site,
        context_summary=context_summary,
        user_message=user_message,
        history_block=history_block,
    )

    asst_row = AssistantMessage(conversation_id=conv.id, role="assistant", content=reply_body)
    db.add(asst_row)
    db.commit()
    db.refresh(user_row)
    db.refresh(asst_row)
    db.refresh(conv)

    return AssistantChatResponse(
        reply=reply_body,
        context_summary=context_summary,
        conversation_id=conv.id,
        user_message=ChatMessagePublic.model_validate(user_row),
        assistant_message=ChatMessagePublic.model_validate(asst_row),
    )
