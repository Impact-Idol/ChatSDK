# ChatSDK Enterprise Readiness Plan
## For Impact Idol Certification (COMPREHENSIVE)

**Status**: Ready for Implementation (Updated with Impact Idol Feasibility Analysis)
**Approach**: Parallel development across 13 major work streams
**Timeline**: Quality-focused (no hard deadline)
**Breaking Changes**: Acceptable (can force client updates)
**Estimated Total Effort**: 16-20 weeks for complete feature parity

---

## Executive Summary

Transform ChatSDK into an enterprise-ready platform competitive with Stream Chat by addressing critical security vulnerabilities, mobile SDK gaps, migration tooling, AND building complete feature parity with Stream Chat for platforms like Impact Idol.

**Context**: Impact Idol currently uses Stream Chat but needs:
- Multi-workspace hierarchy (workspaces → channels)
- Conference-specific chat with auto-expiry
- Polls, moderation, guardian monitoring
- Prisma ORM integration (vs raw SQL)
- Next.js Server Actions integration
- Full mobile support with Capacitor

### Work Streams Organized by Priority

**TIER 0: CRITICAL BLOCKERS (Must have for ANY adoption)**
1. ✅ Centrifugo Multi-Tenant Security Isolation
2. ✅ Stream Chat Migration CLI
3. ✅ iOS SDK Extraction + Capacitor Plugin

**TIER 1: MUST-HAVE FOR IMPACT IDOL (Feature parity requirements)**
4. ✅ Multi-Workspace / Team Hierarchy (NEW)
5. ✅ Polls & Voting System (NEW)
6. ✅ Message Moderation & Reporting (NEW)
7. ✅ User Blocking (NEW)
8. ✅ Next.js Server Actions Adapter (NEW)

**TIER 2: IMPORTANT FOR FEATURE PARITY**
9. ✅ Link Previews with Video Embed (NEW)
10. ✅ Pinned Messages (NEW)
11. ✅ Saved/Bookmarked Messages (NEW)
12. ✅ WebPush/APNS VoIP Support
13. ✅ Docker Production Configuration
14. ✅ Admin Dashboard Super Admin Mode

**TIER 3: COMPETITIVE DIFFERENTIATORS**
15. ✅ Supervised User / Guardian Monitoring (NEW)
16. ✅ Auto-Enrollment Rules Engine (NEW)
17. ✅ Workspace Templates & Presets (NEW)
18. ✅ Custom Emoji Support (NEW)
19. ✅ Enhanced File Upload with Blur Hash (NEW)

**TIER 4: DEVELOPER EXPERIENCE**
20. ✅ TypeScript-First SDK with Zod Validation (NEW)
21. ✅ Webhooks & Event System (NEW)
22. ✅ Observability & Monitoring (NEW)
23. ✅ Offline-First Sync Enhancement (NEW)

---

## ANALYSIS: Gaps in Original Feedback vs New Feasibility Analysis

**Original Feedback** (3 critical items):
- Centrifugo security namespacing
- iOS SDK extraction + Capacitor plugin
- Stream migration CLI

**NEW Feasibility Analysis** adds **17 additional features** organized in 4 tiers that were NOT in original feedback:

### What Was MISSING from Original Plan:

**TIER 1 - Must-Have (5 features)**:
- Multi-workspace hierarchy (workspace → channels)
- Polls & voting system
- Message moderation & reporting queue
- User blocking
- Next.js Server Actions adapter (@chatsdk/nextjs)

**TIER 2 - Important (3 features)**:
- Link previews with video embed support
- Pinned messages
- Saved/bookmarked messages

**TIER 3 - Differentiators (5 features)**:
- Supervised users / guardian monitoring
- Auto-enrollment rules engine
- Workspace templates & presets
- Custom emoji support
- Enhanced file upload with blur hash

**TIER 4 - DX Improvements (4 features)**:
- TypeScript-first SDK with Zod validation
- Webhooks & event system
- Observability & monitoring (Prometheus metrics)
- Offline-first sync enhancement

### Impact Idol Specific Needs:
- **Prisma ORM integration** (they use Prisma, ChatSDK uses raw SQL)
- **Conference workspaces** with auto-expiry
- **Chapter-based access control**
- **Multi-workspace per user** (users belong to multiple workspaces)
- **Post-transaction sync pattern** (write to DB first, sync async)

---

## Work Stream 1: Centrifugo Security Fix (CRITICAL)
**Priority**: TIER 0 - Security Vulnerability
**Team**: Backend + All Client SDK teams
**Effort**: 2-3 weeks

### Problem
Users from App A can subscribe to channels from App B if they know the channel UUID because:
- `wsToken` only contains `sub: userId` (no app_id)
- Channels named `chat:{channelId}` without app_id prefix
- No server-side subscription validation

### Solution: App-Namespaced Channels

**Backend Changes**:

1. **Add app_id to wsToken** (`packages/api/src/routes/tokens.ts:79, 130`):
   ```typescript
   const wsToken = await new jose.SignJWT({
     sub: body.userId,
     app_id: appId,  // ADD THIS
   })
   ```

2. **Namespace all channels** (`packages/api/src/services/centrifugo.ts`):
   - Change `chat:{channelId}` → `chat:{appId}:{channelId}`
   - Change `user:{userId}` → `user:{appId}:{userId}`
   - Update all 7 publish methods: publishMessage, publishMessageUpdate, publishMessageDelete, publishTyping, publishReaction, publishReadReceipt, publishPresence

3. **Pass appId to all publishers** (update 5+ files):
   - `packages/api/src/routes/messages.ts:153, 381, 425, 470, 517`
   - `packages/api/src/routes/channels.ts:388, 428`

**Client SDK Changes**:

4. **Core SDK** (`packages/core/src/client/ChatClient.ts`):
   - Parse app_id from JWT token or accept as parameter
   - Update `subscribeToChannel()` to use `chat:{appId}:{channelId}`
   - Update `subscribeToUserChannel()` to use `user:{appId}:{userId}`

5. **React/React Native SDKs**: No changes (use Core SDK)

6. **iOS SDK**: Currently HTTP-only (no WebSocket), no changes needed now

**Testing**:
- Multi-tenant isolation tests: verify App A cannot receive App B events
- Token validation: verify wsToken contains app_id claim
- Manual test: try to subscribe to other app's channel (should fail)

**Critical Files**:
- `/packages/api/src/routes/tokens.ts` - Token generation
- `/packages/api/src/services/centrifugo.ts` - Publishing service
- `/packages/core/src/client/ChatClient.ts` - Subscription logic
- `/packages/api/src/routes/messages.ts` - Message event publishing
- `/packages/api/src/routes/channels.ts` - Typing/read event publishing

---

## Work Stream 2: iOS SDK Extraction + Capacitor Plugin
**Priority**: P0 - Mobile Strategy
**Team**: iOS + Mobile Web
**Effort**: 3-4 weeks

