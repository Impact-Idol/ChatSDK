-- Flyway Migration V008
-- Created: 2026-06-08
-- Description: Token sessions, revocation, and app-scoped RLS for token hardening

ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS tokens_valid_after TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0);

CREATE TABLE IF NOT EXISTS auth_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_session_user
  ON auth_session (app_id, user_id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS revoked_token (
  app_id UUID NOT NULL,
  token_id UUID NOT NULL,
  session_id UUID,
  user_id VARCHAR(255) NOT NULL,
  token_type VARCHAR(20) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  PRIMARY KEY (app_id, token_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES auth_session(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_revoked_token_expiry
  ON revoked_token (expires_at);

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
  ('auth_session'),
  ('revoked_token')
) AS tenant_tables(table_name);

DROP FUNCTION chatsdk.enable_app_rls(TEXT);
