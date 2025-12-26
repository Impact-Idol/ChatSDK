# ChatSDK Product Strategy & Implementation Plan

## Executive Summary

Build a **GetStream.io competitor** - an embeddable, multi-tenant chat platform with exceptional features and UI UX and with:
Remember we have @openimsdk_learnings.md file with more details.
| Deliverable | Description |
|-------------|-------------|
| **Hosted Backend** | Centrifugo + PostgreSQL + Inngest + FCM/Novu + Meilisearch + Qdrant |
| **Embeddable SDKs** | React, React Native, iOS Swift, Android Kotlin |
| **Complete Native Apps** | Production-ready iOS & Android apps (white-label ready) |
| **Self-Hosting Option** | Docker Compose for on-premise deployment |
| **Developer Tools** | CLI scaffolding, Theme Studio, Storybook, Dashboard |
| **Enterprise Compliance** | PCI-DSS + HIPAA ready from day 1 (audit logs, encryption, BYOK) |

**Key Differentiators**:
- **AI-Native**: Vector embeddings, semantic search, smart replies, catch-up summaries
- **Voice-First**: Voice notes with waveform visualization (table stakes in 2025)
- **Offline-first**: Messages work without network, sync when online
- **Sub-100ms latency**: Centrifugo WebSocket + Optimistic UI
- **Fluid Mobile UX**: Spring physics, haptic feedback, shared element transitions
- **Developer-first DX**: `npx chatsdk init` → working app in 30 seconds
- **White-label apps**: Clone & customize complete iOS/Android apps
- **E2EE Option**: Signal protocol for private 1:1 conversations
- **Better Auth**: Modern auth library for email, OAuth, 2FA, magic links

---

## Strategic Decisions (Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Hosting Model** | Both (Open-source + Cloud) | Maximum market reach. OSS core builds community, cloud generates revenue |
| **Mobile Strategy** | All three in parallel | React Native + iOS Swift + Android Kotlin. Premium experience on all platforms |
| **AI Features** | Configurable opt-in | AI infrastructure ready from day 1, but customers can disable. No data sent to AI if disabled. |
| **Search Engine** | Meilisearch + Qdrant | Text search + Vector search. Qdrant only active when AI enabled. |
| **Compliance** | PCI-DSS + HIPAA from day 1 | Enterprise requirement. Built-in, not bolted-on. |
| **Authentication** | Better Auth | TypeScript-first, 2FA, OAuth, magic links, session management |
| **Push Notifications** | Firebase Cloud Messaging + Novu | FCM for reliable delivery, Novu for orchestration |
| **E2E Encryption** | Signal Protocol (libsignal) | Industry standard, Double Ratchet algorithm |

---

## Authentication Architecture (Better Auth)

### Why Better Auth?
- **TypeScript-first**: Full type safety, works with our stack
- **Database agnostic**: Works with PostgreSQL via Drizzle
- **Feature-rich**: Email/password, OAuth (Google, GitHub, Apple), Magic Links, 2FA
- **Session management**: Secure cookies, token refresh, device management
- **No vendor lock-in**: Self-hosted, no external auth service required

### User Model (Extended)
```sql
-- Better Auth core tables (auto-generated)
CREATE TABLE auth_user (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth_session (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES auth_user(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth_account (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES auth_user(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'email', 'google', 'github', 'apple'
  provider_account_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ
);

-- Link auth_user to app_user for multi-tenant
ALTER TABLE app_user ADD COLUMN auth_user_id VARCHAR(255) REFERENCES auth_user(id);
```

### Auth Flow
```
1. User signs up via Better Auth → auth_user created
2. First SDK connection → app_user created with auth_user_id link
3. Better Auth issues session token → SDK uses for API calls
4. Centrifugo JWT derived from session → Real-time auth
```

---

## Push Notification Architecture (FCM + Novu)

### Why FCM + Novu instead of OneSignal?
- **FCM**: More reliable on iOS (OneSignal had intermittent iOS issues)
- **FCM**: Free, Google-backed, native integration with Android
- **Novu**: Open-source notification infrastructure
- **Novu**: Digests, preferences, in-app notifications, multi-channel

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Inngest     │────▶│      Novu       │────▶│       FCM       │
│  (Event Source) │     │ (Orchestration) │     │   (Delivery)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   In-App Toast  │     │   APNs/GCM      │
                        │   Notification  │     │   Push          │
                        └─────────────────┘     └─────────────────┘
