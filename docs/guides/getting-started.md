# Getting Started

This guide will help you integrate ChatSDK into your application.

## Prerequisites

- Node.js 18+
- Backend server running with a chat token endpoint (see [Server Setup](./server-setup.md))

## Installation

### JavaScript/TypeScript

```bash
npm install @chatsdk/core
# or
yarn add @chatsdk/core
```

### React

```bash
npm install @chatsdk/core @chatsdk/react
```

### React Native

```bash
npm install @chatsdk/core @chatsdk/react-native
```

### iOS (Swift Package Manager)

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/your-org/chatsdk-ios", from: "1.0.0")
]
```

## Initialize the Client

```typescript
import { createChatClient } from '@chatsdk/core';

const client = createChatClient({
  apiUrl: 'https://api.your-server.com',
  wsUrl: 'wss://ws.your-server.com/connection/websocket',
  tokenProvider: async (user) => {
    const response = await fetch('/api/chat-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id }),
    });
    return response.json();
  },
  debug: true, // Enable for development
  enableOfflineSupport: true,
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tokenProvider` | function | required for browser clients | Fetches chat tokens from your backend |
| `apiKey` | string | optional, deprecated | Server/app API key for legacy server-side clients only |
| `apiUrl` | string | `http://localhost:5500` | API server URL |
| `wsUrl` | string | `ws://localhost:8000/connection/websocket` | WebSocket URL |
| `debug` | boolean | `false` | Enable debug logging |
| `enableOfflineSupport` | boolean | `true` | Enable offline message queue |
| `reconnectIntervals` | number[] | `[1000,2000,4000,8000,16000]` | Reconnection backoff (ms) |

## Connect a User

Users must be authenticated before using the SDK. With `tokenProvider`, the SDK gets chat tokens from your backend when connecting:

```typescript
const user = await client.connectUser(
  {
    id: 'user-123',
    name: 'Alice Johnson',
    image: 'https://example.com/alice.jpg',
  }
);

console.log('Connected as:', user.name);
```

## Subscribe to Events

Listen for real-time events:

```typescript
// Connection state changes
client.on('connection.connected', () => {
  console.log('Connected!');
});

client.on('connection.disconnected', ({ reason }) => {
  console.log('Disconnected:', reason);
});

// New messages
client.on('message.new', ({ channelId, message }) => {
  console.log(`New message in ${channelId}:`, message.text);
});

// Typing indicators
client.on('typing.start', ({ channelId, user }) => {
  console.log(`${user.name} is typing in ${channelId}`);
});
```

## Query Channels

```typescript
// Get user's channels
const channels = await client.queryChannels({
  limit: 20,
  offset: 0,
});

// Get a specific channel
const channel = await client.getChannel('channel-123');

// Subscribe to real-time updates
await client.subscribeToChannel('channel-123');
```

## Send Messages

```typescript
// Send a text message
const message = await client.sendMessage('channel-123', {
  text: 'Hello, world!',
});

// Send with attachments
const messageWithImage = await client.sendMessage('channel-123', {
  text: 'Check out this photo!',
  attachments: [{
    type: 'image',
    url: 'https://example.com/photo.jpg',
  }],
});

// Reply to a thread
const reply = await client.sendMessage('channel-123', {
  text: 'Great point!',
  parentId: 'parent-message-id',
});
```

## Handle Reactions

```typescript
// Add a reaction
await client.addReaction('channel-123', 'message-456', '👍');

// Remove a reaction
await client.removeReaction('channel-123', 'message-456', '👍');
```

## Typing Indicators

```typescript
// Start typing
await client.sendTypingStart('channel-123');

// Stop typing (call after sending or on blur)
await client.sendTypingStop('channel-123');
```

## Read Receipts

```typescript
// Mark messages as read
await client.markRead('channel-123', 'last-message-id');
```

## Disconnect

```typescript
// Clean disconnect when user logs out
await client.disconnect();
```

## Next Steps

- [React Integration](./react.md) - Using with React
- [Offline Support](./offline.md) - Handling offline scenarios
- [API Reference](../api/core.md) - Full API documentation
