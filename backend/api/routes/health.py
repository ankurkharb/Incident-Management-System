"""
health.py
---------
GET /health — parallel liveness check against all three external dependencies.

Docker Compose healthcheck calls this endpoint.  Returns 200 if all services
are reachable, or 503 (degraded) if any check fails.
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.db.postgres import get_pool
from backend.db.redis_client import get_redis
from backend.db.mongo import get_mongo_db

router = APIRouter()


async def _check_postgres() -> bool:
    try:
        pool = await get_pool()
        await pool.fetchval("SELECT 1")
        return True
    except Exception:
        return False


async def _check_redis() -> bool:
    try:
        redis = await get_redis()
        return await redis.ping()
    except Exception:
        return False


async def _check_mongo() -> bool:
    try:
        db = await get_mongo_db()
        await db.command("ping")
        return True
    except Exception:
        return False


@router.get("/health", tags=["health"], summary="Liveness / readiness probe")
async def health_check():
    """
    Check PostgreSQL, Redis, and MongoDB in parallel.

    Returns HTTP 200 + ``{"status": "healthy", ...}`` when all pass,
    or HTTP 503 + ``{"status": "degraded", ...}`` if any fail.
    """
    pg_ok, redis_ok, mongo_ok = await asyncio.gather(
        _check_postgres(),
        _check_redis(),
        _check_mongo(),
    )

    body = {
        "status": "healthy" if all([pg_ok, redis_ok, mongo_ok]) else "degraded",
        "postgres": pg_ok,
        "redis": redis_ok,
        "mongo": mongo_ok,
    }

    status_code = 200 if body["status"] == "healthy" else 503
    return JSONResponse(content=body, status_code=status_code)
