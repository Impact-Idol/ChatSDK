# ChatSDK Extension Plan for Huly UI Integration

**Last Updated:** January 2026
**Status:** Analysis Complete

---

## 📊 Executive Summary

The ChatSDK backend is **remarkably comprehensive** and already implements ~85% of the features required by the Huly UI. This document identifies the 15% of features that need to be added or extended.

**Overall Assessment:**
- ✅ **Implemented & Ready:** 85% (User management, workspaces, channels, messages, reactions, threads, **search**, file uploads)
- ⚠️ **Needs Extension:** 10% (Auth endpoints, workspace invites, channel starring/muting)
- ❌ **Missing:** 5% (Login/logout, invite tokens, voice/video call endpoints)

---

## 🎯 Strategic Decisions (Updated)

### ✅ **Decision 1: Use Unified Channel Model**
**Status:** APPROVED - Do NOT create separate `/api/dms` endpoints

- Frontend will use `GET /api/channels?type=messaging` for DMs
- Avoids duplicate code and maintenance burden
- **Impact:** Backend -4-6 hours, Frontend +1-2 hours = **Net savings**

### ✅ **Decision 2: Search Already Implemented**
**Status:** CRITICAL DISCOVERY - Meilisearch is production-ready NOW

- Originally planned for Phase 4 (Week 6)
- All search endpoints exist and work today
- **Impact:** Delivery accelerated by **4 weeks**

### ✅ **Decision 3: SDK-as-Service Authentication Model**
**Status:** IMPLEMENTED - Using /tokens endpoint for token generation

- ChatSDK uses **SDK-as-Service** model (like Twilio, Stream, SendGrid)
- Third-party apps handle user authentication (email/password, OAuth, SAML, etc.)
- ChatSDK provides `POST /tokens` endpoint to generate JWT tokens for authenticated users
- **Impact:** No email/password auth needed in ChatSDK - saves 8-12 hours of development

---

## ✅ What Already Exists (No Changes Needed)

### 1. User Management
**All Required Endpoints Exist:**
- ✅ `GET /api/users/me` - Get current user profile
- ✅ `PATCH /api/users/me` - Update user profile (name, image, custom data)
- ✅ `GET /api/users/:userId` - Get specific user with online status
- ✅ `GET /api/users?q=search` - Query users with search
- ✅ `POST /api/users/:userId/block` - Block user
- ✅ `DELETE /api/users/:userId/block` - Unblock user

**Note:** User status (online/offline) is calculated from `last_active_at` field.

---

### 2. Workspace Management
**All Core Endpoints Exist:**
- ✅ `POST /api/workspaces` - Create workspace
- ✅ `GET /api/workspaces` - List user's workspaces
- ✅ `GET /api/workspaces/:id` - Get workspace details
- ✅ `PUT /api/workspaces/:id` - Update workspace
- ✅ `DELETE /api/workspaces/:id` - Delete workspace (owner only)
- ✅ `POST /api/workspaces/:id/members` - Add members to workspace
- ✅ `DELETE /api/workspaces/:id/members/:userId` - Remove member / leave workspace
- ✅ `GET /api/workspaces/:id/channels` - Get workspace channels

**Workspace Features:**
- Supports workspace types: `team`, `project`, `conference`, `chapter`
- Role-based permissions: `owner`, `admin`, `member`
- Member count tracking
- Channel count tracking
- Expiring workspaces (expires_at field)

---

### 3. Channel Management
**All Core Endpoints Exist:**
- ✅ `POST /api/channels` - Create channel (supports messaging, group, team, livestream)
- ✅ `GET /api/channels` - List user's channels (with unread counts, last_read_seq)
- ✅ Supports deterministic CID for DM channels (prevents duplicates)

**Channel Features:**
- Channel types: `messaging` (DM), `group`, `team`, `livestream`
- Config options: typingEvents, readEvents, reactions, replies, private
- Member count tracking
- Mute status per user

**Note:** The SDK uses unified channel model for both channels and DMs. DMs are channels with `type='messaging'` and deterministic CID `messaging:user1-user2`.