```

### Novu Workflow Example
```typescript
// Inngest function triggers Novu
const messageSent = inngest.createFunction(
  { id: 'chat/message.sent' },
  { event: 'chat/message.sent' },
  async ({ event, step }) => {
    const { message, channel, recipients } = event.data;

    // Novu handles: digest (bundle multiple messages), preferences, delivery
    await step.run('notify-via-novu', async () => {
      return novu.trigger('new-message', {
        to: recipients.map(r => ({
          subscriberId: r.user_id,
          email: r.email,
          phone: r.phone,
        })),
        payload: {
          channelName: channel.name,
          senderName: message.user.name,
          messagePreview: message.text.slice(0, 100),
          channelId: channel.id,
          messageId: message.id,
        },
      });
    });
  }
);
```

### Device Token Management
```sql
CREATE TABLE device_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id),
  user_id VARCHAR(255) NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL,  -- 'ios', 'android', 'web'
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, user_id, token)
);
```

---

## End-to-End Encryption (E2EE) Architecture

### Signal Protocol Implementation
We use the **Signal Protocol** (via libsignal) for E2EE in 1:1 DMs. This provides:
- **Perfect Forward Secrecy**: Compromised key doesn't reveal past messages
- **Future Secrecy**: Compromised key doesn't reveal future messages
- **Deniability**: Messages can't be cryptographically attributed

### E2EE Schema Extensions
```sql
-- User's identity keys (one per app_user)
CREATE TABLE e2ee_identity_key (
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  public_key BYTEA NOT NULL,           -- Identity key (public)
  private_key_encrypted BYTEA,          -- Identity key (encrypted with user's master key)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (app_id, user_id)
);

-- Pre-keys for async key exchange (bundle of one-time keys)
CREATE TABLE e2ee_prekey (
  id SERIAL PRIMARY KEY,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  key_id INT NOT NULL,
  public_key BYTEA NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, user_id, key_id)
);

-- Signed pre-key (rotated periodically)
CREATE TABLE e2ee_signed_prekey (
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  key_id INT NOT NULL,
  public_key BYTEA NOT NULL,
  signature BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (app_id, user_id)
);

