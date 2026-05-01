"""
debounce.py
-----------
Debounce engine worker — drains the ``SignalBuffer`` and either creates a new
work item or appends to an existing one, using Redis ``SET … NX EX 10`` as the
atomic gate to prevent duplicates.

**Concurrency model**
A pool of ``N`` (default 20) async workers drain the shared buffer in parallel,
throttled by an ``asyncio.Semaphore``.  The Redis ``SET NX`` call is the single
point of serialisation per ``component_id`` — no two coroutines can both create
a work item for the same component within the debounce window.

Start the worker pool via ``start_debounce_workers()`` inside the FastAPI
lifespan startup handler.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from backend.core.buffer import signal_buffer
from backend.db.postgres import get_pool
from backend.db.mongo import get_mongo_db
from backend.db.redis_client import get_redis
from backend.patterns.alert_strategy import get_alert_strategy, AlertContext

logger = logging.getLogger(__name__)

DEBOUNCE_TTL_SECONDS = 10
MAX_CONCURRENT_WORKERS = 20
METRICS_KEY = "metrics:signals_ingested"

# Handles managed by the lifespan so we can cancel on shutdown.
_worker_tasks: list[asyncio.Task] = []


# ═══════════════════════════════════════════════════════════════════════════
# Core debounce logic
# ═══════════════════════════════════════════════════════════════════════════

async def _process_signal(signal: dict[str, Any]) -> None:
    """
    Process a single signal pulled from the buffer.

    1. Try ``SET debounce:{component_id} … NX EX 10`` in Redis.
    2. If the key was **set** (first signal in the window):
       - Create a new work item in PostgreSQL.
       - Store the Redis value as the new work item ID.
       - Persist the raw signal in MongoDB.
       - Link signal ↔ work item.
       - Fire the alert strategy.
    3. If the key **already existed** (duplicate within window):
       - Fetch the existing work item ID from Redis.
       - Persist the raw signal in MongoDB.
       - Insert a link row.
       - Increment the TimescaleDB signal counter.
    """
    component_id: str = signal["component_id"]
    redis_key = f"debounce:{component_id}"

    redis = await get_redis()
    pool = await get_pool()
    mongo_db = await get_mongo_db()
    signals_col = mongo_db["signals"]

    now = datetime.now(timezone.utc)

    # ── Atomic gate — SET NX EX ─────────────────────────────────────────
    # Returns True if the key was set (we are the "winner").
    was_set = await redis.set(
        redis_key,
        "",           # placeholder — overwritten below once we have the ID
        ex=DEBOUNCE_TTL_SECONDS,
        nx=True,
    )

    if was_set:
        # ── First signal in this debounce window ────────────────────────
        async with pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    INSERT INTO work_items (component_id, status, priority, start_time)
                    VALUES ($1, 'OPEN', $2, $3)
                    RETURNING id
                    """,
                    component_id,
                    signal.get("priority", "P3"),
                    now,
                )
                work_item_id: UUID = row["id"]

        # Store the work item ID in Redis so later signals can find it.
        await redis.set(redis_key, str(work_item_id), ex=DEBOUNCE_TTL_SECONDS)

        # Persist raw signal in MongoDB
        signal_doc = {**signal, "work_item_id": str(work_item_id), "received_at": now}
        result = await signals_col.insert_one(signal_doc)
        signal_mongo_id = str(result.inserted_id)

        # Link signal ↔ work item in PostgreSQL
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO signal_work_item_links (signal_id, work_item_id)
                VALUES ($1, $2)
                """,
                signal_mongo_id,
                work_item_id,
            )

        # Increment TimescaleDB signal counter
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO signal_counts (time, component_id, count)
                VALUES ($1, $2, 1)
                """,
                now,
                component_id,
            )

        # Fire alerting strategy
        component_type = signal.get("component_type", "unknown")
        strategy = get_alert_strategy(component_type)
        ctx = AlertContext(strategy)
        await ctx.execute({"id": str(work_item_id), "component_id": component_id})

        logger.info(
            "New work item %s created for component %s",
            work_item_id,
            component_id,
        )

    else:
        # ── Duplicate within the debounce window ────────────────────────
        existing_id_str = await redis.get(redis_key)

        # Tiny race: the winner may not have written the ID yet — retry briefly.
        for _ in range(5):
            if existing_id_str:
                break
            await asyncio.sleep(0.05)
            existing_id_str = await redis.get(redis_key)

        if not existing_id_str:
            logger.warning(
                "Debounce key exists but work item ID not found for %s — dropping signal",
                component_id,
            )
            return

        work_item_id = UUID(existing_id_str)

        # Persist raw signal in MongoDB
        signal_doc = {**signal, "work_item_id": str(work_item_id), "received_at": now}
        result = await signals_col.insert_one(signal_doc)
        signal_mongo_id = str(result.inserted_id)

        # Link signal ↔ work item
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO signal_work_item_links (signal_id, work_item_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
                """,
                signal_mongo_id,
                work_item_id,
            )

        # Increment TimescaleDB signal counter
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO signal_counts (time, component_id, count)
                VALUES ($1, $2, 1)
                """,
                now,
                component_id,
            )

        logger.debug(
            "Signal appended to existing work item %s (component %s)",
            work_item_id,
            component_id,
        )

    # ── Metrics: track total signals ingested ───────────────────────────
    await redis.incr(METRICS_KEY)


# ═══════════════════════════════════════════════════════════════════════════
# Worker loop — one per concurrent slot
# ═══════════════════════════════════════════════════════════════════════════

async def _worker(semaphore: asyncio.Semaphore, worker_id: int) -> None:
    """Single async worker: waits on the buffer, processes under semaphore."""
    while True:
        signal = await signal_buffer.get()
        async with semaphore:
            try:
                await _process_signal(signal)
            except Exception:
                logger.exception(
                    "Worker-%d failed to process signal: %s", worker_id, signal
                )
            finally:
                signal_buffer.task_done()


# ═══════════════════════════════════════════════════════════════════════════
# Lifecycle helpers — called from FastAPI lifespan
# ═══════════════════════════════════════════════════════════════════════════

async def start_debounce_workers(
    num_workers: int = MAX_CONCURRENT_WORKERS,
) -> None:
    """Spawn *num_workers* consumer tasks that drain the SignalBuffer."""
    semaphore = asyncio.Semaphore(num_workers)
    for i in range(num_workers):
        task = asyncio.create_task(_worker(semaphore, i), name=f"debounce-worker-{i}")
        _worker_tasks.append(task)
    logger.info("Started %d debounce workers", num_workers)


async def stop_debounce_workers() -> None:
    """Cancel all running worker tasks (called on shutdown)."""
    for task in _worker_tasks:
        task.cancel()
    await asyncio.gather(*_worker_tasks, return_exceptions=True)
    _worker_tasks.clear()
    logger.info("All debounce workers stopped")
