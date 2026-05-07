from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from aegisrec.config.settings import get_settings
from aegisrec.models.site import Site
from aegisrec.schemas import MitigationAppliedPatch, SyncDetectionIndicesBody
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


def get_elasticsearch_health() -> dict[str, Any]:
    s = get_settings()
    from aegisrec.services.elasticsearch_client import cluster_health

    try:
        return {"ok": True, "cluster": cluster_health(s.elasticsearch_url)}
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


def get_recent_logs(_site: Site, *, minutes: int) -> dict[str, Any]:
    s = get_settings()
    from aegisrec.services.elasticsearch_client import search_recent_logs

    try:
        logs = search_recent_logs(
            s.elasticsearch_url,
            s.elasticsearch_log_index_pattern,
            minutes=minutes,
        )
        return {"logs": logs, "minutes": max(1, min(int(minutes or 5), 1440))}
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


def sync_detection_from_elasticsearch(
    db: Session,
    site: Site,
    body: SyncDetectionIndicesBody,
) -> dict[str, Any]:
    return site_service.sync_detection_indices_from_elasticsearch(
        db,
        site.id,
        alert_minutes=body.alert_minutes,
        chain_minutes=body.chain_minutes,
    )
