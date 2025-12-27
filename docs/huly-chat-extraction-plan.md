# Huly Chat Extraction Plan
## Creating an Embeddable Chat SDK/Widget

**Date**: 2025-12-27
**Goal**: Extract Huly's production-grade Svelte chat UI and consolidate its 15 microservices into an embeddable chat SDK/widget (like Intercom or Zendesk Chat) with a simplified monolith backend.

---

## Executive Summary

Based on comprehensive exploration of the Huly codebase, this plan outlines how to create a **separate standalone embeddable chat product** with:

- ✅ **All features**: channels, DMs, threads, reactions, mentions, search, typing indicators, file uploads, permissions, audit
- ✅ **Svelte UI**: Production-ready components from Huly (100+ components)
- ✅ **Simplified backend**: Single monolith service (replacing 15 microservices)
- ✅ **Mobile-first**: Exceptional mobile product design
- ✅ **Easy integration**: < 5 lines of code to embed
- ✅ **Independent**: Separate repository and codebase from existing ChatSDK

### Architecture at a Glance

**Current Huly Stack** (complex):
- Frontend: 100+ Svelte components in Rush.js monorepo
- Backend: 15 microservices (Transactor, Collaborator, Account, Fulltext, etc.)
- Storage: CockroachDB + Elasticsearch + MinIO + Redis + Redpanda/Kafka

**Target Stack** (simplified - standalone project):
- **New Repository**: `HulyChat` (or similar name)
- **Frontend**: Svelte components packaged as embeddable widget
- **Backend**: Single NestJS monolith with PostgreSQL
- **Integration**: < 5 line script tag or framework components
- **Deployment**: Independent from ChatSDK

---

## Part 1: Frontend Extraction Strategy

### 1.1 Package Structure

**New Standalone Repository**: `HulyChat/` (separate from existing ChatSDK)

```
HulyChat/                        # NEW REPOSITORY
├── packages/
│   ├── svelte-ui/              # Extracted Svelte components from Huly
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── chat/
│   │   │   │   │   ├── Chat.svelte
│   │   │   │   │   ├── ChatNavigator.svelte
│   │   │   │   │   └── ChannelView.svelte
│   │   │   │   ├── messages/
│   │   │   │   │   ├── ChatMessagePresenter.svelte
│   │   │   │   │   ├── ChatMessageInput.svelte
│   │   │   │   │   └── ReverseChannelScrollView.svelte  # ⭐ Virtual scrolling
│   │   │   │   ├── threads/
│   │   │   │   │   ├── ThreadView.svelte
│   │   │   │   │   └── ThreadContent.svelte
│   │   │   │   └── shared/      # Base UI components from @hcengineering/ui
│   │   │   ├── stores/          # Svelte stores
│   │   │   ├── client/          # WebSocket client (simplified)
│   │   │   ├── theme/           # CSS variables
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── embed/                   # Embeddable widget wrapper
│       ├── src/
│       │   ├── widget/
│       │   │   ├── ChatWidget.svelte       # Main widget
│       │   │   ├── WidgetLauncher.tsx      # Popup launcher
│       │   │   ├── WidgetFrame.tsx         # Iframe mode
│       │   │   └── WidgetInline.tsx        # Inline mode
│       │   ├── loader/
│       │   │   ├── sdk-loader.ts           # UMD/CDN loader
│       │   │   └── iframe-bridge.ts        # PostMessage bridge
│       │   ├── adapters/
│       │   │   ├── ReactAdapter.tsx
│       │   │   ├── VueAdapter.vue
│       │   │   └── VanillaAdapter.ts
│       │   └── mobile/
│       │       ├── WebViewBridge.ts        # React Native integration
│       │       └── gestures.ts             # Swipe, pull-to-refresh
│       ├── dist/
│       │   ├── chatsdk-embed.js            # CDN bundle
│       │   └── chatsdk-embed.css
│       └── package.json
│   │
│   └── backend/                 # NestJS backend monolith
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── spaces/
│       │   │   ├── messages/
│       │   │   ├── files/
│       │   │   ├── search/
│       │   │   └── presence/
│       │   └── main.ts
│       ├── docker-compose.yml
│       └── package.json
│
├── examples/
│   ├── vanilla-js/              # Vanilla JS integration
│   ├── react-demo/              # React integration
│   ├── vue-demo/                # Vue integration
│   ├── nextjs-demo/             # Next.js integration
│   └── wordpress-plugin/        # WordPress plugin
│
├── docs/
│   ├── getting-started.md
│   ├── embedding-modes.md
│   ├── api-reference.md
│   ├── theming.md
│   ├── mobile-integration.md
│   └── self-hosting.md
│
├── docker-compose.yml           # Production deployment
├── package.json                 # Root monorepo config
└── README.md
```