-- Session state between two users
CREATE TABLE e2ee_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  peer_user_id VARCHAR(255) NOT NULL,
  session_data BYTEA NOT NULL,         -- Encrypted session state
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, user_id, peer_user_id)
);
```

### E2EE Message Flow
```
1. Alice wants to send encrypted message to Bob
2. Alice fetches Bob's pre-key bundle (identity key, signed pre-key, one-time pre-key)
3. Alice performs X3DH key agreement → establishes shared secret
4. Alice encrypts message with shared secret using Double Ratchet
5. Message stored on server with encrypted body (server can't read)
6. Bob receives message, decrypts with his session state
7. Both parties update ratchet state for next message
```

### E2EE Message Schema
```sql
-- Encrypted messages (server cannot read content)
CREATE TABLE encrypted_message (
  id UUID PRIMARY KEY,  -- UUIDv7
  app_id UUID NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  recipient_id VARCHAR(255) NOT NULL,
  ciphertext BYTEA NOT NULL,           -- Encrypted message content
  ratchet_key BYTEA,                   -- Public ratchet key for this message
  counter INT NOT NULL,                -- Message counter for ordering
  prev_counter INT,                    -- Previous chain counter
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### E2EE App Configuration
```json
{
  "e2ee_enabled": true,
  "e2ee_required_for_dm": false,   // If true, all 1:1 DMs are encrypted
  "e2ee_key_backup": "icloud",     // 'icloud', 'google', 'none'
  "e2ee_verification_required": false  // Require key verification for new sessions
}
```

---

## Compliance Architecture (PCI-DSS + HIPAA)

### Data Protection Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Encryption at Rest** | AES-256 for PostgreSQL (via pgcrypto), S3 server-side encryption |
| **Encryption in Transit** | TLS 1.3 everywhere. No plaintext connections. |
| **Access Logging** | Immutable audit log table. Every read/write logged with user, timestamp, IP |
| **Data Residency** | Configurable region (US, EU, APAC). Data never leaves region. |
| **Key Management** | AWS KMS / HashiCorp Vault. No keys in code. |
| **PHI/PCI Detection** | Optional Inngest step to detect & redact sensitive data before storage |

### Audit Log Schema

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL,
  user_id VARCHAR(255),
  action VARCHAR(50) NOT NULL,        -- 'read', 'create', 'update', 'delete'
  resource_type VARCHAR(50) NOT NULL, -- 'message', 'channel', 'user'
  resource_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable: No UPDATE or DELETE allowed via app. Archive to cold storage.
CREATE INDEX idx_audit_log_app_time ON audit_log (app_id, created_at DESC);
```

### App-Level AI Configuration

```sql
-- In app.settings JSONB:
{
  "ai_enabled": true,              -- Master toggle for AI features
  "ai_embeddings": true,           -- Generate vector embeddings
  "ai_smart_replies": true,        -- Show smart reply suggestions
  "ai_catch_up_summaries": true,   -- Channel catch-up feature
  "ai_moderation": false,          -- Auto-moderation (premium)
  "data_retention_days": 365,      -- HIPAA: configurable retention
  "pii_detection": true,           -- Scan for PII/PHI before storage
  "encryption_key_id": "vault://..." -- Customer-managed key (BYOK)
}
```

---

## Part 1: Gap Analysis vs GetStream

### Features We MUST Have (GetStream Parity)

| Category | GetStream Feature | Priority | Complexity |
|----------|------------------|----------|------------|
| **Core Messaging** | Rich text, attachments, reactions | P0 | Medium |
| **Threading** | Replies, quoted messages, threads | P0 | Medium |
| **Real-time** | Typing indicators, read receipts, presence | P0 | Medium |
| **Channels** | 1:1, group, public channels with roles | P0 | Medium |
| **Search** | Full-text message search | P1 | High |
| **Moderation** | Shadow ban, slow mode, freeze, block | P1 | Medium |
| **Media** | Image/video upload, thumbnails, galleries | P1 | High |
| **Offline** | Local cache, optimistic UI, sync engine | P0 | High |
| **Push** | Smart notifications with bundling | P0 | Medium |
| **SDK Components** | ChannelList, MessageList, MessageInput, Thread | P0 | High |
| **Theming** | CSS variables, component customization | P1 | Medium |
| **AI** | Smart replies, auto-moderation | P2 | High |

### Features That Make Us BETTER

| Feature | Description | Why It Wins |
|---------|-------------|-------------|
| **Cursor Pagination** | ID-based, not offset | No message skipping on fast streams |
| **Zulip UserMessage** | Denormalized read state | 10x faster unread queries |
| **Huly Event Bus** | Kafka-style transactions | Reliable at-least-once delivery |
| **Inngest Orchestration** | Step functions for notifications | Automatic retry, observability |
| **CLI Scaffolding** | `npx chatsdk init` | 30-second setup |
| **Storybook Playground** | Copy-paste components | Visual DX |

---

## Part 2: Technical Architecture

### 2.1 Backend Stack (Node.js/TypeScript)

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (Hono/Express)               │
│  - JWT Auth (App API Key + User Token)                         │
│  - Rate Limiting (per-tenant)                                  │
│  - Request Validation (Zod)                                    │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Centrifugo    │  │   PostgreSQL    │  │    Inngest      │
│   (Real-time)   │  │   (Data Store)  │  │   (Workers)     │
│                 │  │                 │  │                 │
│ - WebSocket     │  │ - Messages      │  │ - Push (FCM/Novu) │
│ - Pub/Sub       │  │ - Channels      │  │ - Webhooks      │
│ - Presence      │  │ - UserMessage   │  │ - AI Pipeline   │
│ - Auth via JWT  │  │ - Reactions     │  │ - Thumbnails    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Meilisearch   │  │     Qdrant      │  │   S3/R2 Storage │
│   (Text Search) │  │ (Vector Search) │  │   (Attachments) │
│                 │  │                 │  │                 │
│ - Typo-tolerant │  │ - Embeddings    │  │ - Images/Video  │
│ - Faceted       │  │ - Semantic      │  │ - Voice notes   │
│ - Fast          │  │ - RAG-ready     │  │ - Thumbnails    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**AI Pipeline (Inngest):**
```
Message Created → Embed (OpenAI/Cohere) → Store in Qdrant → Index in Meilisearch
```

### 2.2 Database Schema (Zulip-Inspired)

**Critical Insight from Zulip**: The `UserMessage` table is the secret to performance.

```sql
-- Multi-tenancy
CREATE TABLE app (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  api_secret VARCHAR(64) NOT NULL,
  webhook_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users within an app
CREATE TABLE app_user (
  id VARCHAR(255) NOT NULL,  -- Customer-provided ID
  app_id UUID REFERENCES app(id),
  name VARCHAR(255),
  image_url TEXT,
  custom_data JSONB DEFAULT '{}',
  last_active_at TIMESTAMPTZ,
  PRIMARY KEY (app_id, id)
);

-- Channels (Zulip's Recipient pattern)
CREATE TABLE channel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id),
  cid VARCHAR(255) NOT NULL,  -- e.g., "messaging:general"
  type VARCHAR(50) NOT NULL,   -- messaging, livestream, team, commerce
  name VARCHAR(255),
  config JSONB DEFAULT '{}',   -- frozen, slow_mode_interval, etc.
  member_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, cid)
);

-- Messages (UUIDv7 for time-sortable IDs)
CREATE TABLE message (
  id UUID PRIMARY KEY,  -- UUIDv7
  channel_id UUID REFERENCES channel(id),
  user_id VARCHAR(255) NOT NULL,
  app_id UUID NOT NULL,

  -- Content
  text TEXT,
  attachments JSONB DEFAULT '[]',

  -- Voice/Video (2025 table stakes)
  voice_url TEXT,                -- S3 URL for voice note
  voice_duration_ms INT,         -- Duration in milliseconds
  voice_waveform JSONB,          -- Array of amplitude values for visualization
  video_url TEXT,                -- S3 URL for video bubble
  video_thumbnail_url TEXT,      -- Thumbnail for video preview
  video_duration_ms INT,

  -- Threading
  parent_id UUID REFERENCES message(id),  -- Thread parent
  reply_to_id UUID REFERENCES message(id), -- Quoted reply

  -- AI/Vector
  embedding_id VARCHAR(255),     -- Reference to Qdrant vector

  -- Moderation
  shadowed BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id)
);