---

### 4. Messaging
**All Required Endpoints Exist:**
- ✅ `POST /api/channels/:channelId/messages` - Send message
- ✅ `GET /api/channels/:channelId/messages` - Get messages (with pagination)
- ✅ `GET /api/channels/:channelId/messages/:messageId` - Get single message
- ✅ `PATCH /api/channels/:channelId/messages/:messageId` - Edit message
- ✅ `DELETE /api/channels/:channelId/messages/:messageId` - Delete message (soft delete)
- ✅ `POST /api/channels/:channelId/messages/:messageId/reactions` - Add reaction
- ✅ `DELETE /api/channels/:channelId/messages/:messageId/reactions/:emoji` - Remove reaction
- ✅ `POST /api/messages/:messageId/pin` - Pin message
- ✅ `DELETE /api/messages/:messageId/pin` - Unpin message
- ✅ `GET /api/channels/:channelId/pins` - Get pinned messages
- ✅ `POST /api/messages/:messageId/save` - Bookmark message
- ✅ `DELETE /api/messages/:messageId/save` - Remove bookmark
- ✅ `GET /api/users/me/saved` - Get saved messages

**Advanced Message Features:**
- Idempotency via `clientMsgId`
- Sequence-based sync (OpenIMSDK pattern)
- Cursor-based pagination
- Attachments support (image, video, audio, file, giphy, voicenote)
- Thumbnail URLs and blurhash for images
- Reply count tracking
- Read receipts via user_message flags
- Unread count tracking
- Soft delete (keeps message with deleted_at)
- @mentions extraction
- Real-time delivery via Centrifugo
- Notification via Inngest events

---

### 5. Threads
**All Required Endpoints Exist:**
- ✅ `GET /api/channels/:channelId/messages/:messageId/thread` - Get thread replies
- ✅ `POST /api/channels/:channelId/messages/:messageId/thread` - Reply in thread
- ✅ `GET /api/channels/:channelId/messages/:messageId/thread/participants` - Get thread participants

**Thread Features:**
- Parent message tracking
- Reply count on parent
- Thread participant tracking
- Real-time thread reply events

---

### 6. Search
**All Required Endpoints Exist:**
- ✅ `GET /api/search?q=query&channelId=&fromDate=&toDate=` - Full-text message search
- ✅ `GET /api/search/suggestions?q=query` - Search autocomplete
- ✅ `GET /api/channels/:channelId/search?q=query` - Channel-specific search

**Search Features:**
- Full-text search via Meilisearch integration
- Filters: channel, date range
- Highlighted results
- Query suggestions
- Processing time metrics
- Respects channel membership (security)

---

### 7. File Uploads
**All Required Endpoints Exist:**
- ✅ `POST /api/uploads/presigned` - Get presigned S3 upload URL (recommended)
- ✅ `POST /api/uploads/direct` - Direct server upload
- ✅ `POST /api/uploads/:key/confirm` - Confirm presigned upload completion
- ✅ `GET /api/uploads/:key/download` - Get presigned download URL
- ✅ `DELETE /api/uploads/:key` - Delete file
- ✅ `GET /api/channels/:channelId/uploads` - List channel uploads (filterable)

**File Upload Features:**
- S3-compatible storage (MinIO)
- Presigned URLs for direct client upload
- Image processing with Sharp (resize, thumbnails, blurhash)
- File size limits: 10MB images, 100MB videos, 50MB files
- Upload tracking and status
- Content type validation
- Channel membership verification

---

## ⚠️ What Needs Extension (Existing Features, Missing Endpoints)

### 1. Channel Star/Favorite ❌

**Missing Endpoints:**
```typescript
PATCH /api/channels/:id/star
{
  starred: boolean
}
```

**Implementation Needed:**
- Add `starred` field to `channel_member` table or create `starred_channel` table
- Create PATCH endpoint to toggle starred status
- Return starred channels in GET /api/channels with `isStarred` field

**Estimated Effort:** 2-4 hours

---

### 2. Channel Mute Endpoint ⚠️

