"""
integration_checklist.py
------------------------
Automated integration test that verifies every requirement against the live
system running on localhost.

Prerequisites:
    docker compose up --build   (all services healthy)

Usage:
    pip install httpx
    python scripts/integration_checklist.py
"""

from __future__ import annotations

import asyncio
import json
import sys
import time

import httpx

BASE = "http://localhost:8000"
API = f"{BASE}/api/v1"

PASS = "✅"
FAIL = "❌"
SKIP = "⏭️ "

results: list[tuple[str, str, str]] = []  # (name, status, detail)


def record(name: str, passed: bool, detail: str = ""):
    status = PASS if passed else FAIL
    results.append((name, status, detail))
    print(f"  {status}  {name}" + (f"  — {detail}" if detail else ""))


# ═══════════════════════════════════════════════════════════════════════════
# 1. Health endpoint
# ═══════════════════════════════════════════════════════════════════════════

async def check_health(client: httpx.AsyncClient):
    print("\n── 1. Health endpoint ────────────────────────────────────────")
    r = await client.get(f"{BASE}/health")
    body = r.json()
    record(
        "GET /health returns 200 + healthy",
        r.status_code == 200 and body.get("status") == "healthy",
        f"status={r.status_code} body={body}",
    )
    record("Postgres healthy", body.get("postgres") is True)
    record("Redis healthy", body.get("redis") is True)
    record("Mongo healthy", body.get("mongo") is True)


# ═══════════════════════════════════════════════════════════════════════════
# 2. Signal ingestion + backpressure
# ═══════════════════════════════════════════════════════════════════════════

async def check_signal_ingestion(client: httpx.AsyncClient):
    print("\n── 2. Signal ingestion + backpressure ────────────────────────")

    payload = {
        "component_id": "TEST_COMPONENT_01",
        "component_type": "api",
        "error_code": "INTEGRATION_TEST",
        "message": "Integration test signal",
        "severity": "LOW",
        "metadata": {"test": True},
    }

    r = await client.post(f"{API}/signals", json=payload)
    record(
        "POST /api/v1/signals returns 202",
        r.status_code == 202,
        f"status={r.status_code}",
    )
    record(
        "Response contains buffer_size",
        "buffer_size" in r.json(),
        f"body={r.json()}",
    )


# ═══════════════════════════════════════════════════════════════════════════
# 3. Debounce: exactly 1 work item per component per window
# ═══════════════════════════════════════════════════════════════════════════

async def check_debounce(client: httpx.AsyncClient):
    print("\n── 3. Debounce deduplication ──────────────────────────────────")

    component = f"DEBOUNCE_TEST_{int(time.time())}"

    # Send 20 signals for the same component rapidly
    tasks = []
    for i in range(20):
        tasks.append(client.post(f"{API}/signals", json={
            "component_id": component,
            "component_type": "cache",
            "error_code": "DEBOUNCE_CHECK",
            "message": f"Debounce test signal #{i+1}",
            "severity": "MEDIUM",
            "metadata": {},
        }))
    await asyncio.gather(*tasks)

    # Wait for debounce workers to process
    await asyncio.sleep(3)

    # Fetch incidents and count how many have this component_id
    r = await client.get(f"{API}/incidents")
    incidents = r.json()
    matches = [inc for inc in incidents if inc.get("component_id") == component]

    record(
        "20 signals → exactly 1 work item",
        len(matches) == 1,
        f"found {len(matches)} work items for {component}",
    )


# ═══════════════════════════════════════════════════════════════════════════
# 4. FSM: CLOSED rejected without RCA
# ═══════════════════════════════════════════════════════════════════════════

