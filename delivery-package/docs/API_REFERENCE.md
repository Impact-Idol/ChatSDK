# ChatSDK API Reference

Complete REST API and WebSocket documentation.

## Base URL

```
Production: https://api.yourdomain.com
Development: http://localhost:5500
```

## Authentication

### API Key (Server-to-Server)

```bash
curl -H "X-API-Key: your_api_key" \
  https://api.yourdomain.com/api/users
```

### JWT Token (Client-Side)

```bash
# 1. Get token
POST /api/auth/token
{
  "userId": "user-123",
  "appId": "app-456"
}

# 2. Use token
curl -H "Authorization: Bearer <token>" \
  https://api.yourdomain.com/api/users/me
```

## Core Endpoints

### Users

#### Get Current User
```
GET /api/users/me
Authorization: Bearer <token>

Response:
{
  "id": "user-123",
  "name": "John Doe",
  "image": "https://cdn.example.com/avatar.jpg",
  "custom": {"role": "admin"},
  "lastActiveAt": "2025-01-03T10:30:00Z"
}
```

#### Update User
```
PATCH /api/users/me
Authorization: Bearer <token>
{
  "name": "Jane Smith",
  "image": "https://new-avatar.jpg"
}
```

#### Create User (Admin)
```
POST /api/users
X-API-Key: <api_key>
{
  "id": "user-789",
  "name": "New User",
  "email": "user@example.com"
}
```

### Channels

#### Create Channel
```
POST /api/channels
Authorization: Bearer <token>
{
  "type": "group",
  "name": "Project Team",
  "memberIds": ["user-1", "user-2"]
}

Types: messaging | group | team | livestream

Response:
{
  "id": "channel-abc",
  "cid": "group:channel-abc",
  "type": "group",
  "name": "Project Team",
  "memberCount": 3
}
```

#### List Channels
```
GET /api/channels?limit=20&type=group
Authorization: Bearer <token>

Response:
{
  "channels": [...],
  "total": 15,
  "hasMore": false
}
```

#### Get Channel
```
GET /api/channels/:channelId
Authorization: Bearer <token>

Response:
{
  "id": "channel-abc",
  "name": "Project Team",
  "members": [
    {
      "userId": "user-123",
      "name": "John Doe",
      "role": "owner"
    }
  ]
}
```

### Messages

#### Send Message
```
POST /api/channels/:channelId/messages
Authorization: Bearer <token>
{
  "text": "Hello! 👋",
  "clientMsgId": "client-123",
  "attachments": [
    {
      "type": "image",
      "url": "https://cdn.example.com/photo.jpg",
      "width": 1920,
      "height": 1080
    }
  ]
}

Response:
{
  "id": "msg-xyz",
  "seq": 42,
  "text": "Hello! 👋",
  "status": "sent",
  "createdAt": "2025-01-03T11:10:00Z"
}
```

#### Get Messages
```
GET /api/channels/:channelId/messages?limit=50&before=msg-xyz
Authorization: Bearer <token>

Response:
{
  "messages": [
    {
      "id": "msg-xyz",
      "seq": 42,
      "user": {
        "id": "user-123",
        "name": "John Doe"
      },
      "text": "Hello! 👋",
      "reactions": [
        {
          "emoji": "👍",
          "count": 3
        }
      ]
    }
  ],
  "hasMore": true
}
```

#### Update Message
```
PATCH /api/messages/:messageId
Authorization: Bearer <token>
{
  "text": "Updated message"
}
```

#### Delete Message
```
DELETE /api/messages/:messageId
Authorization: Bearer <token>
```

### Reactions

#### Add Reaction
```
POST /api/messages/:messageId/reactions
Authorization: Bearer <token>
{
  "emoji": "👍"
}
```

#### Remove Reaction
```
DELETE /api/messages/:messageId/reactions/:emoji
Authorization: Bearer <token>
```

### Threads

#### Get Thread
```
GET /api/messages/:parentId/thread?limit=50
Authorization: Bearer <token>

Response:
{
  "parentMessage": {...},
  "replies": [...],
  "participants": [
    {
      "userId": "user-123",
      "replyCount": 5
    }
  ]
}
```

#### Reply to Thread
```
POST /api/channels/:channelId/messages
{
  "text": "Reply",
  "parentId": "msg-parent-id"
}
```

### Uploads

#### Upload File
```
POST /api/uploads
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data: file=<binary>

Response:
{
  "url": "https://cdn.example.com/file.jpg",
  "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
  "fileName": "photo.jpg",
  "fileSize": 245678,
  "width": 1920,
  "height": 1080
}
```

**Limits:**
- Images: 10 MB
- Videos: 100 MB
- Audio: 50 MB
- Documents: 25 MB

### Search

#### Search Messages
```
GET /api/search/messages?q=keyword&channelId=channel-abc
Authorization: Bearer <token>

Response:
{
  "results": [
    {
      "message": {...},
      "channel": {...},
      "highlights": ["...keyword..."]
    }
  ],
  "total": 45
}
```

### Workspaces

#### List Workspaces
```
GET /api/workspaces
Authorization: Bearer <token>

Response:
{
  "workspaces": [
    {
      "id": "workspace-123",
      "name": "Acme Corp",
      "role": "admin"
    }
  ]
}
```

#### Create Workspace
```
POST /api/workspaces
{
  "name": "New Workspace",
  "icon": "🚀"
}
```

## WebSocket Events

### Connect

```javascript
import { Centrifuge } from 'centrifuge';

const centrifuge = new Centrifuge('wss://api.yourdomain.com/ws', {
  token: wsToken
});

centrifuge.connect();
```

