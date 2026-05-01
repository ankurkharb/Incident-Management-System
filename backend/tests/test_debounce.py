"""
test_debounce.py
----------------
Unit tests for the debounce engine.

Redis and PostgreSQL are fully mocked via ``unittest.mock.AsyncMock`` so the
tests run without any infrastructure.
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
from uuid import uuid4, UUID


# ── Helpers ─────────────────────────────────────────────────────────────

def _make_signal(**overrides) -> dict:
    base = {
        "component_id": "payment-service",
        "component_type": "api",
        "error_code": "CONN_TIMEOUT",
        "message": "Connection timed out",
        "severity": "HIGH",
        "metadata": {},
    }
    base.update(overrides)
    return base


# ═══════════════════════════════════════════════════════════════════════════
# Debounce logic
# ═══════════════════════════════════════════════════════════════════════════

class TestDebounceWorker:
    """Test _process_signal with mocked Redis, PG, and MongoDB."""

    @pytest.fixture(autouse=True)
    def _setup_mocks(self, monkeypatch):
        """Patch all external dependencies before each test."""
        self.work_item_id = uuid4()

        # ── Mock Redis ──────────────────────────────────────────────
        self.mock_redis = AsyncMock()
        self.mock_redis.incr = AsyncMock()

        async def _get_redis():
            return self.mock_redis

        # ── Mock PostgreSQL pool ────────────────────────────────────
        self.mock_conn = AsyncMock()
        self.mock_conn.fetchrow = AsyncMock(return_value={"id": self.work_item_id})
        self.mock_conn.execute = AsyncMock()

        self.mock_pool = AsyncMock()

        # Make pool.acquire() work as an async context manager
        acq_ctx = AsyncMock()
        acq_ctx.__aenter__ = AsyncMock(return_value=self.mock_conn)
        acq_ctx.__aexit__ = AsyncMock(return_value=False)
        self.mock_pool.acquire = MagicMock(return_value=acq_ctx)

        # Transaction context manager on the connection
        tx_ctx = AsyncMock()
        tx_ctx.__aenter__ = AsyncMock(return_value=None)
        tx_ctx.__aexit__ = AsyncMock(return_value=False)
        self.mock_conn.transaction = MagicMock(return_value=tx_ctx)

        async def _get_pool():
            return self.mock_pool

        # ── Mock MongoDB ────────────────────────────────────────────
        self.mock_mongo_collection = AsyncMock()
        self.mock_mongo_collection.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id="64abc123def4567890abcdef")
        )

        self.mock_mongo_db = MagicMock()
        self.mock_mongo_db.__getitem__ = MagicMock(return_value=self.mock_mongo_collection)

        async def _get_mongo_db():
            return self.mock_mongo_db

        # ── Apply patches ───────────────────────────────────────────
        monkeypatch.setattr("backend.core.debounce.get_redis", _get_redis)
        monkeypatch.setattr("backend.core.debounce.get_pool", _get_pool)
        monkeypatch.setattr("backend.core.debounce.get_mongo_db", _get_mongo_db)

        # Stub alert strategy so it doesn't log
        monkeypatch.setattr(
            "backend.core.debounce.get_alert_strategy",
            lambda _: MagicMock(send=AsyncMock()),
        )
        monkeypatch.setattr(
            "backend.core.debounce.AlertContext",
            lambda s: MagicMock(execute=AsyncMock()),
        )

    @pytest.mark.asyncio
    async def test_first_signal_creates_work_item(self):
        """When the debounce key does NOT exist, a new work item is created."""
        from backend.core.debounce import _process_signal

        # SET NX returns True → we are the "winner"
        self.mock_redis.set = AsyncMock(return_value=True)

        signal = _make_signal()
        await _process_signal(signal)

        # PostgreSQL INSERT should have been called (via conn.fetchrow inside transaction)
        self.mock_conn.fetchrow.assert_called_once()
        call_sql = self.mock_conn.fetchrow.call_args[0][0]
        assert "INSERT INTO work_items" in call_sql

        # MongoDB insert_one should have been called
        self.mock_mongo_collection.insert_one.assert_called_once()

        # Redis key should be overwritten with the work item ID
        assert self.mock_redis.set.call_count == 2  # initial NX + ID write

        # Metrics counter incremented
        self.mock_redis.incr.assert_called_once()

    @pytest.mark.asyncio
    async def test_second_signal_within_window_appends(self):
        """When the debounce key EXISTS, no new work item is created — signal is appended."""
        from backend.core.debounce import _process_signal

        # SET NX returns False → key already exists
        self.mock_redis.set = AsyncMock(return_value=False)
        # GET returns the existing work item ID
        self.mock_redis.get = AsyncMock(return_value=str(self.work_item_id))

        signal = _make_signal()
        await _process_signal(signal)

        # PostgreSQL INSERT INTO work_items should NOT have been called
        self.mock_conn.fetchrow.assert_not_called()

        # But signal_work_item_links INSERT should have been called
        self.mock_conn.execute.assert_called()
        link_calls = [
            c for c in self.mock_conn.execute.call_args_list
            if "signal_work_item_links" in str(c)
        ]
        assert len(link_calls) >= 1

        # MongoDB insert_one should still have been called (raw signal stored)
        self.mock_mongo_collection.insert_one.assert_called_once()

        # Metrics counter incremented
        self.mock_redis.incr.assert_called_once()

    @pytest.mark.asyncio
    async def test_signal_after_ttl_expiry_creates_new_work_item(self):
        """After the 10 s TTL expires, the next signal creates a fresh work item."""
        from backend.core.debounce import _process_signal

        # Simulate TTL expiry: SET NX returns True again
        self.mock_redis.set = AsyncMock(return_value=True)

        signal = _make_signal()
        await _process_signal(signal)

        # A new INSERT INTO work_items should have happened
        self.mock_conn.fetchrow.assert_called_once()
        call_sql = self.mock_conn.fetchrow.call_args[0][0]
        assert "INSERT INTO work_items" in call_sql

        # New work item ID written back to Redis
        assert self.mock_redis.set.call_count == 2