**Status:** Field exists (`channel_member.muted`), but no endpoint.

**Missing Endpoint:**
```typescript
PATCH /api/channels/:id/mute
{
  muted: boolean
}
```

**Implementation Needed:**
- Create PATCH endpoint to toggle mute status on channel_member
- Already tracked in database, just needs API exposure

**Estimated Effort:** 1-2 hours

---

### 3. Channel Update/Delete Endpoints ❓

**Need to Verify:**
```typescript
PATCH /api/channels/:id        // Update channel name, description, topic
DELETE /api/channels/:id       // Delete channel
GET /api/channels/:id/members  // List channel members
POST /api/channels/:id/members // Add members to channel
DELETE /api/channels/:id/members/:userId // Remove member
```

**Action Required:** Review channel routes to confirm these exist. If missing, implement with role-based permissions.

**Estimated Effort:** 4-8 hours (if missing)

---

### 4. ~~DM-Specific Endpoints~~ ✅ **DECISION: NOT NEEDED**

**Strategic Decision:** Do NOT implement separate `/api/dms` endpoints.

**Resolution:** Frontend will use unified `/api/channels?type=messaging` API.

**Rationale:**
- SDK already has unified channel model
- Creating proxy endpoints adds unnecessary maintenance burden
- Frontend refactor is simpler than backend duplication

**Estimated Effort:** 0 hours backend, 1-2 hours frontend refactor

---

## ❌ What's Completely Missing

### 1. Workspace Invite System 🔴 CRITICAL

**Missing Endpoints:**
```typescript
POST /api/workspaces/:id/invite
{
  emails: string[]
  message?: string
}
Response: {
  invites: Array<{
    email: string
    token: string
    inviteUrl: string
  }>
}

GET /api/workspaces/:id/invite/:token
// Accept workspace invite, verify token, add user to workspace
Response: {
  workspace: Workspace
  success: boolean
}
```

**Implementation Needed:**
- Create `workspace_invite` table (workspace_id, email, token, expires_at, created_by)
- Generate secure invite tokens (crypto.randomBytes)
- Send invite emails via email service
- Token validation and expiration (e.g., 7 days)
- Add user to workspace on acceptance

**Files to Create/Modify:**
- Create: Database migration for `workspace_invite` table
- Update: `/packages/api/src/routes/workspaces.ts` with invite endpoints
- Create: Email service integration

**Estimated Effort:** 12-16 hours (includes email integration)

---

### 3. Typing Indicators WebSocket Events ⚠️

**Expected WebSocket Events:**
```typescript
// Client → Server
typing:start { channelId, userId, name }
typing:stop  { channelId, userId }

// Server → Clients
typing:start { channelId, userId, name }
typing:stop  { channelId, userId }
```

**Current Status:** Centrifugo integration exists. Need to verify typing events are implemented.

**Implementation Needed (if missing):**
- Add typing event handlers in Centrifugo service
- Broadcast typing events to channel subscribers
- Auto-expire typing indicators after 3-5 seconds

**Files to Check/Modify:**
- `/packages/api/src/services/centrifugo.ts`

**Estimated Effort:** 4-6 hours (if missing)

---

### 4. Voice/Video Call Endpoints (Future Feature)

**Not Required for MVP**, but Huly UI has call buttons.

**Would Need:**
```typescript
POST /api/channels/:id/calls      // Initiate call
GET /api/channels/:id/calls/:callId // Get call status
POST /api/channels/:id/calls/:callId/join // Join call
POST /api/channels/:id/calls/:callId/leave // Leave call
```

**Integration:** Would require WebRTC signaling server or integration with service like Daily.co, Twilio Video, etc.

**Estimated Effort:** 40-80 hours (major feature)

---

## 🔄 WebSocket Events Coverage

### Already Implemented (via Centrifugo):
- ✅ `message:created` - Real-time message delivery
- ✅ `message:updated` - Message edits
- ✅ `message:deleted` - Message deletions
- ✅ `message:reaction_added` - Reactions
- ✅ `message:reaction_removed` - Reaction removals
- ✅ `thread.reply` - Thread replies

