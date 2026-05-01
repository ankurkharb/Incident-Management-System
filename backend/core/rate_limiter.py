"""
rate_limiter.py
---------------
Token-bucket rate limiter for FastAPI.

The bucket refills at *rate* tokens per second up to a maximum of *capacity*
(burst size).  Each ``acquire()`` call consumes one token; if no tokens remain
the call returns ``False`` and the FastAPI dependency responds with HTTP 429.
"""

from __future__ import annotations

import time
import asyncio

from fastapi import HTTPException, Request


class TokenBucketRateLimiter:
    """Async-safe token-bucket rate limiter."""

    def __init__(self, rate: float, capacity: int) -> None:
        """
        Parameters
        ----------
        rate : float
            Tokens added per second (sustained throughput).
        capacity : int
            Maximum tokens the bucket can hold (burst size).
        """
        self._rate = rate
        self._capacity = capacity
        self._tokens = float(capacity)       # start full
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> bool:
        """
        Try to consume one token.

        Returns ``True`` if a token was available, ``False`` otherwise.
        """
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_refill
            self._last_refill = now

            # Refill tokens accumulated since the last call, capped at capacity
            self._tokens = min(
                self._capacity,
                self._tokens + elapsed * self._rate,
            )

            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return True
            return False

    # ── Observability ───────────────────────────────────────────────────

    @property
    def tokens(self) -> float:
        """Current (approximate) token count — not locked, for metrics only."""
        return self._tokens


# ── Module-level default instance ───────────────────────────────────────
# 1 000 req/s sustained, burst of 2 000.  Tune via env vars later if needed.
default_rate_limiter = TokenBucketRateLimiter(rate=1000, capacity=2000)


# ── FastAPI dependency ──────────────────────────────────────────────────

async def RateLimitDep(request: Request) -> None:  # noqa: N802 — uppercase for Depends()
    """
    Inject via ``Depends(RateLimitDep)``.

    Raises HTTP 429 with a ``Retry-After`` header when the bucket is empty.
    """
    allowed = await default_rate_limiter.acquire()
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please retry later.",
            headers={"Retry-After": "1"},
        )
