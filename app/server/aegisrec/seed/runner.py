import json

from sqlalchemy import select

from aegisrec.config.settings import get_server_root
from aegisrec.core.database import SessionLocal
from aegisrec.core.security import hash_password
from aegisrec.models import Site


def run_seed() -> None:
    db = SessionLocal()
    try:
        exists = db.scalars(select(Site).where(Site.username == "grficsadmin")).first()
        if exists is not None:
            return
        seed_path = get_server_root() / "seed" / "grfics_asset_register.json"
        reg = json.loads(seed_path.read_text(encoding="utf-8"))
        meta = reg.get("metadata") or {}
        site = Site(
            username="grficsadmin",
            password_hash=hash_password("admin"),
            site_name=str(meta.get("site_name") or "GRFICS"),
            location=meta.get("location"),
            industry_sector=meta.get("industry_sector"),
            description=meta.get("description"),
            ics_architecture=meta.get("ics_architecture"),
            normalization_date=meta.get("normalization_date"),
            standard_version=meta.get("standard_version"),
            asset_register_json=json.dumps(reg),
            extra_metadata={"seed_source": "grfics_asset_register.json"},
        )
        db.add(site)
        db.commit()
    finally:
        db.close()