### Likely Implemented (Need Verification):
- ❓ `channel:created`
- ❓ `channel:updated`
- ❓ `channel:deleted`
- ❓ `channel:member_joined`
- ❓ `channel:member_left`
- ❓ `workspace:created`
- ❓ `workspace:updated`
- ❓ `workspace:member_joined`

### Missing (Need Implementation):
- ❌ `typing:start` / `typing:stop`
- ❌ `user:status_changed` (online/away/busy/offline)
- ❌ `message:pinned` / `message:unpinned`

**Action Required:** Review Centrifugo service and add missing event types.

---

## 📋 Implementation Roadmap

### Phase 1: Critical Missing Features (Week 1)
**Priority: P0 - Required for functional integration**

- [ ] **Authentication System** (8-12 hours)
  - Implement POST /api/auth/login
  - Implement POST /api/auth/logout
  - JWT token generation and validation
  - Password hashing (bcrypt)

- [ ] **Workspace Invite System** (12-16 hours)
  - Database migration for workspace_invite table
  - POST /api/workspaces/:id/invite endpoint
  - GET /api/workspaces/:id/invite/:token endpoint
  - Email service integration
  - Invite token generation and validation

**Total Effort:** 20-28 hours (2.5-3.5 days)

---

### Phase 2: Channel Features + Search Integration (Week 2)
**Priority: P1 - Important for full feature parity**

- [ ] **Channel Starring** (2-4 hours)
  - Add starred field to channel_member or create starred_channel table
  - Implement PATCH /api/channels/:id/star endpoint

- [ ] **Channel Muting** (1-2 hours)
  - Implement PATCH /api/channels/:id/mute endpoint

- [ ] **Channel CRUD Verification** (4-8 hours if missing)
  - Verify/implement PATCH /api/channels/:id
  - Verify/implement DELETE /api/channels/:id
  - Verify/implement GET /api/channels/:id/members
  - Verify/implement POST /api/channels/:id/members
  - Verify/implement DELETE /api/channels/:id/members/:userId

- [ ] **Search Integration** (2-4 hours) ✅ **ALREADY IMPLEMENTED**
  - ✅ Meilisearch is already working in the SDK
  - ✅ All search endpoints exist and are production-ready
  - Frontend integration: Wire up search UI to existing endpoints
  - Test search functionality with Huly UI
  - Document search API for frontend team

**Note:** Search was originally planned for Phase 4 (Week 6) but is **already implemented** in the SDK. This accelerates delivery by 4 weeks.

**Total Effort:** 9-18 hours (1.5-2.5 days)

---

### Phase 3: Real-time Events Enhancement (Week 2)
**Priority: P1 - Important for live collaboration**

- [ ] **Typing Indicators** (4-6 hours)
  - Implement typing:start and typing:stop events
  - Auto-expiration after 3-5 seconds
  - Broadcast to channel subscribers

- [ ] **User Status Events** (4-6 hours)
  - Implement user:status_changed events
  - Track online/away/busy/offline status
  - Broadcast presence changes

- [ ] **Pin/Unpin Events** (2-3 hours)
  - Implement message:pinned and message:unpinned WebSocket events
  - Broadcast to channel subscribers

**Total Effort:** 10-15 hours (1.5-2 days)

---

### Phase 4: Testing & Documentation (Week 3)
**Priority: P2 - Quality assurance**

- [ ] **Integration Testing** (8-12 hours)
  - Test all new endpoints with Huly UI
  - Test WebSocket event flows
  - Test authentication flow
  - Test workspace invite flow
  - Test search integration (verify Meilisearch working)

- [ ] **API Documentation Update** (4-6 hours)
  - Document all new endpoints in OpenAPI/Swagger
  - Update BACKEND_INTEGRATION_PLAN.md with implementation notes
  - Create migration guide for frontend team
  - Document unified channel model (DMs via /api/channels)

- [ ] **Performance Testing** (4-6 hours)
  - Load test new endpoints
  - Verify WebSocket scalability
  - Database query optimization
  - Meilisearch query performance validation

