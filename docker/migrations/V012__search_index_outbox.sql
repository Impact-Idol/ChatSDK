CREATE TABLE IF NOT EXISTS search_index_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  message_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('index', 'update', 'delete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_index_outbox_due
  ON search_index_outbox (next_attempt_at, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_search_index_outbox_stale_processing
  ON search_index_outbox (locked_at, created_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_search_index_outbox_app_status
  ON search_index_outbox (app_id, status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_search_index_outbox_unique_active
  ON search_index_outbox (app_id, message_id, operation)
  WHERE status IN ('pending', 'processing', 'failed');

ALTER TABLE search_index_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index_outbox FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS search_index_outbox_system_only ON search_index_outbox;
DROP POLICY IF EXISTS search_index_outbox_app_or_system ON search_index_outbox;
CREATE POLICY search_index_outbox_app_or_system ON search_index_outbox
  USING (
    current_setting('app.system_context', true) = 'true'
    OR app_id::text = current_setting('app.current_app_id', true)
  )
  WITH CHECK (
    current_setting('app.system_context', true) = 'true'
    OR app_id::text = current_setting('app.current_app_id', true)
  );
