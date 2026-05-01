"""
mongo_setup.py
--------------
Connect to MongoDB and ensure the `signals` collection has the
required indexes for debounce queries, incident lookups, and
automatic 30-day TTL expiry.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING

MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
MONGO_DB = os.getenv("MONGO_DB", "ims")


async def init_mongo() -> AsyncIOMotorClient:
    """Initialise the MongoDB client and create collection indexes."""

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[MONGO_DB]
    signals = db["signals"]

    # Compound index: component + newest-first received_at (debounce window queries)
    await signals.create_index(
        [("component_id", ASCENDING), ("received_at", DESCENDING)],
        name="idx_component_received",
    )

    # Single-field index: fetch all signals linked to an incident
    await signals.create_index(
        [("work_item_id", ASCENDING)],
        name="idx_work_item",
    )

    # TTL index: auto-delete documents 30 days after received_at
    await signals.create_index(
        [("received_at", ASCENDING)],
        name="idx_ttl_received",
        expireAfterSeconds=2592000,  # 30 days
    )

    return client
