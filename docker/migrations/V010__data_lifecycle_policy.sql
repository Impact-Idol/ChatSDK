-- Flyway Migration V010
-- Created: 2026-06-08
-- Description: Add data lifecycle metadata, purge ledger, and export manifest tables

ALTER TABLE message
  ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS delete_reason TEXT,
  ADD COLUMN IF NOT EXISTS hard_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purge_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_hold_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_hold_reason TEXT;

ALTER TABLE upload
  ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purge_reason TEXT;

CREATE TABLE IF NOT EXISTS data_purge_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  storage_key TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_purge_ledger_app_time
  ON data_purge_ledger (app_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_purge_ledger_resource
  ON data_purge_ledger (app_id, resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_data_purge_ledger_pending_storage
  ON data_purge_ledger (app_id, status, storage_key)
  WHERE status = 'pending' AND storage_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS data_export (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  requested_by VARCHAR(255),
  scope_type VARCHAR(50) NOT NULL,
  scope_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  manifest JSONB NOT NULL,
  artifact JSONB NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_export_app_time
  ON data_export (app_id, created_at DESC);

ALTER TABLE data_purge_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_purge_ledger FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS data_purge_ledger_app_isolation ON data_purge_ledger;
CREATE POLICY data_purge_ledger_app_isolation ON data_purge_ledger
  USING (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context())
  WITH CHECK (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context());

ALTER TABLE data_export ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS data_export_app_isolation ON data_export;
CREATE POLICY data_export_app_isolation ON data_export
  USING (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context())
  WITH CHECK (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context());