-- THE CRITICAL TABLE: UserMessage (Zulip pattern)
-- ~32 bytes per row, optimized for billions of rows
CREATE TABLE user_message (
  user_id VARCHAR(255) NOT NULL,
  app_id UUID NOT NULL,
  message_id UUID REFERENCES message(id),
  flags INT DEFAULT 0,  -- Bitmask: read(1), mentioned(2), starred(4)
  PRIMARY KEY (app_id, user_id, message_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id)
);

-- Partial indexes for fast queries (Zulip's secret)
CREATE INDEX idx_user_message_unread
  ON user_message (app_id, user_id, message_id)
  WHERE (flags & 1) = 0;  -- Unread messages only

CREATE INDEX idx_user_message_mentioned
  ON user_message (app_id, user_id, message_id)
  WHERE (flags & 2) != 0;  -- Mentioned messages only

-- Channel membership
CREATE TABLE channel_member (
  channel_id UUID REFERENCES channel(id),
  user_id VARCHAR(255) NOT NULL,
  app_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'member',  -- admin, moderator, member
  last_read_message_id UUID,
  muted BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, app_id, user_id)
);

-- Reactions
CREATE TABLE reaction (
  message_id UUID REFERENCES message(id),
  user_id VARCHAR(255) NOT NULL,
  app_id UUID NOT NULL,
  emoji_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, app_id, user_id, emoji_code)
);
```

### 2.3 Real-Time Architecture (Centrifugo)

**Channel Naming Convention:**
```
chat:app:{app_id}:channel:{channel_id}     # Channel messages
chat:app:{app_id}:user:{user_id}           # Private user events
chat:app:{app_id}:presence:{channel_id}    # Presence updates
```

**JWT Token Structure:**
```typescript
interface CentrifugoToken {
  sub: string;           // user_id
  info: {
    app_id: string;
    name: string;
  };
  channels: string[];    // Allowed channel patterns
  exp: number;           // Expiration
}
```

**Event Types:**
```typescript
type ChatEvent =
  | { type: 'message.new'; message: Message }
  | { type: 'message.updated'; message: Message }
  | { type: 'message.deleted'; message_id: string }
  | { type: 'reaction.new'; reaction: Reaction }
  | { type: 'reaction.deleted'; reaction: Reaction }
  | { type: 'typing.start'; user: User; channel_id: string }
  | { type: 'typing.stop'; user: User; channel_id: string }
  | { type: 'read.update'; user_id: string; message_id: string }
  | { type: 'member.added'; member: ChannelMember }
  | { type: 'member.removed'; user_id: string; channel_id: string };
