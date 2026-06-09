-- Flyway Migration V014
-- Created: 2026-06-09
-- Description: Client-owned token broker control plane, replay, audit, and membership freshness state

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chatsdk_broker_system') THEN
    CREATE ROLE chatsdk_broker_system LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS broker_client (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 255),
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled', 'suspended')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION chatsdk.is_broker_system_context()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT chatsdk.is_system_context()
     AND current_user = 'chatsdk_broker_system'
$$;

CREATE TABLE IF NOT EXISTS broker_credential (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES broker_client(id) ON DELETE RESTRICT,
  kid TEXT NOT NULL UNIQUE CHECK (length(kid) BETWEEN 1 AND 255),
  public_key_jwk JSONB,
  encrypted_secret TEXT,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('service_jwt_hs256', 'service_jwt_rs256', 'mtls')),
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled', 'rotating')),
  not_before TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  mtls_subject_dn TEXT CHECK (mtls_subject_dn IS NULL OR length(mtls_subject_dn) <= 512),
  mtls_san TEXT CHECK (mtls_san IS NULL OR length(mtls_san) <= 512),
  mtls_certificate_sha256 TEXT CHECK (mtls_certificate_sha256 IS NULL OR mtls_certificate_sha256 ~ '^[0-9a-fA-F]{64}$'),
  trusted_proxy_id TEXT CHECK (trusted_proxy_id IS NULL OR length(trusted_proxy_id) <= 255),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    auth_type <> 'mtls'
    OR mtls_certificate_sha256 IS NOT NULL
    OR mtls_subject_dn IS NOT NULL
    OR mtls_san IS NOT NULL
  ),
  CHECK (
    auth_type <> 'service_jwt_rs256'
    OR public_key_jwk IS NOT NULL
  ),
  CHECK (
    auth_type <> 'service_jwt_hs256'
    OR encrypted_secret IS NOT NULL
  ),
  UNIQUE (id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_broker_credential_client
  ON broker_credential (client_id, status);

CREATE TABLE IF NOT EXISTS broker_app_scope (
  credential_id UUID NOT NULL REFERENCES broker_credential(id) ON DELETE RESTRICT,
  app_id UUID NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  allowed_external_tenant_ids TEXT[] NOT NULL DEFAULT '{}',
  allowed_user_id_prefixes TEXT[] NOT NULL DEFAULT '{}',
  allowed_channel_id_prefixes TEXT[] NOT NULL DEFAULT '{}',
  max_membership_fanout INTEGER NOT NULL DEFAULT 1000 CHECK (max_membership_fanout > 0),
  allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  max_token_ttl_seconds INTEGER NOT NULL DEFAULT 900 CHECK (max_token_ttl_seconds BETWEEN 60 AND 3600),
  default_scopes TEXT[] NOT NULL DEFAULT ARRAY['chat:read', 'chat:write'],
  allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY[
    'chat:read',
    'chat:write',
    'reaction:write',
    'typing:write',
    'upload:write',
    'search:read'
  ],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (credential_id, app_id),
  CHECK (allowed_scopes <@ ARRAY[
    'chat:read',
    'chat:write',
    'reaction:write',
    'typing:write',
    'upload:write',
    'search:read'
  ]::text[]),
  CHECK (default_scopes <@ allowed_scopes),
  CHECK (array_position(allowed_origins, '*') IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_broker_app_scope_app
  ON broker_app_scope (app_id, status);

CREATE TABLE IF NOT EXISTS broker_mint_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES broker_client(id) ON DELETE RESTRICT,
  credential_id UUID REFERENCES broker_credential(id) ON DELETE RESTRICT,
  app_id UUID REFERENCES app(id) ON DELETE RESTRICT,
  requested_app_id TEXT CHECK (requested_app_id IS NULL OR length(requested_app_id) <= 255),
  client_slug TEXT,
  credential_kid TEXT,
  user_id TEXT CHECK (user_id IS NULL OR length(user_id) <= 255),
  external_tenant_id TEXT CHECK (external_tenant_id IS NULL OR length(external_tenant_id) <= 255),
  requested_scopes TEXT[],
  granted_scopes TEXT[],
  token_jti TEXT CHECK (token_jti IS NULL OR length(token_jti) BETWEEN 16 AND 255),
  session_id UUID,
  status TEXT NOT NULL CHECK (status IN ('success', 'denied', 'error')),
  denial_reason TEXT CHECK (denial_reason IS NULL OR length(denial_reason) <= 1024),
  request_id TEXT CHECK (request_id IS NULL OR length(request_id) <= 255),
  external_request_id TEXT CHECK (external_request_id IS NULL OR length(external_request_id) <= 255),
  trace_id TEXT CHECK (trace_id IS NULL OR length(trace_id) <= 255),
  caller_ip INET,
  user_agent TEXT CHECK (user_agent IS NULL OR length(user_agent) <= 512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requested_scopes IS NULL OR cardinality(requested_scopes) <= 50),
  CHECK (granted_scopes IS NULL OR cardinality(granted_scopes) <= 50)
);

CREATE INDEX IF NOT EXISTS idx_broker_mint_audit_created
  ON broker_mint_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broker_mint_audit_app_status
  ON broker_mint_audit (app_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS broker_jwt_replay (
  credential_id UUID NOT NULL REFERENCES broker_credential(id) ON DELETE RESTRICT,
  audience TEXT NOT NULL,
  environment TEXT NOT NULL,
  jti TEXT NOT NULL CHECK (length(jti) BETWEEN 16 AND 255),
  expires_at TIMESTAMPTZ NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (credential_id, jti)
);

CREATE INDEX IF NOT EXISTS idx_broker_jwt_replay_audience_environment
  ON broker_jwt_replay (credential_id, audience, environment);

CREATE INDEX IF NOT EXISTS idx_broker_jwt_replay_expires
  ON broker_jwt_replay (expires_at);

CREATE TABLE IF NOT EXISTS broker_membership_state (
  app_id UUID NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  external_tenant_id TEXT NOT NULL,
  version TEXT NOT NULL,
  revision BIGINT NOT NULL CHECK (revision >= 0 AND revision <= 9007199254740991),
  state_hash TEXT NOT NULL,
  fresh_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled', 'suspended', 'removed')),
  profile_hash TEXT,
  synced_by_credential_id UUID REFERENCES broker_credential(id) ON DELETE RESTRICT,
  tombstoned_at TIMESTAMPTZ,
  revoke_epoch TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_id, user_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE,
  CHECK (
    (status IN ('removed', 'disabled', 'suspended') AND tombstoned_at IS NOT NULL)
    OR (status = 'active' AND tombstoned_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_broker_membership_state_external_tenant
  ON broker_membership_state (app_id, external_tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_broker_membership_state_fresh_until
  ON broker_membership_state (app_id, fresh_until);

ALTER TABLE auth_session
  ADD COLUMN IF NOT EXISTS broker_client_id UUID,
  ADD COLUMN IF NOT EXISTS broker_credential_id UUID,
  ADD COLUMN IF NOT EXISTS external_tenant_id TEXT,
  ADD COLUMN IF NOT EXISTS external_user_id TEXT,
  ADD COLUMN IF NOT EXISTS external_session_hash TEXT,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS auth_source TEXT,
  ADD COLUMN IF NOT EXISTS membership_version TEXT;

ALTER TABLE auth_session
  ADD CONSTRAINT auth_session_broker_client_required
    CHECK (
      broker_credential_id IS NULL
      OR broker_client_id IS NOT NULL
    ) NOT VALID,
  ADD CONSTRAINT auth_session_broker_credential_client_fk
    FOREIGN KEY (broker_credential_id, broker_client_id)
    REFERENCES broker_credential(id, client_id)
    ON DELETE RESTRICT NOT VALID,
  ADD CONSTRAINT auth_session_broker_scope_fk
    FOREIGN KEY (broker_credential_id, app_id)
    REFERENCES broker_app_scope(credential_id, app_id)
    ON DELETE RESTRICT NOT VALID;

ALTER TABLE broker_membership_state
  ADD CONSTRAINT broker_membership_state_scope_fk
    FOREIGN KEY (synced_by_credential_id, app_id)
    REFERENCES broker_app_scope(credential_id, app_id)
    ON DELETE RESTRICT NOT VALID;

CREATE INDEX IF NOT EXISTS idx_auth_session_broker_credential
  ON auth_session (broker_credential_id, revoked_at, expires_at);

CREATE OR REPLACE FUNCTION prevent_broker_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'broker_mint_audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS broker_mint_audit_append_only ON broker_mint_audit;
CREATE TRIGGER broker_mint_audit_append_only
  BEFORE UPDATE OR DELETE ON broker_mint_audit
  FOR EACH ROW
  EXECUTE FUNCTION prevent_broker_audit_mutation();

CREATE OR REPLACE FUNCTION chatsdk.enable_system_only_rls(table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_system_only', table_name);
  EXECUTE format(
    'CREATE POLICY %I ON %I
       USING (chatsdk.is_broker_system_context())
       WITH CHECK (chatsdk.is_broker_system_context())',
    table_name || '_system_only',
    table_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION chatsdk.enable_broker_membership_rls()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  ALTER TABLE broker_membership_state ENABLE ROW LEVEL SECURITY;
  ALTER TABLE broker_membership_state FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS broker_membership_state_app_isolation ON broker_membership_state;
  DROP POLICY IF EXISTS broker_membership_state_select ON broker_membership_state;
  DROP POLICY IF EXISTS broker_membership_state_insert ON broker_membership_state;
  DROP POLICY IF EXISTS broker_membership_state_update ON broker_membership_state;
  DROP POLICY IF EXISTS broker_membership_state_delete ON broker_membership_state;

  CREATE POLICY broker_membership_state_select ON broker_membership_state
    FOR SELECT
    USING (app_id = chatsdk.current_app_id() OR chatsdk.is_broker_system_context());

  CREATE POLICY broker_membership_state_insert ON broker_membership_state
    FOR INSERT
    WITH CHECK (chatsdk.is_broker_system_context());

  CREATE POLICY broker_membership_state_update ON broker_membership_state
    FOR UPDATE
    USING (chatsdk.is_broker_system_context())
    WITH CHECK (chatsdk.is_broker_system_context());

  CREATE POLICY broker_membership_state_delete ON broker_membership_state
    FOR DELETE
    USING (chatsdk.is_broker_system_context());
END;
$$;

SELECT chatsdk.enable_system_only_rls(table_name)
FROM (VALUES
  ('broker_client'),
  ('broker_credential'),
  ('broker_app_scope'),
  ('broker_mint_audit'),
  ('broker_jwt_replay')
) AS system_tables(table_name);

SELECT chatsdk.enable_broker_membership_rls();

DROP FUNCTION chatsdk.enable_system_only_rls(TEXT);
DROP FUNCTION chatsdk.enable_broker_membership_rls();

GRANT USAGE ON SCHEMA public, chatsdk TO chatsdk_broker_system;

GRANT SELECT ON app TO chatsdk_broker_system;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  app_user,
  channel_member,
  event_outbox,
  broker_membership_state
TO chatsdk_broker_system;

GRANT SELECT, UPDATE ON
  channel
TO chatsdk_broker_system;

GRANT SELECT, INSERT, UPDATE ON
  auth_session
TO chatsdk_broker_system;

GRANT SELECT, INSERT ON
  broker_mint_audit
TO chatsdk_broker_system;

GRANT SELECT, INSERT, DELETE ON
  broker_jwt_replay
TO chatsdk_broker_system;

GRANT SELECT ON
  broker_client,
  broker_credential,
  broker_app_scope
TO chatsdk_broker_system;
