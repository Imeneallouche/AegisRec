from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from aegisrec.api.deps import get_current_site
from aegisrec.controllers import site_controller
from aegisrec.core.database import get_db
from aegisrec.models.site import Site
from aegisrec.schemas import MitigationAppliedPatch

router = APIRouter(tags=["site"])


@router.get("/site/asset-register")
def get_asset_register(site: Site = Depends(get_current_site)) -> Any:
    return site_controller.get_asset_register(site)


@router.get("/site/persisted-snapshot")
def get_persisted_snapshot(site: Site = Depends(get_current_site), db: Session = Depends(get_db)) -> Any:
    return site_controller.get_persisted_snapshot(db, site)


@router.patch("/site/mitigations/{record_id}", response_model=dict)
def patch_mitigation_applied(
    record_id: int,
    body: MitigationAppliedPatch,
    site: Site = Depends(get_current_site),
    db: Session = Depends(get_db),
) -> Any:
    return site_controller.patch_mitigation(db, site, record_id, body)


@router.post("/site/attack-chains")
def ingest_attack_chain(
    body: dict[str, Any],
    site: Site = Depends(get_current_site),
    db: Session = Depends(get_db),
) -> Any:
    return site_controller.ingest_attack_chain(db, site, body)


@router.post("/site/alerts")
def ingest_alert(
    body: dict[str, Any],
    site: Site = Depends(get_current_site),
    db: Session = Depends(get_db),
) -> Any:
    return site_controller.ingest_alert(db, site, body)


@router.post("/site/mitigations")
def ingest_mitigation(
    body: dict[str, Any],
    site: Site = Depends(get_current_site),
    db: Session = Depends(get_db),
) -> Any:
    return site_controller.ingest_mitigation(db, site, body)
