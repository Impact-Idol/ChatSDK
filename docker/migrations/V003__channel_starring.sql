-- Flyway Migration V003
-- Created: 2026-01-03
-- Description: Add channel starring support for per-user channel favorites
--
-- This migration adds a starred field to the channel_member table to allow
-- users to mark channels as favorites for quick access

-- Add starred field to channel_member table
ALTER TABLE channel_member
ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT FALSE;

-- Create index for fast lookup of starred channels
CREATE INDEX IF NOT EXISTS idx_channel_member_starred ON channel_member (app_id, user_id, starred) WHERE starred = TRUE;

-- Comments for documentation
COMMENT ON COLUMN channel_member.starred IS 'Whether this channel is starred/favorited by the user';

COMMIT;
