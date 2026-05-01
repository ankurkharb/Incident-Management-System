"""
postgres.py
-----------
Async PostgreSQL connection pool via asyncpg.
Exposed as a FastAPI dependency through get_pool().
"""

import asyncpg
from asyncpg import Pool

from backend.config import settings

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