```

### 2.4 Search Integration (Meilisearch)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │────▶│    Inngest      │────▶│   Meilisearch   │
│   (Primary DB)  │     │   (Sync Job)    │     │   (Search)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Meilisearch Index Schema:**
```json
{
  "uid": "messages",
  "primaryKey": "id",
  "searchableAttributes": ["text", "user.name", "channel.name"],
  "filterableAttributes": ["app_id", "channel_id", "user_id", "created_at"],
  "sortableAttributes": ["created_at"]
}
```

### 2.5 Async Workers (Inngest)

```typescript
// inngest/functions/message-sent.ts
export const messageSent = inngest.createFunction(
  { id: 'chat/message.sent' },
  { event: 'chat/message.sent' },
  async ({ event, step }) => {
    const { message, channel, app } = event.data;

    // Step 1: Fan-out push notifications
    const recipients = await step.run('get-recipients', async () => {
      return db.channelMember.findMany({
        where: {
          channel_id: channel.id,
          user_id: { not: message.user_id },
          muted: false
        },
        include: { user: true }
      });
    });

    // Step 2: Filter online users (skip push if on socket)
    const offlineRecipients = await step.run('filter-online', async () => {
      const onlineUsers = await centrifugo.presence(`chat:app:${app.id}:channel:${channel.id}`);
      return recipients.filter(r => !onlineUsers.includes(r.user_id));
    });

    // Step 3: Send push via Novu/FCM (with debounce)
    if (offlineRecipients.length > 0) {
      await step.run('send-push', async () => {
        return onesignal.createNotification({
          app_id: app.onesignal_app_id,
          include_player_ids: offlineRecipients.map(r => r.user.player_id),
          headings: { en: channel.name },
          contents: { en: `${message.user.name}: ${message.text.slice(0, 100)}` },
          data: { channel_id: channel.id, message_id: message.id }
        });
      });
    }

    // Step 4: Webhook (if configured)
    if (app.webhook_url) {
      await step.run('send-webhook', async () => {
        return fetch(app.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'message.new',
            message,
            channel,
            app_id: app.id
          })
        });
      });
    }

    // Step 5: Index in Meilisearch
    await step.run('index-message', async () => {
      return meilisearch.index('messages').addDocuments([{
        id: message.id,
        text: message.text,
        app_id: app.id,
        channel_id: channel.id,
        user_id: message.user_id,
        user: { name: message.user.name },
        channel: { name: channel.name },
        created_at: message.created_at
      }]);
    });

    // Step 6: AI Moderation (optional - premium feature)
    if (app.settings.auto_moderation) {
      const flagged = await step.run('ai-moderate', async () => {
        return moderateContent(message.text);
      });

      if (flagged) {
        await step.run('shadow-ban', async () => {
          return db.message.update({
            where: { id: message.id },
            data: { shadowed: true }
          });
        });
      }
    }
  }
);
```

---

## Part 3: SDK Architecture

### 3.1 Monorepo Structure

```
chatsdk/
├── backend/                 # Node.js API Server
│   ├── src/
│   │   ├── routes/         # Hono routes
│   │   ├── inngest/        # Async workers
│   │   ├── db/             # Drizzle schema
│   │   └── centrifugo/     # Real-time integration
│   └── package.json
│
├── packages/                # SDKs (Embeddable Libraries)
│   ├── core/               # @chatsdk/core - TypeScript core
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── channel.ts
│   │   │   ├── message.ts
│   │   │   ├── sync.ts     # Offline sync engine
│   │   │   └── socket.ts   # Centrifugo WebSocket
│   │   └── package.json
│   │
│   ├── react/              # @chatsdk/react - React components
│   │   ├── src/
│   │   │   ├── ChatProvider.tsx
│   │   │   ├── components/
│   │   │   │   ├── ChannelList/
│   │   │   │   ├── MessageList/
│   │   │   │   ├── MessageInput/
│   │   │   │   └── Thread/
│   │   │   └── hooks/
│   │   └── package.json
│   │
│   ├── react-native/       # @chatsdk/react-native - RN components
│   │   ├── src/
│   │   │   ├── components/ # NativeWind components
│   │   │   └── storage/    # SQLite persistence
│   │   └── package.json
│   │
│   ├── ios/                # ChatSDK.swift - Swift Package
│   │   ├── Sources/
│   │   │   ├── ChatClient/
│   │   │   ├── UI/         # SwiftUI components
│   │   │   └── Storage/    # CoreData
│   │   └── Package.swift
│   │
│   └── android/            # io.chatsdk:chat-sdk - Kotlin
│       ├── core/
│       ├── compose-ui/     # Jetpack Compose
│       └── build.gradle.kts
│
├── apps/                    # Complete Standalone Apps
│   ├── web/                # Next.js web app
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── mobile-rn/          # React Native (Expo) app
│   │   ├── app/            # Expo Router
│   │   └── package.json
│   │
│   ├── ios/                # Native iOS app (SwiftUI)
│   │   ├── ChatApp/
│   │   │   ├── Views/
│   │   │   ├── Models/
│   │   │   └── Services/
│   │   └── ChatApp.xcodeproj
│   │
│   └── android/            # Native Android app (Compose)
│       ├── app/
│       │   ├── src/main/
│       │   │   ├── java/
│       │   │   └── res/
│       └── build.gradle.kts
│
├── docs/                    # Documentation site
│   └── specs/
│
└── docker/                  # Self-hosting configs
    └── docker-compose.yml
```

### 3.2 React SDK API Design (GetStream Parity)

```tsx
// Basic Usage
import { ChatProvider, ChannelList, Channel, MessageList, MessageInput } from '@chatsdk/react';

function App() {
  const client = useMemo(() => new ChatClient('API_KEY'), []);

  useEffect(() => {
    client.connectUser({ id: 'user-1', name: 'John' }, 'USER_TOKEN');
    return () => client.disconnectUser();
  }, []);

  return (
    <ChatProvider client={client}>
      <ChannelList
        filters={{ type: 'messaging', members: { $in: ['user-1'] } }}
        sort={{ last_message_at: -1 }}
      />
      <Channel>
        <MessageList />
        <MessageInput />
      </Channel>
    </ChatProvider>
  );
}
```

**Required Components (GetStream Parity):**

| Component | Description | Props |
|-----------|-------------|-------|
| `Chat` | Root provider | `client`, `theme`, `i18n` |
| `ChannelList` | Channel sidebar | `filters`, `sort`, `options`, `Preview` |
| `Channel` | Channel context | `channel`, `LoadingIndicator` |
| `MessageList` | Virtualized messages | `messageActions`, `renderMessage` |
| `VirtualizedMessageList` | For 10k+ messages | Same + `itemSize` |
| `MessageInput` | Composer | `additionalTextareaProps`, `grow` |
| `Thread` | Thread view | `fullWidth` |
| `ChannelHeader` | Channel info | `Avatar`, `title` |
| `Attachment` | File/image preview | `attachments` |
| `ReactionSelector` | Emoji picker | `reactionOptions` |

**Required Hooks:**

| Hook | Purpose |
|------|---------|
| `useChatContext` | Access client |
| `useChannelStateContext` | Channel state |
| `useMessageContext` | Current message |
| `useTypingContext` | Typing users |
| `useChannelActionContext` | Channel mutations |

### 3.3 Offline-First Engine

```typescript
// packages/core/src/sync.ts
export class SyncEngine {
  private db: LocalDB;  // IndexedDB (web) or SQLite (mobile)
  private pendingQueue: PendingAction[] = [];

