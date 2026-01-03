# Backend Integration Plan - Huly Chat UI

**Last Updated:** January 2026
**Status:** UI Complete - Ready for Backend Integration

---

## 📋 Overview

This document outlines all features implemented in the Huly Chat UI and the corresponding backend endpoints/functionality needed for full integration.

---

## ✅ Completed UI Features

### 1. **User Management**

#### UI Implementation:
- Current user state: `currentUser` (User object)
- Profile updates via UserProfileModal
- Logout functionality

#### Backend Requirements:
```typescript
// API Endpoints Needed:
POST   /api/auth/login          // Authenticate user, return JWT
POST   /api/auth/logout         // Invalidate session
GET    /api/users/me            // Get current user profile
PATCH  /api/users/me            // Update user profile (name, email, avatar, status)

// WebSocket Events:
user:status_changed             // Broadcast when user status changes
```

#### Data Structure:
```typescript
interface User {
  id: string
  name: string
  email: string
  avatar: string
  status: 'online' | 'away' | 'busy' | 'offline'
  isOnline: boolean
}
```

---

### 2. **Workspace Management**

#### UI Implementation:
- Create workspace (AddWorkspaceModal)
- Switch between workspaces
- Update workspace settings
- Leave/Delete workspace
- Invite members to workspace (WorkspaceInviteModal)

#### Backend Requirements:
```typescript
// API Endpoints Needed:
GET    /api/workspaces                    // List user's workspaces
POST   /api/workspaces                    // Create new workspace
GET    /api/workspaces/:id                // Get workspace details
PATCH  /api/workspaces/:id                // Update workspace (name, icon)
DELETE /api/workspaces/:id                // Delete workspace
POST   /api/workspaces/:id/members        // Add member to workspace
DELETE /api/workspaces/:id/members/:userId // Remove member
POST   /api/workspaces/:id/invite         // Send email invitations
GET    /api/workspaces/:id/invite/:token  // Accept workspace invite

// WebSocket Events:
workspace:created
workspace:updated
workspace:deleted
workspace:member_joined
workspace:member_left
```

#### Data Structure:
```typescript
interface Workspace {
  id: string
  name: string
  icon: string  // Emoji character
  channels: string[]  // Channel IDs
  members: string[]   // User IDs
  createdAt: Date
}
```

---

### 3. **Channel Management**

#### UI Implementation:
- Create public/private channels (CreateChannelModal)
- Update channel settings (ChannelSettingsModal)
- Leave channel
- Delete channel
- Add members to channel (AddMembersModal)
- Star/favorite channels
- Channel members panel

#### Backend Requirements:
```typescript
// API Endpoints Needed:
GET    /api/channels                          // List channels in workspace
POST   /api/channels                          // Create channel
GET    /api/channels/:id                      // Get channel details
PATCH  /api/channels/:id                      // Update channel (name, description, topic)
DELETE /api/channels/:id                      // Delete channel
GET    /api/channels/:id/members              // List channel members
POST   /api/channels/:id/members              // Add members
DELETE /api/channels/:id/members/:userId      // Remove member / leave channel
PATCH  /api/channels/:id/star                 // Star/unstar channel
PATCH  /api/channels/:id/mute                 // Mute/unmute notifications

// WebSocket Events:
channel:created
channel:updated
channel:deleted
channel:member_joined
channel:member_left
```

#### Data Structure:
```typescript
interface Channel {
  id: string
  workspaceId: string
  name: string
  description?: string
  topic?: string
  type: 'public' | 'private'
  isStarred?: boolean
  isMuted?: boolean
  unreadCount?: number
  lastMessage?: string
  lastMessageAt?: Date
  memberCount?: number
  createdAt: Date
  createdBy: string
}

interface ChannelMember {
  id: string        // User ID
  name: string
  avatar: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
}
```

---

### 4. **Direct Messages (DMs)**

#### UI Implementation:
- Start 1-on-1 or group DMs (StartConversationModal)
- DM settings (mute, leave)
- Star/favorite DMs

#### Backend Requirements:
```typescript
// API Endpoints Needed:
GET    /api/dms                     // List user's DMs
POST   /api/dms                     // Start new DM/group DM
GET    /api/dms/:id                 // Get DM details
DELETE /api/dms/:id                 // Leave DM
PATCH  /api/dms/:id/star            // Star/unstar DM
PATCH  /api/dms/:id/mute            // Mute/unmute notifications

// WebSocket Events:
dm:created
dm:updated
```

