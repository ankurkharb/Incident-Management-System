# Incident Management System

A scalable incident management system monorepo.

## Architecture

### Backpressure & Load Shedding

The ingestion pipeline uses a **bounded in-memory ring buffer** (`asyncio.Queue` with `maxsize=50 000`).  Every incoming signal is placed onto this buffer via `put_nowait()`.

If the persistence / debounce layer falls behind and the buffer fills up, `asyncio.QueueFull` is raised at the edge — the API responds with **HTTP 429 (Too Many Requests)** and a `Retry-After` header.  This guarantees the system **never crashes under load**; it sheds excess traffic gracefully.

> **Why not Kafka?**  At this scale an in-process `asyncio.Queue` gives us bounded back-pressure with zero operational overhead.  If the system later needs cross-process durability or multi-consumer fan-out, swapping in Kafka is a one-layer change.

### Rate Limiting

A **token-bucket rate limiter** protects the ingestion endpoint.  The bucket refills at a configurable *rate* (tokens/second) and allows short bursts up to *capacity*.  When the bucket is empty the API returns **HTTP 429** before the request even reaches the buffer.  This provides a second layer of defence above the backpressure mechanism.
