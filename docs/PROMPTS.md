# Development Prompts & Specifications

All prompts and specifications used during the development of this system.

---

## Phase 0 — Project Initialization

### Step 0.1 — Initialize the monorepo
Create a root directory `ims/`. Inside it create `backend/`, `frontend/`, `docs/`, and `scripts/`. At the root, add a `docker-compose.yml`, a `README.md`, and a `.gitignore`. Commit this empty skeleton immediately.

### Step 0.2 — Choose and lock the tech stack
Document decisions in `docs/TECH_STACK.md`: Python 3.12 + FastAPI + asyncio, MongoDB, PostgreSQL, Redis 7, TimescaleDB, asyncio.Queue, React 18 + Vite + TailwindCSS, Docker Compose v2.

### Step 0.3 — Write the Docker Compose file
Define six services: postgres (TimescaleDB), mongo, redis, backend, frontend, and mock-producer with healthchecks and named volumes.

---

## Phase 1 — Database Schemas & Migrations

### Step 1.1 — PostgreSQL schema
Create `001_initial.sql` with tables: `work_items` (UUID PK, status CHECK, indexes), `rca_records` (UNIQUE on work_item_id), `signal_work_item_links` (composite PK).

### Step 1.2 — TimescaleDB hypertable
Create `002_timeseries.sql` with `signal_counts` table converted to hypertable.

### Step 1.3 — MongoDB collection & indexes
Create `mongo_setup.py` with compound index, work_item_id index, and 30-day TTL index.

---

## Phase 2 — Backend Core Structure

### Step 2.1 — Project layout
Full directory tree: `api/routes/`, `core/`, `patterns/`, `db/`, `models/`, `services/`, `tests/`.

### Step 2.2 — Configuration
`pydantic_settings.BaseSettings` reading `POSTGRES_DSN`, `MONGO_URI`, `REDIS_URL`, `MONGO_DB_NAME`.

### Step 2.3 — Database connection pools
asyncpg pool (min=5, max=20), motor client, redis.asyncio — all wired as FastAPI lifespan events.

---

## Phase 3 — In-Memory Buffer and Rate Limiter

### Step 3.1 — Bounded ring buffer
`asyncio.Queue(maxsize=50_000)` with `put_nowait()` → `QueueFull` → HTTP 429 + Retry-After.

### Step 3.2 — Token bucket rate limiter
`TokenBucketRateLimiter(rate, capacity)` with `asyncio.Lock` and `time.monotonic()`. FastAPI dependency `RateLimitDep`.

---

## Phase 4 — Design Patterns

### Step 4.1 — Strategy pattern for alerting
Abstract `AlertStrategy` with P0–P3 concrete strategies. Factory function `get_alert_strategy()`.

### Step 4.2 — State pattern for Work Item FSM
Four states (Open, Investigating, Resolved, Closed). RCA guard on Resolved→Closed. PostgreSQL persistence per transition.

---

## Phase 5 — Debounce Engine

### Step 5.1 — Debounce worker
Redis `SET NX EX 10` as atomic gate. First signal creates work item, duplicates append.

### Step 5.2 — Concurrency safety
`asyncio.Semaphore(20)` caps concurrent workers. Redis SET NX prevents race conditions.

---

## Phase 6 — API Routes

### Step 6.1 — Signal ingestion
`POST /api/v1/signals` — rate-limited, buffer-backed, returns 202 immediately.

### Step 6.2 — Incident endpoints
List (Redis-cached), detail (PG+Mongo), status transition (FSM), RCA submission (with MTTR).

### Step 6.3 — Health endpoint
Parallel `asyncio.gather` checks against PG, Redis, MongoDB. Returns 200/503.

### Step 6.4 — Throughput metrics
Background task reading Redis counter every 5s, logging signals/sec.

---

## Phase 7 — Frontend

### Step 7.1–7.5
React 18 + Vite + Tailwind scaffold. Routing with react-router-dom. IncidentFeed (15s polling), IncidentDetail (stepper + transition controls), RCAForm (validated, 20-char minimums).

---

## Phase 8 — Resilience

### Step 8.1 — PostgreSQL retry
`async_retry(max_attempts=3, backoff_base=0.5)` on `TooManyConnectionsError` and `PostgresConnectionError`.

### Step 8.2 — MongoDB retry
Same pattern for `NetworkTimeout` and `AutoReconnect`.

---

## Phase 9 — Testing

### Step 9.1–9.3
24 unit tests: RCA validation (12), state machine (12), debounce (3). All use mocks — no infrastructure required.

---

## Phase 10 — Sample Data

Simulation script sending 150 RDBMS + 50 MCP signals to verify debounce creates exactly 2 work items.

---

## Phase 11 — Documentation

README.md, ARCHITECTURE.md, BACKPRESSURE.md, PROMPTS.md.
