"""
test_state_machine.py
---------------------
Unit tests for the Work Item FSM (State pattern).
"""

from __future__ import annotations

import pytest
from uuid import uuid4

from backend.patterns.work_item_state import (
    WorkItemContext,
    InvalidTransitionError,
    RCARequiredError,
)


# ── Helper: stub _apply_transition so we never touch PostgreSQL ─────────

@pytest.fixture(autouse=True)
def _patch_apply(monkeypatch):
    """Replace _apply_transition with a pure in-memory state swap."""

    async def _fake_apply(self, target_state):
        from backend.patterns.work_item_state import _state_for
        self._state = _state_for(target_state)

    monkeypatch.setattr(WorkItemContext, "_apply_transition", _fake_apply)


# ═══════════════════════════════════════════════════════════════════════════
# Valid transitions
# ═══════════════════════════════════════════════════════════════════════════

class TestValidTransitions:

    @pytest.mark.asyncio
    async def test_open_to_investigating(self):
        ctx = WorkItemContext(work_item_id=uuid4(), current_state="OPEN")
        await ctx.transition("INVESTIGATING")
        assert ctx.state_name == "INVESTIGATING"

    @pytest.mark.asyncio
    async def test_investigating_to_resolved(self):
        ctx = WorkItemContext(work_item_id=uuid4(), current_state="INVESTIGATING")
        await ctx.transition("RESOLVED")
        assert ctx.state_name == "RESOLVED"

    @pytest.mark.asyncio
    async def test_open_to_resolved(self):
        """Skip INVESTIGATING — valid shortcut."""
        ctx = WorkItemContext(work_item_id=uuid4(), current_state="OPEN")
        await ctx.transition("RESOLVED")
        assert ctx.state_name == "RESOLVED"

    @pytest.mark.asyncio
    async def test_investigating_back_to_open(self):
        ctx = WorkItemContext(work_item_id=uuid4(), current_state="INVESTIGATING")
        await ctx.transition("OPEN")
        assert ctx.state_name == "OPEN"

    @pytest.mark.asyncio
    async def test_resolved_back_to_investigating(self):
        ctx = WorkItemContext(work_item_id=uuid4(), current_state="RESOLVED")
        await ctx.transition("INVESTIGATING")
        assert ctx.state_name == "INVESTIGATING"

    @pytest.mark.asyncio
    async def test_resolved_to_closed_with_rca(self, monkeypatch):
        """RESOLVED → CLOSED must succeed when RCA is complete."""
        from backend.services import incident_service

        async def _rca_ok(_wid):
            return True

        monkeypatch.setattr(incident_service, "rca_is_complete", _rca_ok)

        ctx = WorkItemContext(work_item_id=uuid4(), current_state="RESOLVED")
        await ctx.transition("CLOSED")
        assert ctx.state_name == "CLOSED"


# ═══════════════════════════════════════════════════════════════════════════
# Invalid transitions
# ═══════════════════════════════════════════════════════════════════════════

class TestInvalidTransitions:

    @pytest.mark.asyncio
    async def test_open_to_closed_raises(self):
        """OPEN → CLOSED is not allowed (must go through RESOLVED)."""
        ctx = WorkItemContext(work_item_id=uuid4(), current_state="OPEN")
        with pytest.raises(InvalidTransitionError):
            await ctx.transition("CLOSED")

    @pytest.mark.asyncio
    async def test_closed_to_open_raises(self):
        """CLOSED is terminal — no further transitions."""
        ctx = WorkItemContext(work_item_id=uuid4(), current_state="CLOSED")
        with pytest.raises(InvalidTransitionError):
            await ctx.transition("OPEN")

    @pytest.mark.asyncio
    async def test_closed_to_investigating_raises(self):
        ctx = WorkItemContext(work_item_id=uuid4(), current_state="CLOSED")
        with pytest.raises(InvalidTransitionError):
            await ctx.transition("INVESTIGATING")

    @pytest.mark.asyncio
    async def test_closed_to_resolved_raises(self):
        ctx = WorkItemContext(work_item_id=uuid4(), current_state="CLOSED")
        with pytest.raises(InvalidTransitionError):
            await ctx.transition("RESOLVED")

    @pytest.mark.asyncio
    async def test_closed_to_closed_raises(self):
        ctx = WorkItemContext(work_item_id=uuid4(), current_state="CLOSED")
        with pytest.raises(InvalidTransitionError):
            await ctx.transition("CLOSED")


# ═══════════════════════════════════════════════════════════════════════════
# RCA guard
# ═══════════════════════════════════════════════════════════════════════════

class TestRCAGuard:

    @pytest.mark.asyncio
    async def test_resolved_to_closed_without_rca_raises(self, monkeypatch):
        """RESOLVED → CLOSED without an RCA must raise RCARequiredError."""
        from backend.services import incident_service

        async def _no_rca(_wid):
            return False

        monkeypatch.setattr(incident_service, "rca_is_complete", _no_rca)

        ctx = WorkItemContext(work_item_id=uuid4(), current_state="RESOLVED")
        with pytest.raises(RCARequiredError):
            await ctx.transition("CLOSED")
