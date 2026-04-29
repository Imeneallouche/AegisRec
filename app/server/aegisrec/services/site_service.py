"""Persistence and site-scoped detection data."""

from __future__ import annotations

import datetime as dt
import json
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from aegisrec.models.site import AlertRecord, AttackChainRecord, MitigationRecord, Site
from aegisrec.utils.snapshot import alert_to_client, chain_to_client, mitigation_to_client


def get_asset_register_dict(site: Site) -> dict[str, Any]:
    try:
        return json.loads(site.asset_register_json or "{}")
    except json.JSONDecodeError:
        return {}


def build_persisted_snapshot(db: Session, site_id: int) -> dict[str, Any]:
    chains = db.scalars(
        select(AttackChainRecord).where(AttackChainRecord.site_id == site_id).order_by(AttackChainRecord.id)
    ).all()
    alerts = db.scalars(
        select(AlertRecord).where(AlertRecord.site_id == site_id).order_by(AlertRecord.id)
    ).all()
    mitigations = db.scalars(
        select(MitigationRecord).where(MitigationRecord.site_id == site_id).order_by(MitigationRecord.id)
    ).all()
    return {
        "chains": [chain_to_client(c) for c in chains],
        "alerts": [alert_to_client(a) for a in alerts],
        "mitigations": [mitigation_to_client(m) for m in mitigations],
        "logs": [],
        "stats": None,
        "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def set_mitigation_applied(db: Session, site_id: int, record_id: int, applied: bool) -> MitigationRecord | None:
    row = db.scalars(
        select(MitigationRecord).where(
            MitigationRecord.id == record_id,
            MitigationRecord.site_id == site_id,
        )
    ).first()
    if row is None:
        return None
    row.applied = applied
    row.applied_at = dt.datetime.now(dt.timezone.utc) if applied else None
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def upsert_attack_chain(db: Session, site_id: int, body: dict[str, Any]) -> AttackChainRecord:
    eid: Optional[str] = body.get("id")
    if eid:
        existing = db.scalars(
            select(AttackChainRecord).where(
                AttackChainRecord.site_id == site_id,
                AttackChainRecord.external_id == eid,
            )
        ).first()
        if existing:
            existing.payload = body
            existing.status_tag = body.get("status")
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing
    row = AttackChainRecord(
        site_id=site_id,
        external_id=eid,
        status_tag=body.get("status"),
        payload=body,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def upsert_alert(db: Session, site_id: int, body: dict[str, Any]) -> AlertRecord:
    eid: Optional[str] = body.get("id")
    if eid:
        existing = db.scalars(
            select(AlertRecord).where(
                AlertRecord.site_id == site_id,
                AlertRecord.external_id == eid,
            )
        ).first()
        if existing:
            existing.payload = body
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing
    row = AlertRecord(site_id=site_id, external_id=eid, payload=body)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def upsert_mitigation(db: Session, site_id: int, body: dict[str, Any]) -> MitigationRecord:
    eid: Optional[str] = body.get("id")
    if eid:
        existing = db.scalars(
            select(MitigationRecord).where(
                MitigationRecord.site_id == site_id,
                MitigationRecord.external_id == eid,
            )
        ).first()
        if existing:
            existing.payload = body
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing
    row = MitigationRecord(site_id=site_id, external_id=eid, payload=body, applied=False)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