### Current State
- SDK already well-structured in `packages/ios-sdk/`
- 4 core files (~1180 lines): ChatClient, Models, ChatViewModel, ChatSDK
- Zero external dependencies (Foundation + URLSession only)
- Example app in `examples/ios-chat/`

### Tasks

**Phase 1: SDK Documentation & Hardening** (Week 1-2)
1. Add comprehensive inline doc comments to all public APIs
2. Create DocC documentation catalog with tutorials
3. Enhance README with architecture, troubleshooting, migration guides
4. Add unit tests (target >80% coverage):
   - ChatClientTests.swift - Connection, pagination, errors
   - ChatViewModelTests.swift - Event handling, state
   - MockTests.swift - Offline testing

**Phase 2: Versioning & Distribution** (Week 2)
1. Update `ChatSDK.swift` with version constant: `public static let version = "1.0.0"`
2. Create RELEASES.md changelog
3. Create git tag: `git tag -a ios-1.0.0 -m "iOS SDK v1.0.0"`
4. Verify SPM import works:
   ```swift
   .package(url: "https://github.com/piper5ul/ChatSDK.git", from: "ios-1.0.0")
   ```

**Phase 3: Capacitor Plugin** (Week 3-4)
1. Create `packages/capacitor/` with structure:
   ```
   capacitor/
   ├── src/
   │   ├── definitions.ts    # TypeScript API (mirrors Swift SDK)
   │   ├── index.ts
   │   └── web.ts
   ├── ios/Plugin/
   │   ├── ChatSDKCapacitorPlugin.swift
   │   └── Models+Capacitor.swift
   └── android/              # Future
   ```

2. **TypeScript Interface**:
   ```typescript
   export interface ChatSDKPlugin {
     initialize(options: { apiURL: string; token: string }): Promise<void>;
     connect(): Promise<{ user: User }>;
     getChannels(options?: { limit?: number }): Promise<{ channels: Channel[] }>;
     sendMessage(options: { channelId: string; text: string }): Promise<{ message: Message }>;
     addListener(eventName: 'messageNew', listenerFunc: (event: MessageNewEvent) => void): Promise<PluginListenerHandle>;
   }
   ```

3. **Swift Plugin Implementation**:
   - Wrap ChatClient instance
   - Route @objc methods to async ChatClient calls
   - Convert Swift events → Capacitor notifications
   - Handle error translation

4. **Package Configuration**:
   - `package.json` for npm publish
   - `ChatSDKCapacitor.podspec` for iOS dependency
   - README with installation and usage

5. **Test Ionic App** (`examples/ionic-app/`):
   - Test all plugin methods
   - Verify event listeners
   - Performance profiling

**Critical Files**:
- `/packages/ios-sdk/Sources/ChatSDK/ChatClient.swift` - Core API
- `/packages/ios-sdk/Sources/ChatSDK/Models.swift` - Data structures
- `/packages/ios-sdk/Package.swift` - SPM configuration
- `/packages/ios-sdk/README.md` - Documentation
- `/packages/capacitor/src/definitions.ts` - Plugin interface (NEW)
- `/packages/capacitor/ios/Plugin/ChatSDKCapacitorPlugin.swift` - Bridge (NEW)

---

## Work Stream 3: Stream Chat Migration CLI
**Priority**: P0 - Data Migration Blocker
**Team**: Backend/DevOps
**Effort**: 3-4 weeks

### Architecture

**CLI Tool**: `packages/migration-cli/`
**Command**: `chatsdk-migrate import-stream --api-key "..." --secret "..." --target-app-id "..."`

### Implementation Strategy

**Data Flow**:
1. Export from Stream Chat (paginated API + async exports)
2. Import Users → Channels → Members → Messages → user_message → Reactions
3. Preserve timestamps and IDs where possible
4. Assign sequence numbers chronologically

**Key Decisions**:
- **Direct DB Access** (not REST API) for bulk performance
- **Batch Sizes**: Users (500), Channels (100), Messages (1000), Reactions (2000)
- **ID Mapping**: Stream CID → ChatSDK UUID cache
- **Timestamp Preservation**: Use explicit values, generate UUIDv7 from timestamps
- **Resume Capability**: Save progress to `.migration-cache/` with checkpoints

**Data Mapping**:
```
Stream User → app_user (preserve IDs)
Stream Channel → channel (generate new UUIDs, preserve CID)
Stream Message → message (UUIDv7 from timestamp, assign seq)
Stream Reaction → reaction
```

### File Structure
```
packages/migration-cli/
├── src/
│   ├── index.ts              # CLI entry (commander.js)
│   ├── commands/
│   │   ├── import-stream.ts  # Main orchestrator
│   │   └── validate.ts       # Dry-run mode
│   ├── stream/
│   │   ├── client.ts         # Stream API wrapper
│   │   ├── exporter.ts       # Export data
│   │   └── types.ts          # Type definitions
│   ├── importers/
│   │   ├── users.ts          # User import logic
│   │   ├── channels.ts       # Channel import
│   │   ├── messages.ts       # Message import
│   │   ├── reactions.ts      # Reaction import
│   │   └── members.ts        # Membership import
│   ├── mappers/
│   │   ├── user-mapper.ts    # Data transformation
│   │   ├── channel-mapper.ts
│   │   └── message-mapper.ts
│   └── utils/
│       ├── progress.ts       # Progress bars (cli-progress)
│       ├── batch.ts          # Batch utilities
│       └── id-mapping.ts     # ID cache
└── package.json
```

### Features
- **Dry-run mode**: Validate before importing
- **Resume capability**: Continue interrupted migrations
- **Progress reporting**: Multi-bar terminal UI
- **Error handling**: Log failures, continue processing
- **Validation**: Check conflicts, foreign keys, timestamps
- **Performance**: Use PostgreSQL COPY, disable triggers during import

### Dependencies
```json
{
  "stream-chat": "^8.40.0",
  "commander": "^12.0.0",
  "cli-progress": "^3.12.0",
  "ora": "^8.0.1",
  "chalk": "^5.3.0",
  "pg": "^8.13.1",
  "uuid": "^11.0.3"
}
```

**Critical Files**:
- `/docker/init-db.sql` - Database schema reference
- `/packages/api/src/services/database.ts` - Transaction utilities
- `/packages/api/src/routes/messages.ts` - Message creation patterns
- `/packages/api/src/routes/channels.ts` - Channel creation patterns
- `/packages/migration-cli/src/index.ts` - CLI entry (NEW)
- `/packages/migration-cli/src/commands/import-stream.ts` - Main logic (NEW)

---

## Work Stream 4: Multi-Workspace / Team Hierarchy (CRITICAL NEW FEATURE)
**Priority**: TIER 1 - Must-Have for Impact Idol
**Team**: Backend + Frontend
**Effort**: 4-5 weeks

