# ChatSDK: Unread Count & Read Receipts Specification

## Overview

This document describes the unread count and read receipts implementation in ChatSDK. All features are now **fully implemented** and ready for use.

---

## Current State: Fully Implemented

### Client-Side (React Hooks)

| Hook | Purpose | Status |
|------|---------|--------|
| `useReadState(channelId)` | Unread count + markAsRead | ✅ Implemented |
| `useReadReceipts(channelId)` | Per-message read tracking | ✅ Implemented |
| `useTotalUnreadCount()` | Total unread badge | ✅ Implemented |

### Backend (API + WebSocket)

| Feature | Status |
|---------|--------|
| WebSocket event: `channel.unread_changed` | ✅ Implemented |
| WebSocket event: `channel.total_unread_changed` | ✅ Implemented |
| WebSocket event: `read.updated` | ✅ Implemented |
| WebSocket event: `read_receipt` | ✅ Implemented |
| API: `POST /api/channels/:id/read` | ✅ Implemented |
| API: `GET /api/channels/unread-count` | ✅ Implemented |
| Per-user unread tracking in database | ✅ Implemented |

---

## WebSocket Events

All events are published to user-specific channels: `user:{appId}:{userId}`

### 1. `channel.unread_changed`

Emitted when a user's unread count for a channel changes.

```typescript
{
  type: 'channel.unread_changed',
  payload: {
    channelId: string,
    count: number  // New unread count for this channel
  }
}
```

**When emitted:**
- When a new message is sent (to all channel members except sender)
- When a user marks channel as read (to that user, with count=0)

### 2. `channel.total_unread_changed`

Emitted when a user's total unread count across all channels changes.

```typescript
{
  type: 'channel.total_unread_changed',
  payload: {
    count: number  // Total unread across all channels
  }
}
```

**When emitted:**
- After any `channel.unread_changed` event
- Emitted to the specific user whose count changed

### 3. `read.updated`

Emitted when a user's read position changes (published to channel).

```typescript
{
  type: 'read.updated',
  payload: {
    channelId: string,
    userId: string,
    lastReadSeq: number  // Message sequence number
  }
}
```

**When emitted:**
- When a user marks a channel as read
- Published to channel: `chat:{appId}:{channelId}`

### 4. `read_receipt`

Emitted when a user reads a specific message.

```typescript
{
  type: 'read_receipt',
  payload: {
    channelId: string,
    messageId: string,
    userId: string,
    userName: string,
    readAt: string  // ISO timestamp
  }
}
```

**When emitted:**
- When `POST /api/channels/:id/receipts` is called with a `messageId`
- Published to channel: `chat:{appId}:{channelId}`

---

## API Endpoints

### Mark Channel as Read

```
POST /api/channels/:channelId/read
Authorization: Bearer <token>

Request Body (optional):
{
  "messageId": "msg-123"  // Optional: specific message to mark as read
}

Response:
{
  "success": true,
  "lastReadSeq": 42
}
```

**Side effects:**
- Updates `channel_member.unread_count = 0`
- Updates `channel_member.last_read_seq`
- Emits `read.updated` to channel
- Emits `channel.unread_changed` to user (count=0)
- Emits `channel.total_unread_changed` to user

### Get Total Unread Count

```
GET /api/channels/unread-count
Authorization: Bearer <token>

Response:
{
  "count": 15  // Total unread across all channels
}
```

### Get Message Receipts

```
GET /api/channels/:channelId/receipts/messages/:messageId/receipts
Authorization: Bearer <token>

Response:
{
  "readBy": [
    {
      "userId": "user-123",
      "name": "John Doe",
      "image": "https://...",
      "readAt": "2024-01-15T12:00:00Z"
    }
  ],
  "readCount": 5,
  "totalMembers": 10
}
```

### Batch Get Receipts

```
POST /api/channels/:channelId/receipts/query
Authorization: Bearer <token>

Request Body:
{
  "messageIds": ["msg-1", "msg-2", "msg-3"]  // Max 100
}

Response:
{
  "receipts": {
    "msg-1": { "readCount": 5, "readers": [...] },
    "msg-2": { "readCount": 3, "readers": [...] },
    "msg-3": { "readCount": 0, "readers": [] }
  }
}
```

### Get Channel Read Status

```
GET /api/channels/:channelId/receipts/read-status
Authorization: Bearer <token>

Response:
{
  "members": [
    {
      "userId": "user-123",
      "name": "John Doe",
      "image": "https://...",
      "lastReadMessageId": "msg-456",
      "lastReadSeq": 42
    }
  ]
}
```

---

## Database Schema

### channel_member (existing table)

```sql
-- Relevant columns for read tracking:
user_id VARCHAR(255) NOT NULL,
channel_id UUID NOT NULL,
last_read_message_id UUID,
last_read_seq BIGINT DEFAULT 0,
unread_count INT DEFAULT 0,
```

### read_receipt (existing table)

```sql
CREATE TABLE read_receipt (
  message_id UUID NOT NULL REFERENCES message(id),
  app_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, app_id, user_id)
);
```

### user_message (existing table)

```sql
-- flags column uses bitmask:
-- Bit 0 (1): read
-- Bit 1 (2): mentioned
-- Bit 2 (4): starred
-- Bit 3 (8): muted
flags INT DEFAULT 0,
```

---

## Implementation Details

### On New Message Send

Location: `packages/api/src/routes/messages.ts`

