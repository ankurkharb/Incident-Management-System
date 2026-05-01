"""
incident_service.py
-------------------
Business logic for incident / work-item management.
"""

from __future__ import annotations

from uuid import UUID

from backend.db.postgres import get_pool


async def rca_is_complete(work_item_id: UUID) -> bool:
    """
    Check whether a complete RCA record exists for the given work item.

    A record is considered *complete* when every required text field is
    non-empty (root_cause_category, fix_applied, prevention_steps).
    """
    pool = await get_pool()

    row = await pool.fetchrow(
        """
        SELECT root_cause_category,
               fix_applied,
               prevention_steps
          FROM rca_records
         WHERE work_item_id = $1
        """,
        work_item_id,
    )

    if row is None:
        return False

    # All three narrative fields must be non-empty
    return all(
        bool(row[col].strip())
        for col in ("root_cause_category", "fix_applied", "prevention_steps")
    )
