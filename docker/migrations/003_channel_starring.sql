-- Migration: Add channel starring support
-- Created: 2026-01-03
-- Description: Adds starred field to channel_member table for per-user channel favorites

-- Add starred field to channel_member table
ALTER TABLE channel_member
ADD COLUMN starred BOOLEAN DEFAULT FALSE;

-- Create index for fast lookup of starred channels
CREATE INDEX idx_channel_member_starred ON channel_member (app_id, user_id, starred) WHERE starred = TRUE;

-- Comments for documentation
COMMENT ON COLUMN channel_member.starred IS 'Whether this channel is starred/favorited by the user';

COMMIT;
