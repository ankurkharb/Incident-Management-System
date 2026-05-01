"""
retry.py
--------
Generic async retry decorators with exponential backoff.

Two ready-made decorators are provided:

* ``pg_retry``    — retries on transient asyncpg connection errors only.
* ``mongo_retry`` — retries on transient pymongo network errors only.

Constraint violations, auth failures, and other non-transient errors are
**never** retried — those are programmer errors, not infrastructure blips.
"""

from __future__ import annotations

import asyncio
import functools
import logging
from typing import Any, Callable, Coroutine, Sequence

logger = logging.getLogger(__name__)


def async_retry(
    retryable_exceptions: Sequence[type[Exception]],
    max_attempts: int = 3,
    backoff_base: float = 0.5,
) -> Callable:
    """
    Decorator factory for async functions.

    Parameters
    ----------
    retryable_exceptions
        Only these exception types trigger a retry.
    max_attempts
        Total number of tries (1 = no retries).
    backoff_base
        Base delay in seconds.  Actual delay is
        ``backoff_base * 2 ** attempt`` (exponential).
    """

    def decorator(fn: Callable[..., Coroutine]) -> Callable[..., Coroutine]:
        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exc: Exception | None = None
            for attempt in range(max_attempts):
                try:
                    return await fn(*args, **kwargs)
                except tuple(retryable_exceptions) as exc:
                    last_exc = exc
                    if attempt < max_attempts - 1:
                        delay = backoff_base * (2 ** attempt)
                        logger.warning(
                            "%s attempt %d/%d failed (%s) — retrying in %.2fs",
                            fn.__qualname__,
                            attempt + 1,
                            max_attempts,
                            exc,
                            delay,
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            "%s failed after %d attempts: %s",
                            fn.__qualname__,
                            max_attempts,
                            exc,
                        )
            raise last_exc  # type: ignore[misc]

        return wrapper

    return decorator


# ═══════════════════════════════════════════════════════════════════════════
# Pre-built decorators
# ═══════════════════════════════════════════════════════════════════════════

def pg_retry(fn: Callable[..., Coroutine] | None = None, *, max_attempts: int = 3, backoff_base: float = 0.5):
    """
    Retry on transient asyncpg connection errors.

    Retried exceptions:
    - ``asyncpg.TooManyConnectionsError``
    - ``asyncpg.PostgresConnectionError``

    NOT retried: constraint violations, syntax errors, etc.
    """
    import asyncpg

    _retry = async_retry(
        retryable_exceptions=[
            asyncpg.TooManyConnectionsError,
            asyncpg.PostgresConnectionError,
        ],
        max_attempts=max_attempts,
        backoff_base=backoff_base,
    )
    if fn is not None:
        return _retry(fn)
    return _retry


def mongo_retry(fn: Callable[..., Coroutine] | None = None, *, max_attempts: int = 3, backoff_base: float = 0.5):
    """
    Retry on transient pymongo network errors.

    Retried exceptions:
    - ``pymongo.errors.NetworkTimeout``
    - ``pymongo.errors.AutoReconnect``

    NOT retried: write-concern errors, duplicate-key errors, etc.
    """
    from pymongo.errors import NetworkTimeout, AutoReconnect

    _retry = async_retry(
        retryable_exceptions=[
            NetworkTimeout,
            AutoReconnect,
        ],
        max_attempts=max_attempts,
        backoff_base=backoff_base,
    )
    if fn is not None:
        return _retry(fn)
    return _retry