### 1.2 Critical Huly Components to Extract

From `assets/huly/plugins/chunter-resources/src/components/`:

| Huly Component | Priority | Why Critical | Lines |
|---------------|----------|--------------|-------|
| **ReverseChannelScrollView.svelte** | ⭐⭐⭐ | Virtual scrolling, infinite loading, read receipts - production-ready | 23KB |
| **Chat.svelte** | ⭐⭐⭐ | Top-level container, orchestrates layout | 5KB |
| **ChatMessagePresenter.svelte** | ⭐⭐⭐ | Message rendering with reactions, threads, mentions | 8KB |
| **ChatMessageInput.svelte** | ⭐⭐⭐ | TipTap editor, file uploads, mentions, emoji | 16KB |
| **ChatNavigator.svelte** | ⭐⭐ | Sidebar navigation, channels/DMs list | 10KB |
| **ThreadView.svelte** | ⭐⭐ | Thread panel with replies | 6KB |

**Total**: ~70 components to extract

### 1.3 Dependency Resolution

Replace Huly platform packages with local implementations:

| Huly Package | Replacement Strategy |
|-------------|---------------------|
| `@hcengineering/core` | Extract types → `packages/huly-svelte/src/types.ts` |
| `@hcengineering/client` | Rewrite WebSocket client → `packages/huly-svelte/src/client.ts` |
| `@hcengineering/presentation` | Extract stores → `packages/huly-svelte/src/stores.ts` |
| `@hcengineering/ui` | Extract 30+ base components → `packages/huly-svelte/src/components/shared/` |
| `@hcengineering/theme` | Extract CSS variables → `packages/huly-svelte/src/theme/` |

### 1.4 Build System Migration

**From**: Rush.js monorepo (complex)
**To**: Vite (simple, fast)

```typescript
// packages/huly-svelte/vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'HulyChat',
      formats: ['es', 'umd']
    }
  }
});
```

### 1.5 Integration API Design

**Mode 1: Popup Widget** (< 5 lines)
```html
<script src="https://cdn.chatsdk.io/huly/v1/embed.js"></script>
<script>
  HulyChat.init({
    appId: 'your-app-id',
    apiKey: 'your-api-key',
  });
</script>
```

**Mode 2: Inline Embed**
```html
<div id="huly-chat"></div>
<script>
  HulyChat.init({
    appId: 'your-app-id',
    mode: 'inline',
    container: '#huly-chat',
  });
</script>
```

**Mode 3: React Component**
```tsx
import { HulyChatEmbed } from '@chatsdk/embed';

function App() {
  return (
    <HulyChatEmbed
      appId="your-app-id"
      apiKey="your-api-key"
      mode="popup"
      theme={{ primaryColor: '#0066cc' }}
    />
  );
}
```

### 1.6 Mobile-First Design Principles

**CSS Strategy**:
```css
/* Mobile-first base styles */
.huly-chat-widget {
  width: 100vw;
  height: 100vh;
  position: fixed;
}

/* Desktop override */
@media (min-width: 768px) {
  .huly-chat-widget {
    width: 400px;
    height: 600px;
    bottom: 20px;
    right: 20px;
    border-radius: 12px;
  }
}
```