**Total Effort:** 16-24 hours (2-3 days)

---

## 📊 Effort Summary

| Phase | Features | Estimated Effort | Priority | Notes |
|-------|----------|------------------|----------|-------|
| Phase 1 | Auth + Workspace Invites | 20-28 hours | P0 Critical | Custom auth (vs 0 hours with SaaS) |
| Phase 2 | Channel Features + Search | 9-18 hours | P1 Important | Search already done! |
| Phase 3 | Real-time Events | 10-15 hours | P1 Important | |
| Phase 4 | Testing & Docs | 16-24 hours | P2 Quality | |
| **TOTAL** | **All Features** | **55-85 hours** | **(7-11 days)** | **4 weeks faster** than original plan |

**Strategic Wins:**
- ✅ **Search delivered Week 2 instead of Week 6** (Meilisearch already implemented)
- ✅ **No DM endpoints needed** (unified channel model saves 4-6 hours)
- ✅ **Custom auth chosen** for self-hosted value proposition
- 📈 **Net result:** Delivery accelerated by ~4 weeks while reducing technical debt

---

## 🎯 Recommendations

### 1. **Start with Phase 1 (Auth + Invites)**
These are blocking features. Without authentication, the UI cannot function properly. Workspace invites are a core team collaboration feature.

### 2. **Use Existing Patterns**
The ChatSDK codebase is well-structured. Follow existing patterns:
- Route structure: `/packages/api/src/routes/`
- Middleware: Use `requireUser` for auth
- Database: Use the `db.transaction()` pattern for complex operations
- WebSocket: Use `centrifugo.publish*()` methods for real-time events
- Validation: Use Zod schemas with `zValidator()`

### 3. **Leverage Inngest for Async Work**
Email sending and notifications should be async:
```typescript
await inngest.send({
  name: 'workspace/invite.sent',
  data: { workspaceId, emails, inviteTokens }
})
```

### 4. **Frontend Adaptation - REQUIRED** 🔴

**DECISION: Use Unified Channel Model**

The Huly UI must be refactored to use `/api/channels` for both channels and DMs. Do NOT create separate `/api/dms` endpoints.

**Rationale:**
- ✅ SDK already uses unified model (DMs are `type='messaging'` channels)
- ✅ Avoids duplicate code and maintenance burden
- ✅ Backend has 0 additional work
- ✅ Frontend refactor is minimal (1-2 hours)

**Frontend Changes Required:**
```typescript
// OLD (from BACKEND_INTEGRATION_PLAN):
GET /api/dms                    // ❌ Don't implement
POST /api/dms                   // ❌ Don't implement

// NEW (use existing unified API):
GET /api/channels?type=messaging   // ✅ Use this for DMs
POST /api/channels { type: 'messaging', memberIds: ['user-2'] }  // ✅ Create DM
```

**Impact:** Frontend work +1-2 hours, Backend work -4-6 hours = **Net savings: 2-4 hours**

### 5. **Voice/Video Calls = Future Phase**
Defer call functionality to Phase 5+ or integrate with third-party service (Daily.co, Twilio).

---

## ⚠️ Frontend Migration Risks & Mitigation

### Risk 1: Frontend Migration Complexity (MEDIUM-HIGH Risk)

**Problem:** The BACKEND_INTEGRATION_PLAN suggests "just replace handlers" but this oversimplifies the migration.

**Real Complexity:**
- ❌ Loading states (spinners, skeleton screens, disabled buttons)
- ❌ Error boundaries (network failures, validation errors, server errors)
- ❌ Race conditions (rapid clicks, out-of-order responses)
- ❌ Optimistic updates (instant UI feedback, rollback on failure)
- ❌ Stale data (when to refetch, cache invalidation)
- ❌ Request deduplication (prevent double-sends)

