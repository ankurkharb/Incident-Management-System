"""
main.py
-------
FastAPI application factory.
Wires database connection pools via the lifespan context manager
and registers all API routers.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.db.postgres import connect_postgres, close_postgres
from backend.db.mongo import connect_mongo, close_mongo
from backend.db.redis_client import connect_redis, close_redis
from backend.db.mongo_setup import init_mongo
from backend.api.routes import health, incidents, signals


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create connection pools. Shutdown: close them."""
    # ── Startup ─────────────────────────────────────────────────────────
    await connect_postgres()
    await connect_mongo()
    await connect_redis()

    # Ensure MongoDB indexes exist
    await init_mongo()

    yield

    # ── Shutdown ────────────────────────────────────────────────────────
    await close_postgres()
    await close_mongo()
    await close_redis()


app = FastAPI(
    title="Incident Management System",
    version="0.1.0",
    lifespan=lifespan,
)

# ── Register routers ───────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(incidents.router, prefix="/api/incidents", tags=["incidents"])
app.include_router(signals.router, prefix="/api/signals", tags=["signals"])
