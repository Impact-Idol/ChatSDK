-- Flyway Migration V005
-- Created: 2026-06-08
-- Description: Add durable realtime event outbox
--
-- Stores realtime events in the same database transaction as the domain write.
-- A background worker publishes due rows to Centrifugo and marks them delivered.

CREATE TABLE IF NOT EXISTS event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channels TEXT[] NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  last_error TEXT,
  idempotency_key VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_outbox_status_check
    CHECK (status IN ('pending', 'processing', 'published', 'failed'))
);

CREATE INDEX idx_event_outbox_due
  ON event_outbox (next_attempt_at, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX idx_event_outbox_app_status
  ON event_outbox (app_id, status, created_at);

CREATE UNIQUE INDEX idx_event_outbox_idempotency_key
  ON event_outbox (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
