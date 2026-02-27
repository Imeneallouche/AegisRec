"""
src/observability/logging_setup.py
────────────────────────────────────
Configures structlog for structured JSON output.

All log records include:
    timestamp  – ISO-8601
    level      – INFO / DEBUG / …
    logger     – module name
    event      – the message string
    …          – any extra key=value pairs passed at call site
"""
from __future__ import annotations

import logging
import sys

import structlog


def configure_logging(level: str = "INFO", service_name: str = "ics-dc-detector") -> None:
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level.upper(), logging.INFO),
    )

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    structlog.configure(
        processors=shared_processors
        + [structlog.processors.JSONRenderer()],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    # Silence noisy third-party loggers
    for noisy in ("elasticsearch", "elastic_transport", "urllib3", "aiokafka"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
