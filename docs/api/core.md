# Core SDK API Reference

The `@chatsdk/core` package provides the foundation for building chat applications.

## ChatClient

The main entry point for the SDK.

### Constructor

```typescript
import { ChatClient } from '@chatsdk/core';

const client = new ChatClient(options: ChatClientOptions);
```

#### ChatClientOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `apiKey` | `string` | Yes | - | Your API key |
| `apiUrl` | `string` | No | `http://localhost:5500` | API server URL |
| `wsUrl` | `string` | No | `ws://localhost:8000/...` | WebSocket URL |
| `debug` | `boolean` | No | `false` | Enable debug logging |
| `enableOfflineSupport` | `boolean` | No | `true` | Enable offline queue |
| `reconnectIntervals` | `number[]` | No | `[1000,2000,4000,8000,16000]` | Backoff intervals |

### Properties

#### `user`
```typescript
get user(): User | null
```
Returns the currently connected user, or `null` if not connected.

#### `state`
```typescript
get state(): ConnectionState
```
Returns the current connection state: `'connecting' | 'connected' | 'disconnected' | 'reconnecting'`.

#### `apiUrl`
```typescript
get apiUrl(): string
```
Returns the configured API URL.

### Connection Methods

#### `connectUser()`
```typescript
async connectUser(
  user: ConnectUserOptions,
  token: string
): Promise<User>
```

Connect a user to the chat service.

```typescript
const user = await client.connectUser(
  { id: 'user-123', name: 'Alice', image: 'https://...' },
  'jwt-token'
);
```

#### `disconnect()`
```typescript
async disconnect(): Promise<void>
```

Disconnect from the chat service and clean up resources.

### Event Methods

#### `on()`
```typescript
on<K extends keyof EventMap>(
  event: K,
  callback: EventCallback<K>
): () => void
```

Subscribe to an event. Returns an unsubscribe function.

```typescript
const unsub = client.on('message.new', ({ channelId, message }) => {
  console.log('New message:', message.text);
});

// Later: unsubscribe
unsub();
```

#### `once()`
```typescript
once<K extends keyof EventMap>(
  event: K,
  callback: EventCallback<K>
): () => void
```

Subscribe to an event once. Automatically unsubscribes after first emit.

#### `off()`
```typescript
off<K extends keyof EventMap>(
  event: K,
  callback: EventCallback<K>
): void
```

Unsubscribe a specific callback from an event.

### Channel Methods

#### `queryChannels()`
```typescript
async queryChannels(options?: {
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<Channel[]>
```

Query channels the user is a member of.

```typescript
const channels = await client.queryChannels({ limit: 20 });
```

#### `getChannel()`
```typescript
async getChannel(channelId: string): Promise<Channel>
```

Get a specific channel by ID.

#### `createChannel()`
```typescript
async createChannel(data: {
  type?: string;
  name?: string;
  memberIds: string[];
}): Promise<Channel>
```

Create a new channel.

```typescript
const channel = await client.createChannel({
  name: 'Project Discussion',
  memberIds: ['user-1', 'user-2'],
});
```

#### `subscribeToChannel()`
```typescript
async subscribeToChannel(channelId: string): Promise<Subscription>
```

Subscribe to real-time updates for a channel.

#### `unsubscribeFromChannel()`
```typescript
async unsubscribeFromChannel(channelId: string): Promise<void>
```

Unsubscribe from a channel.

### Message Methods

#### `queryMessages()`
```typescript
async queryMessages(
  channelId: string,
  options?: {
    sinceSeq?: number;
    limit?: number;
    before?: string;
    after?: string;
  }
): Promise<{
  messages: MessageWithSeq[];
  maxSeq: number;
  hasMore: boolean;
}>
```

Query messages in a channel.

```typescript
const { messages, hasMore } = await client.queryMessages('channel-123', {
  limit: 50,
});
```

#### `sendMessage()`
```typescript
async sendMessage(
  channelId: string,
  data: {
    text: string;
    clientMsgId?: string;
    attachments?: Attachment[];
    parentId?: string;
  }
): Promise<MessageWithSeq>
```

Send a message to a channel.

```typescript
const message = await client.sendMessage('channel-123', {
  text: 'Hello!',
  attachments: [{ type: 'image', url: 'https://...' }],
});
```

#### `updateMessage()`
```typescript
async updateMessage(
  channelId: string,
  messageId: string,
  data: { text: string }
): Promise<MessageWithSeq>
```

Update a message.

#### `deleteMessage()`
```typescript
async deleteMessage(
  channelId: string,
  messageId: string
): Promise<void>
```

Delete a message (soft delete).

### Reaction Methods

#### `addReaction()`
```typescript
async addReaction(
  channelId: string,
  messageId: string,
  emoji: string
): Promise<void>
```

