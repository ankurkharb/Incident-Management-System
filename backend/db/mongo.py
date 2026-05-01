"""
mongo.py
--------
Async MongoDB client via motor.

Write helpers are wrapped with ``mongo_retry`` so transient network errors
(timeouts, auto-reconnect) are retried with exponential backoff.
Duplicate-key and write-concern errors are **not** retried.
"""

from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.results import InsertOneResult

from backend.config import settings
from backend.db.retry import mongo_retry

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_mongo() -> AsyncIOMotorClient:
    """Create the motor client and select the database (called during app startup)."""
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    _db = _client[settings.MONGO_DB_NAME]
    return _client


async def close_mongo() -> None:
    """Close the motor client (called during app shutdown)."""
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None


async def get_mongo_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency — returns the active database handle."""
    assert _db is not None, "MongoDB client is not initialised"
    return _db


# ═══════════════════════════════════════════════════════════════════════════
# Retryable write helpers
# ═══════════════════════════════════════════════════════════════════════════

@mongo_retry
async def insert_signal(document: dict[str, Any]) -> InsertOneResult:
    """Insert a single signal document with automatic retry on transient errors."""
    db = await get_mongo_db()
    return await db["signals"].insert_one(document)


@mongo_retry
async def find_signals_by_ids(object_ids: list) -> list[dict[str, Any]]:
    """Fetch signals by a list of ObjectIds with automatic retry."""
    db = await get_mongo_db()
    cursor = db["signals"].find({"_id": {"$in": object_ids}})
    return await cursor.to_list(length=None)
