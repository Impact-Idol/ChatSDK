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
  "image": "https://example.com/avatar.jpg"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "wsToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "user-123",
    "name": "Alice Johnson",
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
- `message.new` - New message
- `message.updated` - Message edited
- `message.deleted` - Message deleted
- `reaction.new` - Reaction added
- `reaction.removed` - Reaction removed
- `typing.start` - User started typing
- `typing.stop` - User stopped typing
- `member.joined` - User joined channel
- `member.left` - User left channel
