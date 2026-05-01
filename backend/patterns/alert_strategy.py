"""
alert_strategy.py
-----------------
Strategy pattern for alerting based on component priority.

The ingestion worker never decides *how* to alert — it calls the factory
``get_alert_strategy(component_type)`` and delegates to the returned strategy.
Adding a new priority level is a one-class change with zero modifications to
the caller.
"""

from __future__ import annotations

import abc
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Forward-reference type alias — avoids a circular import with models.
# Replace with the real import once models/work_item.py is fleshed out.
# ---------------------------------------------------------------------------
WorkItem = Any


# ═══════════════════════════════════════════════════════════════════════════
# Abstract strategy
# ═══════════════════════════════════════════════════════════════════════════

class AlertStrategy(abc.ABC):
    """Base class for all alerting strategies."""

    @abc.abstractmethod
    async def send(self, work_item: WorkItem) -> None:
        """Dispatch an alert for the given work item."""


# ═══════════════════════════════════════════════════════════════════════════
# Concrete strategies
# ═══════════════════════════════════════════════════════════════════════════

class P0Strategy(AlertStrategy):
    """RDBMS failures — critical channel (PagerDuty-style) + CRITICAL log."""

    async def send(self, work_item: WorkItem) -> None:
        logger.critical(
            "[P0] CRITICAL alert — RDBMS failure  |  work_item=%s  component=%s",
            work_item.get("id", "?"),
            work_item.get("component_id", "?"),
        )
        # TODO: integrate with PagerDuty / Opsgenie webhook
        # await pagerduty_client.trigger(work_item)


class P1Strategy(AlertStrategy):
    """API failures — high-priority channel + ERROR log."""

    async def send(self, work_item: WorkItem) -> None:
        logger.error(
            "[P1] HIGH alert — API failure  |  work_item=%s  component=%s",
            work_item.get("id", "?"),
            work_item.get("component_id", "?"),
        )
        # TODO: send to Slack #incidents-high


class P2Strategy(AlertStrategy):
    """Cache failures — WARNING log."""

    async def send(self, work_item: WorkItem) -> None:
        logger.warning(
            "[P2] WARN alert — Cache failure  |  work_item=%s  component=%s",
            work_item.get("id", "?"),
            work_item.get("component_id", "?"),
        )


class P3Strategy(AlertStrategy):
    """Queue / NoSQL failures — INFO log."""

    async def send(self, work_item: WorkItem) -> None:
        logger.info(
            "[P3] INFO alert — Queue/NoSQL issue  |  work_item=%s  component=%s",
            work_item.get("id", "?"),
            work_item.get("component_id", "?"),
        )


# ═══════════════════════════════════════════════════════════════════════════
# Context — holds the active strategy and delegates
# ═══════════════════════════════════════════════════════════════════════════

class AlertContext:
    """Runtime context that delegates alerting to the current strategy."""

    def __init__(self, strategy: AlertStrategy | None = None) -> None:
        self._strategy = strategy

    def set_strategy(self, strategy: AlertStrategy) -> None:
        self._strategy = strategy

    async def execute(self, work_item: WorkItem) -> None:
        if self._strategy is None:
            raise RuntimeError("AlertContext has no strategy set")
        await self._strategy.send(work_item)


# ═══════════════════════════════════════════════════════════════════════════
# Factory — maps component-type strings to the right strategy
# ═══════════════════════════════════════════════════════════════════════════

_STRATEGY_MAP: dict[str, type[AlertStrategy]] = {
    "rdbms":  P0Strategy,
    "api":    P1Strategy,
    "cache":  P2Strategy,
    "queue":  P3Strategy,
    "nosql":  P3Strategy,
}


def get_alert_strategy(component_type: str) -> AlertStrategy:
    """
    Return the correct alerting strategy for a component type.

    Falls back to ``P3Strategy`` for unknown types so the pipeline
    never drops an alert entirely.
    """
    cls = _STRATEGY_MAP.get(component_type.lower(), P3Strategy)
    return cls()
