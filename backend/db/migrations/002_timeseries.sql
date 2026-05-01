-- 002_timeseries.sql
-- TimescaleDB hypertable for time-bucketed signal count aggregations.

BEGIN;

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE signal_counts (
    time            TIMESTAMPTZ NOT NULL,
    component_id    TEXT        NOT NULL,
    count           INTEGER     NOT NULL
);

-- Convert to a TimescaleDB hypertable partitioned on the `time` column
SELECT create_hypertable('signal_counts', 'time');

COMMIT;
