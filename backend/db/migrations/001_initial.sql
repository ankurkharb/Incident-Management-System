-- 001_initial.sql
-- PostgreSQL schema for work items, RCA records, and signal-work-item links.

BEGIN;

-- =============================================================================
-- work_items: core incident / work-item tracking table
-- =============================================================================
CREATE TABLE work_items (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id    TEXT        NOT NULL,
    status          TEXT        NOT NULL CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','CLOSED')),
    priority        TEXT        NOT NULL,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    mttr_seconds    INTEGER,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Compound index: fast lookups by component + status (dashboard filters)
CREATE INDEX idx_work_items_component_status
    ON work_items (component_id, status);

-- Partial index: only non-closed items (active incident queries)
CREATE INDEX idx_work_items_active_status
    ON work_items (status)
    WHERE status != 'CLOSED';

-- =============================================================================
-- rca_records: one root-cause analysis per incident
-- =============================================================================
CREATE TABLE rca_records (
    id                  UUID        PRIMARY KEY,
    work_item_id        UUID        NOT NULL REFERENCES work_items(id),
    root_cause_category TEXT        NOT NULL,
    fix_applied         TEXT        NOT NULL,
    prevention_steps    TEXT        NOT NULL,
    incident_start      TIMESTAMPTZ NOT NULL,
    incident_end        TIMESTAMPTZ NOT NULL,
    submitted_at        TIMESTAMPTZ DEFAULT now(),

    -- One RCA per incident
    CONSTRAINT uq_rca_work_item UNIQUE (work_item_id)
);

-- =============================================================================
-- signal_work_item_links: maps MongoDB signal ObjectIds to work items
-- =============================================================================
CREATE TABLE signal_work_item_links (
    signal_id       TEXT    NOT NULL,   -- MongoDB ObjectId stored as string
    work_item_id    UUID    NOT NULL REFERENCES work_items(id),
    PRIMARY KEY (signal_id, work_item_id)
);

COMMIT;