```typescript
// 1. Increment unread count for all members except sender
await client.query(
  `UPDATE channel_member SET unread_count = unread_count + 1
   WHERE channel_id = $1 AND app_id = $2 AND user_id != $3`,
  [channelId, auth.appId, auth.userId]
);

// 2. Query updated counts for each member
const memberUnreadCounts = await db.query(
  `SELECT cm.user_id, cm.unread_count,
          (SELECT COALESCE(SUM(unread_count), 0) FROM channel_member
           WHERE app_id = $2 AND user_id = cm.user_id) as total_unread
   FROM channel_member cm
   WHERE cm.channel_id = $1 AND cm.app_id = $2 AND cm.user_id != $3`,
  [channelId, auth.appId, auth.userId]
);

// 3. Emit events to each member
for (const member of memberUnreadCounts.rows) {
  await centrifugo.publishUnreadCount(appId, member.user_id, channelId, member.unread_count);
  await centrifugo.publishTotalUnreadCount(appId, member.user_id, member.total_unread);
}
```

### On Mark As Read

Location: `packages/api/src/routes/channels.ts`

```typescript
// 1. Reset unread count
await db.query(
  `UPDATE channel_member SET last_read_seq = $4, unread_count = 0
   WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
  [channelId, auth.appId, auth.userId, maxSeq]
);

// 2. Get new total
const totalResult = await db.query(
  `SELECT COALESCE(SUM(unread_count), 0) as total FROM channel_member
   WHERE app_id = $1 AND user_id = $2`,
  [auth.appId, auth.userId]
);

// 3. Emit events
await centrifugo.publishReadReceipt(appId, channelId, userId, maxSeq);
await centrifugo.publishUnreadCount(appId, userId, channelId, 0);
await centrifugo.publishTotalUnreadCount(appId, userId, totalUnread);
```

---

## Client Usage

### Per-Channel Unread Count

```typescript
import { useReadState } from '@chatsdk/react';

function ChannelItem({ channelId }) {
  const { unreadCount, markAsRead } = useReadState(channelId);

  // Auto-mark as read when viewing
  useEffect(() => {
    if (isActive) {
      markAsRead();
    }
  }, [isActive, markAsRead]);

  return (
    <div>
      <span>{channelName}</span>
      {unreadCount > 0 && <Badge count={unreadCount} />}
    </div>
  );
}
```

### Total Unread Badge

```typescript
import { useTotalUnreadCount } from '@chatsdk/react';

function AppHeader() {
  const totalUnread = useTotalUnreadCount();

  return (
    <header>
      <ChatIcon />
      {totalUnread > 0 && <Badge count={totalUnread} />}
    </header>
  );
}
```

### Message Read Receipts

```typescript
import { useReadReceipts } from '@chatsdk/react';

function MessageItem({ channelId, message }) {
  const { getReceipts, receipts } = useReadReceipts(channelId);

  const handleShowReceipts = async () => {
    const { readBy, readCount } = await getReceipts(message.id);
    // Show who read the message
  };

  return (
    <div>
      <p>{message.text}</p>
      {message.user.id === currentUser.id && (
        <ReadStatus count={receipts[message.id]?.readCount || 0} />
      )}
    </div>
  );
}
```

---

## Testing Checklist

### Backend WebSocket Events
- [x] Send message → receivers get `channel.unread_changed` with incremented count
- [x] Send message → sender does NOT get `channel.unread_changed`
- [x] Mark read → user gets `channel.unread_changed` with count=0
- [x] Mark read → user gets `channel.total_unread_changed`
- [x] Mark read → all channel members get `read.updated`

### Backend API
- [x] `POST /api/channels/:id/read` returns success and updates database
- [x] `GET /api/channels/unread-count` returns total unread count
- [x] `GET /api/channels/:id/receipts/messages/:msgId/receipts` returns readers
- [x] Unread count persists across page refresh
- [x] Unread count is per-user (different users see different counts)

### Client Integration
- [x] `useReadState` fetches initial count on mount
- [x] `useReadState` receives real-time events and updates count
- [x] `useTotalUnreadCount` fetches initial count on mount
- [x] `useTotalUnreadCount` updates when any channel changes
- [x] `useReadReceipts` shows checkmarks on messages

---

## Files Modified

| File | Changes |
|------|---------|
| `packages/api/src/services/centrifugo.ts` | Added `publishUnreadCount()` and `publishTotalUnreadCount()` |
| `packages/api/src/routes/messages.ts` | Emit unread events on message send |
| `packages/api/src/routes/channels.ts` | Added `/unread-count` endpoint, emit events on mark-as-read |
| `packages/react/src/hooks/useReadState.ts` | Added initial fetch for both hooks |

---

## Architecture

```
User Sends Message
        ↓
POST /api/channels/:id/messages
        ↓
Backend:
  - Insert message
  - Increment unread_count for other members
  - Query each member's counts
        ↓
Centrifugo:
  - Publish message.new to channel
  - Publish channel.unread_changed to each user
  - Publish channel.total_unread_changed to each user
        ↓
Client receives via WebSocket
        ↓
useReadState/useTotalUnreadCount update state
        ↓
UI re-renders with new counts
```

```
User Views Channel
        ↓
useReadState calls markAsRead()
        ↓
POST /api/channels/:id/read
        ↓
Backend:
  - Set unread_count = 0
  - Calculate new total
        ↓
Centrifugo:
  - Publish read.updated to channel
  - Publish channel.unread_changed (count=0) to user
  - Publish channel.total_unread_changed to user
        ↓
Client receives via WebSocket
        ↓
All hooks update state
        ↓
UI shows read status
```
