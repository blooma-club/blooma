-- Migration: Add webhook_events table for idempotency
-- This table tracks processed webhook events to prevent duplicate processing

CREATE TABLE IF NOT EXISTS webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    received_at TEXT NOT NULL,
    processed_at TEXT,
    error TEXT,
    created_at TEXT NOT NULL
);

-- Index for cleanup queries (find old processed events)
CREATE INDEX IF NOT EXISTS webhook_events_status_idx ON webhook_events(status);
CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx ON webhook_events(received_at);
