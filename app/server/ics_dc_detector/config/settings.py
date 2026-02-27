"""
config/settings.py
──────────────────
Centralised, validated configuration loaded from environment variables /
.env files.  Import `settings` wherever you need config values.

All values can be overridden at runtime via env vars (12-factor style).
"""
from __future__ import annotations

from pathlib import Path
from typing import List, Literal, Optional

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Elasticsearch ──────────────────────────────────────────────────────────
    es_host: str = "https://localhost:9200"
    es_user: str = "elastic"
    es_pass: str = "changeme"
    es_ssl: bool = True
    es_ssl_verify: bool = True
    es_ca_certs: Optional[str] = None
    es_index_pattern: str = "logs-*,winlogbeat-*,ics-*,scada-*"

    @property
    def es_index_list(self) -> List[str]:
        """Split comma-separated index patterns into a list."""
        return [p.strip() for p in self.es_index_pattern.split(",") if p.strip()]

    # ── Detection engine ───────────────────────────────────────────────────────
    dc_dir: Path = Path("./datacomponents")
    similarity_threshold: float = Field(default=0.65, ge=0.0, le=1.0)
    embedding_model: str = "all-MiniLM-L6-v2"
    temporal_window_seconds: int = 60
    correlation_boost: float = Field(default=0.15, ge=0.0, le=1.0)

    # ── Runtime ────────────────────────────────────────────────────────────────
    mode: Literal["polling", "batch", "streaming"] = "polling"
    poll_interval_seconds: int = 15
    lookback_window_minutes: int = 5
    batch_start: Optional[str] = None   # ISO-8601
    batch_end: Optional[str] = None     # ISO-8601
    batch_page_size: int = 500

    # ── State ──────────────────────────────────────────────────────────────────
    state_backend: Literal["file", "redis"] = "file"
    state_file_path: Path = Path("./state/cursor.json")
    redis_url: str = "redis://localhost:6379/0"
    state_key_prefix: str = "ics_dc_detector"

    # ── Sinks ──────────────────────────────────────────────────────────────────
    sinks: str = "stdout,file"

    @property
    def sink_list(self) -> List[str]:
        return [s.strip() for s in self.sinks.split(",") if s.strip()]

    alert_file_path: Path = Path("./output/alerts.ndjson")

    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_topic: str = "ics-dc-alerts"
    kafka_security_protocol: str = "PLAINTEXT"
    kafka_sasl_mechanism: Optional[str] = None
    kafka_sasl_username: Optional[str] = None
    kafka_sasl_password: Optional[str] = None

    # Webhook
    webhook_url: Optional[str] = None
    webhook_auth_header: Optional[str] = None
    webhook_timeout_seconds: int = 5

    # ── Observability ──────────────────────────────────────────────────────────
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    prometheus_port: int = 8000
    healthcheck_port: int = 8001
    service_name: str = "ics-dc-detector"

    # ── Validators ─────────────────────────────────────────────────────────────
    @field_validator("dc_dir", mode="before")
    @classmethod
    def _expand_dc_dir(cls, v: str) -> Path:
        return Path(v).expanduser().resolve()

    @model_validator(mode="after")
    def _check_batch_dates(self) -> "Settings":
        if self.mode == "batch":
            if not self.batch_start or not self.batch_end:
                raise ValueError(
                    "batch mode requires BATCH_START and BATCH_END to be set"
                )
        return self


# Singleton – import this in every module
settings = Settings()