### Problem
Current ChatSDK only has app-level isolation. Impact Idol needs:
- Users belong to multiple workspaces (chapters, conferences, projects)
- Each workspace has its own channels
- Workspaces can expire (conference workspaces auto-delete after event)
- Different roles per workspace (owner, admin, member)

### Solution: Add Workspace Layer

**Database Schema** (NEW tables):
```sql
CREATE TABLE workspace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'team', -- team, project, conference, chapter
  image_url TEXT,
  config JSONB DEFAULT '{}',
  member_count INT DEFAULT 0,
  channel_count INT DEFAULT 0,
  created_by VARCHAR(255),
  expires_at TIMESTAMPTZ, -- For conference/event workspaces
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, name)
);

CREATE TABLE workspace_member (
  workspace_id UUID REFERENCES workspace(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member
  is_default BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, app_id, user_id),
  FOREIGN KEY (app_id, user_id) REFERENCES app_user(app_id, id) ON DELETE CASCADE
);

-- Update channel table
ALTER TABLE channel ADD COLUMN workspace_id UUID REFERENCES workspace(id);
```

**API Endpoints** (NEW):
```
POST   /api/workspaces                    - Create workspace
GET    /api/workspaces                    - List user's workspaces
GET    /api/workspaces/:id                - Get workspace details
PUT    /api/workspaces/:id                - Update workspace
DELETE /api/workspaces/:id                - Delete workspace (cascade)
POST   /api/workspaces/:id/members        - Add members
DELETE /api/workspaces/:id/members/:uid   - Remove member
GET    /api/workspaces/:id/channels       - List workspace channels
POST   /api/workspaces/from-template      - Create from template
```

**React Hooks** (@chatsdk/react):
```typescript
useWorkspaces() -> { workspaces, loading, error }
useWorkspace(workspaceId) -> { workspace, channels, members }
useActiveWorkspace() -> { workspace, setWorkspace }
```

**React Components**:
```typescript
<WorkspaceSwitcher workspaces={workspaces} onSwitch={handleSwitch} />
<WorkspaceChannelList workspaceId={workspaceId} />
<CreateWorkspaceDialog onSubmit={handleCreate} />
```

**Critical Files**:
- `/docker/init-db.sql` - Add workspace tables + migrations
- `/packages/api/src/routes/workspaces.ts` - Workspace CRUD (NEW)
- `/packages/api/src/routes/channels.ts` - Update to require workspace_id
- `/packages/react/src/hooks/useWorkspaces.ts` - React hooks (NEW)
- `/packages/react/src/components/sdk/WorkspaceSwitcher.tsx` - UI component (NEW)

---

## Work Stream 5: Polls & Voting System (CRITICAL NEW FEATURE)
**Priority**: TIER 1 - Must-Have for Impact Idol
**Team**: Backend + Frontend
**Effort**: 2-3 weeks

### Requirements
- Inline polls in chat messages
- Anonymous voting support
- Multi-choice polls
- Poll expiry
- Real-time vote updates via Centrifugo

### Implementation

**Database Schema** (NEW tables):
```sql
CREATE TABLE poll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- [{"id": "opt1", "text": "Option 1"}, ...]
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_multi_choice BOOLEAN DEFAULT FALSE,
  total_votes INT DEFAULT 0,
  ends_at TIMESTAMPTZ,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE poll_vote (
  poll_id UUID REFERENCES poll(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  option_id VARCHAR(50) NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (poll_id, app_id, user_id, option_id)
);

ALTER TABLE message ADD COLUMN poll_id UUID REFERENCES poll(id);
```

**API Endpoints** (NEW):
```
POST /api/messages/:id/polls              - Create poll
POST /api/polls/:id/vote                  - Vote on poll
GET  /api/polls/:id/results               - Get results
DELETE /api/polls/:id/vote                - Remove vote
```

**Real-time Events**:
- `poll.created` - New poll in channel
- `poll.voted` - Vote cast (hide voter if anonymous)
- `poll.closed` - Poll expired

**React Components**:
```typescript
<PollMessage poll={poll} onVote={handleVote} />
<PollResults poll={poll} results={results} />
<CreatePollDialog channelId={channelId} onSubmit={handleCreate} />
```

**Critical Files**:
- `/docker/init-db.sql` - Add poll tables
- `/packages/api/src/routes/polls.ts` - Poll CRUD (NEW)
- `/packages/api/src/services/centrifugo.ts` - Add poll events
- `/packages/react/src/components/sdk/PollMessage.tsx` - Poll UI (NEW)

---

## Work Stream 6: Message Moderation & Reporting (CRITICAL NEW FEATURE)
**Priority**: TIER 1 - Must-Have for Impact Idol (Safety requirement)
**Team**: Backend + Admin Dashboard
**Effort**: 2-3 weeks

### Requirements
- Users can report messages (harassment, spam, inappropriate)
- Moderation queue for admins
- Review workflow with actions (delete, warn, ban, dismiss)
- Audit trail of moderator actions

### Implementation

**Database Schema** (NEW table):
```sql
CREATE TABLE message_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  reporter_user_id VARCHAR(255) NOT NULL,
  reason VARCHAR(50) NOT NULL, -- harassment, spam, inappropriate, violence, hate_speech
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, actioned, dismissed
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  action_taken VARCHAR(100), -- deleted_message, warned_user, banned_user, none
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_status ON message_report (app_id, status, created_at DESC);
```

**API Endpoints** (NEW):
```
POST /api/messages/:id/report             - Report message
GET  /api/moderation/reports               - List reports (admin only)
PUT  /api/moderation/reports/:id/review   - Review report (admin only)
```

**Admin Dashboard** (NEW component):
```typescript
<ModerationQueue
  reports={reports}
  onReview={handleReview}
  onAction={handleAction}
/>
```

**Critical Files**:
- `/docker/init-db.sql` - Add message_report table
- `/packages/api/src/routes/moderation.ts` - Moderation API (NEW)
- `/apps/admin-dashboard/src/components/ModerationQueue.tsx` - Queue UI (NEW)

---

## Work Stream 7: User Blocking (CRITICAL NEW FEATURE)
**Priority**: TIER 1 - Must-Have for Impact Idol (Safety requirement)
**Team**: Backend + Frontend
**Effort**: 1-2 weeks

### Requirements
- Users can block other users
- Blocked users' messages are filtered client-side
- Mutual blocking (A blocks B, B blocks A)
- Unblock capability

### Implementation

**Database Schema** (NEW table):
```sql
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
```

**API Endpoints** (NEW):
```
POST   /api/users/:id/block               - Block user
DELETE /api/users/:id/block               - Unblock user
GET    /api/users/blocked                 - List blocked users
```

**Client-side Filtering** (@chatsdk/core):
```typescript
// In ChatClient
const { blockedUserIds } = await this.getBlockedUsers();

// Filter messages
const filteredMessages = messages.filter(
  msg => !blockedUserIds.includes(msg.user_id)
);
```

