-- ChatSDK Database Schema
-- Based on Zulip's UserMessage pattern + OpenIMSDK sequence-based sync

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Multi-tenancy: Apps table
CREATE TABLE app (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  api_secret VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  webhook_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users within an app
CREATE TABLE app_user (
  id VARCHAR(255) NOT NULL,
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  name VARCHAR(255),
  image_url TEXT,
  custom_data JSONB DEFAULT '{}',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (app_id, id)
);

-- Channels (conversations)
CREATE TABLE channel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  cid VARCHAR(255) NOT NULL,  -- e.g., "messaging:user1-user2"
  type VARCHAR(50) NOT NULL DEFAULT 'messaging',  -- messaging, group, team, livestream
  name VARCHAR(255),
  image_url TEXT,
  config JSONB DEFAULT '{}',
  member_count INT DEFAULT 0,
  message_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, cid)
);

-- Sequence counter per channel (OpenIMSDK pattern)
CREATE TABLE channel_seq (
  channel_id UUID PRIMARY KEY REFERENCES channel(id) ON DELETE CASCADE,
  current_seq BIGINT DEFAULT 0
);

-- Messages with sequence numbers
CREATE TABLE message (
  id UUID PRIMARY KEY,  -- UUIDv7 (time-sortable)
  channel_id UUID REFERENCES channel(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  seq BIGINT NOT NULL,  -- Sequence number within channel (OpenIMSDK pattern)

  -- Content
  text TEXT,
  attachments JSONB DEFAULT '[]',

  -- Voice/Video
  voice_url TEXT,
  voice_duration_ms INT,
  voice_waveform JSONB,
  video_url TEXT,
  video_thumbnail_url TEXT,
  video_duration_ms INT,

  -- Threading
  parent_id UUID REFERENCES message(id),
  reply_to_id UUID REFERENCES message(id),
  reply_count INT DEFAULT 0,

  -- AI/Vector
  embedding_id VARCHAR(255),

  -- Status
  status VARCHAR(20) DEFAULT 'sent',  -- sending, sent, delivered, read, failed
  shadowed BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id)
);

-- Index for sequence-based sync (OpenIMSDK pattern)
CREATE INDEX idx_message_channel_seq ON message(channel_id, seq);
CREATE INDEX idx_message_created_at ON message(created_at DESC);
CREATE INDEX idx_message_parent ON message(parent_id) WHERE parent_id IS NOT NULL;