  async initialize() {
    // Load cached channels and messages
    this.channels = await this.db.channels.toArray();
    this.pendingQueue = await this.db.pending.toArray();
  }

  async sendMessage(channel: Channel, text: string): Promise<Message> {
    // 1. Create optimistic message with temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      text,
      user: this.client.user,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    // 2. Update UI immediately
    this.emit('message.new', optimisticMessage);
    await this.db.messages.put(optimisticMessage);

    // 3. Queue for sync
    const action: PendingAction = {
      type: 'send_message',
      channel_id: channel.id,
      payload: { text },
      temp_id: tempId,
      created_at: Date.now()
    };
    await this.db.pending.put(action);

    // 4. Try to sync immediately
    if (navigator.onLine) {
      await this.processPendingQueue();
    }

    return optimisticMessage;
  }

  async processPendingQueue() {
    for (const action of this.pendingQueue) {
      try {
        const result = await this.executeAction(action);

        // Replace temp message with real one
        if (action.type === 'send_message') {
          await this.db.messages.delete(action.temp_id);
          await this.db.messages.put(result);
          this.emit('message.updated', {
            temp_id: action.temp_id,
            message: result
          });
        }

        await this.db.pending.delete(action.id);
      } catch (error) {
        if (error.status === 400) {
          // Permanent failure, mark as failed
          action.status = 'failed';
          await this.db.pending.put(action);
        }
        // Network error: will retry on reconnect
      }
    }
  }