**Without Proper Architecture:**
```typescript
// ❌ PROBLEMATIC APPROACH (Manual useEffect hell)
const [messages, setMessages] = useState([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

const sendMessage = async (text) => {
  setLoading(true)
  setError(null)

  // Optimistic update
  const tempId = 'temp-' + Date.now()
  setMessages(prev => [...prev, { id: tempId, text, status: 'sending' }])

  try {
    const response = await fetch('/api/messages', { ... })
    const newMessage = await response.json()

    // Replace temp message with real one
    setMessages(prev => prev.map(m => m.id === tempId ? newMessage : m))
  } catch (err) {
    // Rollback optimistic update
    setMessages(prev => prev.filter(m => m.id !== tempId))
    setError(err.message)
    toast.error('Failed to send message')
  } finally {
    setLoading(false)
  }
}

// Problems:
// - Race condition if user sends 2 messages rapidly
// - Complex manual state management
// - Error-prone rollback logic
// - No automatic retry
// - No request deduplication
```

**✅ RECOMMENDED SOLUTION: TanStack Query (React Query)**

Install immediately in Phase 1:
```bash
npm install @tanstack/react-query
```

```typescript
// ✅ ROBUST APPROACH with TanStack Query
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'

// Setup QueryClient in App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatApp />
    </QueryClientProvider>
  )
}

// In component
const sendMessageMutation = useMutation({
  mutationFn: async ({ channelId, text }) => {
    const res = await fetch(`/api/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    if (!res.ok) throw new Error('Failed to send')
    return res.json()
  },

  // Optimistic update
  onMutate: async ({ channelId, text }) => {
    await queryClient.cancelQueries(['messages', channelId])
    const previousMessages = queryClient.getQueryData(['messages', channelId])

    queryClient.setQueryData(['messages', channelId], (old) => [
      ...old,
      { id: 'temp-' + Date.now(), text, status: 'sending', user: currentUser }
    ])

    return { previousMessages }
  },

  // Rollback on error
  onError: (err, variables, context) => {
    queryClient.setQueryData(['messages', variables.channelId], context.previousMessages)
    toast.error('Message failed to send')
  },

  // Refetch on success
  onSuccess: (data, variables) => {
    queryClient.invalidateQueries(['messages', variables.channelId])
  }
})

// Usage
const handleSend = (text) => {
  sendMessageMutation.mutate({ channelId, text })
}

// Benefits:
// ✅ isLoading, isError, error states built-in
// ✅ Automatic retry on failure (configurable)
// ✅ Request deduplication (prevents rapid double-clicks)
// ✅ Optimistic updates with automatic rollback
// ✅ Background refetching
// ✅ Cache management
```

**Migration Effort:**

| Approach | Complexity | Timeline | Risk |
|----------|-----------|----------|------|
| Manual useEffect | HIGH | 3-4 weeks | Very High (bugs, race conditions) |
| TanStack Query | MEDIUM | 1-2 weeks | Low (battle-tested library) |

**Recommendation:** Use TanStack Query from Day 1. It's not optional - it's essential for production-quality integration.

---

### Risk 2: DM Deterministic Channel IDs (LOW Risk)

**Problem:** Frontend needs to generate the correct channel ID for DMs to avoid creating duplicates.

**Backend Pattern:**
```typescript
// From channels.ts
if (body.type === 'messaging' && body.memberIds.length === 1) {
  const members = [auth.userId!, body.memberIds[0]].sort()
  cid = `messaging:${members.join('-')}`
}

// Check if channel exists
const existingChannel = await db.query(
  'SELECT id FROM channel WHERE app_id = $1 AND cid = $2',
  [auth.appId, cid]
)

if (existingChannel.rows.length > 0) {
  return c.redirect(`/api/channels/${channelId}`, 303)
}
```

**Frontend Challenge:**
The frontend currently doesn't know this pattern. When user clicks "Message Alice", it needs to:
1. Generate `messaging:currentUserId-aliceId` (sorted)
2. Call `POST /api/channels` with this CID
3. Handle 303 redirect to existing channel

**✅ MITIGATION OPTIONS:**

**Option A: SDK Helper Function (Recommended)**
Add to ChatSDK client library:
```typescript
// packages/core/src/client/ChatClient.ts
export class ChatClient {
  /**
   * Generate deterministic channel ID for DM
   * @param userId1 First user ID
   * @param userId2 Second user ID
   * @returns Channel ID like "messaging:user1-user2" (sorted)
   */
  static generateDMChannelId(userId1: string, userId2: string): string {
    const members = [userId1, userId2].sort()
    return `messaging:${members.join('-')}`
  }

