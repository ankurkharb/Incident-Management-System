"""
test_rca_validation.py
----------------------
Unit tests for RCA model validation, the RCA-required guard on work-item
closure, and MTTR calculation.
"""

from __future__ import annotations

import pytest
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from pydantic import ValidationError

from backend.models.rca import RCAIn


# ═══════════════════════════════════════════════════════════════════════════
# RCA Pydantic model validation
# ═══════════════════════════════════════════════════════════════════════════

class TestRCAValidation:
    """Validate the Pydantic model used for POST /api/v1/incidents/{id}/rca."""

    def _valid_payload(self, **overrides) -> dict:
        base = {
            "root_cause_category": "Infrastructure",
            "fix_applied": "Replaced the failing load balancer node with a healthy standby.",
            "prevention_steps": "Added automated health checks that trigger failover within 30 seconds.",
            "incident_start": datetime(2025, 6, 1, 10, 0, 0, tzinfo=timezone.utc).isoformat(),
            "incident_end": datetime(2025, 6, 1, 10, 45, 0, tzinfo=timezone.utc).isoformat(),
        }
        base.update(overrides)
        return base

    def test_all_fields_populated_succeeds(self):
        """A fully-populated payload must pass validation."""
        rca = RCAIn(**self._valid_payload())
        assert rca.root_cause_category == "Infrastructure"
        assert len(rca.fix_applied) > 0
        assert len(rca.prevention_steps) > 0

    def test_empty_fix_applied_raises(self):
        """An empty fix_applied must be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            RCAIn(**self._valid_payload(fix_applied=""))
        assert "fix_applied" in str(exc_info.value)

    def test_blank_fix_applied_raises(self):
        """A whitespace-only fix_applied must be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            RCAIn(**self._valid_payload(fix_applied="   "))
        assert "fix_applied" in str(exc_info.value)

    def test_empty_prevention_steps_raises(self):
        """An empty prevention_steps must be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            RCAIn(**self._valid_payload(prevention_steps=""))
        assert "prevention_steps" in str(exc_info.value)

    def test_blank_prevention_steps_raises(self):
        """A whitespace-only prevention_steps must be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            RCAIn(**self._valid_payload(prevention_steps="    "))
        assert "prevention_steps" in str(exc_info.value)

    def test_empty_root_cause_category_raises(self):
        """An empty root_cause_category must be rejected."""
        with pytest.raises(ValidationError) as exc_info:
            RCAIn(**self._valid_payload(root_cause_category=""))
        assert "root_cause_category" in str(exc_info.value)


# ═══════════════════════════════════════════════════════════════════════════
# RCA-required guard (via state machine)
# ═══════════════════════════════════════════════════════════════════════════

class TestRCARequiredGuard:
    """Closing an incident without a complete RCA must be blocked."""

    @pytest.mark.asyncio
    async def test_close_without_rca_raises(self, monkeypatch):
        """RESOLVED → CLOSED without an RCA must raise RCARequiredError."""
        from backend.patterns.work_item_state import (
            WorkItemContext,
            RCARequiredError,
        )
        from backend.services import incident_service

        # Stub rca_is_complete to return False (no RCA)
        async def _fake_rca_incomplete(_wid):
            return False

        monkeypatch.setattr(incident_service, "rca_is_complete", _fake_rca_incomplete)

        ctx = WorkItemContext(work_item_id=uuid4(), current_state="RESOLVED")

        with pytest.raises(RCARequiredError):
            await ctx.transition("CLOSED")

    @pytest.mark.asyncio
    async def test_close_with_rca_succeeds(self, monkeypatch):
        """RESOLVED → CLOSED with a complete RCA must succeed."""
        from backend.patterns.work_item_state import WorkItemContext
        from backend.services import incident_service
        from backend.db import postgres as pg_mod

        # Stub rca_is_complete to return True
        async def _fake_rca_complete(_wid):
            return True

        monkeypatch.setattr(incident_service, "rca_is_complete", _fake_rca_complete)

        # Stub _apply_transition to avoid hitting real PostgreSQL
        async def _fake_apply(self, target_state):
            from backend.patterns.work_item_state import _state_for
            self._state = _state_for(target_state)

        monkeypatch.setattr(WorkItemContext, "_apply_transition", _fake_apply)

        ctx = WorkItemContext(work_item_id=uuid4(), current_state="RESOLVED")
        await ctx.transition("CLOSED")
        assert ctx.state_name == "CLOSED"


# ═══════════════════════════════════════════════════════════════════════════
# MTTR calculation
# ═══════════════════════════════════════════════════════════════════════════

class TestMTTRCalculation:
    """Verify MTTR = (incident_end - start_time) in seconds."""

    @pytest.mark.asyncio
    async def test_mttr_correct(self, monkeypatch):
        """Given known timestamps, mttr_seconds should be exact."""
        from backend.services import mttr_service
        from backend.db import postgres as pg_mod
        import asyncpg

        start = datetime(2025, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
        end = datetime(2025, 6, 1, 10, 45, 0, tzinfo=timezone.utc)
        expected_mttr = int((end - start).total_seconds())  # 2700

        work_item_id = uuid4()
        _stored_mttr = {}

        # ── Mock pool ───────────────────────────────────────────────
        class FakeConn:
            async def fetchrow(self, query, *args):
                return {"start_time": start}

            async def execute(self, query, *args):
                _stored_mttr["value"] = args[0]  # first arg = mttr_seconds

        class FakePool:
            class _AcquireCtx:
                def __init__(self):
                    self.conn = FakeConn()

                async def __aenter__(self):
                    return self.conn

                async def __aexit__(self, *a):
                    pass

            def acquire(self):
                return self._AcquireCtx()

            async def fetchrow(self, query, *args):
                return {"start_time": start}

            async def execute(self, query, *args):
                _stored_mttr["value"] = args[0]

        async def _fake_get_pool():
            return FakePool()

        monkeypatch.setattr(mttr_service, "get_pool", _fake_get_pool)

        result = await mttr_service.compute_and_store_mttr(work_item_id, end)
        assert result == expected_mttr
        assert result == 2700
