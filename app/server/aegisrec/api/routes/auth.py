from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from aegisrec.api.deps import get_current_site
from aegisrec.controllers import auth_controller
from aegisrec.core.database import get_db
from aegisrec.models.site import Site
from aegisrec.schemas import LoginRequest, LoginResponse, SitePublic

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> Any:
    return auth_controller.login(db, body)


@router.get("/auth/me", response_model=SitePublic)
def me(site: Site = Depends(get_current_site)) -> Any:
    return auth_controller.me(site)