async def check_fsm_rca_guard(client: httpx.AsyncClient):
    print("\n── 4. FSM: CLOSED rejected without RCA ───────────────────────")

    # Create a signal to get a work item
    component = f"FSM_TEST_{int(time.time())}"
    await client.post(f"{API}/signals", json={
        "component_id": component,
        "component_type": "rdbms",
        "error_code": "FSM_TEST",
        "message": "FSM guard test",
        "severity": "CRITICAL",
        "metadata": {},
    })
    await asyncio.sleep(2)

    # Find the work item
    r = await client.get(f"{API}/incidents")
    incidents = r.json()
    match = next((i for i in incidents if i["component_id"] == component), None)

    if not match:
        record("FSM test work item created", False, "no work item found")
        return

    wid = match["id"]

    # Transition OPEN → INVESTIGATING → RESOLVED
    await client.patch(f"{API}/incidents/{wid}/status", json={"target_status": "INVESTIGATING"})
    await client.patch(f"{API}/incidents/{wid}/status", json={"target_status": "RESOLVED"})

    # Try RESOLVED → CLOSED without RCA (should fail with 422)
    r = await client.patch(f"{API}/incidents/{wid}/status", json={"target_status": "CLOSED"})
    record(
        "RESOLVED → CLOSED without RCA returns 422",
        r.status_code == 422,
        f"status={r.status_code} body={r.json()}",
    )


# ═══════════════════════════════════════════════════════════════════════════
# 5. RCA submission + MTTR calculation
# ═══════════════════════════════════════════════════════════════════════════

async def check_rca_and_mttr(client: httpx.AsyncClient):
    print("\n── 5. RCA submission + MTTR ──────────────────────────────────")

    # Create a signal
    component = f"RCA_TEST_{int(time.time())}"
    await client.post(f"{API}/signals", json={
        "component_id": component,
        "component_type": "api",
        "error_code": "RCA_TEST",
        "message": "RCA + MTTR test",
        "severity": "HIGH",
        "metadata": {},
    })
    await asyncio.sleep(2)

    r = await client.get(f"{API}/incidents")
    incidents = r.json()
    match = next((i for i in incidents if i["component_id"] == component), None)

    if not match:
        record("RCA test work item created", False, "no work item found")
        return

    wid = match["id"]
    start_time = match["start_time"]

    # Transition to RESOLVED
    await client.patch(f"{API}/incidents/{wid}/status", json={"target_status": "INVESTIGATING"})
    await client.patch(f"{API}/incidents/{wid}/status", json={"target_status": "RESOLVED"})

    # Submit RCA
    rca_payload = {
        "root_cause_category": "Infrastructure",
        "fix_applied": "Replaced the failing node with a healthy standby instance to restore service.",
        "prevention_steps": "Added automated health checks and failover triggers with 30-second threshold.",
        "incident_start": start_time,
        "incident_end": "2099-01-01T12:00:00Z",
    }
    r = await client.post(f"{API}/incidents/{wid}/rca", json=rca_payload)
    record(
        "POST RCA returns 201",
        r.status_code == 201,
        f"status={r.status_code}",
    )

    if r.status_code == 201:
        rca = r.json()
        record("RCA id present", "id" in rca)

    # Check MTTR appeared on work item
    r = await client.get(f"{API}/incidents/{wid}")
    detail = r.json()
    wi = detail.get("work_item", {})
    record(
        "MTTR populated on work item",
        wi.get("mttr_seconds") is not None and wi["mttr_seconds"] > 0,
        f"mttr_seconds={wi.get('mttr_seconds')}",
    )

    # Now RESOLVED → CLOSED should succeed
    r = await client.patch(f"{API}/incidents/{wid}/status", json={"target_status": "CLOSED"})
    record(
        "RESOLVED → CLOSED with RCA returns 200",
        r.status_code == 200,
        f"status={r.status_code}",
    )


# ═══════════════════════════════════════════════════════════════════════════
# 6. Incident detail — linked raw signals
# ═══════════════════════════════════════════════════════════════════════════