**Critical Files**:
- `/docker/init-db.sql` - Add user_block table
- `/packages/api/src/routes/users.ts` - Add block/unblock endpoints
- `/packages/core/src/client/ChatClient.ts` - Add getBlockedUsers(), filter logic

---

## Work Stream 8: Next.js Server Actions Adapter (CRITICAL NEW FEATURE)
**Priority**: TIER 1 - Must-Have for Impact Idol (They use Next.js 15)
**Team**: SDK
**Effort**: 2 weeks

### Problem
Impact Idol uses Next.js Server Actions, not traditional REST API calls. ChatSDK needs to provide a Server Actions adapter.

### Solution: Create @chatsdk/nextjs package

**Package Structure**:
```
packages/nextjs/
├── src/
│   ├── actions/
│   │   ├── channels.ts      # Channel actions
│   │   ├── messages.ts      # Message actions
│   │   ├── workspaces.ts    # Workspace actions
│   │   ├── polls.ts         # Poll actions
│   │   └── index.ts         # Re-export all
│   ├── client.ts            # Server-side ChatSDK client
│   └── index.ts
└── package.json
```

**Example Implementation**:
```typescript
// packages/nextjs/src/actions/messages.ts
'use server';

import { ChatSDKClient } from '@chatsdk/core';

export async function sendMessage(channelId: string, text: string) {
  const client = new ChatSDKClient({
    apiUrl: process.env.CHATSDK_API_URL!,
    token: await getServerToken(), // From session
  });
  return await client.channels.sendMessage(channelId, { text });
}

export async function getMessages(channelId: string, limit = 50) {
  const client = new ChatSDKClient({ ... });
  return await client.channels.getMessages(channelId, { limit });
}
```

**Usage in Next.js App**:
```typescript
// app/actions/chat.ts
import { sendMessage, getMessages } from '@chatsdk/nextjs/actions';

// In Server Component
const messages = await getMessages(channelId);

// In Client Component
const handleSend = async (text: string) => {
  await sendMessage(channelId, text);
};
```

**Critical Files**:
- `/packages/nextjs/src/actions/` - All Server Actions (NEW package)
- `/packages/nextjs/README.md` - Documentation for Next.js usage (NEW)

---

## Work Stream 9: Link Previews with Video Embed
**Priority**: TIER 2 - Important for Feature Parity
**Team**: Backend
**Effort**: 1-2 weeks

### Implementation

**Database Schema Update**:
```sql
ALTER TABLE message ADD COLUMN link_previews JSONB DEFAULT '[]';
-- [{"url": "...", "title": "...", "description": "...", "image": "...", "video": {...}}]
```

**Inngest Job** (background processing):
```typescript
export const generateLinkPreview = inngest.createFunction(
  { id: "generate-link-preview" },
  { event: "message.created" },
  async ({ event }) => {
    const urls = extractUrls(event.data.text);
    const previews = await Promise.all(
      urls.map(url => fetchOpenGraphData(url))
    );
    await db.query(
      'UPDATE message SET link_previews = $1 WHERE id = $2',
      [JSON.stringify(previews), event.data.messageId]
    );
  }
);
```

**Video Embed Support**:
- YouTube iframe embed
- Vimeo iframe embed
- Generic og:video support

**Critical Files**:
- `/packages/api/src/inngest/functions.ts` - Add link preview job
- `/packages/api/src/services/link-preview.ts` - OpenGraph fetcher (NEW)

---

## Work Stream 10: Pinned Messages
**Priority**: TIER 2 - Important
**Team**: Backend + Frontend
**Effort**: 1 week

**Database Schema**:
```sql
CREATE TABLE pinned_message (
  channel_id UUID REFERENCES channel(id) ON DELETE CASCADE,
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  pinned_by VARCHAR(255) NOT NULL,
  pinned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, message_id)
);
```

**API Endpoints**:
```
POST   /api/messages/:id/pin              - Pin message (admin only)
DELETE /api/messages/:id/pin              - Unpin message
GET    /api/channels/:id/pins             - Get pinned messages
```

---

## Work Stream 11: Saved/Bookmarked Messages
**Priority**: TIER 2 - Important
**Team**: Backend + Frontend
**Effort**: 1 week

**Database Schema**:
```sql
CREATE TABLE saved_message (
  user_id VARCHAR(255) NOT NULL,
  message_id UUID REFERENCES message(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (app_id, user_id, message_id)
);
```

**API Endpoints**:
```
POST   /api/messages/:id/save             - Bookmark message
DELETE /api/messages/:id/save             - Remove bookmark
GET    /api/users/me/saved                - Get saved messages
```

---

## Work Stream 12: WebPush/APNS VoIP Support
**Priority**: TIER 2 - Enhanced Mobile Experience
**Team**: Backend + Mobile
**Effort**: 1-2 weeks

### Requirements
- Support APNS VoIP push notifications for call features
- Different payload format than standard notifications
- Headers: `apns-push-type: voip`, `apns-topic: {bundle-id}.voip`

### Implementation

1. **Update Device Token Model** (`packages/api/src/routes/webpush.ts`):
   ```typescript
   interface DeviceToken {
     token: string;
     platform: 'web' | 'ios' | 'android';
     pushType?: 'standard' | 'voip';  // NEW
     voipTopic?: string;               // NEW (for iOS VoIP)
   }
   ```

2. **Add VoIP Push Method**:
   ```typescript
   async function sendVoIPPush(
     userId: string,
     payload: {
       callId: string,
       callerName: string,
       channelId: string
     }
   ): Promise<void> {
     const tokens = await getDeviceTokens(userId, 'ios', 'voip');

     for (const token of tokens) {
       await apns.send({
         token: token.token,
         topic: token.voipTopic,
         pushType: 'voip',
         priority: 10,
         payload: {
           aps: { 'content-available': 1 },
           call: payload
         }
       });
     }
   }
   ```

3. **Update Inngest Events** (`packages/api/src/inngest/functions.ts`):
   - Add `call.started` event type
   - Trigger VoIP push on incoming calls

**Critical Files**:
- `/packages/api/src/routes/webpush.ts` - Push notification routes
- `/packages/api/src/inngest/functions.ts` - Event-triggered notifications
- `/docker/init-db.sql` - Update device_token table schema

---

## Work Stream 13: Docker Production Configuration
**Priority**: TIER 2 - Production Deployment
**Team**: DevOps
**Effort**: 1 week

### Current Issue
`docker/docker-compose.yml` uses local volumes and development defaults. Need production-ready configuration.

### Implementation

