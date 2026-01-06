-- Flyway Migration V002
-- Created: 2026-01-03
-- Description: Add workspace invite system for email-based workspace invitations
--
-- This migration adds the workspace_invite table for managing email-based
-- workspace invitations with secure tokens and expiration tracking

-- Create workspace_invite table
CREATE TABLE IF NOT EXISTS workspace_invite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  invited_by VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',  -- owner, admin, member
  message TEXT,  -- Optional personal message from inviter
  status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, expired
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_by VARCHAR(255),  -- User ID who accepted
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (app_id, invited_by) REFERENCES app_user(app_id, id) ON DELETE CASCADE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired'))
);

-- Indexes for performance
CREATE INDEX idx_workspace_invite_workspace ON workspace_invite (workspace_id, status, created_at DESC);
CREATE INDEX idx_workspace_invite_token ON workspace_invite (token) WHERE status = 'pending';
CREATE INDEX idx_workspace_invite_email ON workspace_invite (app_id, email, status);
CREATE INDEX idx_workspace_invite_expires ON workspace_invite (expires_at) WHERE status = 'pending';

-- Comments for documentation
COMMENT ON TABLE workspace_invite IS 'Stores workspace invitation tokens for email-based invites';
COMMENT ON COLUMN workspace_invite.token IS 'Secure random token used in invite URL';
COMMENT ON COLUMN workspace_invite.expires_at IS 'Invite expires after 7 days by default';
COMMENT ON COLUMN workspace_invite.accepted_by IS 'User ID of the person who accepted the invite';

COMMIT;
