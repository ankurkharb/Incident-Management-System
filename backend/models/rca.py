"""
rca.py
------
Pydantic models for Root Cause Analysis records.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class RCAIn(BaseModel):
    """Body for POST /api/v1/incidents/{id}/rca."""

    root_cause_category: str
    fix_applied: str
    prevention_steps: str
    incident_start: datetime
    incident_end: datetime

    # ── Server-side validation: no empty fields ─────────────────────────
    @field_validator("root_cause_category", "fix_applied", "prevention_steps")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or blank")
        return v.strip()


class RCAOut(BaseModel):
    """Serialised RCA record returned by the API."""

    id: UUID
    work_item_id: UUID
    root_cause_category: str
    fix_applied: str
    prevention_steps: str
    incident_start: datetime
    incident_end: datetime
    submitted_at: datetime | None = None