1. **Create `docker/docker-compose.prod.yml`**:
   ```yaml
   version: '3.8'

   services:
     api:
       environment:
         NODE_ENV: production
         DB_HOST: ${DB_HOST}
         DB_PORT: ${DB_PORT}
         DB_NAME: ${DB_NAME}
         DB_USER: ${DB_USER}
         DB_PASSWORD: ${DB_PASSWORD}
         S3_ENDPOINT: ${S3_ENDPOINT}
         S3_ACCESS_KEY: ${S3_ACCESS_KEY}
         S3_SECRET_KEY: ${S3_SECRET_KEY}
         S3_BUCKET: ${S3_BUCKET}

     # Remove local PostgreSQL, MinIO in production
     # Use managed services
   ```

2. **Update MinIO Configuration** (`packages/api/src/services/storage.ts`):
   - Support S3-compatible endpoints (AWS S3, DigitalOcean Spaces, Cloudflare R2)
   - Environment variables for credentials

3. **Health Checks**:
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:5500/health"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

4. **Secrets Management**:
   - Use Docker secrets or environment files
   - Document AWS Secrets Manager integration
   - Add `.env.production.example`

**Critical Files**:
- `/docker/docker-compose.yml` - Development config
- `/docker/docker-compose.prod.yml` - Production config (NEW)
- `/packages/api/src/services/storage.ts` - S3 client
- `/.env.production.example` - Template (NEW)

---

## Work Stream 14: Admin Dashboard Super Admin Mode
**Priority**: TIER 2 - Multi-Tenant Management
**Team**: Frontend
**Effort**: 2 weeks

### Current State
Admin dashboard uses static API_KEY. No way to create new apps or switch between apps.

### Implementation

1. **Create Super Admin Routes** (`packages/api/src/routes/admin.ts`):
   ```typescript
   // Requires special ADMIN_API_KEY
   POST /admin/apps          - Create new app
   GET /admin/apps           - List all apps
   GET /admin/apps/:id       - Get app details
   PATCH /admin/apps/:id     - Update app
   DELETE /admin/apps/:id    - Delete app (with cascade warning)
   POST /admin/apps/:id/regenerate-key  - Regenerate API key
   ```

2. **Update Admin Dashboard** (`apps/admin-dashboard/`):

   **App Switcher Component**:
   ```typescript
   const AppSwitcher = () => {
     const [apps, setApps] = useState<App[]>([]);
     const [currentAppId, setCurrentAppId] = useState<string>();

     useEffect(() => {
       fetchApps().then(setApps);
     }, []);

     return (
       <Select value={currentAppId} onValueChange={setCurrentAppId}>
         {apps.map(app => (
           <SelectItem value={app.id}>{app.name}</SelectItem>
         ))}
       </Select>
     );
   };
   ```

3. **App Management UI**:
   - List view with app names, created dates, message counts
   - Create form: name, settings (ai_enabled, etc.)
   - Display API key (with copy button) and secret (masked)
   - Regenerate key button with confirmation

4. **Context Provider**:
   ```typescript
   const AdminContext = createContext<{
     currentAppId: string;
     apps: App[];
     switchApp: (id: string) => void;
   }>(null);
   ```

5. **Update All Dashboard Components**:
   - Add app_id filter to all API calls
   - Display current app name in header
   - Reset state when switching apps

**Critical Files**:
- `/packages/api/src/routes/admin.ts` - Admin API (NEW)
- `/apps/admin-dashboard/src/App.tsx` - Add app switcher
- `/apps/admin-dashboard/src/components/AppManager.tsx` - App CRUD UI (NEW)
- `/apps/admin-dashboard/src/context/AdminContext.tsx` - State management (NEW)

---

## Work Stream 15: Supervised User / Guardian Monitoring
**Priority**: TIER 3 - Competitive Differentiator
**Team**: Backend + Frontend
**Effort**: 2-3 weeks

### Use Case
Parents monitor minors' chat activity, schools monitor students, Impact Idol guardians monitor volunteers.

### Implementation

**Database Schema**:
```sql
CREATE TABLE supervised_user (
  supervisor_user_id VARCHAR(255) NOT NULL,
  supervised_user_id VARCHAR(255) NOT NULL,
  app_id UUID NOT NULL,
  monitoring_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (app_id, supervisor_user_id, supervised_user_id)
);
```

**API Endpoints**:
```
POST /api/users/:id/supervise             - Set up supervision
GET  /api/users/:id/supervised            - Get supervised users
GET  /api/users/:id/activity              - View supervised user's chat history (supervisor only)
```

**Privacy Controls**:
- Supervised user gets notification
- Can toggle monitoring on/off (requires supervisor approval)
- Age-gated (auto-disable at 18)

---

## Work Stream 16: Auto-Enrollment Rules Engine
**Priority**: TIER 3 - Competitive Differentiator
**Team**: Backend
**Effort**: 2 weeks

### Use Case
Auto-join users to workspaces/channels based on criteria (role, tags, events).

**Database Schema**:
```sql
CREATE TABLE enrollment_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES app(id),
  workspace_id UUID REFERENCES workspace(id),
  channel_id UUID REFERENCES channel(id),
  rule_type VARCHAR(50) NOT NULL, -- all_users, role_based, tag_based, event_trigger
  conditions JSONB NOT NULL, -- {"role": "volunteer", "tags": ["SF", "tech"]}
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example Rules**:
- "All new users auto-join #welcome channel"
- "Users with role=volunteer auto-join workspace=Volunteers"
- "Conference attendees auto-join workspace=Conference2025"

---

## Work Stream 17: Workspace Templates & Presets
**Priority**: TIER 3 - Competitive Differentiator
**Team**: Backend + Frontend
**Effort**: 1-2 weeks

### Use Case
Quick setup for events, conferences, projects.

**Templates**:
```typescript
const templates = {
  'conference': {
    channels: [
      { name: 'announcements', type: 'team', readOnly: true },
      { name: 'general', type: 'group' },
      { name: 'help-desk', type: 'group' },
      { name: 'speakers', type: 'private' },
    ],
    expiresInDays: 30,
  },
  'project': {
    channels: [
      { name: 'general', type: 'team' },
      { name: 'dev', type: 'group' },
      { name: 'design', type: 'group' },
    ],
  },
};

// API
POST /api/workspaces/from-template
{
  "template": "conference",
  "name": "Tech Summit 2025",
  "expiresAt": "2025-06-30"
}
```

---

## Work Stream 18: Custom Emoji Support
**Priority**: TIER 3 - Nice-to-have
**Team**: Backend + Frontend
**Effort**: 1-2 weeks

**Database Schema**:
```sql
CREATE TABLE custom_emoji (
  id UUID PRIMARY KEY,
  app_id UUID REFERENCES app(id),
  workspace_id UUID REFERENCES workspace(id),
  name VARCHAR(50) NOT NULL,
  image_url TEXT NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(app_id, workspace_id, name)
);
```

**API Endpoints**:
```
POST /api/workspaces/:id/emoji            - Upload custom emoji
GET  /api/workspaces/:id/emoji            - List custom emoji
```

---

## Work Stream 19: Enhanced File Upload with Blur Hash
**Priority**: TIER 3 - UX Enhancement
**Team**: Backend
**Effort**: 1-2 weeks

### Implementation
```typescript
import sharp from 'sharp';
import { encode } from 'blurhash';

