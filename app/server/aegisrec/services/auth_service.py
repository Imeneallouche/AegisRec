from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from aegisrec.core import security
from aegisrec.models.site import Site


def get_site_by_username(db: Session, username: str) -> Site | None:
    return db.scalars(select(Site).where(Site.username == username.strip())).first()


def verify_credentials(site: Site | None, password: str) -> bool:
    if site is None:
        return False
    return security.verify_password(password, site.password_hash)


def create_token_for_site(site: Site) -> str:
    return security.create_access_token(site_id=site.id)
