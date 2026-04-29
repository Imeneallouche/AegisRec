from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from aegisrec.models.site import Site
from aegisrec.schemas import MitigationAppliedPatch
from aegisrec.services import site_service
from aegisrec.utils.snapshot import mitigation_to_client


def get_asset_register(site: Site) -> dict[str, Any]:
    return site_service.get_asset_register_dict(site)


def get_persisted_snapshot(db: Session, site: Site) -> dict[str, Any]:
    return site_service.build_persisted_snapshot(db, site.id)


def patch_mitigation(db: Session, site: Site, record_id: int, body: MitigationAppliedPatch) -> dict[str, Any]:
    row = site_service.set_mitigation_applied(db, site.id, record_id, body.applied)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mitigation not found")
    return mitigation_to_client(row)


def ingest_attack_chain(db: Session, site: Site, body: dict[str, Any]) -> dict[str, Any]:
    row = site_service.upsert_attack_chain(db, site.id, body)
    return {"ok": True, "persistedRecordId": row.id}


def ingest_alert(db: Session, site: Site, body: dict[str, Any]) -> dict[str, Any]:
    row = site_service.upsert_alert(db, site.id, body)
    return {"ok": True, "persistedRecordId": row.id}


def ingest_mitigation(db: Session, site: Site, body: dict[str, Any]) -> dict[str, Any]:
    row = site_service.upsert_mitigation(db, site.id, body)
    return {"ok": True, "persistedRecordId": row.id, "applied": row.applied}