async function processImageUpload(file: File) {
  const buffer = await file.arrayBuffer();
  const image = sharp(Buffer.from(buffer));
  const metadata = await image.metadata();

  // Generate thumbnail
  const thumbnail = await image
    .resize(300, 300, { fit: 'inside' })
    .toBuffer();

  // Generate blurhash
  const { data, info } = await image
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurhash = encode(data, info.width, info.height, 4, 4);

  return {
    width: metadata.width,
    height: metadata.height,
    blurhash,
    thumbnailUrl: await uploadToS3(thumbnail, 'thumbnails/'),
  };
}
```

---

## Work Stream 20: TypeScript-First SDK with Zod Validation
**Priority**: TIER 4 - Developer Experience
**Team**: SDK
**Effort**: 2 weeks

### Implementation
```typescript
// Zod schemas for all API payloads
export const SendMessageSchema = z.object({
  channelId: z.string().uuid(),
  text: z.string().min(1).max(5000).optional(),
  attachments: z.array(AttachmentSchema).max(10).optional(),
  pollId: z.string().uuid().optional(),
  replyToId: z.string().uuid().optional(),
});

export type SendMessagePayload = z.infer<typeof SendMessageSchema>;

// API client with full types
class ChatSDKClient {
  async sendMessage(data: SendMessagePayload): Promise<Message> {
    const validated = SendMessageSchema.parse(data);
    const response = await this.fetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify(validated),
    });
    return MessageSchema.parse(await response.json());
  }
}
```

---

## Work Stream 21: Webhooks & Event System
**Priority**: TIER 4 - Developer Experience
**Team**: Backend
**Effort**: 2 weeks

### Implementation
```typescript
// Subscribe to events
const webhooks = [
  {
    url: 'https://myapp.com/webhooks/chat',
    events: [
      'message.new',
      'message.updated',
      'message.deleted',
      'channel.created',
      'user.banned',
      'message.reported',
    ],
    secret: 'webhook_secret_for_signature',
  },
];

// Webhook payload
{
  "event": "message.new",
  "created_at": "2025-12-27T10:30:00Z",
  "app_id": "...",
  "data": {
    "message": { ... },
    "channel": { ... },
    "user": { ... }
  },
  "signature": "sha256=..." // HMAC for verification
}
```

---

## Work Stream 22: Observability & Monitoring
**Priority**: TIER 4 - Production Requirement
**Team**: DevOps
**Effort**: 2 weeks

### Implementation
```typescript
// Prometheus metrics
import prometheus from 'prom-client';

const messageCounter = new prometheus.Counter({
  name: 'chatsdk_messages_total',
  help: 'Total messages sent',
  labelNames: ['app_id', 'channel_type'],
});

const latencyHistogram = new prometheus.Histogram({
  name: 'chatsdk_api_latency_seconds',
  help: 'API latency',
  labelNames: ['method', 'route'],
});

// Expose /metrics endpoint
app.get('/metrics', async (c) => {
  return c.text(await prometheus.register.metrics());
});
```

**Logging**:
```typescript
import { Logger } from 'pino';

const logger = Logger({
  level: process.env.LOG_LEVEL || 'info',
});

logger.info({ app_id, channel_id, user_id }, 'Message sent');
logger.error({ error, app_id }, 'Failed to send message');
```

---

## Work Stream 23: Offline-First Sync Enhancement
**Priority**: TIER 4 - Mobile UX
**Team**: Mobile SDK
**Effort**: 2 weeks

### Implementation
```typescript
// @chatsdk/core - Already has OfflineQueue, enhance it:
class OfflineQueue {
  async sync() {
    const pendingMessages = await this.storage.getPending();
    for (const msg of pendingMessages) {
      try {
        const result = await this.api.sendMessage(msg);
        // Conflict detection
        if (result.conflictDetected) {
          await this.handleConflict(msg, result.serverVersion);
        }
        await this.storage.markSent(msg.id);
      } catch (error) {
        await this.storage.markFailed(msg.id, error);
      }
    }
  }

