# React SDK API Reference

React hooks and components for ChatSDK.

## Installation

```bash
npm install @chatsdk/core @chatsdk/react
```

## Provider

### ChatProvider

Wrap your app to provide the chat client context.

```tsx
import { ChatProvider, ChatClient } from '@chatsdk/react';

const client = new ChatClient({
  apiKey: 'your-api-key',
  apiUrl: 'https://api.your-server.com',
});

function App() {
  return (
    <ChatProvider client={client}>
      <YourApp />
    </ChatProvider>
  );
}
```

### useChatClient

Access the ChatClient instance.

```tsx
import { useChatClient } from '@chatsdk/react';

function MyComponent() {
  const client = useChatClient();
  // Use client methods directly
}
```

## Hooks

### useChannels

Manage channel list with real-time updates.

```tsx
const {
  channels,   // Channel[]
  loading,    // boolean
  error,      // Error | null
  refresh,    // () => Promise<void>
} = useChannels(options?);
```

#### Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `20` | Max channels to fetch |
| `type` | `string` | - | Filter by channel type |

### useMessages

Manage messages for a channel.

```tsx
const {
  messages,   // Message[]
  loading,    // boolean
  error,      // Error | null
  hasMore,    // boolean
  loadMore,   // () => Promise<void>
  refresh,    // () => Promise<void>
} = useMessages(channelId, options?);
```

#### Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `50` | Messages per page |
| `initialLoad` | `boolean` | `true` | Load on mount |

### useReactions

Add/remove emoji reactions.

```tsx
const {
  addReaction,     // (messageId: string, emoji: string) => Promise<void>
  removeReaction,  // (messageId: string, emoji: string) => Promise<void>
  toggleReaction,  // (messageId: string, emoji: string, currentlyOwn: boolean) => Promise<void>
} = useReactions(channelId, options?);
```

#### Options
| Option | Type | Description |
|--------|------|-------------|
| `onReactionAdded` | `(event) => void` | Callback when reaction added |
| `onReactionRemoved` | `(event) => void` | Callback when reaction removed |

#### Exports

```tsx
// Quick reaction emojis
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

// Update messages after reaction event
export function updateMessageReactions(
  messages: Message[],
  messageId: string,
  emoji: string,
  userId: string,
  userName: string,
  added: boolean,
  currentUserId: string
): Message[];

// Format large reaction counts
export function formatReactionCount(count: number): string;
// 999 -> "999", 1500 -> "1.5k", 15000 -> "15k"
```

### useTypingIndicator

Manage typing indicators.

```tsx
const {
  typingUsers,   // User[]
  startTyping,   // () => Promise<void>
  stopTyping,    // () => Promise<void>
} = useTypingIndicator(channelId);
```

### useReadReceipts

Track read status.

```tsx
const {
  markAsRead,         // (messageId: string) => Promise<void>
  getReceipts,        // (messageId: string) => ReadReceipt[]
  formatReadReceipt,  // (receipts: ReadReceipt[]) => string
} = useReadReceipts(channelId);
```

### useMentions

Get @mentions for the current user.

```tsx
const {
  mentions,      // Mention[]
  loading,       // boolean
  hasMore,       // boolean
  unreadCount,   // number
  loadMore,      // () => Promise<void>
  refresh,       // () => Promise<void>
} = useMentions(options?);
```

#### Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `unreadOnly` | `boolean` | `false` | Only fetch unread |
| `limit` | `number` | `50` | Mentions per page |

### useMentionSearch

Search users for @mention autocomplete.

```tsx
const {
  query,      // string
  setQuery,   // (query: string) => void
  users,      // MentionUser[]
  loading,    // boolean
} = useMentionSearch(options?);
```

#### Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `channelId` | `string` | - | Limit to channel members |
| `debounceMs` | `number` | `200` | Debounce delay |

#### Utility Functions

```tsx
// Parse @mentions from text
export function parseMentions(text: string): string[];
// "@alice and @[Bob Smith]" -> ["alice", "Bob Smith"]

// Format mention for insertion
export function formatMention(user: MentionUser): string;
// { name: "Alice" } -> "@Alice"
// { name: "Bob Smith" } -> "@[Bob Smith]"

// Highlight mentions for rendering
export function highlightMentions(
  text: string,
  currentUserId?: string
): Array<{
  type: 'text' | 'mention';
  content: string;
  isCurrentUser?: boolean;
}>;
```

### usePresence

Track user online status.

```tsx
const {
  isOnline,   // boolean
  lastSeen,   // Date | null
} = usePresence(userId);
```

### useThread

Manage thread replies.

```tsx
const {
  parent,     // Message | null
  replies,    // Message[]
  loading,    // boolean
  hasMore,    // boolean
  loadMore,   // () => Promise<void>
  sendReply,  // (text: string) => Promise<Message>
} = useThread(channelId, parentMessageId);
```

### useSearch

Search messages.

