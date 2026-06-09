-- Flyway Migration V013
-- Created: 2026-06-08
-- Description: Make next_channel_seq executable by separated runtime DB roles
--
-- V007 restricted EXECUTE to the migration role and an optional literal
-- chatsdk_app role. Production deployments may use separate Flyway/runtime
-- users with arbitrary names. The function is SECURITY DEFINER and enforces
-- tenant context internally, so runtime compatibility is safer than a
-- migration-time role-name guess.

GRANT EXECUTE ON FUNCTION next_channel_seq(UUID) TO PUBLIC;
