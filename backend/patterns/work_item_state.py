"""
work_item_state.py
------------------
State pattern / finite-state-machine for Work Item lifecycle.

Valid transitions::

    OPEN ──► INVESTIGATING ──► RESOLVED ──► CLOSED
      │            │                ▲
      └────────────┘                │
           (skip)          requires RCA ✓

``ClosedState`` is terminal — any transition raises ``InvalidTransitionError``.
``ResolvedState → CLOSED`` is guarded: the RCA must be present and complete
before the transition is allowed (raises ``RCARequiredError`` otherwise).

Every successful transition is persisted in a PostgreSQL transaction
immediately.
"""

from __future__ import annotations

import abc
import logging
from uuid import UUID

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# Exceptions
# ═══════════════════════════════════════════════════════════════════════════

class InvalidTransitionError(Exception):
    """Raised when a state transition is not allowed."""


class RCARequiredError(Exception):
    """Raised when trying to close an incident that has no complete RCA."""


# ═══════════════════════════════════════════════════════════════════════════
# Abstract state
# ═══════════════════════════════════════════════════════════════════════════

class WorkItemState(abc.ABC):
    """Base class for every FSM state."""

    name: str  # e.g. "OPEN", "INVESTIGATING", …

    @abc.abstractmethod
    async def transition(
        self,
        context: WorkItemContext,
        target_state: str,
    ) -> None:
        """
        Validate and execute a transition to *target_state*.

        Raises ``InvalidTransitionError`` if the move is illegal.
        """


# ═══════════════════════════════════════════════════════════════════════════
# Concrete states
# ═══════════════════════════════════════════════════════════════════════════

class OpenState(WorkItemState):
    name = "OPEN"

    _valid_targets = {"INVESTIGATING", "RESOLVED"}

    async def transition(self, context: WorkItemContext, target_state: str) -> None:
        if target_state not in self._valid_targets:
            raise InvalidTransitionError(
                f"Cannot transition from OPEN to {target_state}. "
                f"Valid targets: {self._valid_targets}"
            )
        await context._apply_transition(target_state)


class InvestigatingState(WorkItemState):
    name = "INVESTIGATING"

    _valid_targets = {"RESOLVED", "OPEN"}

    async def transition(self, context: WorkItemContext, target_state: str) -> None:
        if target_state not in self._valid_targets:
            raise InvalidTransitionError(
                f"Cannot transition from INVESTIGATING to {target_state}. "
                f"Valid targets: {self._valid_targets}"
            )
        await context._apply_transition(target_state)


class ResolvedState(WorkItemState):
    name = "RESOLVED"

    _valid_targets = {"CLOSED", "INVESTIGATING"}

    async def transition(self, context: WorkItemContext, target_state: str) -> None:
        if target_state not in self._valid_targets:
            raise InvalidTransitionError(
                f"Cannot transition from RESOLVED to {target_state}. "
                f"Valid targets: {self._valid_targets}"
            )

        # ── Guard: RESOLVED → CLOSED requires a complete RCA ───────────
        if target_state == "CLOSED":
            from backend.services.incident_service import rca_is_complete

            complete = await rca_is_complete(context.work_item_id)
            if not complete:
                raise RCARequiredError(
                    f"Cannot close work item {context.work_item_id}: "
                    "RCA is missing or has empty fields."
                )

        await context._apply_transition(target_state)


class ClosedState(WorkItemState):
    """Terminal state — no further transitions allowed."""

    name = "CLOSED"

    async def transition(self, context: WorkItemContext, target_state: str) -> None:
        raise InvalidTransitionError(
            "CLOSED is a terminal state. No further transitions are allowed."
        )


# ═══════════════════════════════════════════════════════════════════════════
# State lookup
# ═══════════════════════════════════════════════════════════════════════════

_STATE_MAP: dict[str, type[WorkItemState]] = {
    "OPEN": OpenState,
    "INVESTIGATING": InvestigatingState,
    "RESOLVED": ResolvedState,
    "CLOSED": ClosedState,
}


def _state_for(name: str) -> WorkItemState:
    cls = _STATE_MAP.get(name)
    if cls is None:
        raise ValueError(f"Unknown state: {name}")
    return cls()


# ═══════════════════════════════════════════════════════════════════════════
# Context — holds the current state and persists transitions
# ═══════════════════════════════════════════════════════════════════════════

class WorkItemContext:
    """
    Owns the current ``WorkItemState`` and delegates ``transition()`` to it.

    After every valid transition the new status is persisted in PostgreSQL
    inside a transaction.
    """

    def __init__(self, work_item_id: UUID, current_state: str) -> None:
        self.work_item_id = work_item_id
        self._state: WorkItemState = _state_for(current_state)

    @property
    def state_name(self) -> str:
        return self._state.name

    async def transition(self, target_state: str) -> None:
        """
        Request a transition to *target_state*.

        The active state object validates the move, applies any guards
        (e.g. RCA check), and — on success — calls ``_apply_transition``
        which persists the change.
        """
        await self._state.transition(self, target_state)

    # ── Internal — called by state objects after validation ─────────────

    async def _apply_transition(self, target_state: str) -> None:
        """Persist the state change and swap the internal state object."""
        from backend.db.postgres import get_pool

        pool = await get_pool()

        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    UPDATE work_items
                       SET status     = $1,
                           updated_at = now()
                     WHERE id = $2
                    """,
                    target_state,
                    self.work_item_id,
                )

        old = self._state.name
        self._state = _state_for(target_state)

        logger.info(
            "Work item %s transitioned: %s → %s",
            self.work_item_id,
            old,
            target_state,
        )
