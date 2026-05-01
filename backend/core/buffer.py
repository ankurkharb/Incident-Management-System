"""
buffer.py
---------
Bounded ring buffer backed by asyncio.Queue.

**Backpressure contract**
The ingestion endpoint calls ``buffer.put_nowait(signal)``.  If the queue is
full (i.e. the persistence / debounce layer is slower than the ingestion rate),
``asyncio.QueueFull`` is raised.  The caller catches this and returns
**HTTP 429 + Retry-After** — the system never crashes; it sheds load at the
edge.  Consumers drain the queue via ``get()`` at their own pace.
"""

from __future__ import annotations

import asyncio
from typing import Any

_DEFAULT_MAX_SIZE = 50_000


class SignalBuffer:
    """Thread-safe, bounded, async ring buffer for incoming signals."""

    def __init__(self, maxsize: int = _DEFAULT_MAX_SIZE) -> None:
        self._queue: asyncio.Queue[Any] = asyncio.Queue(maxsize=maxsize)

    # ── Producer side ───────────────────────────────────────────────────

    def put_nowait(self, signal: Any) -> None:
        """
        Enqueue a signal without blocking.

        Raises
        ------
        asyncio.QueueFull
            When the buffer has reached *maxsize* — the caller should
            respond with HTTP 429 and a ``Retry-After`` header.
        """
        self._queue.put_nowait(signal)

    # ── Consumer side ───────────────────────────────────────────────────

    async def get(self) -> Any:
        """Block until a signal is available, then return it."""
        return await self._queue.get()

    def task_done(self) -> None:
        """Mark the most recently dequeued item as processed."""
        self._queue.task_done()

    # ── Observability ───────────────────────────────────────────────────

    @property
    def qsize(self) -> int:
        """Current number of items in the buffer."""
        return self._queue.qsize()

    @property
    def full(self) -> bool:
        return self._queue.full()

    @property
    def empty(self) -> bool:
        return self._queue.empty()

    @property
    def maxsize(self) -> int:
        return self._queue.maxsize


# Module-level singleton — shared across the entire application.
signal_buffer = SignalBuffer()