**Mobile Gestures**:
- Swipe down to close
- Pull-to-refresh message list
- Bottom sheet animation
- 44px touch targets

**Performance**:
- Virtual scrolling (already in ReverseChannelScrollView)
- Lazy image loading
- Service Worker for offline
- IndexedDB caching

---

## Part 2: Backend Simplification Strategy

### 2.1 Technology Stack

**Replace 15 Microservices with Single Monolith**:

- **Framework**: NestJS (TypeScript, modular architecture)
- **Database**: PostgreSQL 16+ (replaces CockroachDB)
- **Search**: PostgreSQL Full-Text Search (replaces Elasticsearch)
- **Storage**: MinIO or PostgreSQL BYTEA (replaces complex setup)
- **Real-time**: Socket.io (replaces Transactor WebSocket + Redis)
- **Cache**: In-memory LRU (replaces Redis)

**Why NestJS**:
- Built-in WebSocket support
- Dependency injection
- Modular (mirrors Huly's service boundaries)
- Excellent TypeScript integration
- Can directly port Huly's TypeScript business logic

### 2.2 PostgreSQL Schema

```sql
-- Accounts & Users
CREATE TABLE accounts (
    uuid UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    hash BYTEA,
    salt BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE persons (
    uuid UUID PRIMARY KEY,
    account_uuid UUID REFERENCES accounts(uuid),
    name VARCHAR(255),
    avatar_url TEXT,
    status VARCHAR(50), -- online, away, offline
    last_seen TIMESTAMPTZ
);

-- Workspaces
CREATE TABLE workspaces (
    uuid UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES persons(uuid)
);

CREATE TABLE workspace_members (
    workspace_uuid UUID REFERENCES workspaces(uuid),
    person_uuid UUID REFERENCES persons(uuid),
    role VARCHAR(50), -- owner, member, guest
    PRIMARY KEY (workspace_uuid, person_uuid)
);

-- Channels & Direct Messages
CREATE TABLE spaces (
    id UUID PRIMARY KEY,
    workspace_uuid UUID REFERENCES workspaces(uuid),
    type VARCHAR(50) NOT NULL, -- 'channel' or 'direct_message'
    name VARCHAR(255),
    topic TEXT,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE space_members (
    space_id UUID REFERENCES spaces(id),
    person_uuid UUID REFERENCES persons(uuid),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY (space_id, person_uuid)
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    space_id UUID REFERENCES spaces(id),
    created_by UUID REFERENCES persons(uuid),
    message TEXT NOT NULL,
    attachments JSONB,
    reactions JSONB, -- { "👍": ["uuid1", "uuid2"] }
    mentions JSONB,  -- ["uuid1", "uuid2"]
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_messages_space ON messages(space_id, created_at DESC);
CREATE INDEX idx_messages_fts ON messages USING GIN(to_tsvector('english', message));

-- Thread Messages
CREATE TABLE thread_messages (
    id UUID PRIMARY KEY,
    parent_message_id UUID REFERENCES messages(id),
    space_id UUID REFERENCES spaces(id),
    created_by UUID REFERENCES persons(uuid),
    message TEXT NOT NULL,
    attachments JSONB,
    reactions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_thread_messages_parent ON thread_messages(parent_message_id);

-- Attachments
CREATE TABLE attachments (
    id UUID PRIMARY KEY,
    workspace_uuid UUID REFERENCES workspaces(uuid),
    uploaded_by UUID REFERENCES persons(uuid),
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(128),
    size_bytes BIGINT,
    storage_key TEXT, -- MinIO key
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notification_contexts (
    id UUID PRIMARY KEY,
    person_uuid UUID REFERENCES persons(uuid),
    space_id UUID REFERENCES spaces(id),
    last_viewed_at TIMESTAMPTZ,
    unread_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    UNIQUE(person_uuid, space_id)
);
```

### 2.3 NestJS Module Architecture

```
src/
├── modules/
│   ├── auth/                    # Port from pods/account
│   │   ├── auth.service.ts      # Login, signup, JWT
│   │   └── jwt.strategy.ts
│   │
│   ├── spaces/                  # Channels + DMs
│   │   ├── spaces.controller.ts # REST API
│   │   ├── spaces.service.ts    # Business logic
│   │   └── spaces.gateway.ts    # WebSocket events
│   │
│   ├── messages/                # Core messaging
│   │   ├── messages.controller.ts
│   │   ├── messages.service.ts
│   │   ├── messages.gateway.ts  # Real-time WebSocket
│   │   └── triggers/
│   │       ├── message.trigger.ts       # Port ChunterTrigger
│   │       └── notifications.trigger.ts # Auto-notifications
│   │
│   ├── files/                   # File uploads
│   │   ├── files.service.ts
│   │   └── storage/
│   │       └── minio.storage.ts
│   │
│   ├── search/                  # PostgreSQL full-text
│   │   └── search.service.ts
│   │
│   └── presence/                # User status, typing
│       └── presence.gateway.ts  # WebSocket
│
└── common/
    ├── database/
    │   └── typeorm.config.ts
    └── websocket/
        └── socket-io.adapter.ts
```

### 2.4 Service Consolidation Mapping

| Huly Service | → | NestJS Module | Key Logic to Port |
|-------------|---|---------------|-------------------|
| **transactor** | → | `messages.gateway.ts` | WebSocket handling, transaction processing |
| **account** | → | `auth.service.ts` | Login, signup, JWT generation |
| **collaborator** | → | Optional (skip for MVP) | Y.js CRDT collaborative editing |
| **fulltext** | → | `search.service.ts` | Replace Elasticsearch with PostgreSQL FTS |
| **datalake** | → | `files.service.ts` | MinIO integration |
| **workspace** | → | `workspaces.service.ts` | Workspace management |
| **hulypulse** | → | `presence.gateway.ts` | Real-time notifications via Socket.io |
| **ChunterTrigger** | → | `messages/triggers/` | Auto-join, mentions, notifications |

### 2.5 Critical Huly Code to Port

**Priority 1**: `/Users/pushkar/Downloads/ChatSDK/assets/huly/server-plugins/chunter-resources/src/index.ts`
- **ChunterTrigger**: Auto-join channels, extract mentions, add collaborators
- **ChatNotificationsHandler**: Create notifications on new messages
- **OnUserStatus**: Auto-hide old DMs

**Priority 2**: `/Users/pushkar/Downloads/ChatSDK/assets/huly/pods/server/src/server.ts`
- WebSocket session management
- Request processing pipeline
- Real-time broadcasting

**Priority 3**: `/Users/pushkar/Downloads/ChatSDK/assets/huly/models/chunter/src/types.ts`
- TypeScript data models → TypeORM entities
- ChunterSpace, Channel, DirectMessage, ChatMessage, ThreadMessage

### 2.6 API Design

**REST API**:
```
POST   /api/v1/auth/login
POST   /api/v1/auth/signup
GET    /api/v1/spaces
POST   /api/v1/spaces
GET    /api/v1/spaces/:id/messages
POST   /api/v1/spaces/:id/messages
PATCH  /api/v1/messages/:id
DELETE /api/v1/messages/:id
POST   /api/v1/messages/:id/reactions
GET    /api/v1/search?q=...
POST   /api/v1/files/upload
```

**WebSocket Events** (Socket.io):
```typescript
// Server → Client
message:created
message:updated
message:deleted
message:reaction:added
user:typing:start
user:status:changed

// Client → Server
message:send
typing:start
typing:stop
```

### 2.7 Simplified Deployment

**Before (Huly)**:
```yaml
services:
  - transactor
  - collaborator
  - account
  - fulltext
  - datalake
  - workspace
  - hulypulse
  - front
  - cockroachdb (3 nodes)
  - elasticsearch
  - minio
  - redis
  - redpanda
# = 15+ containers
```

**After (Simplified)**:
```yaml
version: '3.8'
services:
  chat-backend:
    image: huly-chat:latest
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://user:pass@postgres/chatdb
      MINIO_ENDPOINT: minio:9000
      JWT_SECRET: your-secret

  postgres:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]

  minio:
    image: minio/minio:latest
    command: server /data
    volumes: [minio_data:/data]

# = 3 containers
```

---

## Part 3: Standalone Project Structure

### 3.1 Repository Setup

**New Repository**: `HulyChat` (completely independent)

```bash
# Create new repository
git init HulyChat
cd HulyChat

# Initialize pnpm monorepo
pnpm init

# Create workspace
cat > pnpm-workspace.yaml <<EOF
packages:
  - 'packages/*'
  - 'examples/*'
EOF
```

### 3.2 Package Manager: pnpm

Use pnpm workspaces (like Huly) for efficient monorepo management:

```json
// package.json
{
  "name": "hulychat",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "build:backend": "pnpm --filter backend build",
    "build:frontend": "pnpm --filter svelte-ui build && pnpm --filter embed build",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

### 3.3 Independent Architecture

```
HulyChat (Standalone Product)
├── Svelte UI (@hulychat/svelte-ui)
│   ├── 100+ components extracted from Huly
│   ├── WebSocket client
│   └── Svelte stores
│
├── Embed Widget (@hulychat/embed)
│   ├── < 5 line integration
│   ├── Framework adapters (React, Vue, vanilla)
│   └── CDN distribution
│
└── NestJS Backend (@hulychat/backend)
    ├── PostgreSQL database
    ├── Socket.io WebSocket
    ├── MinIO file storage
    └── Full-text search

# No dependency on existing ChatSDK
```

### 3.4 Deployment Options

**Option 1: Hosted SaaS**
```
CDN: https://cdn.hulychat.io/embed/v1/hulychat.js
API: https://api.hulychat.io
Widget: https://chat.hulychat.io/widget
```

**Option 2: Self-Hosted**
```bash
# Customer runs on their infrastructure
docker-compose up -d

# Embed from their domain
<script src="https://chat.customer.com/embed/v1/hulychat.js"></script>
```

**Option 3: Hybrid**
```
# Customer hosts backend, we host CDN
CDN: https://cdn.hulychat.io/embed/v1/hulychat.js
API: https://chat.customer.com/api (customer-hosted)
```

---

## Part 4: Mobile-First Product Excellence

### 4.1 Touch Optimizations
- 44px minimum touch targets
- Swipe gestures (iOS-style)
- Haptic feedback
- Bottom sheet on mobile
- Safe area handling (notches)

### 4.2 Performance Targets
- Mobile Lighthouse score: > 90
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s on 3G
- 60fps scroll animations
- Virtual scrolling (1000+ messages)

### 4.3 Mobile UX Patterns
- Pull-to-refresh
- Infinite scroll
- Optimistic updates
- Network status indicator
- Offline mode banner
- Service Worker caching

### 4.4 Accessibility
- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode
- Font size scaling

---

## Part 5: Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Backend**:
- Set up NestJS project
- Configure PostgreSQL + TypeORM
- Implement auth module (port from Huly account service)
- Create database migrations

**Frontend**:
- Create `packages/huly-svelte/` package
- Set up Vite build
- Extract core types from Huly
- Implement simplified WebSocket client

**Deliverable**: Basic project structure

### Phase 2: Core Chat Components (Week 3-4)
**Backend**:
- Implement spaces module (channels + DMs)
- Implement messages module (CRUD + WebSocket)
- Port ChunterTrigger business logic
- Threading support

**Frontend**:
- Extract Chat.svelte, ChatNavigator.svelte, ChannelView.svelte
- Extract ChatMessagePresenter.svelte, ChatMessageInput.svelte
- Extract ReverseChannelScrollView.svelte (virtual scrolling)
- Extract base UI components

**Deliverable**: Working chat with channels, DMs, threads

### Phase 3: Real-time Features (Week 5)
**Backend**:
- WebSocket gateway for real-time messaging
- Typing indicators
- User presence/status
- Notification contexts

**Frontend**:
- WebSocket integration
- Typing indicator components
- Presence display
- Real-time updates

**Deliverable**: Full real-time collaboration

### Phase 4: Rich Features (Week 6)
**Backend**:
- File upload/download with MinIO
- PostgreSQL full-text search
- Reactions, mentions

**Frontend**:
- File upload components
- Search UI
- Reactions picker
- Mention autocomplete

**Deliverable**: Feature-complete chat

### Phase 5: Embeddable Widget (Week 7-8)
**Frontend**:
- Create `packages/embed/` package
- Build widget controller and launcher
- Implement iframe bridge
- Create UMD bundle for CDN
- Popup, inline, iframe modes

**Deliverable**: < 5 line integration

### Phase 6: Mobile Integration (Week 8-9)
**Frontend**:
- Mobile-responsive layouts
- Swipe gestures
- Bottom sheet UI
- React Native WebView bridge
- iOS WebView integration

**Backend**:
- Mobile API optimizations
- Bandwidth reduction

**Deliverable**: Excellent mobile experience

### Phase 7: Framework Adapters (Week 9-10)
**Frontend**:
- React adapter
- Vue 3 adapter
- Web Component (vanilla JS)
- Angular adapter

**Deliverable**: Multi-framework support

### Phase 8: Documentation & Polish (Week 10-11)
- Quick start guide
- API reference
- Integration examples (10+)
- Performance optimization
- Accessibility audit
- Cross-browser testing

**Deliverable**: Production-ready release

---

## Part 6: Critical Files Reference

### Huly Frontend (to extract from)

1. **`assets/huly/plugins/chunter-resources/src/components/ReverseChannelScrollView.svelte`**
   - ⭐⭐⭐ Virtual scrolling, infinite loading, read receipts
   - 23KB, production-ready
   - Extract as-is with minimal changes

2. **`assets/huly/plugins/chunter-resources/src/components/chat/Chat.svelte`**
   - ⭐⭐⭐ Top-level container
   - Shows overall architecture
   - 5KB

3. **`assets/huly/packages/presentation/src/utils.ts`**
   - ⭐⭐⭐ `getClient()`, `createQuery()` - client SDK abstractions
   - Blueprint for simplified client

4. **`assets/huly/plugins/chunter-resources/src/components/chat-message/ChatMessageInput.svelte`**
   - ⭐⭐⭐ Message input with TipTap editor
   - File uploads, mentions, emoji
   - 16KB, mobile-optimized

5. **`assets/huly/packages/ui/src/components/Scroller.svelte`**
   - ⭐⭐ Custom scroller for mobile touch handling

### Huly Backend (to port to NestJS)

1. **`assets/huly/server-plugins/chunter-resources/src/index.ts`**
   - ⭐⭐⭐ ChunterTrigger, ChatNotificationsHandler
   - Core business logic for chat
   - MUST port to NestJS

2. **`assets/huly/models/chunter/src/types.ts`**
   - ⭐⭐⭐ TypeScript data models
   - Map to TypeORM entities
   - Clean type definitions

3. **`assets/huly/pods/server/src/server.ts`**
   - ⭐⭐ Transactor WebSocket handling
   - Pattern to replicate with Socket.io

4. **`assets/huly/server/account/src/operations.ts`**
   - ⭐⭐ Auth operations (login, signup)
   - Port to NestJS auth module

5. **`assets/huly/server/server-pipeline/src/pipeline.ts`**
   - ⭐ Middleware architecture
   - Understand pattern, simplify in NestJS

### Reference: Existing ChatSDK (for inspiration only)

The existing ChatSDK at `/Users/pushkar/Downloads/ChatSDK/` can serve as reference for:

1. **Backend patterns**: PostgreSQL schema design, Centrifugo integration
2. **Mobile patterns**: React Native components, WebView bridges
3. **API design**: REST endpoints, authentication flows

**Note**: HulyChat is a separate product - no code sharing or dependencies on ChatSDK.

---

## Part 7: Success Metrics

### Integration Simplicity
- ✅ Integration code: < 5 lines
- ✅ Time to first message: < 2 minutes
- ✅ Zero configuration required

### Performance
- ✅ Mobile Lighthouse: > 90
- ✅ First Contentful Paint: < 1.5s
- ✅ Time to Interactive: < 3s on 3G
- ✅ 60fps animations

### Compatibility
- ✅ Browsers: Chrome, Safari, Firefox, Edge
- ✅ Mobile: iOS 14+, Android 8+
- ✅ Frameworks: React, Vue, Angular, Svelte, Vanilla
- ✅ Screen sizes: 320px to 4K

### Developer Experience
- ✅ TypeScript: 100% coverage
- ✅ Documentation: Complete API reference
- ✅ Examples: 10+ integration examples

---

## Part 8: Key Trade-offs

### What We Keep from Huly
✅ Svelte UI components (production-ready)
✅ TypeScript data models and types
✅ Business logic from ChunterTrigger
✅ Virtual scrolling (ReverseChannelScrollView)
✅ TipTap rich text editor
✅ Workspace multi-tenancy model

### What We Simplify
❌ **15 microservices** → Single NestJS monolith
❌ **Redpanda/Kafka** → In-process event emitters
❌ **Elasticsearch** → PostgreSQL full-text search
❌ **Redis pub/sub** → Socket.io broadcast
❌ **CockroachDB** → PostgreSQL
❌ **Rush.js monorepo** → Vite build
❌ **Y.js Collaborator** → Skip for MVP (add later)

### What We Add
✅ Embeddable widget (< 5 line integration)
✅ Multiple embedding modes (popup, inline, iframe)
✅ Framework adapters (React, Vue, vanilla)
✅ Mobile-first gestures and UX
✅ CDN distribution
✅ Integration with existing ChatSDK

---

## Part 9: Risk Mitigation

### Technical Risks
- **Svelte learning curve**: Huly components are well-structured, can be extracted with pattern matching
- **iframe communication**: Use PostMessage with origin validation
- **CDN availability**: Multi-CDN strategy
- **Mobile performance**: Virtual scrolling already implemented in Huly

### Product Risks
- **Feature creep**: Stick to core chat, extensible via API
- **Complexity**: Maintain < 5 line integration promise
- **Backward compatibility**: Semantic versioning

### Operational Risks
- **Scaling**: Start simple, PostgreSQL scales to 100K+ users
- **Security**: JWT tokens, rate limiting, input sanitization
- **Monitoring**: Sentry for errors, metrics tracking

---

## Conclusion

This plan provides a complete roadmap to:

1. **Extract** Huly's production-ready Svelte chat UI (100+ components)
2. **Simplify** backend from 15 microservices to single monolith
3. **Package** as embeddable widget with < 5 line integration
4. **Integrate** with existing ChatSDK infrastructure
5. **Deliver** exceptional mobile-first product

The key insight is that Huly's **excellent UI components** and **TypeScript business logic** can be extracted and simplified while maintaining production quality, creating an embeddable widget that rivals Intercom and Zendesk Chat.

**Estimated Timeline**: 10-11 weeks from start to production-ready release.

**Next Steps**: Review this plan, prioritize features, and begin Phase 1 implementation.
