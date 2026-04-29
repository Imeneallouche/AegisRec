"""Environment-backed configuration (no flat magic strings across the codebase)."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path


@lru_cache
def get_server_root() -> Path:
    """app/server — contains aegisrec.db and seed/ JSON."""
    return Path(__file__).resolve().parents[2]


@lru_cache
def get_settings() -> "Settings":
    return Settings()


class Settings:
    """Application settings loaded once per process."""

    def __init__(self) -> None:
        root = get_server_root()
        default_sqlite = f"sqlite:///{root / 'aegisrec.db'}"
        self.database_url: str = os.environ.get("AEGISREC_DATABASE_URL", default_sqlite)
        self.jwt_secret_key: str = os.environ.get("AEGISREC_JWT_SECRET", "dev-insecure-change-me")
        self.jwt_algorithm: str = "HS256"
        self.jwt_expire_minutes: int = int(os.environ.get("AEGISREC_JWT_EXPIRE_MINUTES", "10080"))
        self.cors_allow_origin_regex: str = (
            r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$"
        )
