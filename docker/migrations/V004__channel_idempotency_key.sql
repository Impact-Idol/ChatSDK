-- Flyway Migration V004
-- Created: 2026-01-30
-- Description: Add idempotency_key column to channel table
--
-- Allows clients to pass an idempotency key when creating group channels
-- to prevent duplicate creation on retry or race conditions.
-- DM channels already use deterministic CID-based dedup; this covers group/team channels.

ALTER TABLE channel ADD COLUMN idempotency_key VARCHAR(255);

-- Partial unique index: only enforces uniqueness on non-null keys, scoped to app_id
CREATE UNIQUE INDEX idx_channel_app_idempotency_key
  ON channel (app_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
