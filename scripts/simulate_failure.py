"""
simulate_failure.py
-------------------
Async script that simulates two concurrent infrastructure failures to verify
the debounce engine creates exactly 2 work items from 200 raw signals.

Scenario
--------
1. **RDBMS outage**  — 150 signals for ``RDBMS_PRIMARY_01`` with error code
   ``CONNECTION_REFUSED`` spread over ~8 seconds.
2. **MCP timeout**   — after a 2-second pause, 50 signals for ``MCP_HOST_02``
   with error code ``TIMEOUT`` sent rapidly.

Expected result
~~~~~~~~~~~~~~~
* 2 work items (one per component_id) in PostgreSQL.
* 200 raw signal documents in MongoDB.
* All signals correctly linked via ``signal_work_item_links``.

Usage
-----
    python scripts/simulate_failure.py
"""

from __future__ import annotations

import asyncio
import time

import httpx

API_URL = "http://localhost:8000/api/v1/signals"


async def send_signal(
    client: httpx.AsyncClient,
    component_id: str,
    component_type: str,
    error_code: str,
    message: str,
    severity: str,
    seq: int,
) -> int:
    """Post a single signal and return the HTTP status code."""
    payload = {
        "component_id": component_id,
        "component_type": component_type,
        "error_code": error_code,
        "message": message,
        "severity": severity,
        "metadata": {"seq": seq},
    }
    resp = await client.post(API_URL, json=payload)
    return resp.status_code


async def main() -> None:
    accepted = 0
    rejected = 0
    errors = 0

    async with httpx.AsyncClient(timeout=30) as client:
        # ── Phase 1: RDBMS outage — 150 signals over ~8 s ──────────────
        print("🔴  Simulating RDBMS_PRIMARY_01 outage  (150 signals / 8 s)")
        t0 = time.monotonic()

        tasks = []
        for i in range(150):
            tasks.append(
                send_signal(
                    client,
                    component_id="RDBMS_PRIMARY_01",
                    component_type="rdbms",
                    error_code="CONNECTION_REFUSED",
                    message=f"Connection refused on primary RDBMS node (signal #{i+1})",
                    severity="CRITICAL",
                    seq=i + 1,
                )
            )
            # Spread signals over ~8 seconds (150 signals / 8 s ≈ 18.75/s)
            if (i + 1) % 19 == 0:
                await asyncio.sleep(1.0)

        results = await asyncio.gather(*tasks)
        for code in results:
            if code == 202:
                accepted += 1
            elif code == 429:
                rejected += 1
            else:
                errors += 1

        elapsed_rdbms = time.monotonic() - t0
        print(f"    ✅  Sent 150 signals in {elapsed_rdbms:.1f}s")

        # ── Pause ──────────────────────────────────────────────────────
        print("\n⏳  Waiting 2 s before next failure…\n")
        await asyncio.sleep(2)

        # ── Phase 2: MCP timeout — 50 signals (rapid burst) ───────────
        print("🟠  Simulating MCP_HOST_02 timeout  (50 signals / burst)")
        t1 = time.monotonic()

        tasks = []
        for i in range(50):
            tasks.append(
                send_signal(
                    client,
                    component_id="MCP_HOST_02",
                    component_type="api",
                    error_code="TIMEOUT",
                    message=f"Request timeout on MCP host (signal #{i+1})",
                    severity="HIGH",
                    seq=i + 1,
                )
            )

        results = await asyncio.gather(*tasks)
        for code in results:
            if code == 202:
                accepted += 1
            elif code == 429:
                rejected += 1
            else:
                errors += 1

        elapsed_mcp = time.monotonic() - t1
        print(f"    ✅  Sent 50 signals in {elapsed_mcp:.1f}s")

    # ── Summary ────────────────────────────────────────────────────────
    total_elapsed = time.monotonic() - t0
    print("\n" + "=" * 56)
    print("  Simulation complete")
    print("=" * 56)
    print(f"  Total signals sent :  200")
    print(f"  Accepted (202)     :  {accepted}")
    print(f"  Rate-limited (429) :  {rejected}")
    print(f"  Errors             :  {errors}")
    print(f"  Elapsed            :  {total_elapsed:.1f}s")
    print()
    print("  Expected work items:  2")
    print("    • RDBMS_PRIMARY_01  (P0 / CRITICAL)")
    print("    • MCP_HOST_02       (P1 / HIGH)")
    print("=" * 56)


if __name__ == "__main__":
    asyncio.run(main())
