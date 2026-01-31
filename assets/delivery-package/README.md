# ChatSDK Delivery Package — v2.0.8

Compiled SDK distribution for `@chatsdk/core` and `@chatsdk/react`.

## What's Included

### `core/` — @chatsdk/core

| Directory | Contents |
|-----------|----------|
| `auth/` | **TokenManager** — automatic token refresh before expiration |
| `client/` | **ChatClient** — `connectUser(user, token)` or `connectUser(user, { token, wsToken })` |
| `lib/` | **retry** (exponential backoff), **circuit-breaker**, **deduplication**, errors, logger, profiler |
| `callbacks/` | **EventBus** — typed event emitter |
| `network/` | **NetworkQualityMonitor** |
| `offline/` | **OfflineQueue** |
| `realtime/` | **ConnectionManager** (reconnectIn support) |
| `schemas/` | Zod validation schemas (CreateChannel with idempotencyKey) |
| `storage/` | **IndexedDBStorage** |
| `sync/` | **MessageSyncer** |
| `ChatSDK.js` | Simplified 2.0 API (recommended entry point) |

### `react/` — @chatsdk/react

| Directory | Contents |
|-----------|----------|
| `hooks/` | 40+ hooks including **useChannelSubscription**, useWorkspaces, useMessages, useChannels, etc. |
| `providers/` | **ChatSDKQueryProvider** — React Query with ChatSDK-optimized defaults |
| `components/sdk/` | ChannelList, MessageList, MessageInput, Thread, ChatLayout, VoiceMessage, etc. |
| `components/admin/` | Dashboard, UsersTable, ChannelsTable, ModerationQueue, APIKeysManager, etc. |
| `components/shared/` | Avatar, Button, Input, Badge |
| `components/onboarding/` | AppSetupWizard, ThemeBuilder |
| `styles/` | Themes (default, dark, impactIdol, createTheme) |

## connectUser — Dual-Token Support

```typescript
import { createChatClient } from '@chatsdk/core';

const client = createChatClient({ apiKey: 'your-key', apiUrl: 'https://api.example.com' });

// Single token (used for both REST and WebSocket)
await client.connectUser({ id: 'user-1', name: 'Alice' }, 'jwt-token');

// Dual token (separate REST and WebSocket tokens)
await client.connectUser({ id: 'user-1', name: 'Alice' }, {
  token: 'rest-api-jwt',
  wsToken: 'centrifugo-jwt',
});
```

## Quick Start (React)

```tsx
import { ChatProvider, ChannelList, MessageList, MessageInput } from '@chatsdk/react';

function App() {
  return (
    <ChatProvider apiKey="your-key" apiUrl="https://api.example.com" userId="user-1" token="jwt">
      <ChannelList />
      <MessageList />
      <MessageInput />
    </ChatProvider>
  );
}
```

## New in v2.0.8

- **Idempotency key** for `createChannel` — prevents duplicate group channels on retry/race
- **reconnectIn** on connection state — `useConnectionState()` returns `reconnectIn: number | null`
- **useChannelSubscription** — subscribe to channel events without loading messages
- **useWorkspaceSubscription** — subscribe to workspace-level events
- **ErrorCodes** — typed error code constants
- **Role hierarchy enforcement** on member role updates
- **Atomic ON CONFLICT dedup** for idempotent channel creation

## Dependencies

### @chatsdk/core
- `centrifuge ^5.0.0`
- `idb ^8.0.0`
- `uuid ^10.0.0`
- `zod ^3.22.0`

### @chatsdk/react
- `@chatsdk/core 2.0.8`
- `clsx ^2.1.0`
- `date-fns ^3.3.0`
- `react-virtuoso ^4.7.0`
- Peer: `react ^18 || ^19`, `react-dom ^18 || ^19`, `@tanstack/react-query ^5.0.0` (optional)
