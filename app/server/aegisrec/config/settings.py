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
        # Elasticsearch (same host as MITRE docker-compose: port 9200). Logs, alert/correlation sync.
        self.elasticsearch_url: str = os.environ.get(
            "AEGISREC_ELASTICSEARCH_URL",
            "http://127.0.0.1:9200",
        )
        self.elasticsearch_log_index_pattern: str = os.environ.get(
            "AEGISREC_ES_LOG_INDEX_PATTERN",
            "ics-*,linux-*,syslog-*,auditd-*,plc-*,hmi-*,scada-*",
        )
        # MITRE engine writes detection alerts / correlation summaries to these patterns by default.
        self.elasticsearch_alert_index_pattern: str = os.environ.get(
            "AEGISREC_ES_ALERT_INDEX_PATTERN",
            "ics-alerts-*",
        )
        self.elasticsearch_correlation_index_pattern: str = os.environ.get(
            "AEGISREC_ES_CORRELATION_INDEX_PATTERN",
            "ics-correlations-*",
        )
        # Shared secret so the MITRE detection engine (or other automation) can POST ingest without a JWT.
        # Accept AEGISREC_INGEST_SECRET as alias (engine forwarder default) so operators only set one name.
        self.engine_ingest_secret: str | None = (
            os.environ.get("AEGISREC_ENGINE_INGEST_SECRET")
            or os.environ.get("AEGISREC_INGEST_SECRET")
            or None
        )