async def check_incident_detail(client: httpx.AsyncClient):
    print("\n── 6. Incident detail + linked signals ───────────────────────")

    component = f"DETAIL_TEST_{int(time.time())}"

    # Send 5 signals
    for i in range(5):
        await client.post(f"{API}/signals", json={
            "component_id": component,
            "component_type": "nosql",
            "error_code": "DETAIL_CHECK",
            "message": f"Detail test #{i+1}",
            "severity": "LOW",
            "metadata": {},
        })

    await asyncio.sleep(3)

    r = await client.get(f"{API}/incidents")
    incidents = r.json()
    match = next((i for i in incidents if i["component_id"] == component), None)

    if not match:
        record("Detail test work item exists", False)
        return

    r = await client.get(f"{API}/incidents/{match['id']}")
    detail = r.json()

    record(
        "Detail response has work_item",
        "work_item" in detail,
    )
    record(
        "Detail response has signals list",
        "signals" in detail and isinstance(detail["signals"], list),
        f"signal_count={len(detail.get('signals', []))}",
    )
    record(
        "Linked signals ≥ 1",
        len(detail.get("signals", [])) >= 1,
        f"got {len(detail.get('signals', []))}",
    )


# ═══════════════════════════════════════════════════════════════════════════
# 7. High-throughput burst
# ═══════════════════════════════════════════════════════════════════════════

async def check_throughput(client: httpx.AsyncClient):
    print("\n── 7. High-throughput burst (500 signals) ────────────────────")

    component = f"BURST_{int(time.time())}"
    t0 = time.monotonic()

    tasks = []
    for i in range(500):
        tasks.append(client.post(f"{API}/signals", json={
            "component_id": component,
            "component_type": "queue",
            "error_code": "BURST",
            "message": f"Burst #{i}",
            "severity": "LOW",
            "metadata": {},
        }))

    responses = await asyncio.gather(*tasks, return_exceptions=True)
    elapsed = time.monotonic() - t0

    accepted = sum(1 for r in responses if not isinstance(r, Exception) and r.status_code == 202)
    rate_limited = sum(1 for r in responses if not isinstance(r, Exception) and r.status_code == 429)
    errors = sum(1 for r in responses if isinstance(r, Exception))

    record(
        "500 signals sent without crash",
        accepted + rate_limited == 500 and errors == 0,
        f"accepted={accepted} rate_limited={rate_limited} errors={errors} elapsed={elapsed:.2f}s",
    )
    record(
        "No server errors (all 202 or 429)",
        errors == 0,
    )


# ═══════════════════════════════════════════════════════════════════════════
# Runner
# ═══════════════════════════════════════════════════════════════════════════

async def main():
    print("=" * 62)
    print("  INCIDENT MANAGEMENT SYSTEM — Integration Checklist")
    print("=" * 62)

    async with httpx.AsyncClient(timeout=30) as client:
        # Quick connectivity check
        try:
            r = await client.get(f"{BASE}/health")
            if r.status_code not in (200, 503):
                print(f"\n{FAIL}  Backend not reachable at {BASE}")
                sys.exit(1)
        except httpx.ConnectError:
            print(f"\n{FAIL}  Cannot connect to {BASE}")
            print("    Make sure 'docker compose up --build' is running.")
            sys.exit(1)

        await check_health(client)
        await check_signal_ingestion(client)
        await check_debounce(client)
        await check_fsm_rca_guard(client)
        await check_rca_and_mttr(client)
        await check_incident_detail(client)
        await check_throughput(client)

    # ── Summary ────────────────────────────────────────────────────────
    print("\n" + "=" * 62)
    passed = sum(1 for _, s, _ in results if s == PASS)
    failed = sum(1 for _, s, _ in results if s == FAIL)
    total = len(results)
    print(f"  Results:  {passed}/{total} passed", end="")
    if failed:
        print(f",  {failed} FAILED")
    else:
        print("  —  ALL CLEAR 🎉")
    print("=" * 62)

    if failed:
        print("\nFailed checks:")
        for name, status, detail in results:
            if status == FAIL:
                print(f"  {FAIL}  {name}  — {detail}")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    asyncio.run(main())
