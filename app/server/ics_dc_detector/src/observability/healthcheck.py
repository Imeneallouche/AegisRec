"""
src/observability/healthcheck.py
──────────────────────────────────
Lightweight aiohttp HTTP server exposing:

    GET /health   → {"status": "ok"|"degraded", ...}
    GET /ready    → 200 if ready, 503 if not
    GET /status   → extended status JSON

Start with:
    await start_healthcheck_server(es_client, port=8001)
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional

import aiohttp
from aiohttp import web

import structlog

log = structlog.get_logger(__name__)

_state: Dict[str, Any] = {
    "start_time": datetime.now(timezone.utc).isoformat(),
    "last_processed_ts": None,
    "docs_processed": 0,
    "alerts_emitted": 0,
    "ready": False,
    "es_healthy": False,
}


def update_state(**kwargs: Any) -> None:
    """Thread-safe state update from other modules."""
    _state.update(kwargs)


# ─── Route handlers ───────────────────────────────────────────────────────────

async def _health(request: web.Request) -> web.Response:
    status = "ok" if _state.get("es_healthy") else "degraded"
    return web.json_response(
        {
            "status": status,
            "service": request.app["service_name"],
            "uptime_since": _state["start_time"],
            "last_processed": _state.get("last_processed_ts"),
        },
        status=200 if status == "ok" else 503,
    )


async def _ready(request: web.Request) -> web.Response:
    if _state.get("ready"):
        return web.json_response({"ready": True})
    return web.json_response({"ready": False}, status=503)


async def _status(request: web.Request) -> web.Response:
    return web.json_response(dict(_state))


# ─── Server factory ───────────────────────────────────────────────────────────

async def start_healthcheck_server(
    service_name: str,
    port: int,
    es_ping_fn: Optional[Callable] = None,
) -> web.AppRunner:
    app = web.Application()
    app["service_name"] = service_name
    app["es_ping_fn"] = es_ping_fn

    app.router.add_get("/health", _health)
    app.router.add_get("/ready", _ready)
    app.router.add_get("/status", _status)

    # Background ES ping task
    if es_ping_fn:
        async def _ping_loop(_app: web.Application) -> None:
            while True:
                try:
                    ok = await es_ping_fn()
                    _state["es_healthy"] = bool(ok)
                except Exception:
                    _state["es_healthy"] = False
                await asyncio.sleep(30)

        app.on_startup.append(lambda a: asyncio.ensure_future(_ping_loop(a)))

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    log.info("healthcheck.server_started", port=port)
    _state["ready"] = True
    return runner
