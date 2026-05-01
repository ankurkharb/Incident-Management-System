"""
signal.py
---------
Pydantic models for incoming signal payloads.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class SignalIn(BaseModel):
    """JSON body for POST /api/v1/signals."""

    component_id: str = Field(..., min_length=1, description="ID of the affected component")
    component_type: str = Field(..., min_length=1, description="e.g. rdbms, api, cache, queue, nosql")
    error_code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    severity: str = Field(..., description="e.g. CRITICAL, HIGH, MEDIUM, LOW")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Arbitrary extra data")
