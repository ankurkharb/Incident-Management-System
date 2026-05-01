"""
mttr_service.py
---------------
Mean-Time-To-Resolve calculation.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from backend.db.postgres import get_pool


async def compute_and_store_mttr(
    work_item_id: UUID,
    incident_end: datetime,
) -> int:
    """
    Calculate MTTR as ``(incident_end - work_item.start_time)`` in seconds,
    then persist it back onto the work item row.

    Returns the computed mttr_seconds.
    """
    pool = await get_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT start_time FROM work_items WHERE id = $1",
            work_item_id,
        )
        if row is None:
            raise ValueError(f"Work item {work_item_id} not found")

        start_time: datetime = row["start_time"]
        mttr_seconds = int((incident_end - start_time).total_seconds())

        await conn.execute(
            """
            UPDATE work_items
               SET mttr_seconds = $1,
                   end_time     = $2,
                   updated_at   = now()
             WHERE id = $3
            """,
            mttr_seconds,
            incident_end,
            work_item_id,
        )

    return mttr_seconds
