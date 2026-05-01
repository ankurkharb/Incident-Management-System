"""
postgres.py
-----------
Async PostgreSQL connection pool via asyncpg.
Exposed as a FastAPI dependency through get_pool().

Write helpers are wrapped with ``pg_retry`` so transient connection errors
(pool exhaustion, network blips) are retried with exponential backoff.
Constraint violations and syntax errors are **not** retried.
"""

from __future__ import annotations

from typing import Any

import asyncpg
from asyncpg import Pool, Record

from backend.config import settings
from backend.db.retry import pg_retry

_pool: Pool | None = None


async def connect_postgres() -> Pool:
    """Create the connection pool (called during app startup)."""
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=settings.POSTGRES_DSN,
        min_size=5,
        max_size=20,
    )
    return _pool


async def close_postgres() -> None:
    """Gracefully close the pool (called during app shutdown)."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_pool() -> Pool:
    """FastAPI dependency — returns the live connection pool."""
    assert _pool is not None, "PostgreSQL pool is not initialised"
    return _pool


# ═══════════════════════════════════════════════════════════════════════════
# Retryable write helpers
# ═══════════════════════════════════════════════════════════════════════════

@pg_retry
async def execute(query: str, *args: Any) -> str:
    """Execute a write statement with automatic retry on transient errors."""
    pool = await get_pool()
    return await pool.execute(query, *args)


@pg_retry
async def fetchrow(query: str, *args: Any) -> Record | None:
    """Fetch a single row with automatic retry on transient errors."""
    pool = await get_pool()
    return await pool.fetchrow(query, *args)


@pg_retry
async def fetch(query: str, *args: Any) -> list[Record]:
    """Fetch multiple rows with automatic retry on transient errors."""
    pool = await get_pool()
    return await pool.fetch(query, *args)


@pg_retry
async def fetchval(query: str, *args: Any) -> Any:
    """Fetch a single value with automatic retry on transient errors."""
    pool = await get_pool()
    return await pool.fetchval(query, *args)