### Subscribe to Channel

```javascript
const sub = centrifuge.newSubscription(`channel:${channelId}`);

sub.on('publication', (ctx) => {
  const event = ctx.data;
  
  switch (event.type) {
    case 'message.new':
      console.log('New message:', event.message);
      break;
    case 'typing.start':
      console.log(`${event.userName} is typing`);
      break;
    case 'reaction.added':
      console.log(`Reaction: ${event.emoji}`);
      break;
  }
});

sub.subscribe();
```

### Event Types

#### message.new
```json
{
  "type": "message.new",
  "channelId": "channel-abc",
  "message": {
    "id": "msg-xyz",
    "text": "New message",
    "userId": "user-123"
  }
}
```

#### message.updated
```json
{
  "type": "message.updated",
  "messageId": "msg-xyz",
  "text": "Updated text"
}
```

#### message.deleted
```json
{
  "type": "message.deleted",
  "messageId": "msg-xyz"
}
```

#### reaction.added / reaction.removed
```json
{
  "type": "reaction.added",
  "messageId": "msg-xyz",
  "emoji": "👍",
  "userId": "user-456"
}
```

#### typing.start / typing.stop
```json
{
  "type": "typing.start",
  "channelId": "channel-abc",
  "userId": "user-456",
  "userName": "Jane Doe"
}
```

## Error Handling

### Response Format
```json
{
  "error": {
    "message": "Human-readable error",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 429: Rate limit exceeded
- 500: Server error

### Rate Limiting
- API Key: 1000 requests per 15 min
- User Token: 100 requests per 15 min

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641071700
```

## Webhooks

### Configure Webhook
```
POST /api/webhooks
{
  "url": "https://yourserver.com/webhook",
  "events": ["message.new", "reaction.added"],
  "secret": "webhook_secret"
}
```

### Payload
```json
{
  "id": "webhook-event-123",
  "type": "message.new",
  "createdAt": "2025-01-03T12:00:00Z",
  "data": {
    "message": {...}
  }
}
```

### Verify Signature
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return signature === digest;
}

// Use X-ChatSDK-Signature header
const isValid = verifyWebhook(
  JSON.stringify(req.body),
  req.headers['x-chatsdk-signature'],
  process.env.WEBHOOK_SECRET
);
```

## SDK Usage

### JavaScript/TypeScript

```bash
npm install @chatsdk/core @chatsdk/react
```

**Core SDK:**
```javascript
import { ChatClient } from '@chatsdk/core';

const client = new ChatClient({
  apiUrl: 'https://api.yourdomain.com',
  wsUrl: 'wss://api.yourdomain.com/ws',
  token: 'your_jwt_token'
});

await client.connect();

// Send message
await client.sendMessage('channel-123', {
  text: 'Hello world!'
});

// Listen for events
client.on('message.new', (message) => {
  console.log('New message:', message);
});
```

**React SDK:**
```jsx
import { ChatProvider, useMessages } from '@chatsdk/react';

function App() {
  return (
    <ChatProvider apiUrl="https://api.yourdomain.com" token={token}>
      <ChatView />
    </ChatProvider>
  );
}

function ChatView() {
  const { messages, sendMessage } = useMessages('channel-123');
  
  return (
    <MessageList messages={messages} />
  );
}
```

### React Native

```bash
npm install @chatsdk/react-native
```

```jsx
import { ChatProvider, MessageList } from '@chatsdk/react-native';

export default function App() {
  return (
    <ChatProvider apiUrl="https://api.yourdomain.com" token={token}>
      <MessageList channelId="channel-123" />
    </ChatProvider>
  );
}
```

### iOS (Swift)

```swift
import ChatSDK

let client = ChatClient(
    apiURL: "https://api.yourdomain.com",
    token: "your_jwt_token"
)

// Send message
Task {
    try await client.sendMessage(
        channelId: "channel-123",
        text: "Hello from iOS!"
    )
}

// Listen for events
client.onMessageReceived = { message in
    print("New message: \(message.text)")
}
```

## Code Examples

### Create DM and Send Message
```javascript
// 1. Create DM channel
const response = await fetch('https://api.yourdomain.com/api/channels', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'messaging',
    memberIds: ['user-456']
  })
});

const { id: channelId } = await response.json();

// 2. Send message
await fetch(`https://api.yourdomain.com/api/channels/${channelId}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Hey! How are you?'
  })
});
```

### Upload and Send Image
```javascript
// 1. Upload image
const formData = new FormData();
formData.append('file', imageFile);

const uploadResponse = await fetch('https://api.yourdomain.com/api/uploads', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { url, thumbnailUrl } = await uploadResponse.json();

// 2. Send message with attachment
await fetch(`https://api.yourdomain.com/api/channels/${channelId}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Check this out!',
    attachments: [{
      type: 'image',
      url,
      thumbnailUrl
    }]
  })
});
```

### Pagination
```javascript
async function loadAllMessages(channelId) {
  let messages = [];
  let hasMore = true;
  let beforeId = null;

  while (hasMore) {
    const url = new URL(`https://api.yourdomain.com/api/channels/${channelId}/messages`);
    url.searchParams.set('limit', '50');
    if (beforeId) url.searchParams.set('before', beforeId);

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    messages = messages.concat(data.messages);
    hasMore = data.hasMore;

    if (data.messages.length > 0) {
      beforeId = data.messages[data.messages.length - 1].id;
    }
  }

  return messages;
}
```

## Support

- Email: support@yourdomain.com
- Docs: See INSTALLATION.md and DEPLOYMENT.md
