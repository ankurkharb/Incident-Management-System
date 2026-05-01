"""
incidents.py
------------
Incident / work-item CRUD endpoints.

GET   /                 — list active incidents (Redis-cached)
GET   /{id}             — detail view with linked raw signals
PATCH /{id}/status      — FSM state transition
POST  /{id}/rca         — submit RCA + compute MTTR
"""

from __future__ import annotations

import json
import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException

from backend.db.postgres import get_pool
from backend.db.mongo import get_mongo_db
from backend.db.redis_client import get_redis
from backend.models.work_item import WorkItemOut, WorkItemDetail, StatusPatch
from backend.models.rca import RCAIn, RCAOut
from backend.patterns.work_item_state import (
    WorkItemContext,
    InvalidTransitionError,
    RCARequiredError,
)
from backend.services.mttr_service import compute_and_store_mttr

logger = logging.getLogger(__name__)
router = APIRouter()

DASHBOARD_CACHE_KEY = "dashboard:active_incidents"
DASHBOARD_CACHE_TTL = 30  # seconds


# ═══════════════════════════════════════════════════════════════════════════
# GET / — list active incidents
# ═══════════════════════════════════════════════════════════════════════════

@router.get("", response_model=list[WorkItemOut], summary="List active incidents")
async def list_incidents():
    """
    Return all non-CLOSED work items, ordered by priority then start_time.

    Results are cached in Redis for 30 s to keep the dashboard snappy.
    """
    redis = await get_redis()

    # ── Cache hit? ──────────────────────────────────────────────────────
    cached = await redis.get(DASHBOARD_CACHE_KEY)
    if cached:
        return json.loads(cached)

    # ── Cache miss — query PostgreSQL ───────────────────────────────────
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT id, component_id, status, priority,
               start_time, end_time, mttr_seconds,
               created_at, updated_at
          FROM work_items
         WHERE status != 'CLOSED'
         ORDER BY priority, start_time
        """
    )

    items = [
        WorkItemOut(
            id=r["id"],
            component_id=r["component_id"],
            status=r["status"],
            priority=r["priority"],
            start_time=r["start_time"],
            end_time=r["end_time"],
            mttr_seconds=r["mttr_seconds"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        ).model_dump(mode="json")
        for r in rows
    ]

    await redis.set(DASHBOARD_CACHE_KEY, json.dumps(items), ex=DASHBOARD_CACHE_TTL)
    return items


# ═══════════════════════════════════════════════════════════════════════════
# GET /{id} — incident detail with linked raw signals
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/{incident_id}", response_model=WorkItemDetail, summary="Get incident detail")
async def get_incident(incident_id: UUID):
    pool = await get_pool()

    row = await pool.fetchrow(
        """
        SELECT id, component_id, status, priority,
               start_time, end_time, mttr_seconds,
               created_at, updated_at
          FROM work_items
         WHERE id = $1
        """,
        incident_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    work_item = WorkItemOut(
        id=row["id"],
        component_id=row["component_id"],
        status=row["status"],
        priority=row["priority"],
        start_time=row["start_time"],
        end_time=row["end_time"],
        mttr_seconds=row["mttr_seconds"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )

    # Fetch linked signal IDs from PostgreSQL
    link_rows = await pool.fetch(
        "SELECT signal_id FROM signal_work_item_links WHERE work_item_id = $1",
        incident_id,
    )
    signal_ids = [r["signal_id"] for r in link_rows]

    # Fetch raw signals from MongoDB
    signals: list[dict] = []
    if signal_ids:
        from bson import ObjectId

        mongo_db = await get_mongo_db()
        cursor = mongo_db["signals"].find(
            {"_id": {"$in": [ObjectId(sid) for sid in signal_ids]}}
        )
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            signals.append(doc)

    return WorkItemDetail(work_item=work_item, signals=signals)


# ═══════════════════════════════════════════════════════════════════════════
# PATCH /{id}/status — FSM state transition
# ═══════════════════════════════════════════════════════════════════════════

@router.patch("/{incident_id}/status", response_model=WorkItemOut, summary="Transition incident status")
async def patch_status(incident_id: UUID, body: StatusPatch):
    pool = await get_pool()

    row = await pool.fetchrow(
        "SELECT status FROM work_items WHERE id = $1",
        incident_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    ctx = WorkItemContext(work_item_id=incident_id, current_state=row["status"])

    try:
        await ctx.transition(body.target_status)
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except RCARequiredError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Invalidate dashboard cache so the next list call reflects the change.
    redis = await get_redis()
    await redis.delete(DASHBOARD_CACHE_KEY)

    # Return the updated work item
    updated = await pool.fetchrow(
        """
        SELECT id, component_id, status, priority,
               start_time, end_time, mttr_seconds,
               created_at, updated_at
          FROM work_items
         WHERE id = $1
        """,
        incident_id,
    )

    return WorkItemOut(
        id=updated["id"],
        component_id=updated["component_id"],
        status=updated["status"],
        priority=updated["priority"],
        start_time=updated["start_time"],
        end_time=updated["end_time"],
        mttr_seconds=updated["mttr_seconds"],
        created_at=updated["created_at"],
        updated_at=updated["updated_at"],
    )


# ═══════════════════════════════════════════════════════════════════════════
# POST /{id}/rca — submit RCA + compute MTTR
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{incident_id}/rca", response_model=RCAOut, status_code=201, summary="Submit RCA")
async def submit_rca(incident_id: UUID, body: RCAIn):
    pool = await get_pool()

    # Verify work item exists
    wi_row = await pool.fetchrow(
        "SELECT id, start_time FROM work_items WHERE id = $1",
        incident_id,
    )
    if wi_row is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Persist RCA
    import uuid

    rca_id = uuid.uuid4()

    try:
        await pool.execute(
            """
            INSERT INTO rca_records
                (id, work_item_id, root_cause_category, fix_applied,
                 prevention_steps, incident_start, incident_end)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            rca_id,
            incident_id,
            body.root_cause_category,
            body.fix_applied,
            body.prevention_steps,
            body.incident_start,
            body.incident_end,
        )
    except Exception as exc:
        # UNIQUE constraint on work_item_id
        if "uq_rca_work_item" in str(exc):
            raise HTTPException(
                status_code=409,
                detail="An RCA already exists for this incident",
            )
        raise

    # Calculate and persist MTTR
    mttr = await compute_and_store_mttr(incident_id, body.incident_end)

    # Return saved RCA
    rca_row = await pool.fetchrow(
        """
        SELECT id, work_item_id, root_cause_category, fix_applied,
               prevention_steps, incident_start, incident_end, submitted_at
          FROM rca_records
         WHERE id = $1
        """,
        rca_id,
    )

    return RCAOut(
        id=rca_row["id"],
        work_item_id=rca_row["work_item_id"],
        root_cause_category=rca_row["root_cause_category"],
        fix_applied=rca_row["fix_applied"],
        prevention_steps=rca_row["prevention_steps"],
        incident_start=rca_row["incident_start"],
        incident_end=rca_row["incident_end"],
        submitted_at=rca_row["submitted_at"],
    )