#### Data Structure:
```typescript
interface DirectMessage {
  id: string
  type: '1-on-1' | 'group'
  participants: User[]
  isStarred?: boolean
  isMuted?: boolean
  unreadCount?: number
  lastMessage?: string
  lastMessageAt?: Date
  createdAt: Date
}
```

---

### 5. **Messaging**

#### UI Implementation:
- Send text messages with markdown
- Send messages with file attachments
- Edit messages (EditMessageModal)
- Delete messages
- React to messages (emoji reactions)
- Pin/unpin messages
- Reply in thread
- Mention users (@username)
- Jump to message (from pins, search)
- Typing indicators
- Message search with filters

#### Backend Requirements:
```typescript
// API Endpoints Needed:
GET    /api/channels/:id/messages            // Get channel messages (paginated)
POST   /api/channels/:id/messages            // Send message to channel
GET    /api/dms/:id/messages                 // Get DM messages (paginated)
POST   /api/dms/:id/messages                 // Send message to DM
PATCH  /api/messages/:id                     // Edit message
DELETE /api/messages/:id                     // Delete message
POST   /api/messages/:id/reactions           // Add reaction
DELETE /api/messages/:id/reactions/:emoji    // Remove reaction
PATCH  /api/messages/:id/pin                 // Pin/unpin message
POST   /api/messages/:id/replies             // Reply in thread
GET    /api/messages/:id/replies             // Get thread replies
POST   /api/files/upload                     // Upload file, return URL
GET    /api/search/messages                  // Search messages (query, filters)

// WebSocket Events:
message:created
message:updated
message:deleted
message:reaction_added
message:reaction_removed
message:pinned
message:unpinned
typing:start                                  // User started typing
typing:stop                                   // User stopped typing
```

#### Data Structure:
```typescript
interface Message {
  id: string
  text: string
  userId: string
  user: User
  channelId: string
  createdAt: Date
  updatedAt?: Date
  isEdited?: boolean
  isPinned?: boolean
  attachments?: Attachment[]
  reactions?: Reaction[]
  mentions?: string[]  // User IDs
  replyCount?: number
  parentMessageId?: string  // For thread replies
  readBy?: string[]  // User IDs who read the message
}

interface Attachment {
  id: string
  name: string
  url: string
  type: string  // MIME type
  size: number
}

interface Reaction {
  emoji: string
  userIds: string[]
}
```

---

### 6. **Real-time Features**

#### UI Implementation:
- Live message updates
- Typing indicators
- Online/offline status
- Unread counts

#### Backend Requirements:
```typescript
// WebSocket Connection:
WS /api/ws?token=<jwt>

// Subscribe to channels:
subscribe:channel:<channelId>
subscribe:dm:<dmId>
subscribe:user:<userId>
subscribe:workspace:<workspaceId>

// Typing indicators:
typing:start { channelId, userId, name }
typing:stop  { channelId, userId }

// Presence updates:
user:online  { userId }
user:offline { userId }
user:away    { userId }
```

---

### 7. **Search**

#### UI Implementation:
- Full-text message search (MessageSearch component)
- Filter by channel, user, date range
- Jump to message result

#### Backend Requirements:
```typescript
// API Endpoints Needed:
GET /api/search/messages?q=<query>&channelId=&userId=&dateFrom=&dateTo=

// Response:
{
  messages: Message[]
  total: number
  page: number
}
```

---

## 🔄 State Management (Current Frontend)

### Current Implementation:
All state is managed locally in React `useState`:

```typescript
// App.tsx state
const [currentUser, setCurrentUser] = useState<User>()
const [workspaces, setWorkspaces] = useState<Workspace[]>()
const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>()
const [channels, setChannels] = useState<Channel[]>()
const [dms, setDMs] = useState<DirectMessage[]>()
const [messages, setMessages] = useState<Record<string, Message[]>>()
const [channelMembersMap, setChannelMembersMap] = useState<...>()
const [typingUsers, setTypingUsers] = useState<...>()
```

### Migration Strategy:
When integrating backend, replace local state updates with API calls:

