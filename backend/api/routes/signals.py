"""
signals.py
----------
POST /api/v1/signals — high-throughput signal ingestion endpoint.

Validates the payload, applies rate limiting, pushes onto the in-memory
buffer and returns HTTP 202 immediately.  Persistence happens asynchronously
via the debounce workers.
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from backend.models.signal import SignalIn
from backend.core.buffer import signal_buffer
from backend.core.rate_limiter import RateLimitDep

router = APIRouter()


@router.post(
    "",
    status_code=202,
    summary="Ingest a raw signal",
    dependencies=[Depends(RateLimitDep)],
)
async def ingest_signal(signal: SignalIn):
    """
    Accept a signal and enqueue it for async processing.

    * **Rate limiter** — token-bucket; returns 429 if exhausted.
    * **Backpressure** — bounded buffer; returns 429 + Retry-After if full.
    * **Never blocks** on database writes — returns 202 immediately.
    """
    try:
        signal_buffer.put_nowait(signal.model_dump())
    except asyncio.QueueFull:
        return JSONResponse(
            status_code=429,
            content={"detail": "Signal buffer is full. Retry later."},
            headers={"Retry-After": "5"},
        )

    return {"accepted": True, "buffer_size": signal_buffer.qsize}
