-- Flyway Migration V006
-- Created: 2026-06-08
-- Description: Add tenant DB context helpers and RLS app isolation policies

CREATE SCHEMA IF NOT EXISTS chatsdk;

CREATE OR REPLACE FUNCTION chatsdk.current_app_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_app_id', true), '')::UUID;
$$;

CREATE OR REPLACE FUNCTION chatsdk.current_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$;

CREATE OR REPLACE FUNCTION chatsdk.is_system_context()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.system_context', true), '')::BOOLEAN, FALSE);
$$;

ALTER TABLE channel_seq ADD COLUMN IF NOT EXISTS app_id UUID;

UPDATE channel_seq cs
SET app_id = c.app_id
FROM channel c
WHERE cs.channel_id = c.id
  AND cs.app_id IS NULL;

ALTER TABLE channel_seq ALTER COLUMN app_id SET NOT NULL;
ALTER TABLE channel_seq
  ADD CONSTRAINT channel_seq_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES app(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_channel_seq_app ON channel_seq (app_id, channel_id);

CREATE OR REPLACE FUNCTION next_channel_seq(p_channel_id UUID)
RETURNS BIGINT AS $$
DECLARE
  new_seq BIGINT;
  channel_app_id UUID;
BEGIN
  SELECT app_id INTO channel_app_id
  FROM channel
  WHERE id = p_channel_id;

  IF channel_app_id IS NULL THEN
    RAISE EXCEPTION 'Channel not found: %', p_channel_id;
  END IF;

  UPDATE channel_seq
  SET current_seq = current_seq + 1
  WHERE channel_id = p_channel_id
  RETURNING current_seq INTO new_seq;

  IF new_seq IS NULL THEN
    INSERT INTO channel_seq (channel_id, app_id, current_seq)
    VALUES (p_channel_id, channel_app_id, 1)
    RETURNING current_seq INTO new_seq;
  END IF;

  RETURN new_seq;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE webhook_delivery ADD COLUMN IF NOT EXISTS app_id UUID;

UPDATE webhook_delivery d
SET app_id = w.app_id
FROM webhook w
WHERE d.webhook_id = w.id
  AND d.app_id IS NULL;

ALTER TABLE webhook_delivery ALTER COLUMN app_id SET NOT NULL;
ALTER TABLE webhook_delivery
  ADD CONSTRAINT webhook_delivery_app_id_fkey
  FOREIGN KEY (app_id) REFERENCES app(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_delivery_app ON webhook_delivery (app_id, attempted_at DESC);

ALTER TABLE workspace_template ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES app(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_workspace_template_app ON workspace_template (app_id, created_at DESC);

CREATE OR REPLACE FUNCTION chatsdk.enable_app_rls(table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_app_isolation', table_name);
  EXECUTE format(
    'CREATE POLICY %I ON %I
       USING (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context())
       WITH CHECK (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context())',
    table_name || '_app_isolation',
    table_name
  );
END;
$$;

SELECT chatsdk.enable_app_rls(table_name)
FROM (VALUES
  ('app_user'),
  ('channel'),
  ('channel_seq'),
  ('message'),
  ('user_message'),
  ('channel_member'),
  ('reaction'),
  ('sync_state'),
  ('device_token'),
  ('upload'),
  ('audit_log'),
  ('read_receipt'),
  ('user_presence'),
  ('mention'),
  ('workspace'),
  ('workspace_member'),
  ('poll'),
  ('poll_vote'),
  ('message_report'),
  ('user_block'),
  ('pinned_message'),
  ('saved_message'),
  ('supervised_user'),
  ('enrollment_rule'),
  ('enrollment_execution'),
  ('custom_emoji'),
  ('emoji_usage'),
  ('webhook'),
  ('webhook_delivery'),
  ('workspace_invite'),
  ('event_outbox')
) AS tenant_tables(table_name);

DROP FUNCTION chatsdk.enable_app_rls(TEXT);

ALTER TABLE workspace_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_template FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_template_read ON workspace_template;
DROP POLICY IF EXISTS workspace_template_insert ON workspace_template;
DROP POLICY IF EXISTS workspace_template_update ON workspace_template;
DROP POLICY IF EXISTS workspace_template_delete ON workspace_template;

CREATE POLICY workspace_template_read
ON workspace_template
FOR SELECT
USING (
  app_id = chatsdk.current_app_id()
  OR (app_id IS NULL AND is_public = true)
  OR chatsdk.is_system_context()
);

CREATE POLICY workspace_template_insert
ON workspace_template
FOR INSERT
WITH CHECK (
  app_id = chatsdk.current_app_id()
  OR chatsdk.is_system_context()
);

CREATE POLICY workspace_template_update
ON workspace_template
FOR UPDATE
USING (
  app_id = chatsdk.current_app_id()
  OR chatsdk.is_system_context()
)
WITH CHECK (
  app_id = chatsdk.current_app_id()
  OR chatsdk.is_system_context()
);

CREATE POLICY workspace_template_delete
ON workspace_template
FOR DELETE
USING (
  app_id = chatsdk.current_app_id()
  OR chatsdk.is_system_context()
);