```tsx
const {
  query,       // string
  setQuery,    // (query: string) => void
  results,     // Message[]
  loading,     // boolean
  hasMore,     // boolean
  loadMore,    // () => Promise<void>
} = useSearch(options?);
```

#### Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `channelId` | `string` | - | Limit to channel |
| `debounceMs` | `number` | `300` | Debounce delay |
| `limit` | `number` | `20` | Results per page |

### useFileUpload

Handle file uploads.

```tsx
const {
  upload,     // (file: File, channelId: string) => Promise<Attachment>
  uploading,  // boolean
  progress,   // number (0-100)
  error,      // Error | null
} = useFileUpload();
```

### useReadState

Track channel read state.

```tsx
const {
  unreadCount,    // number
  lastReadSeq,    // number
  markAsRead,     // () => Promise<void>
} = useReadState(channelId);
```

## Types

### Mention
```typescript
interface Mention {
  id: string;
  mentionedAt: string;
  message: {
    id: string;
    channelId: string;
    text: string;
    createdAt: string;
  };
  mentioner: MentionUser;
  channel: {
    id: string;
    name: string;
    type: string;
  };
  read: boolean;
}
```

### MentionUser
```typescript
interface MentionUser {
  id: string;
  name: string;
  image?: string;
}
```

### ReactionEvent
```typescript
interface ReactionEvent {
  messageId: string;
  channelId: string;
  emoji: string;
  userId: string;
  user?: MentionUser;
  added: boolean;
}
```

### Reaction
```typescript
interface Reaction {
  type: string;
  count: number;
  own: boolean;
  users: Array<{ id: string; name: string }>;
}
```

## Examples

### Complete Chat Component

```tsx
import {
  useChannels,
  useMessages,
  useReactions,
  useTypingIndicator,
  useMentions,
  QUICK_REACTIONS,
  highlightMentions,
} from '@chatsdk/react';

function ChatApp() {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const { channels } = useChannels();
  const { unreadCount } = useMentions();

  return (
    <div className="chat-app">
      {/* Mentions badge */}
      {unreadCount > 0 && (
        <div className="mentions-badge">{unreadCount} mentions</div>
      )}

      {/* Channel list */}
      <aside>
        {channels.map(channel => (
          <button
            key={channel.id}
            onClick={() => setSelectedChannelId(channel.id)}
            className={channel.id === selectedChannelId ? 'active' : ''}
          >
            {channel.name}
            {channel.unreadCount > 0 && (
              <span className="unread">{channel.unreadCount}</span>
            )}
          </button>
        ))}
      </aside>

      {/* Chat view */}
      {selectedChannelId && (
        <ChatView channelId={selectedChannelId} />
      )}
    </div>
  );
}

function ChatView({ channelId }: { channelId: string }) {
  const { messages, loadMore, hasMore } = useMessages(channelId);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(channelId);
  const { toggleReaction } = useReactions(channelId);
  const client = useChatClient();
  const [text, setText] = useState('');

  const handleSend = async () => {
    if (!text.trim()) return;
    await client.sendMessage(channelId, { text });
    setText('');
    stopTyping();
  };

  return (
    <main>
      {/* Messages */}
      <div className="messages">
        {hasMore && <button onClick={loadMore}>Load more</button>}
        {messages.map(message => (
          <div key={message.id} className="message">
            <MessageText text={message.text} />
            <MessageReactions
              reactions={message.reactions}
              onToggle={(emoji, own) => toggleReaction(message.id, emoji, own)}
            />
          </div>
        ))}
        {typingUsers.length > 0 && (
          <div className="typing">
            {typingUsers.map(u => u.name).join(', ')} typing...
          </div>
        )}
      </div>

      {/* Composer */}
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          startTyping();
        }}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type a message..."
      />
    </main>
  );
}

function MessageText({ text }: { text?: string }) {
  const client = useChatClient();
  if (!text) return null;

  const parts = highlightMentions(text, client.user?.id);

  return (
    <p>
      {parts.map((part, i) =>
        part.type === 'mention' ? (
          <span
            key={i}
            className={`mention ${part.isCurrentUser ? 'mention-me' : ''}`}
          >
            @{part.content}
          </span>
        ) : (
          <span key={i}>{part.content}</span>
        )
      )}
    </p>
  );
}

function MessageReactions({
  reactions,
  onToggle,
}: {
  reactions?: Reaction[];
  onToggle: (emoji: string, own: boolean) => void;
}) {
  return (
    <div className="reactions">
      {reactions?.map(r => (
        <button
          key={r.type}
          onClick={() => onToggle(r.type, r.own)}
          className={r.own ? 'own' : ''}
        >
          {r.type} {r.count}
        </button>
      ))}
      <ReactionPicker onSelect={(emoji) => onToggle(emoji, false)} />
    </div>
  );
}

function ReactionPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="reaction-picker">
      <button onClick={() => setOpen(!open)}>+</button>
      {open && (
        <div className="picker-dropdown">
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```
