-- Flyway Migration V007
-- Created: 2026-06-08
-- Description: Adversarial review fixes for Milestone 1 tenant RLS
--
-- Fixes applied:
--   H-2: Add missing RLS to pinned_message, saved_message
--   H-3: Remove global-public mutation from workspace_template UPDATE/DELETE policies
--   C-2: Make next_channel_seq() SECURITY DEFINER with EXECUTE restriction
--   M-5: Add CHECK constraint to workspace_template preventing orphan globals

-- ============================================================================
-- H-2: Enable RLS on pinned_message and saved_message
-- Both tables have app_id columns but were omitted from V006's enable_app_rls list.
-- ============================================================================

ALTER TABLE pinned_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_message FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pinned_message_app_isolation ON pinned_message;
CREATE POLICY pinned_message_app_isolation ON pinned_message
  USING (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context())
  WITH CHECK (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context());

ALTER TABLE saved_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_message FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_message_app_isolation ON saved_message;
CREATE POLICY saved_message_app_isolation ON saved_message
  USING (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context())
  WITH CHECK (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context());


-- ============================================================================
-- H-3: Tighten workspace_template UPDATE and DELETE policies.
-- V006 allowed any tenant to UPDATE/DELETE global public templates
-- (app_id IS NULL AND is_public = true). Global templates should be
-- read-only for tenants; only system context may mutate them.
-- ============================================================================

DROP POLICY IF EXISTS workspace_template_update ON workspace_template;
CREATE POLICY workspace_template_update ON workspace_template
FOR UPDATE
USING (
  app_id = chatsdk.current_app_id()
  OR chatsdk.is_system_context()
)
WITH CHECK (
  app_id = chatsdk.current_app_id()
  OR chatsdk.is_system_context()
);

DROP POLICY IF EXISTS workspace_template_delete ON workspace_template;
CREATE POLICY workspace_template_delete ON workspace_template
FOR DELETE
USING (
  app_id = chatsdk.current_app_id()
  OR chatsdk.is_system_context()
);


-- ============================================================================
-- C-2: Make next_channel_seq() SECURITY DEFINER.
-- The function reads/writes channel and channel_seq, both RLS-protected.
-- As SECURITY INVOKER (the default), it silently fails when called from
-- system context where current_app_id may not match. SECURITY DEFINER
-- lets it operate through RLS while still explicitly enforcing tenant context
-- for non-system callers. EXECUTE is restricted to known runtime roles.
-- ============================================================================

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

  IF NOT chatsdk.is_system_context()
     AND channel_app_id <> chatsdk.current_app_id() THEN
    RAISE EXCEPTION 'Channel is outside current tenant context'
      USING ERRCODE = '42501';
  END IF;

  UPDATE channel_seq
  SET current_seq = current_seq + 1
  WHERE channel_id = p_channel_id
    AND app_id = channel_app_id
  RETURNING current_seq INTO new_seq;

  IF new_seq IS NULL THEN
    INSERT INTO channel_seq (channel_id, app_id, current_seq)
    VALUES (p_channel_id, channel_app_id, 1)
    RETURNING current_seq INTO new_seq;
  END IF;

  RETURN new_seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, chatsdk, pg_temp;

-- Revoke EXECUTE from PUBLIC, grant only to the runtime role.
REVOKE ALL ON FUNCTION next_channel_seq(UUID) FROM PUBLIC;
DO $$
BEGIN
  EXECUTE format('GRANT EXECUTE ON FUNCTION next_channel_seq(UUID) TO %I', current_user);
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chatsdk_app') THEN
    GRANT EXECUTE ON FUNCTION next_channel_seq(UUID) TO chatsdk_app;
  END IF;
END;
$$;


-- ============================================================================
-- M-5: Add CHECK constraint to workspace_template.
-- Prevents INSERT of non-public templates without an app_id, which would
-- create orphan "global" templates visible to all tenants.
-- ============================================================================

ALTER TABLE workspace_template
  ADD CONSTRAINT workspace_template_app_or_public
  CHECK (app_id IS NOT NULL OR is_public = true);