Add a reaction to a message.

```typescript
await client.addReaction('channel-123', 'msg-456', '👍');
```

#### `removeReaction()`
```typescript
async removeReaction(
  channelId: string,
  messageId: string,
  emoji: string
): Promise<void>
```

Remove a reaction from a message.

### Typing Methods

#### `sendTypingStart()`
```typescript
async sendTypingStart(channelId: string): Promise<void>
```

Send a typing indicator.

#### `sendTypingStop()`
```typescript
async sendTypingStop(channelId: string): Promise<void>
```

Stop the typing indicator.

### Read State Methods

#### `markRead()`
```typescript
async markRead(
  channelId: string,
  messageId?: string
): Promise<void>
```

Mark messages as read in a channel.

### API Request Method

#### `fetch()`
```typescript
async fetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T>
```

Make an authenticated API request. Automatically adds authentication headers.

```typescript
const data = await client.fetch<MyResponse>('/api/custom-endpoint', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' }),
});
```

## Events

### Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `connection.connecting` | `void` | Connecting to server |
| `connection.connected` | `void` | Successfully connected |
| `connection.disconnected` | `{ reason: string }` | Disconnected |
| `connection.error` | `{ error: Error }` | Connection error |
| `message.new` | `{ channelId, message }` | New message received |
| `message.updated` | `{ channelId, message }` | Message updated |
| `message.deleted` | `{ channelId, messageId }` | Message deleted |
| `typing.start` | `{ channelId, user }` | User started typing |
| `typing.stop` | `{ channelId, user }` | User stopped typing |
| `reaction.added` | `{ channelId, messageId, reaction }` | Reaction added |
| `reaction.removed` | `{ channelId, messageId, reaction }` | Reaction removed |
| `channel.updated` | `{ channel }` | Channel updated |
| `read.updated` | `{ channelId, userId, lastReadSeq }` | Read state updated |
| `presence.online` | `{ userId }` | User came online |
| `presence.offline` | `{ userId, lastSeen }` | User went offline |
| `sync.start` | `{ channelId?, isInitial }` | Sync started |
| `sync.progress` | `{ channelId?, progress }` | Sync progress |
| `sync.complete` | `{ channelId?, messageCount }` | Sync complete |
| `sync.error` | `{ channelId?, error }` | Sync error |

## Types

### User
```typescript
interface User {
  id: string;
  name: string;
  image?: string;
  online?: boolean;
  last_active?: string;
  custom?: Record<string, unknown>;
}
```

### Channel
```typescript
interface Channel {
  id: string;
  cid: string;
  type: 'messaging' | 'livestream' | 'team' | 'commerce';
  name?: string;
  image?: string;
  member_count: number;
  message_count?: number;
  unread_count?: number;
  last_message?: Message;
  created_at: string;
  updated_at?: string;
}
```

### Message
```typescript
interface Message {
  id: string;
  cid: string;
  type: 'regular' | 'system' | 'error' | 'deleted';
  text?: string;
  user?: User;
  attachments?: Attachment[];
  reactions?: ReactionGroup[];
  reply_count?: number;
  parent_id?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
  updated_at?: string;
}
```

### MessageWithSeq
```typescript
interface MessageWithSeq extends Message {
  seq: number;
  clientMsgId?: string;
}
```

### Attachment
```typescript
interface Attachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'giphy' | 'voicenote';
  url?: string;
  thumb_url?: string;
  title?: string;
  mime_type?: string;
  file_size?: number;
  width?: number;
  height?: number;
}
```

### Reaction
```typescript
interface Reaction {
  type: string;
  user_id: string;
  message_id: string;
  created_at: string;
}
```

### ReactionGroup
```typescript
interface ReactionGroup {
  type: string;
  count: number;
  own: boolean;
  users: User[];
}
```

## EventBus

Low-level event emitter used internally.

```typescript
import { EventBus } from '@chatsdk/core';

const bus = new EventBus({ debug: true });

// Subscribe
const unsub = bus.on('message.new', (data) => { ... });

// Emit
bus.emit('message.new', { channelId: '...', message: { ... } });

// Wait for event
const data = await bus.waitFor('connection.connected', { timeout: 5000 });
```

## MessageSyncer

Handles sequence-based message synchronization with gap detection.

```typescript
import { MessageSyncer } from '@chatsdk/core';

const syncer = new MessageSyncer({
  client,
  eventBus,
  storage, // SyncStorage implementation
  batchSize: 100,
  debug: true,
});

// Sync a channel
const { synced, gaps } = await syncer.syncChannel('channel-123');

// Handle incoming message (validates sequence)
await syncer.handleNewMessage('channel-123', message);

// Sync all channels
await syncer.syncAllChannels();
```