  async syncFromServer(lastSyncedAt: Date) {
    const diff = await this.client.api.sync({
      last_synced_at: lastSyncedAt.toISOString()
    });

    // Apply diff to local DB
    for (const message of diff.messages) {
      await this.db.messages.put(message);
    }
    for (const channel of diff.channels) {
      await this.db.channels.put(channel);
    }
  }
}
```

---

## Part 4: Implementation Phases

### Phase 1: Core Engine (Weeks 1-4)

**Backend:**
- [ ] Project setup: Hono + Drizzle + PostgreSQL
- [ ] Multi-tenant auth middleware (API key + user JWT)
- [ ] CRUD APIs: Apps, Users, Channels, Messages
- [ ] Cursor-based pagination (UUIDv7)
- [ ] Centrifugo integration (publish on message create)
- [ ] UserMessage table with flags (Zulip pattern)

**Deliverable:** Working REST API with real-time via Centrifugo

### Phase 2: Async Workers (Weeks 5-6)

- [ ] Inngest setup and event definitions
- [ ] `chat/message.sent` flow (push, webhooks)
- [ ] FCM + Novu integration
- [ ] Push notification bundling via Novu digests
- [ ] Webhook delivery with retries
- [ ] Meilisearch indexing

**Deliverable:** Reliable push notifications, webhooks, and search

### Phase 3: React SDK MVP (Weeks 7-10)

- [ ] `@chatsdk/core` - ChatClient, sync engine
- [ ] `@chatsdk/react` - Provider, hooks
- [ ] Components: ChannelList, MessageList, MessageInput
- [ ] Virtualized list (react-virtuoso)
- [ ] Optimistic UI updates
- [ ] Theming system (CSS variables)

**Deliverable:** Drop-in React components

### Phase 4: Mobile SDKs (Weeks 11-16)

**React Native (Weeks 11-14):**
- [ ] `@chatsdk/react-native` - NativeWind components
- [ ] AsyncStorage/SQLite persistence
- [ ] Push notification handling (FCM + Novu SDK)

**iOS Swift (Weeks 11-14, parallel team):**
- [ ] ChatClient with async/await
- [ ] SwiftUI components (ChannelListView, MessageListView)
- [ ] CoreData persistence
- [ ] APNs integration

**Android Kotlin (Weeks 11-14, parallel team):**
- [ ] ChatClient with coroutines
- [ ] Jetpack Compose UI
- [ ] Room database persistence
- [ ] FCM integration

**Integration Testing (Weeks 15-16):**
- [ ] Cross-platform test suite
- [ ] Performance benchmarks

**Deliverable:** Native SDKs with offline support

### Phase 5: Advanced Features (Weeks 17-20)

- [ ] Threads and quoted replies
- [ ] File uploads (S3 presigned URLs)
- [ ] Thumbnail generation (Inngest + Sharp)
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Presence system
- [ ] Moderation tools (shadow ban, slow mode)

### Phase 6: Complete Native Apps (Weeks 21-26)

**Purpose:** Production-ready standalone chat apps that serve as:
- Reference implementations for SDK users
- White-label templates for enterprise customers
- App Store/Play Store showcase apps

**iOS App (SwiftUI):**
- [ ] Full-featured chat app using ChatSDK Swift
- [ ] Authentication flow (email, Apple Sign-In, Google)
- [ ] Channel browsing, creation, search
- [ ] Rich message composer (images, files, voice)
- [ ] Push notification handling with deep linking
- [ ] Offline mode with sync indicator
- [ ] Settings (notifications, appearance, blocked users)
- [ ] iPad support with split view
- [ ] App Store submission

**Android App (Jetpack Compose):**
- [ ] Full-featured chat app using ChatSDK Android
- [ ] Authentication flow (email, Google Sign-In)
- [ ] Material You theming
- [ ] Adaptive layouts (phone, tablet, foldable)
- [ ] Background sync with WorkManager
- [ ] Widget for recent conversations
- [ ] Play Store submission

**React Native App (Expo):**
- [ ] Cross-platform reference app
- [ ] EAS Build for distribution
- [ ] Expo Router for navigation
- [ ] Shared codebase with web

### Phase 7: Developer Experience (Weeks 27-30)

- [ ] CLI tool: `npx chatsdk init`
- [ ] Storybook playground
- [ ] Dashboard (usage analytics)
- [ ] Documentation site
- [ ] App cloning tool: `npx chatsdk clone-app ios|android`

---

## Part 5: Deployment Strategy

### Dual Deployment Model

**Open-Source Edition:**
- Full backend (Hono + PostgreSQL + Centrifugo + Meilisearch)
- All SDKs (React, React Native, iOS, Android)
- Docker Compose for easy self-hosting
- MIT or Apache 2.0 license

**Cloud Edition (Premium):**
- Managed infrastructure on Fly.io/Railway
- Usage-based pricing (MAU + messages)
- 99.9% SLA
- Premium features: Analytics dashboard, AI moderation, Priority support

### Docker Compose (Self-Hosted)

```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/chatsdk
      - CENTRIFUGO_API_URL=http://centrifugo:8000
      - MEILISEARCH_URL=http://meilisearch:7700
    depends_on:
      - db
      - centrifugo
      - meilisearch

  centrifugo:
    image: centrifugo/centrifugo:v5
    ports:
      - "8000:8000"
    command: centrifugo -c config.json

  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data

  meilisearch:
    image: getmeili/meilisearch:v1.6
    volumes:
      - meilisearch_data:/meili_data

  inngest:
    image: inngest/inngest:latest
    ports:
      - "8288:8288"

volumes:
  postgres_data:
  meilisearch_data:
