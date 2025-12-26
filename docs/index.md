# ChatSDK Documentation

A modern, real-time chat SDK for building messaging features into your applications.

## Quick Start

### Installation

```bash
# Core SDK
npm install @chatsdk/core

# React Components
npm install @chatsdk/react

# React Native
npm install @chatsdk/react-native
```

### Basic Setup

```typescript
import { ChatClient } from '@chatsdk/core';

const client = new ChatClient({
  apiKey: 'your-api-key',
  apiUrl: 'https://your-api-server.com',
});

// Connect a user
await client.connectUser(
  { id: 'user-123', name: 'Alice' },
  'jwt-token'
);

// Query channels
const channels = await client.queryChannels();

// Send a message
await client.sendMessage('channel-id', { text: 'Hello!' });
```

## Features

- **Real-time messaging** - WebSocket-based with Centrifugo
- **Offline support** - Messages queue when offline, sync when online
- **Sequence-based sync** - Gap detection and automatic recovery
- **Rich messages** - Text, images, files, voice notes
- **Reactions** - Emoji reactions with real-time updates
- **Typing indicators** - See when users are typing
- **Read receipts** - Delivered and read status
- **Mentions** - @user mentions with notifications
- **Threads** - Reply to messages in threads
- **Search** - Full-text message search

## Packages

| Package | Description |
|---------|-------------|
| [@chatsdk/core](./api/core.md) | Core SDK with sync engine |
| [@chatsdk/react](./api/react.md) | React hooks and components |
| [@chatsdk/react-native](./api/react-native.md) | React Native components |
| [iOS SDK](./api/ios.md) | Native Swift SDK |

## Guides

- [Getting Started](./guides/getting-started.md)
- [Authentication](./guides/authentication.md)
- [Channels](./guides/channels.md)
- [Messages](./guides/messages.md)
- [Real-time Events](./guides/events.md)
- [Offline Support](./guides/offline.md)
- [React Integration](./guides/react.md)
- [iOS Integration](./guides/ios.md)

## Examples

- [Basic Chat App](./examples/basic-chat.md)
- [React Chat Component](./examples/react-chat.md)
- [iOS SwiftUI Chat](./examples/ios-swiftui.md)