  async handleConflict(localMsg, serverMsg) {
    // Strategy: Last write wins with timestamp
    if (localMsg.created_at > serverMsg.created_at) {
      return 'use_local';
    }
    return 'use_server';
  }
}
```

---

## FINAL SUMMARY: What Did The Original Engineer Miss?

### Original Feedback Analysis
The original engineer provided 3 critical technical items:
1. Centrifugo security fix (app_id namespacing)
2. iOS SDK extraction + Capacitor plugin
3. Stream Chat migration CLI

**This was TECHNICALLY CORRECT but INCOMPLETE for Impact Idol's actual needs.**

### The NEW Feasibility Analysis Revealed 17 MISSING Features:

**The original engineer missed ALL of these TIER 1 must-haves:**
1. **Multi-Workspace Hierarchy** (4-5 weeks) - Fundamental architecture change
2. **Polls & Voting System** (2-3 weeks) - Core feature for Impact Idol
3. **Message Moderation & Reporting** (2-3 weeks) - Legal/safety requirement
4. **User Blocking** (1-2 weeks) - Safety requirement
5. **Next.js Server Actions Adapter** (2 weeks) - Integration requirement

**The original engineer missed ALL of these TIER 2 important features:**
6. **Link Previews with Video Embed** (1-2 weeks)
7. **Pinned Messages** (1 week)
8. **Saved/Bookmarked Messages** (1 week)

**The original engineer missed ALL of these TIER 3 differentiators:**
9. **Supervised User / Guardian Monitoring** (2-3 weeks) - Impact Idol specific
10. **Auto-Enrollment Rules Engine** (2 weeks)
11. **Workspace Templates** (1-2 weeks)
12. **Custom Emoji** (1-2 weeks)
13. **Enhanced File Upload with Blur Hash** (1-2 weeks)

**The original engineer missed ALL of these TIER 4 DX improvements:**
14. **TypeScript-First SDK with Zod** (2 weeks)
15. **Webhooks & Event System** (2 weeks)
16. **Observability & Monitoring** (2 weeks)
17. **Offline-First Sync Enhancement** (2 weeks)

### Impact Assessment

**Original Estimate**: ~7 weeks for 6 work streams
**ACTUAL Requirement**: 16-20 weeks for 23 work streams

**Original Scope**: 3 critical blockers + 3 nice-to-haves
**ACTUAL Scope**: 3 blockers + 5 TIER 1 must-haves + 3 TIER 2 features + 5 TIER 3 differentiators + 4 TIER 4 improvements

### Root Cause Analysis

**Why did the original engineer miss so much?**

1. **No Impact Idol Context**: Original feedback was generic "enterprise readiness" without understanding Impact Idol's actual product requirements
2. **No Feature Parity Analysis**: Didn't compare ChatSDK's features against Stream Chat's full feature set
3. **No User Journey Mapping**: Didn't understand Impact Idol's use cases (conferences, guardians, polls, moderation)
4. **No Integration Analysis**: Didn't analyze Impact Idol's tech stack (Prisma, Next.js Server Actions, etc.)

### Key Lessons

**For future technical assessments:**
1. ✅ Always get customer context FIRST
2. ✅ Do competitive feature analysis (ChatSDK vs Stream Chat)
3. ✅ Understand customer's tech stack and integration needs
4. ✅ Map customer's actual use cases and workflows
5. ✅ Consider safety/legal requirements (moderation, guardian monitoring)

---

## Updated Implementation Timeline

**Phase 1: TIER 0 - Critical Blockers** (Weeks 1-3)
- Work Stream 1: Centrifugo Security Fix
- Work Stream 2: iOS SDK Extraction + Capacitor Plugin (documentation phase)
- Work Stream 3: Stream Chat Migration CLI (foundation)

**Phase 2: TIER 1 - Must-Have Features** (Weeks 4-8)
- Work Stream 4: Multi-Workspace Hierarchy (parallel with security fix)
- Work Stream 5: Polls & Voting System
- Work Stream 6: Message Moderation & Reporting
- Work Stream 7: User Blocking
- Work Stream 8: Next.js Server Actions Adapter

**Phase 3: TIER 2 - Important Features** (Weeks 9-11)
- Work Stream 9: Link Previews with Video Embed
- Work Stream 10: Pinned Messages
- Work Stream 11: Saved/Bookmarked Messages
- Work Stream 12: WebPush/APNS VoIP Support
- Work Stream 13: Docker Production Configuration
- Work Stream 14: Admin Dashboard Super Admin Mode

**Phase 4: TIER 3 - Differentiators** (Weeks 12-15)
- Work Stream 15: Supervised User / Guardian Monitoring
- Work Stream 16: Auto-Enrollment Rules Engine
- Work Stream 17: Workspace Templates & Presets
- Work Stream 18: Custom Emoji Support
- Work Stream 19: Enhanced File Upload with Blur Hash

**Phase 5: TIER 4 - Developer Experience** (Weeks 16-20)
- Work Stream 20: TypeScript-First SDK with Zod
- Work Stream 21: Webhooks & Event System
- Work Stream 22: Observability & Monitoring
- Work Stream 23: Offline-First Sync Enhancement

---

## Updated Success Metrics

### Technical Metrics
- ✅ Multi-tenant isolation: 100% (no cross-app data access)
- ✅ Workspace isolation: 100% (no cross-workspace data access)
- ✅ iOS SDK test coverage: >80%
- ✅ Migration CLI: Successfully imports 100k+ messages
- ✅ Poll voting performance: <500ms response time
- ✅ Moderation queue: <1s load time for 1000+ reports
- ✅ API response time: <100ms p95
- ✅ WebSocket connection success rate: >99%
- ✅ Observability: Full Prometheus metrics + structured logging

### Product Metrics for Impact Idol
- ✅ Impact Idol can import 2 years of chat history (125k+ messages)
- ✅ Conference workspaces auto-expire after events
- ✅ Guardians can monitor volunteer chats
- ✅ Polls work in channels with anonymous voting
- ✅ Moderation queue handles message reports
- ✅ Users can block other users
- ✅ Pinned messages visible at top of channels
- ✅ Link previews auto-generate for YouTube/Vimeo
- ✅ Mobile developers can install SDK via SPM in <5 minutes
- ✅ Next.js apps integrate via Server Actions
- ✅ Production deployment uses managed services

### Adoption Metrics
- ✅ ChatSDK reaches feature parity with Stream Chat
- ✅ Impact Idol successfully migrates from Stream Chat
- ✅ $5k+/year cost savings vs Stream Chat
- ✅ 10+ other orgs adopt ChatSDK
- ✅ 100+ stars on GitHub
- ✅ Active community contributions

---

## Database Migration Summary

**New Tables to Create** (11 tables):
1. `workspace` - Multi-workspace hierarchy
2. `workspace_member` - Workspace membership
3. `poll` - Poll questions and options
4. `poll_vote` - Poll votes
5. `message_report` - Message reports for moderation
6. `user_block` - User blocking relationships
7. `pinned_message` - Pinned messages in channels
8. `saved_message` - User-saved bookmarks
9. `custom_emoji` - Workspace-specific emoji
10. `supervised_user` - Guardian monitoring
11. `enrollment_rule` - Auto-enrollment rules

**Schema Updates**:
- `channel` table: ADD `workspace_id UUID REFERENCES workspace(id)`
- `message` table: ADD `poll_id UUID`, `link_previews JSONB`
- `device_token` table: ADD `push_type VARCHAR(20)`, `voip_topic VARCHAR(255)`

**Total Database Changes**: 11 new tables + 3 table alterations

---

## API Endpoints Summary

**New Endpoint Categories**:
- `/api/workspaces/*` - 9 endpoints (workspace CRUD, members, templates)
- `/api/polls/*` - 4 endpoints (create, vote, results, delete vote)
- `/api/moderation/*` - 3 endpoints (report, list reports, review)
- `/api/users/*/block` - 3 endpoints (block, unblock, list blocked)
- `/api/users/*/supervise` - 3 endpoints (supervise, list supervised, activity)
- `/api/messages/*/pin` - 3 endpoints (pin, unpin, list pins)
- `/api/messages/*/save` - 3 endpoints (save, unsave, list saved)
- `/api/workspaces/*/emoji` - 2 endpoints (upload, list)
- `/admin/apps/*` - 6 endpoints (super admin app management)
- `/api/webhooks/*` - 4 endpoints (register, list, update, delete)
- `/metrics` - 1 endpoint (Prometheus metrics)

**Total New Endpoints**: ~41 new API endpoints

---

## Package/Dependency Changes

**New Packages to Create**:
- `@chatsdk/nextjs` - Next.js Server Actions adapter
- `packages/migration-cli` - Stream Chat migration CLI

**New Dependencies**:
- `zod` - Runtime validation
- `sharp` - Image processing
- `blurhash` - Image placeholders
- `prom-client` - Prometheus metrics
- `pino` - Structured logging
- `stream-chat` - For migration CLI
- `commander` - CLI framework
- `cli-progress` - Progress bars
- `ora` - Spinners

---

## Critical Path to Impact Idol Certification

**MUST COMPLETE (Weeks 1-8)**:
1. Centrifugo Security Fix (TIER 0)
2. Multi-Workspace Hierarchy (TIER 1)
3. Polls & Voting (TIER 1)
4. Message Moderation (TIER 1)
5. User Blocking (TIER 1)
6. Next.js Server Actions (TIER 1)
7. Stream Migration CLI (TIER 0)
8. iOS SDK + Capacitor (TIER 0)

**SHOULD COMPLETE (Weeks 9-12)**:
9. Link Previews (TIER 2)
10. Pinned Messages (TIER 2)
11. WebPush/VoIP (TIER 2)
12. Admin Dashboard (TIER 2)

**NICE TO HAVE (Weeks 13-20)**:
13. All TIER 3 features (differentiators)
14. All TIER 4 features (DX improvements)

---

## Risk Assessment

**High Risk Items**:
1. **Multi-Workspace Migration** - Existing ChatSDK users will need migration path from app-only to workspace model
2. **Breaking Changes** - Centrifugo security fix requires coordinated SDK updates
3. **Scope Creep** - 23 work streams vs original 6 = 3.8x increase in scope

**Mitigation Strategies**:
1. **Phased Rollout** - Deploy TIER 0 and TIER 1 first, then iterate
2. **Feature Flags** - Use flags to enable new features gradually
3. **Backwards Compatibility** - Provide migration scripts for existing users

**Go/No-Go Decision Points**:
- After Week 4: Evaluate TIER 1 progress, decide on TIER 2/3/4 scope
- After Week 8: Demo to Impact Idol, get feedback, adjust priorities
- After Week 12: Production readiness review

---

## FINAL RECOMMENDATION

**For ChatSDK Team**:
✅ Commit to TIER 0 + TIER 1 features (Weeks 1-8) as **minimum viable product** for Impact Idol
✅ Build TIER 2 features in parallel (Weeks 9-11) for **competitive parity with Stream Chat**
⚠️ Evaluate TIER 3/4 based on Impact Idol feedback and other customer demand
⚠️ Consider partnering with Impact Idol to co-develop TIER 1 features (guardian monitoring, conference workspaces)

**For Impact Idol**:
✅ Wait for TIER 0 + TIER 1 completion before migrating from Stream Chat
⚠️ Provide detailed requirements for guardian monitoring and conference use cases
⚠️ Consider pilot deployment with TIER 0 + TIER 1 only (minimal viable migration)

---

## Next Steps After Plan Approval

1. ✅ Copy this plan to `docs/enterprise-readiness-plan.md` (per user request)
2. Create GitHub project board with all 23 work streams
3. Create individual GitHub issues for each work stream with acceptance criteria
4. Assign teams to work streams based on skill sets
5. Set up weekly sprint planning and progress tracking
6. Schedule kickoff meeting with all teams
7. Begin TIER 0 implementation (Security + Migration + iOS SDK)
8. Weekly demos to stakeholders starting Week 2

---

**END OF COMPREHENSIVE PLAN**

*Note: This plan will be copied to `docs/enterprise-readiness-plan.md` upon exiting plan mode as requested by user.*

### Implementation

1. **Create Super Admin Routes** (`packages/api/src/routes/admin.ts`):
   ```typescript
   // Requires special ADMIN_API_KEY
   POST /admin/apps          - Create new app
   GET /admin/apps           - List all apps
   GET /admin/apps/:id       - Get app details
   PATCH /admin/apps/:id     - Update app
   DELETE /admin/apps/:id    - Delete app (with cascade warning)
   POST /admin/apps/:id/regenerate-key  - Regenerate API key
   ```

2. **Update Admin Dashboard** (`apps/admin-dashboard/`):

   **App Switcher Component**:
   ```typescript
   const AppSwitcher = () => {
     const [apps, setApps] = useState<App[]>([]);
     const [currentAppId, setCurrentAppId] = useState<string>();

     useEffect(() => {
       fetchApps().then(setApps);
     }, []);

     return (
       <Select value={currentAppId} onValueChange={setCurrentAppId}>
         {apps.map(app => (
           <SelectItem value={app.id}>{app.name}</SelectItem>
         ))}
       </Select>
     );
   };
   ```

3. **App Management UI**:
   - List view with app names, created dates, message counts
   - Create form: name, settings (ai_enabled, etc.)
   - Display API key (with copy button) and secret (masked)
   - Regenerate key button with confirmation

4. **Context Provider**:
   ```typescript
   const AdminContext = createContext<{
     currentAppId: string;
     apps: App[];
     switchApp: (id: string) => void;
   }>(null);
   ```

5. **Update All Dashboard Components**:
   - Add app_id filter to all API calls
   - Display current app name in header
   - Reset state when switching apps

**Critical Files**:
- `/packages/api/src/routes/admin.ts` - Admin API (NEW)
- `/apps/admin-dashboard/src/App.tsx` - Add app switcher
- `/apps/admin-dashboard/src/components/AppManager.tsx` - App CRUD UI (NEW)
- `/apps/admin-dashboard/src/context/AdminContext.tsx` - State management (NEW)

---

## Testing Strategy

### Security Testing (Work Stream 1)
```typescript
// Multi-tenant isolation test
describe('Channel Isolation', () => {
  test('App A cannot subscribe to App B channels', async () => {
    const app1Channel = await app1Client.createChannel({...});

    // Try to subscribe with App B client
    await expect(
      app2Client.subscribeToChannel(app1Channel.id)
    ).rejects.toThrow();
  });

  test('wsToken contains app_id claim', async () => {
    const { wsToken } = await getTokens(apiKey, userId);
    const decoded = jose.decodeJwt(wsToken);
    expect(decoded.app_id).toBe(expectedAppId);
  });
});
```

### iOS SDK Testing (Work Stream 2)
- Unit tests for all ChatClient methods
- SwiftUI integration tests
- Memory leak detection (Instruments)
- Capacitor plugin e2e test in Ionic app

### Migration CLI Testing (Work Stream 3)
```bash
# Dry run validation
chatsdk-migrate import-stream --api-key "..." --secret "..." --target-app-id "..." --dry-run

# Small dataset test
chatsdk-migrate import-stream --channels "messaging:test-channel" ...

# Resume interrupted migration
chatsdk-migrate import-stream --resume "migration-abc123" ...
```

### Integration Testing
- All work streams: Test against staging environment
- Load testing: 1000+ concurrent connections per app
- Cross-app isolation: Verify no data leakage

---

## Success Metrics

### Technical Metrics
- ✅ Multi-tenant isolation: 100% (no cross-app data access)
- ✅ iOS SDK test coverage: >80%
- ✅ Migration CLI: Successfully imports 100k+ messages
- ✅ API response time: <100ms p95
- ✅ WebSocket connection success rate: >99%

### Product Metrics
- ✅ Impact Idol can import 2 years of chat history
- ✅ Mobile developers can install SDK via SPM in <5 minutes
- ✅ Ionic/Capacitor apps can integrate via npm package
- ✅ Platform admins can create new apps via dashboard
- ✅ Production deployment uses managed services (not local Docker volumes)

---

## IMPLEMENTATION COMPLETE ✅

All 23 work streams have been successfully implemented and verified. See [TIER4_IMPLEMENTATION_SUMMARY.md](../TIER4_IMPLEMENTATION_SUMMARY.md) for detailed implementation summary of the final 4 work streams.
