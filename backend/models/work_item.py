"""
work_item.py
------------
Pydantic models for work item API responses.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import Any

from pydantic import BaseModel, Field


class WorkItemOut(BaseModel):
    """Serialised work item returned by the API."""

    id: UUID
    component_id: str
    status: str
    priority: str
    start_time: datetime
    end_time: datetime | None = None
    mttr_seconds: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class WorkItemDetail(BaseModel):
    """Work item together with its linked raw signals."""

    work_item: WorkItemOut
    signals: list[dict[str, Any]] = Field(default_factory=list)


class StatusPatch(BaseModel):
    """Body for PATCH /api/v1/incidents/{id}/status."""

    target_status: str
