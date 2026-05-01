# Technology Stack

## Backend
- **Python 3.12 + FastAPI + asyncio**: Native async, great for high-throughput I/O.

## Data Storage
- **NoSQL (raw signals audit log)**: MongoDB (flexible schema, high write throughput).
- **RDBMS (work items + RCA)**: PostgreSQL (ACID transactions, row-level locking).
- **Cache (hot-path dashboard)**: Redis 7 (sub-millisecond reads, Pub/Sub for live updates).
- **Time-series aggregations**: TimescaleDB (a PostgreSQL extension — reuse your PG connection pool, add a hypertable for signal counts).

## Message Passing
- **Internal backpressure**: `asyncio.Queue` (bounded, in-process — no need for Kafka at this scale).

## Frontend
- **React 18 + Vite + TailwindCSS**

## Infrastructure
- **Container orchestration**: Docker Compose v2
