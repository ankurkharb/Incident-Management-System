"""
main.py
-------
FastAPI application factory.
Wires database connection pools, debounce workers, and throughput metrics
via the lifespan context manager.  Registers all API routers.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.db.postgres import connect_postgres, close_postgres
from backend.db.mongo import connect_mongo, close_mongo
from backend.db.redis_client import connect_redis, close_redis
from backend.db.mongo_setup import init_mongo
from backend.core.debounce import start_debounce_workers, stop_debounce_workers
from backend.api.routes import health, incidents, signals

logger = logging.getLogger(__name__)

METRICS_KEY = "metrics:signals_ingested"
METRICS_INTERVAL = 5  # seconds

_metrics_task: asyncio.Task | None = None


# ═══════════════════════════════════════════════════════════════════════════
# Throughput metrics background task
# ═══════════════════════════════════════════════════════════════════════════

async def _throughput_reporter() -> None:
    """
    Every 5 s, read and reset the Redis counter ``metrics:signals_ingested``,
    compute signals/sec, and log it.
    """
    from backend.db.redis_client import get_redis

    while True:
        await asyncio.sleep(METRICS_INTERVAL)
        try:
            redis = await get_redis()
            # GETSET is atomic: returns old value and sets to 0
            raw = await redis.getset(METRICS_KEY, 0)
            count = int(raw) if raw else 0
            rate = count / METRICS_INTERVAL
            logger.info(
                "Throughput: %d signals in %ds (%.1f signals/sec)",
                count,
                METRICS_INTERVAL,
                rate,
            )
        except Exception:
            logger.exception("Throughput reporter error")


# ═══════════════════════════════════════════════════════════════════════════
# Lifespan
# ═══════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create connection pools. Shutdown: close them."""
    global _metrics_task

    # ── Startup ─────────────────────────────────────────────────────────
    await connect_postgres()
    await connect_mongo()
    await connect_redis()

    # Ensure MongoDB indexes exist
    await init_mongo()

    # Start debounce worker pool (N async tasks draining the signal buffer)
    await start_debounce_workers()

    # Start throughput metrics reporter
    _metrics_task = asyncio.create_task(
        _throughput_reporter(), name="throughput-reporter"
    )

    yield

    # ── Shutdown ────────────────────────────────────────────────────────
    if _metrics_task is not None:
        _metrics_task.cancel()
        await asyncio.gather(_metrics_task, return_exceptions=True)

    await stop_debounce_workers()
    await close_postgres()
    await close_mongo()
    await close_redis()


app = FastAPI(
    title="Incident Management System",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS — required for Render deployment (separate domains) ──────────
from fastapi.middleware.cors import CORSMiddleware
import os

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ───────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["incidents"])
app.include_router(signals.router, prefix="/api/v1/signals", tags=["signals"])
