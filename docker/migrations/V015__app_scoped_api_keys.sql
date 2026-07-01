-- Flyway Migration V015
-- Created: 2026-06-20
-- Description: Add per-client API keys for a ChatSDK app without rotating the primary app key

CREATE TABLE IF NOT EXISTS app_api_key (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  api_key_hash CHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_api_key_app_active
  ON app_api_key (app_id, created_at DESC)
  WHERE revoked_at IS NULL;
