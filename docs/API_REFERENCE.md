# ChatSDK REST API Reference

Base URL: `http://localhost:5501`

## Authentication

All API requests require two headers:

| Header | Description |
|--------|-------------|
| `X-API-Key` | Your application API key |
| `Authorization` | `Bearer <JWT_TOKEN>` (for user-specific endpoints) |

---

## Token Generation

### POST /tokens

Generate JWT tokens for a user. Call this from your backend after authenticating the user.

**Headers:**
- `X-API-Key`: Required

**Request Body:**
```json
{
  "userId": "user-123",
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "image": "https://example.com/avatar.jpg",
  "custom": { "role": "admin" }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Unique user identifier from your system |
| `name` | string | No | Display name |
| `email` | string | No | User's email address |
| `image` | string | No | Avatar URL |
| `custom` | object | No | Custom metadata |

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "wsToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "user-123",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "image": "https://example.com/avatar.jpg"
  },
  "expiresIn": 86400
}
```

---

## Channels

### GET /api/channels

List channels for the authenticated user.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max results (max: 100) |
| `offset` | number | 0 | Pagination offset |
| `type` | string | - | Filter by type: `messaging`, `group`, `team`, `livestream` |

**Response:**
```json
{
  "channels": [
    {
      "id": "uuid",
      "cid": "group:general",
      "name": "General",
      "type": "group",
      "image": "https://...",
      "memberCount": 5,
      "unreadCount": 3,
      "lastMessage": {...},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/channels

Create a new channel.

**Request Body:**
```json
{
  "name": "Project Alpha",
  "type": "group",
  "description": "Discussion for Project Alpha",
  "image": "https://example.com/channel.jpg",
  "memberIds": ["user-2", "user-3"],
  "workspaceId": "workspace-uuid"
}
```

**Channel Types:**
| Type | Description |
|------|-------------|
| `messaging` | Direct message (1:1) - requires exactly 1 `memberIds` |
| `group` | Group chat |
| `team` | Team channel |
| `livestream` | Livestream/broadcast channel |
| `public` | Public channel - anyone can join |
| `private` | Private channel - invite only |

**Response:** `201 Created`
```json
{
  "id": "channel-uuid",
  "cid": "group:project-alpha",
  "name": "Project Alpha",
  "type": "group",
  ...
}
```

### GET /api/channels/:channelId

Get channel details.

### DELETE /api/channels/:channelId

Delete a channel (owner only).

### GET /api/channels/unread-count

Get total unread message count across all channels for the authenticated user.

**Response:**
```json
{
  "count": 15
}
```

### POST /api/channels/:channelId/read

Mark a channel as read for the authenticated user.

**Request Body (optional):**
```json
{
  "messageId": "message-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "lastReadSeq": 42
}
```

**Side Effects:**
- Sets `unreadCount` to 0 for this channel
- Emits `read.updated` WebSocket event to channel members
- Emits `channel.unread_changed` WebSocket event to user
- Emits `channel.total_unread_changed` WebSocket event to user

---

## Read Receipts

### POST /api/channels/:channelId/receipts

Mark messages as read up to a specific message.

**Request Body:**
```json
{
  "messageId": "message-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "lastReadMessageId": "message-uuid"
}
```

### GET /api/channels/:channelId/receipts/messages/:messageId/receipts

Get read receipts for a specific message.

**Response:**
```json
{
  "readBy": [
    {
      "userId": "user-123",
      "name": "Alice Johnson",
      "image": "https://...",
      "readAt": "2024-01-15T12:00:00Z"
    }
  ],
  "readCount": 5,
  "totalMembers": 10
}
```

### POST /api/channels/:channelId/receipts/query

Batch query read receipts for multiple messages.

**Request Body:**
```json
{
  "messageIds": ["msg-1", "msg-2", "msg-3"]
}
```

**Response:**
```json
{
  "receipts": {
    "msg-1": { "readCount": 5, "readers": [...] },
    "msg-2": { "readCount": 3, "readers": [...] },
    "msg-3": { "readCount": 0, "readers": [] }
  }
}
```

### GET /api/channels/:channelId/receipts/read-status

Get read status for all channel members.

**Response:**
```json
{
  "members": [
    {
      "userId": "user-123",
      "name": "Alice Johnson",
      "image": "https://...",
      "lastReadMessageId": "msg-456",
      "lastReadSeq": 42
    }
  ]
}
```

---

## Messages

### GET /api/channels/:channelId/messages

Get messages in a channel.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Max messages (max: 200) |
| `before` | string | - | Message ID for cursor pagination (older) |
| `after` | string | - | Message ID for cursor pagination (newer) |
| `since_seq` | number | 0 | Sequence number for sync |

**Response:**
```json
{
  "messages": [
    {
      "id": "message-uuid",
      "channelId": "channel-uuid",
      "userId": "user-1",
      "text": "Hello @user-2!",
      "seq": 42,
      "user": {
        "id": "user-1",
        "name": "Alice Johnson",
        "image": "https://..."
      },
      "reactions": [
        {"type": "👍", "count": 2, "own": true, "users": [...]}
      ],
      "mentions": ["user-2"],
      "attachments": [],
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "maxSeq": 100,
  "hasMore": true
}
```

### POST /api/channels/:channelId/messages

Send a message.

**Request Body:**
```json
{
  "text": "Hello @user-2! Check this out.",
  "attachments": [
    {
      "type": "image",
      "url": "https://example.com/image.jpg",
      "name": "photo.jpg"
    }
  ],
  "parentId": "parent-message-uuid"
}
```

**Mentions:**
Use `@username` syntax in message text. The API automatically:
- Extracts mentions (supports hyphens: `@user-2`)
- Stores them in the database
- Returns them in the `mentions` array
- Sets mention flags for push notifications

**Response:** `201 Created`
```json
{
  "id": "new-message-uuid",
  "text": "Hello @user-2! Check this out.",
  "mentions": ["user-2"],
  "reactions": [],
  ...
}
```

---

## Link Previews

Link previews are **automatically generated** when messages contain URLs. The system extracts OpenGraph metadata and creates rich previews for shared links.

### How It Works

1. User sends a message containing a URL
2. Message is saved and returned immediately
3. Background job (Inngest) fetches URL metadata
4. Message is updated with `linkPreviews` data
5. Real-time event broadcasts the update

### Supported Platforms

| Platform | Features |
|----------|----------|
| **YouTube** | Video embed, thumbnail, title, channel name |
| **Vimeo** | Video embed, thumbnail, title |
| **Any website** | OpenGraph title, description, image |

### Message Response with Link Preview

```json
{
  "id": "message-uuid",
  "text": "Check out this video: https://youtube.com/watch?v=abc123",
  "linkPreviews": [
    {
      "url": "https://youtube.com/watch?v=abc123",
      "title": "Amazing Video Title",
      "description": "Video description here...",
      "image": "https://img.youtube.com/vi/abc123/maxresdefault.jpg",
      "siteName": "YouTube",
      "type": "video",
      "videoId": "abc123",
      "embedUrl": "https://www.youtube.com/embed/abc123"
    }
  ],
  ...
}
```

### Link Preview Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Original URL from message |
| `title` | string | Page/video title |
| `description` | string | Meta description |
| `image` | string | Preview image URL |
| `siteName` | string | Website name (e.g., "YouTube") |
| `type` | string | Content type: `website`, `video`, `article` |
| `videoId` | string | Video ID (YouTube/Vimeo only) |
| `embedUrl` | string | Embeddable video URL |

### React Component

```tsx
import { LinkPreview } from '@chatsdk/react';

function Message({ message }) {
  return (
    <div>
      <p>{message.text}</p>
      {message.linkPreviews?.map((preview, i) => (
        <LinkPreview key={i} preview={preview} />
      ))}
    </div>
  );
}
```

### Configuration

Link previews require **Inngest** for background processing:

```bash
# .env.production
INNGEST_EVENT_KEY=your-inngest-key
INNGEST_SIGNING_KEY=your-signing-key

# Or use Inngest Dev Server locally
INNGEST_DEV=true
```

If Inngest is not configured, messages will be sent without link previews.

---

### PATCH /api/channels/:channelId/messages/:messageId

Edit a message (owner only).

**Request Body:**
```json
{
  "text": "Updated message text"
}
```

### DELETE /api/channels/:channelId/messages/:messageId

Delete a message (owner only, within 15 minutes).

---

## Reactions

### POST /api/channels/:channelId/messages/:messageId/reactions

Add a reaction to a message.

**Request Body:**
```json
{
  "emoji": "👍"
}
```

### DELETE /api/channels/:channelId/messages/:messageId/reactions/:emoji

Remove a reaction from a message.

```bash
DELETE /api/channels/abc/messages/xyz/reactions/👍
```

---

## Pin Messages

### POST /api/channels/:channelId/messages/:messageId/pin

Pin a message to the channel.

**Response:** `200 OK`
```json
{
  "success": true
}
```

### DELETE /api/channels/:channelId/messages/:messageId/pin

Unpin a message.

**Response:** `200 OK`
```json
{
  "success": true
}
```

### GET /api/channels/:channelId/pins

Get all pinned messages in a channel.

**Response:**
```json
{
  "messages": [
    {
      "id": "message-uuid",
      "text": "Important announcement!",
      "pinnedBy": "user-1",
      "pinnedAt": "2024-01-01T12:00:00Z",
      ...
    }
  ]
}
```

---

## Users

### GET /api/users

List users in your app.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max results (max: 100) |
| `offset` | number | 0 | Pagination offset |
| `q` | string | - | Search by name |

**Response:**
```json
{
  "users": [
    {
      "id": "user-1",
      "name": "Alice Johnson",
      "image": "https://...",
      "lastActiveAt": "2024-01-01T12:00:00Z",
      "online": true
    }
  ]
}
```

### GET /api/users/:userId

Get user details.

### POST /api/users/sync

Bulk sync users from your system to ChatSDK. Use this to ensure ChatSDK has the latest user data.

**Request Body:**
```json
{
  "users": [
    {
      "id": "user-1",
      "name": "Alice Johnson",
      "image": "https://example.com/alice.jpg",
      "email": "alice@example.com",
      "custom": { "role": "admin", "department": "Engineering" }
    },
    {
      "id": "user-2",
      "name": "Bob Smith",
      "image": "https://example.com/bob.jpg"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "synced": 2,
  "created": 1,
  "updated": 1,
  "errors": []
}
```

### PUT /api/users/:userId

Create or update a single user. Useful for real-time sync when a user updates their profile.

**Request Body:**
```json
{
  "name": "Alice Johnson",
  "image": "https://example.com/alice.jpg",
  "email": "alice@example.com",
  "custom": { "role": "admin" }
}
```

**Response:** `200 OK`
```json
{
  "id": "user-1",
  "name": "Alice Johnson",
  "image": "https://example.com/alice.jpg",
  "email": "alice@example.com",
  "custom": { "role": "admin", "email": "alice@example.com" }
}
```

### DELETE /api/users/:userId

Delete a user and their associated data. Use this to clean up seed/test users.

**Response:** `200 OK`
```json
{
  "success": true,
  "deletedUserId": "user-1"
}
```

### POST /api/users/bulk-delete

Delete multiple users at once. Useful for cleaning up seed data.

**Request Body:**
```json
{
  "userIds": ["user-1", "user-2", "user-3"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "deleted": ["user-1", "user-2", "user-3"],
  "count": 3
}
```

---

## Devices & Push Notifications

ChatSDK uses [Novu](https://novu.co) for push notifications. See [Push Notifications Guide](./guides/features/push-notifications.md) for setup.

### POST /api/devices

Register a device for push notifications.

**Request Body:**
```json
{
  "platform": "ios",
  "token": "device-push-token",
  "provider": "apns",
  "deviceId": "unique-device-id",
  "appVersion": "1.0.0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | Yes | `ios`, `android`, or `expo` |
| `token` | string | Yes | Push token from device |
| `provider` | string | Yes | `fcm`, `apns`, or `expo` |
| `deviceId` | string | No | Unique device identifier |
| `appVersion` | string | No | App version for targeting |

**Response:** `201 Created`
```json
{
  "id": "device-uuid",
  "platform": "ios",
  "provider": "apns",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### GET /api/devices/preferences

Get notification preferences for the current user.

**Response:**
```json
{
  "preferences": {
    "pushEnabled": true,
    "newMessages": true,
    "mentions": true,
    "reactions": false,
    "channelInvites": true,
    "threadReplies": true,
    "quietHoursEnabled": false,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00"
  },
  "novuPreferences": {
    "channels": [...],
    "workflows": [...]
  }
}
```

### PATCH /api/devices/preferences

Update notification preferences.

**Request Body:**
```json
{
  "pushEnabled": true,
  "mentions": true,
  "reactions": false,
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00"
}
```

### DELETE /api/devices/:deviceId

Unregister a device from push notifications.

---

## Workspaces

### GET /api/workspaces

List workspaces the user belongs to.

**Response:**
```json
{
  "workspaces": [
    {
      "id": "workspace-uuid",
      "name": "Acme Corp",
      "type": "team",
      "memberCount": 25,
      "channelCount": 8,
      "role": "admin",
      "isDefault": true
    }
  ]
}
```

### POST /api/workspaces

Create a new workspace.

**Request Body:**
```json
{
  "name": "Project Team",
  "type": "team",
  "image": "https://example.com/workspace.jpg"
}
```

### POST /api/workspaces/:workspaceId/invite

Create an invite link.

**Request Body:**
```json
{
  "maxUses": 10,
  "expiresInDays": 7,
  "role": "member"
}
```

**Response:**
```json
{
  "token": "abc123...",
  "inviteUrl": "https://app.example.com/invite/abc123...",
  "expiresAt": "2024-01-08T00:00:00Z"
}
```

---

## Channel Member Settings

### PATCH /api/channels/:channelId/settings

Update channel settings for the current user.

**Request Body:**
```json
{
  "starred": true,
  "muted": false
}
```

**Response:**
```json
{
  "success": true,
  "starred": true,
  "muted": false
}
```

---

## Typing Indicators

### POST /api/channels/:channelId/typing

Send typing indicator (broadcasts via WebSocket).

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `INVALID_TOKEN` | 401 | Invalid or expired JWT token |
| `FORBIDDEN` | 403 | Not authorized for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Token generation | 100/min per IP |
| Message send | 60/min per user |
| All other endpoints | 1000/min per API key |

---

## WebSocket Connection

Connect to Centrifugo for real-time events:

```javascript
import { Centrifuge } from 'centrifuge';

const client = new Centrifuge('ws://localhost:8001/connection/websocket', {
  token: wsToken, // From /tokens response
});

// Subscribe to a channel
const sub = client.subscribe(`chat:${appId}:${channelId}`);

sub.on('publication', (ctx) => {
  console.log('Event:', ctx.data);
  // { type: 'message.new', payload: { message: {...} } }
});

client.connect();
```

**Event Types:**

*Channel Events (published to `chat:{appId}:{channelId}`):*
- `message.new` - New message
- `message.updated` - Message edited
- `message.deleted` - Message deleted
- `reaction.added` - Reaction added
- `reaction.removed` - Reaction removed
- `typing.start` - User started typing
- `typing.stop` - User stopped typing
- `channel.member_joined` - User joined channel
- `channel.member_left` - User left channel
- `read.updated` - User read position updated
- `read_receipt` - User read a specific message

*User Events (published to `user:{appId}:{userId}`):*
- `channel.unread_changed` - Unread count changed for a channel
  ```json
  { "type": "channel.unread_changed", "payload": { "channelId": "...", "count": 5 } }
  ```
- `channel.total_unread_changed` - Total unread count changed
  ```json
  { "type": "channel.total_unread_changed", "payload": { "count": 15 } }
  ```
- `presence.online` - User came online
- `presence.offline` - User went offline
