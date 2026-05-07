"""Ingest endpoints for the MITRE detection engine (Bearer-free; shared secret)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from aegisrec.config.settings import get_settings
from aegisrec.controllers import site_controller
from aegisrec.core.database import get_db
from aegisrec.models.site import Site

router = APIRouter(tags=["engine-ingest"])


def _verify_ingest_secret(x_aegisrec_engine_ingest: str | None) -> None:
    settings = get_settings()
    expected = settings.engine_ingest_secret
    if not expected or x_aegisrec_engine_ingest != expected:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid ingest credentials")


def _get_site(db: Session, site_id: int) -> Site:
    site = db.scalars(select(Site).where(Site.id == site_id)).first()
    if site is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="site_id not found")
    return site


@router.post("/engine/ingest/alerts")
def engine_ingest_alert(
    body: dict[str, Any],
    db: Session = Depends(get_db),
    x_aegisrec_engine_ingest: str | None = Header(default=None, alias="X-AegisRec-Engine-Ingest"),
) -> Any:
    _verify_ingest_secret(x_aegisrec_engine_ingest)
    payload = dict(body)
    site_id = int(payload.pop("site_id", 0) or 0)
    if not site_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="site_id is required")
    site = _get_site(db, site_id)
    return site_controller.ingest_alert(db, site, payload)


@router.post("/engine/ingest/attack-chains")
def engine_ingest_chain(
    body: dict[str, Any],
    db: Session = Depends(get_db),
    x_aegisrec_engine_ingest: str | None = Header(default=None, alias="X-AegisRec-Engine-Ingest"),
) -> Any:
    _verify_ingest_secret(x_aegisrec_engine_ingest)
    payload = dict(body)
    site_id = int(payload.pop("site_id", 0) or 0)
    if not site_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="site_id is required")
    site = _get_site(db, site_id)
    return site_controller.ingest_attack_chain(db, site, payload)


@router.post("/engine/ingest/mitigations")
def engine_ingest_mitigation(
    body: dict[str, Any],
    db: Session = Depends(get_db),
    x_aegisrec_engine_ingest: str | None = Header(default=None, alias="X-AegisRec-Engine-Ingest"),
) -> Any:
    _verify_ingest_secret(x_aegisrec_engine_ingest)
    payload = dict(body)
    site_id = int(payload.pop("site_id", 0) or 0)
    if not site_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="site_id is required")
    site = _get_site(db, site_id)
    return site_controller.ingest_mitigation(db, site, payload)
