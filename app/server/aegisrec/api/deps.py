from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from aegisrec.core.database import get_db
from aegisrec.core.security import decode_access_token
from aegisrec.models.site import Site

security = HTTPBearer(auto_error=False)


def get_current_site(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> Site:
    if creds is None or creds.scheme.lower() != "bearer" or not creds.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_access_token(creds.credentials)
        site_id = int(payload["sub"])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc
    site = db.scalars(select(Site).where(Site.id == site_id)).first()
    if site is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Site not found")
    return site