```

---

## Implementation Priorities

### P0 - Core Platform (Weeks 1-16)
| Priority | Deliverable | Description |
|----------|-------------|-------------|
| P0.1 | Core REST API | Multi-tenancy, auth, CRUD, pagination |
| P0.2 | **Compliance Foundation** | Audit logging, encryption at rest, TLS 1.3, key management |
| P0.3 | Centrifugo real-time | WebSocket pub/sub, presence |
| P0.4 | **Voice Notes** | VoiceRecorder, VoiceMessage with waveform visualization |
| P0.5 | React SDK | ChannelList, MessageList, MessageInput, VoiceMessage |
| P0.6 | React Native SDK | Mobile components with NativeWind, haptic feedback |
| P0.7 | iOS Swift SDK | SwiftUI components, CoreData, spring animations |
| P0.8 | Android Kotlin SDK | Compose UI, Room DB, fluid physics |
| P0.9 | Push notifications | FCM + Novu integration |
| P0.10 | Offline-first sync | Local cache, optimistic UI |

### P1 - AI Infrastructure (Weeks 17-20) - CONFIGURABLE
| Feature | Description | Toggle |
|---------|-------------|--------|
| Vector embeddings | Qdrant integration, embed on message create | `ai_embeddings` |
| Semantic search | "Find messages about..." | `ai_embeddings` |
| Smart replies | 3 suggested responses | `ai_smart_replies` |
| Catch-up summaries | "You missed: ..." on channel entry | `ai_catch_up_summaries` |
| PII/PHI detection | Redact before storage | `pii_detection` |

*All AI features respect `ai_enabled: false` master toggle. No data leaves system if disabled.*

### P1.5 - Feature Complete (Weeks 17-20)
1. Meilisearch text search
2. Threads and quoted replies
3. File uploads (S3 presigned URLs)
4. Typing indicators
5. Read receipts
6. Presence system
7. Moderation tools (shadow ban, slow mode, freeze)

### P2 - Complete Apps (Weeks 21-26)
| App | Platform | Features |
|-----|----------|----------|
| **iOS App** | SwiftUI | Auth, channels, messages, voice, push, offline, settings |
| **Android App** | Compose | Auth, channels, messages, voice, push, offline, widgets |
| **RN App** | Expo | Cross-platform reference implementation |
| **Web App** | Next.js | Full-featured web client |

**Mobile UX Requirements (Fluid UI):**
- Spring physics for all message animations (Reanimated 3 / SwiftUI)
- Haptic feedback engine: distinct patterns for send, receive, react, error
- Shared element transitions for images/videos
- Keyboard avoidance with 0 jank

### P3 - Security & Enterprise (Weeks 27-30)
1. **E2EE for 1:1 DMs** - Signal protocol (libsignal)
2. **Data residency controls** - US, EU, APAC region isolation
3. **BYOK** - Customer-managed encryption keys (Vault/KMS)
4. **SSO** - SAML 2.0, OIDC
5. **Data retention policies** - Configurable auto-delete

### P4 - Developer Experience (Weeks 27-30)
1. CLI tool: `npx chatsdk init`
2. App cloning: `npx chatsdk clone-app ios|android`
3. **Theme Studio** - Visual theme builder (web UI)
4. Storybook playground
5. Dashboard MVP
6. Documentation site

### P5 - Premium Features (Month 3+)
1. AI auto-moderation
2. Video bubbles (Loom-style async video)
3. Advanced analytics dashboard
4. Custom integrations marketplace

---

## Reference Codebase Insights

### From OpenIMSDK (Sync Engine & Mobile Patterns) - NEW

**Patterns to Adopt:**

1. **Sequence-Based Sync** (P0 - Critical)
   - Server assigns monotonic `seq` numbers per conversation
   - Client tracks `local_max_seq` per channel in IndexedDB/SQLite
   - Gap detection: If client has seq 100 and receives 102, fetch 101
   - **Why**: Timestamps have clock skew issues. Sequence numbers are deterministic.

   ```sql
   -- Add to messages table
   ALTER TABLE message ADD COLUMN seq INTEGER;
   CREATE INDEX idx_message_channel_seq ON message(channel_id, seq);
   ```

2. **Callback/Observer System** (P0 - For Mobile)
   - 20+ callback types for fine-grained UI updates
   - Categories: Connection, Sync, Channel, Message, Member, Presence
   - Replaces polling with event-driven updates (critical for battery life)

   ```typescript
   interface ChatCallbacks {
     onConnectionStateChanged(state: 'connecting' | 'connected' | 'disconnected'): void;
     onNewMessage(channelId: string, message: Message): void;
     onMessageStatusChanged(messageId: string, status: MessageStatus): void;
     onTypingIndicator(channelId: string, user: User, isTyping: boolean): void;
     onUnreadCountChanged(channelId: string, count: number): void;
   }
   ```

3. **Offline Queue with Manual Retry** (P0)
   - Messages go SENDING -> SENT (success) or SENDING -> FAILED (error)
   - On app restart: mark in-flight messages as FAILED (prevent duplicates)
   - User must manually retry failed messages
   - **Why**: Prevents duplicate sends on network timeout

4. **Lock-Per-Conversation** (P1 - Mobile SDKs)
   - Swift: Use Actors for per-conversation isolation
   - Kotlin: Use `Mutex.withLock` per conversation
   - **Why**: Prevents race conditions during sync on app suspend/resume

5. **3-Task WebSocket Pattern** (P1)
   - Separate concurrent tasks for read, write, heartbeat
   - On background: stop heartbeat, keep connection for push

**Patterns to Skip:**
- One table per conversation (stick with single `messages` table)
- Shared Go core (use native Swift/Kotlin SDKs)
- Protobuf serialization (keep JSON for simplicity)

**Files to Create:**
- `packages/core/src/sync/MessageSyncer.ts` - Version-based sync engine
- `packages/core/src/callbacks/EventBus.ts` - Type-safe event emitter
- `packages/core/src/offline/OfflineQueue.ts` - Pending message queue

See `docs/research/openimsdk_learnings.md` for detailed implementation code.

---

### From Zulip (Performance)
- **UserMessage pattern**: Denormalized read state with bitmask flags
- **Partial indexes**: Only index unread/mentioned messages
- **Presence sequences**: Incremental presence updates via sequence IDs

### From Raven (Offline-First)
- **Optimistic updates**: UI never waits for server
- **SWR caching**: Frappe-react-sdk patterns with cache invalidation
- **Jotai atoms**: Simple state for UI preferences

### From Huly (Plugin Architecture)
- **Metadata system**: Components registered via plugin metadata
- **Y.js CRDT**: Real-time collaboration patterns
- **Event bus**: Kafka-style transaction middleware