-- UserMessage table (Zulip pattern) - per-user message state
CREATE TABLE user_message (
  user_id VARCHAR(255) NOT NULL,
  app_id UUID NOT NULL,
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  flags INT DEFAULT 0,  -- Bitmask: read(1), mentioned(2), starred(4), muted(8)
  PRIMARY KEY (app_id, user_id, message_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

-- Partial indexes for fast queries (Zulip pattern)
CREATE INDEX idx_user_message_unread ON user_message (app_id, user_id, message_id)
  WHERE (flags & 1) = 0;  -- Unread messages only

CREATE INDEX idx_user_message_mentioned ON user_message (app_id, user_id, message_id)
  WHERE (flags & 2) != 0;  -- Mentioned messages only

-- Channel membership
CREATE TABLE channel_member (
  channel_id UUID REFERENCES channel(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',  -- owner, admin, moderator, member
  last_read_message_id UUID,
  last_read_seq BIGINT DEFAULT 0,  -- For sync (OpenIMSDK pattern)
  unread_count INT DEFAULT 0,
  muted BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, app_id, user_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

-- Reactions
CREATE TABLE reaction (
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  emoji VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, app_id, user_id, emoji),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

-- Sync state tracking (OpenIMSDK pattern)
CREATE TABLE sync_state (
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,  -- 'channels', 'messages'
  entity_id VARCHAR(255),  -- channel_id for messages
  version_id VARCHAR(64),  -- Hash for tampering detection
  version BIGINT DEFAULT 0,  -- Monotonic counter
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (app_id, user_id, entity_type, entity_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

-- Device tokens for push notifications
CREATE TABLE device_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL,  -- ios, android, web
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, user_id, token),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

-- File uploads
CREATE TABLE upload (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channel(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  url TEXT,
  width INT,
  height INT,
  duration_ms INT,
  thumbnail_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_upload_channel ON upload (channel_id, created_at DESC);
CREATE INDEX idx_upload_user ON upload (app_id, user_id, created_at DESC);

-- Audit log (for compliance)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL,
  user_id VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_app_time ON audit_log (app_id, created_at DESC);

-- Function to increment channel sequence and return new value
CREATE OR REPLACE FUNCTION next_channel_seq(p_channel_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_seq BIGINT;
BEGIN
  UPDATE channel_seq
  SET current_seq = current_seq + 1
  WHERE channel_id = p_channel_id
  RETURNING current_seq INTO v_seq;

  IF NOT FOUND THEN
    INSERT INTO channel_seq (channel_id, current_seq)
    VALUES (p_channel_id, 1)
    RETURNING current_seq INTO v_seq;
  END IF;

  RETURN v_seq;
END;
$$ LANGUAGE plpgsql;

-- Function to update channel stats on message insert
CREATE OR REPLACE FUNCTION update_channel_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE channel
  SET
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_channel_on_message
AFTER INSERT ON message
FOR EACH ROW
EXECUTE FUNCTION update_channel_on_message();

-- Insert a demo app for development
INSERT INTO app (id, name, settings) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo App',
  '{"ai_enabled": true, "ai_embeddings": false}'
);

-- Insert demo users
INSERT INTO app_user (app_id, id, name, image_url) VALUES
  ('00000000-0000-0000-0000-000000000001', 'user-1', 'Alice Johnson', 'https://i.pravatar.cc/150?u=alice'),
  ('00000000-0000-0000-0000-000000000001', 'user-2', 'Bob Smith', 'https://i.pravatar.cc/150?u=bob'),
  ('00000000-0000-0000-0000-000000000001', 'user-3', 'Carol Williams', 'https://i.pravatar.cc/150?u=carol');

-- Insert demo channel
INSERT INTO channel (id, app_id, cid, type, name, created_by) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'messaging:demo',
  'messaging',
  'Demo Channel',
  'user-1'
);

-- Add members to demo channel
INSERT INTO channel_member (channel_id, app_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'user-1', 'owner'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'user-2', 'member'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'user-3', 'member');

-- Update channel member count
UPDATE channel SET member_count = 3 WHERE id = '00000000-0000-0000-0000-000000000002';

-- Read receipts (per-message read status for each user)
CREATE TABLE read_receipt (
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, app_id, user_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_read_receipt_message ON read_receipt (message_id);
CREATE INDEX idx_read_receipt_user ON read_receipt (app_id, user_id, read_at DESC);

-- User presence (online/offline tracking)
CREATE TABLE user_presence (
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ,
  PRIMARY KEY (app_id, user_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

-- Mentions table (for tracking @mentions in messages)
CREATE TABLE mention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  mentioned_user_id VARCHAR(255) NOT NULL,
  mentioner_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (app_id, mentioned_user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE,
  FOREIGN KEY (app_id, mentioner_user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_mention_user ON mention (app_id, mentioned_user_id, created_at DESC);
CREATE INDEX idx_mention_message ON mention (message_id);

-- ============================================================================
-- Work Stream 4: Multi-Workspace / Team Hierarchy
-- ============================================================================

-- Workspaces (teams, projects, conferences, chapters)
CREATE TABLE workspace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'team',  -- team, project, conference, chapter
  image_url TEXT,
  config JSONB DEFAULT '{}',
  member_count INT DEFAULT 0,
  channel_count INT DEFAULT 0,
  created_by VARCHAR(255),
  expires_at TIMESTAMPTZ,  -- For conference/event workspaces
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, name)
);

CREATE INDEX idx_workspace_app ON workspace (app_id, created_at DESC);
CREATE INDEX idx_workspace_expires ON workspace (expires_at) WHERE expires_at IS NOT NULL;

-- Workspace membership
CREATE TABLE workspace_member (
  workspace_id UUID REFERENCES workspace(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',  -- owner, admin, member
  is_default BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, app_id, user_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_workspace_member_user ON workspace_member (app_id, user_id);

-- Add workspace_id to channel table
ALTER TABLE channel ADD COLUMN workspace_id UUID REFERENCES workspace(id);
CREATE INDEX idx_channel_workspace ON channel (workspace_id) WHERE workspace_id IS NOT NULL;

-- ============================================================================
-- Work Stream 5: Polls & Voting System
-- ============================================================================

-- Polls
CREATE TABLE poll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,  -- [{"id": "opt1", "text": "Option 1"}, ...]
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_multi_choice BOOLEAN DEFAULT FALSE,
  total_votes INT DEFAULT 0,
  ends_at TIMESTAMPTZ,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (app_id, created_by) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_poll_message ON poll (message_id);
CREATE INDEX idx_poll_app ON poll (app_id, created_at DESC);

-- Poll votes
CREATE TABLE poll_vote (
  poll_id UUID REFERENCES poll(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  option_id VARCHAR(50) NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (poll_id, app_id, user_id, option_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_poll_vote_poll ON poll_vote (poll_id);
CREATE INDEX idx_poll_vote_user ON poll_vote (app_id, user_id);

-- Add poll_id and link_previews to message table
ALTER TABLE message ADD COLUMN poll_id UUID REFERENCES poll(id);
ALTER TABLE message ADD COLUMN link_previews JSONB DEFAULT '[]';

-- ============================================================================
-- Work Stream 6: Message Moderation & Reporting
-- ============================================================================

-- Message reports
CREATE TABLE message_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  reporter_user_id VARCHAR(255) NOT NULL,
  reason VARCHAR(50) NOT NULL,  -- harassment, spam, inappropriate, violence, hate_speech
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, reviewed, actioned, dismissed
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  action_taken VARCHAR(100),  -- deleted_message, warned_user, banned_user, none
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (app_id, reporter_user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_report_status ON message_report (app_id, status, created_at DESC);
CREATE INDEX idx_report_message ON message_report (message_id);

-- ============================================================================
-- Work Stream 7: User Blocking
-- ============================================================================

-- User blocks
CREATE TABLE user_block (
  blocker_user_id VARCHAR(255) NOT NULL,
  blocked_user_id VARCHAR(255) NOT NULL,
  app_id UUID NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (app_id, blocker_user_id, blocked_user_id),
  FOREIGN KEY (app_id, blocker_user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE,
  FOREIGN KEY (app_id, blocked_user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE,
  CONSTRAINT no_self_block CHECK (blocker_user_id != blocked_user_id)
);

CREATE INDEX idx_user_block_blocker ON user_block (app_id, blocker_user_id);
CREATE INDEX idx_user_block_blocked ON user_block (app_id, blocked_user_id);

-- ============================================================================
-- Work Stream 10 & 11: Pinned & Saved Messages (TIER 2)
-- ============================================================================

-- Pinned messages
CREATE TABLE pinned_message (
  channel_id UUID REFERENCES channel(id) ON DELETE CASCADE,
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  pinned_by VARCHAR(255) NOT NULL,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, message_id),
  FOREIGN KEY (app_id, pinned_by) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_pinned_channel ON pinned_message (channel_id, pinned_at DESC);

-- Saved messages (bookmarks)
CREATE TABLE saved_message (
  user_id VARCHAR(255) NOT NULL,
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (app_id, user_id, message_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_saved_user ON saved_message (app_id, user_id, saved_at DESC);

-- ============================================================================
-- Work Stream 15: Supervised User / Guardian Monitoring (TIER 3)
-- ============================================================================

-- Supervised users (parent/guardian monitoring)
CREATE TABLE supervised_user (
  supervisor_user_id VARCHAR(255) NOT NULL,
  supervised_user_id VARCHAR(255) NOT NULL,
  app_id UUID NOT NULL,
  monitoring_enabled BOOLEAN DEFAULT TRUE,
  supervision_type VARCHAR(50) DEFAULT 'guardian',  -- guardian, school, organization
  age_restriction INT,  -- Auto-disable at this age
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (app_id, supervisor_user_id, supervised_user_id),
  FOREIGN KEY (app_id, supervisor_user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE,
  FOREIGN KEY (app_id, supervised_user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE,
  CONSTRAINT no_self_supervision CHECK (supervisor_user_id != supervised_user_id)
);

CREATE INDEX idx_supervised_supervisor ON supervised_user (app_id, supervisor_user_id);
CREATE INDEX idx_supervised_user ON supervised_user (app_id, supervised_user_id);

-- ============================================================================
-- Work Stream 16: Auto-Enrollment Rules Engine (TIER 3)
-- ============================================================================

-- Auto-enrollment rules
CREATE TABLE enrollment_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspace(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channel(id) ON DELETE SET NULL,
  rule_type VARCHAR(50) NOT NULL,  -- all_users, role_based, tag_based, event_trigger, attribute_match
  conditions JSONB NOT NULL,  -- {"role": "volunteer", "tags": ["SF", "tech"], "attributes": {...}}
  actions JSONB NOT NULL,  -- {"add_to_channel": "...", "assign_role": "...", "send_message": "..."}
  priority INT DEFAULT 0,  -- Higher priority rules execute first
  enabled BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (app_id, created_by) REFERENCES app_user(app_id, id) ON DELETE SET NULL
);

CREATE INDEX idx_enrollment_workspace ON enrollment_rule (workspace_id, enabled);
CREATE INDEX idx_enrollment_channel ON enrollment_rule (channel_id, enabled);
CREATE INDEX idx_enrollment_app ON enrollment_rule (app_id, enabled, priority DESC);

-- Enrollment rule execution log
CREATE TABLE enrollment_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES enrollment_rule(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_enrollment_execution_rule ON enrollment_execution (rule_id, executed_at DESC);
CREATE INDEX idx_enrollment_execution_user ON enrollment_execution (app_id, user_id, executed_at DESC);

-- ============================================================================
-- Work Stream 17: Workspace Templates & Presets (TIER 3)
-- ============================================================================

-- Workspace templates
CREATE TABLE workspace_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),  -- conference, project, team, education, community
  icon VARCHAR(50),
  config JSONB NOT NULL,  -- Template configuration
  channels JSONB NOT NULL,  -- Pre-defined channels
  roles JSONB,  -- Pre-defined roles
  settings JSONB,  -- Default settings
  is_public BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(255),
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_category ON workspace_template (category, is_public);
CREATE INDEX idx_template_usage ON workspace_template (usage_count DESC);

-- ============================================================================
-- Work Stream 18: Custom Emoji Support (TIER 3)
-- ============================================================================

-- Custom emoji
CREATE TABLE custom_emoji (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspace(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,  -- :emoji_name:
  image_url TEXT NOT NULL,
  category VARCHAR(50),  -- custom, brand, team
  created_by VARCHAR(255),
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, workspace_id, name),
  FOREIGN KEY (app_id, created_by) REFERENCES app_user(app_id, id) ON DELETE SET NULL
);

CREATE INDEX idx_emoji_workspace ON custom_emoji (workspace_id, category);
CREATE INDEX idx_emoji_usage ON custom_emoji (app_id, usage_count DESC);

-- Emoji usage tracking (for analytics)
CREATE TABLE emoji_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji_id UUID REFERENCES custom_emoji(id) ON DELETE CASCADE,
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_emoji_usage_emoji ON emoji_usage (emoji_id, used_at DESC);
CREATE INDEX idx_emoji_usage_user ON emoji_usage (app_id, user_id, used_at DESC);

-- ============================================================================
-- Work Stream 21: Webhooks & Event System (TIER 4)
-- ============================================================================

-- Webhook subscriptions
CREATE TABLE webhook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  url TEXT NOT NULL,  -- Endpoint to receive events
  events JSONB NOT NULL,  -- Array of event types to subscribe to
  description TEXT,
  secret VARCHAR(255) NOT NULL,  -- HMAC secret for signature verification
  enabled BOOLEAN DEFAULT TRUE,
  failure_count INT DEFAULT 0,  -- Consecutive failure count
  last_failure_at TIMESTAMPTZ,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (app_id, created_by) REFERENCES app_user(app_id, id) ON DELETE SET NULL
);

CREATE INDEX idx_webhook_app_events ON webhook (app_id, enabled) WHERE enabled = true;
CREATE INDEX idx_webhook_failures ON webhook (failure_count DESC, last_failure_at DESC);

-- Webhook delivery log
CREATE TABLE webhook_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhook(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,  -- Event type that was sent
  success BOOLEAN NOT NULL,
  status_code INT,  -- HTTP status code
  error_message TEXT,  -- Error details if failed
  retry_count INT DEFAULT 0,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_webhook ON webhook_delivery (webhook_id, attempted_at DESC);
CREATE INDEX idx_delivery_success ON webhook_delivery (success, attempted_at DESC);

COMMIT;
