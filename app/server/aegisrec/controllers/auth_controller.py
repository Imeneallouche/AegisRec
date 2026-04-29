from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from aegisrec.schemas import LoginRequest, LoginResponse, SitePublic
from aegisrec.services import auth_service


def login(db: Session, body: LoginRequest) -> LoginResponse:
    site = auth_service.get_site_by_username(db, body.username)
    if not auth_service.verify_credentials(site, body.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    assert site is not None
    token = auth_service.create_token_for_site(site)
    return LoginResponse(access_token=token, site=SitePublic.model_validate(site))


def me(site) -> SitePublic:
    return SitePublic.model_validate(site)