```typescript
// BEFORE (Current UI-only):
const handleCreateChannel = (name, description, type) => {
  const newChannel = { id: `channel-${Date.now()}`, name, ... }
  setChannels(prev => [...prev, newChannel])
}

// AFTER (With Backend):
const handleCreateChannel = async (name, description, type) => {
  const response = await fetch('/api/channels', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, description, type, workspaceId })
  })
  const newChannel = await response.json()
  setChannels(prev => [...prev, newChannel])
}
```

---

## 📦 File Upload Implementation

### Current UI:
- Files can be selected and attached to messages
- Preview shows before sending
- Files converted to `Attachment[]` objects

### Backend Requirements:

#### Option 1: Direct Upload
```typescript
POST /api/files/upload
Content-Type: multipart/form-data

Response:
{
  url: string      // Public URL to file
  id: string       // File ID
  name: string
  size: number
  type: string
}
```

#### Option 2: S3 Pre-signed URLs (Recommended)
```typescript
// Step 1: Request upload URL
POST /api/files/presigned-url
{ filename: string, contentType: string }

Response:
{
  uploadUrl: string    // Pre-signed S3 URL
  publicUrl: string    // Final public URL
  fileId: string
}

// Step 2: Upload directly to S3 from browser
PUT <uploadUrl>
Body: <file-data>

// Step 3: Send message with file URL
POST /api/channels/:id/messages
{
  text: string,
  attachments: [{ id, name, url, type, size }]
}
```

---

## 🔐 Authentication

### Current UI:
- Assumes user is logged in as `currentUser`
- Logout clears state and shows alert

### Backend Requirements:

```typescript
// JWT Authentication
POST /api/auth/login
{ email: string, password: string }

Response:
{
  token: string        // JWT token
  user: User
  workspaces: Workspace[]
}

// Store JWT in localStorage/cookie
// Include in all requests:
Authorization: Bearer <token>

// WebSocket authentication:
WS /api/ws?token=<jwt>
```

---

## 🎨 UI Components Ready for Integration

All modals and components accept callback functions that can be wired to API calls:

### Example: Channel Creation
```typescript
<CreateChannelModal
  onClose={() => setShowCreateChannel(false)}
  onCreateChannel={async (name, description, type) => {
    // Just replace this with API call:
    const channel = await createChannel({ name, description, type })
    setChannels(prev => [...prev, channel])
  }}
/>
```

### Example: Sending Messages
```typescript
<MessageComposer
  onSendMessage={async (text, files, mentions) => {
    // Upload files first if present
    const attachments = files ? await uploadFiles(files) : []

    // Send message
    const message = await sendMessage({
      channelId,
      text,
      attachments,
      mentions
    })

    // Update local state (or wait for WebSocket event)
    setMessages(prev => ({
      ...prev,
      [channelId]: [...(prev[channelId] || []), message]
    }))
  }}
/>
```

---

## 🚀 Integration Checklist

### Phase 1: Core API (Week 1-2)
- [ ] Authentication (login, logout, JWT)
- [ ] User management (get profile, update profile)
- [ ] Workspace CRUD
- [ ] Channel CRUD
- [ ] Basic messaging (send, receive, list)

### Phase 2: Advanced Features (Week 3-4)
- [ ] File upload (S3 integration)
- [ ] Message editing/deletion
- [ ] Reactions
- [ ] Pins
- [ ] Threads
- [ ] DMs

### Phase 3: Real-time (Week 5)
- [ ] WebSocket server setup (Centrifugo)
- [ ] Live message updates
- [ ] Typing indicators
- [ ] Presence (online/offline)
- [ ] Unread counts

### Phase 4: Search & Polish (Week 6)
- [ ] Full-text search (Elasticsearch/PostgreSQL)
- [ ] Workspace invites (email sending)
- [ ] Notifications
- [ ] Read receipts

---

## 📝 Notes

1. **All UI handlers are already in place** - just need to add `fetch()` or API client calls
2. **WebSocket events** should trigger the same state updates as API responses
3. **Optimistic updates** can be added later for better UX
4. **Error handling** needs to be added around all API calls
5. **Loading states** are already implemented in components

---

## 🔗 Related Files

- Main app: `/examples/react-chat-huly/src/App.tsx`
- Types: `/examples/react-chat-huly/src/types/index.ts`
- Mock data: `/examples/react-chat-huly/src/data/mockData.ts`
- Components: `/examples/react-chat-huly/src/components/**`

---

## 📞 Contact

For questions about the UI implementation or integration strategy, refer to this document or check the code comments in the files above.
