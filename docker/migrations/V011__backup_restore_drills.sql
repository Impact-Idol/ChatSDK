CREATE TABLE IF NOT EXISTS backup_drill (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL UNIQUE,
  source_environment TEXT NOT NULL,
  restore_target TEXT NOT NULL,
  backup_timestamp TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  postgres_backup_path TEXT NOT NULL,
  object_manifest_path TEXT NOT NULL,
  object_manifest_sha256 TEXT,
  migration_version TEXT NOT NULL,
  postgres_rpo_seconds INTEGER,
  restore_rto_seconds INTEGER,
  status TEXT NOT NULL CHECK (status IN ('running', 'passed', 'failed')),
  playwright_result TEXT NOT NULL DEFAULT 'skipped' CHECK (playwright_result IN ('passed', 'failed', 'skipped')),
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_object_manifest (
  drill_id UUID NOT NULL REFERENCES backup_drill(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  storage_key TEXT NOT NULL,
  size_bytes BIGINT,
  checksum_sha256 TEXT,
  etag TEXT,
  last_modified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (drill_id, storage_key)
);

CREATE INDEX IF NOT EXISTS idx_backup_object_manifest_app
  ON backup_object_manifest (drill_id, app_id, storage_key);

CREATE TABLE IF NOT EXISTS backup_restore_gap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id UUID NOT NULL REFERENCES backup_drill(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  upload_id UUID,
  storage_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'missing_primary',
      'missing_thumbnail',
      'purged_object_restored',
      'upload_references_purged_object',
      'rejected_purge_key_present',
      'checksum_mismatch',
      'cross_app_object'
    )
  ),
  action TEXT NOT NULL CHECK (action IN ('tombstone_upload', 'clear_thumbnail', 'delete_object', 'report_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_restore_gap_drill_app
  ON backup_restore_gap (drill_id, app_id, kind);

ALTER TABLE backup_drill ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_drill FORCE ROW LEVEL SECURITY;
ALTER TABLE backup_object_manifest ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_object_manifest FORCE ROW LEVEL SECURITY;
ALTER TABLE backup_restore_gap ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_restore_gap FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS backup_drill_system_only ON backup_drill;
CREATE POLICY backup_drill_system_only ON backup_drill
  USING (current_setting('app.system_context', true) = 'true')
  WITH CHECK (current_setting('app.system_context', true) = 'true');

DROP POLICY IF EXISTS backup_object_manifest_system_only ON backup_object_manifest;
CREATE POLICY backup_object_manifest_system_only ON backup_object_manifest
  USING (current_setting('app.system_context', true) = 'true')
  WITH CHECK (current_setting('app.system_context', true) = 'true');

DROP POLICY IF EXISTS backup_restore_gap_system_only ON backup_restore_gap;
CREATE POLICY backup_restore_gap_system_only ON backup_restore_gap
  USING (current_setting('app.system_context', true) = 'true')
  WITH CHECK (current_setting('app.system_context', true) = 'true');
