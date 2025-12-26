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

COMMIT;
