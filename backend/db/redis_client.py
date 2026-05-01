"""
redis_client.py
---------------
Async Redis client via redis.asyncio.
"""

import redis.asyncio as aioredis

from backend.config import settings

_redis: aioredis.Redis | None = None


async def connect_redis() -> aioredis.Redis:
    """Create the Redis connection (called during app startup)."""
    global _redis
    _redis = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )
    return _redis


async def close_redis() -> None:
    """Close the Redis connection (called during app shutdown)."""
    global _redis
    if _redis is not None:
        await _redis.close()
        _redis = None


async def get_redis() -> aioredis.Redis:
    """FastAPI dependency — returns the live Redis connection."""
    assert _redis is not None, "Redis client is not initialised"
    return _redis
