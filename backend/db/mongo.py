"""
mongo.py
--------
Async MongoDB client via motor.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from backend.config import settings

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