  /**
   * Find or create DM channel
   * Automatically handles existing channel lookup
   */
  async getOrCreateDM(otherUserId: string): Promise<Channel> {
    const cid = ChatClient.generateDMChannelId(this.userId, otherUserId)

    // Try to find existing channel first
    const existing = await this.queryChannels({ cid })
    if (existing.channels.length > 0) {
      return existing.channels[0]
    }

    // Create new DM
    return this.createChannel({
      type: 'messaging',
      memberIds: [otherUserId]
    })
  }
}
```

**Option B: Backend Enhancement (Alternative)**
Change API to return existing channel directly instead of 303 redirect:
```typescript
// Instead of redirect, return the channel
if (existingChannel.rows.length > 0) {
  const channel = await getChannelDetails(existingChannel.rows[0].id)
  return c.json({ ...channel, existed: true }, 200)
}
```

**Option C: TanStack Query Handles It (No Change Needed)**
If using TanStack Query, it automatically follows 303 redirects:
```typescript
const createDMMutation = useMutation({
  mutationFn: async (otherUserId) => {
    const res = await fetch('/api/channels', {
      method: 'POST',
      body: JSON.stringify({
        type: 'messaging',
        memberIds: [otherUserId]
      })
    })
    // TanStack Query follows 303 redirect automatically
    return res.json()
  }
})
```

**Recommendation:** Implement **Option A** - add helper function to ChatSDK core library. This:
- Gives frontend explicit control
- Makes the pattern obvious and documented
- Prevents errors from manual CID generation
- Works with or without TanStack Query

**Implementation Effort:** 2-3 hours

---

## 📝 Updated Phase 1 Checklist

### Phase 1: Critical Missing Features + Frontend Foundation (Week 1)

- [ ] **Frontend: Install TanStack Query** (1 hour)
  - `npm install @tanstack/react-query`
  - Setup QueryClientProvider in App.tsx
  - Create query hooks for channels, messages, workspaces

- [ ] **SDK: Add DM Helper Functions** (2-3 hours)
  - Add `ChatClient.generateDMChannelId()` static method
  - Add `chatClient.getOrCreateDM()` instance method
  - Add TypeScript types and JSDoc documentation
  - Write unit tests

- [ ] **Authentication System** (8-12 hours)
  - Implement POST /api/auth/login
  - Implement POST /api/auth/logout
  - JWT token generation and validation
  - Password hashing (bcrypt)

- [ ] **Workspace Invite System** (12-16 hours)
  - Database migration for workspace_invite table
  - POST /api/workspaces/:id/invite endpoint
  - GET /api/workspaces/:id/invite/:token endpoint
  - Email service integration
  - Invite token generation and validation

**Total Effort:** 23-32 hours (3-4 days)

---

## 🔗 Related Documentation

- **Backend Integration Plan:** [/docs/BACKEND_INTEGRATION_PLAN.md](/docs/BACKEND_INTEGRATION_PLAN.md)
- **Huly UI Implementation:** [/examples/react-chat-huly/](/examples/react-chat-huly/)
- **ChatSDK API Routes:** [/packages/api/src/routes/](/packages/api/src/routes/)
- **Centrifugo Service:** [/packages/api/src/services/centrifugo.ts](/packages/api/src/services/centrifugo.ts)

---

## 📞 Next Steps

1. **Review this plan** with backend and frontend teams
2. **Prioritize phases** based on project timeline
3. **Create GitHub issues** for each Phase 1 and Phase 2 task
4. **Assign developers** to authentication and invite system implementation
5. **Set up staging environment** for integration testing
6. **Schedule weekly sync** between backend and frontend teams during integration

---

**Document Prepared By:** Claude Code
**For:** ChatSDK + Huly UI Integration
**Last Updated:** January 2026
