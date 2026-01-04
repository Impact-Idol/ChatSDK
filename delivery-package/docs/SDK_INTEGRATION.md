# ChatSDK Integration Guide

This guide covers integrating ChatSDK into your existing application **without** using our template UI.

## Table of Contents
- [Installation Options](#installation-options)
- [API-Only Integration](#api-only-integration)
- [React Integration](#react-integration)
- [React Native Integration](#react-native-integration)
- [Vanilla JavaScript](#vanilla-javascript)
- [Framework Examples](#framework-examples)

---

## Installation Options

### Option 1: Full Stack (Recommended for quick start)
```bash
./setup.sh           # Interactive wizard
# or
./instant-setup.sh   # Zero-config default setup
```

### Option 2: API Only (Bring your own frontend)
```bash
./setup.sh --api-only
```

### Option 3: Headless (Just generate config)
```bash
./setup.sh --headless
```

### Option 4: External API (Use hosted ChatSDK)
No setup needed - just install the SDK packages.

---

## API-Only Integration

If you just need the REST API without any UI components:

### 1. Start the API
```bash
./setup.sh --api-only
```

### 2. Get Your API Key
```bash
cat credentials/secrets.json | jq '.app.api_key'
```

### 3. Create User Tokens
```bash
# Server-side: Create tokens for your users
curl -X POST http://localhost:5500/tokens \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "image": "https://example.com/avatar.jpg"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2024-01-15T00:00:00Z"
}
```

### 4. Use the Token in API Calls
```bash
# Client-side: Use the token for authenticated requests
curl http://localhost:5500/api/channels \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

---

## React Integration

### Install Package
```bash
npm install @chatsdk/react
# or
yarn add @chatsdk/react
```

### Basic Setup
```tsx
import { ChatProvider } from '@chatsdk/react';

function App() {
  // Get token from your backend
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch token from your auth endpoint
    fetch('/api/chat-token')
      .then(res => res.json())
      .then(data => setToken(data.token));
  }, []);

  if (!token) return <div>Loading...</div>;

  return (
    <ChatProvider
      apiUrl="http://localhost:5500"
      token={token}
    >
      <YourApp />
    </ChatProvider>
  );
}
```

### Using Hooks

#### Messages
```tsx
import { useMessages } from '@chatsdk/react';

function ChatRoom({ channelId }: { channelId: string }) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    loadMore,
    hasMore,
  } = useMessages(channelId);

  const handleSend = async () => {
    await sendMessage({ text: 'Hello!' });
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>{msg.user.name}:</strong> {msg.text}
        </div>
      ))}
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

#### Channels
```tsx
import { useChannels, useChannel } from '@chatsdk/react';

function ChannelList({ workspaceId }: { workspaceId: string }) {
  const { channels, isLoading, createChannel } = useChannels(workspaceId);

  return (
    <ul>
      {channels.map(ch => (
        <li key={ch.id}>#{ch.name}</li>
      ))}
    </ul>
  );
}
```

#### Typing Indicators
```tsx
import { useTypingIndicator, formatTypingText } from '@chatsdk/react';

function TypingStatus({ channelId }: { channelId: string }) {
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(channelId);

  return (
    <div>
      {typingUsers.length > 0 && (
        <span>{formatTypingText(typingUsers)}</span>
      )}
    </div>
  );
}
```

#### Reactions
```tsx
import { useReactions, QUICK_REACTIONS } from '@chatsdk/react';

function MessageReactions({ channelId, messageId }: Props) {
  const { reactions, addReaction, removeReaction } = useReactions(channelId, messageId);

  return (
    <div>
      {QUICK_REACTIONS.map(emoji => (
        <button key={emoji} onClick={() => addReaction(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  );
}
```

#### Presence
```tsx
import { usePresence, useChannelPresence } from '@chatsdk/react';

function OnlineUsers({ channelId }: { channelId: string }) {
  const { onlineUsers, isOnline } = useChannelPresence(channelId);

  return (
    <div>
      {onlineUsers.length} online
    </div>
  );
}
```

#### Channel Subscription (Advanced)
```tsx
import { useChannelSubscription } from '@chatsdk/react';

// For custom real-time handling without loading messages
function CustomSubscription({ channelId }: { channelId: string }) {
  const { isSubscribed } = useChannelSubscription(channelId, {
    onMessage: (msg) => console.log('New message:', msg),
    onTypingStart: (userId, name) => console.log(`${name} is typing...`),
    onReactionAdded: (msgId, reaction) => console.log('Reaction:', reaction),
  });

  return <div>Subscribed: {isSubscribed ? 'Yes' : 'No'}</div>;
}
```

### Available Hooks
| Hook | Purpose |
|------|---------|
| `useMessages` | Load and send messages |
| `useChannels` | List and create channels |
| `useChannel` | Single channel details |
| `useTypingIndicator` | Typing status |
| `useReactions` | Message reactions |
| `usePresence` | User online status |
| `useChannelPresence` | Channel members online |
| `useReadState` | Read receipts |
| `useSearch` | Search messages |
| `useFileUpload` | File uploads |
| `useThread` | Thread replies |
| `useMentions` | @mentions |
| `usePolls` | Polls in messages |
| `useWorkspaces` | Workspace management |
| `useChannelSubscription` | Low-level event subscription |

---

## React Native Integration

### Install Package
```bash
npm install @chatsdk/react-native
```

### Setup
```tsx
import { ChatProvider } from '@chatsdk/react-native';

function App() {
  return (
    <ChatProvider
      apiUrl="https://api.yourapp.com"
      token={userToken}
    >
      <ChatScreen />
    </ChatProvider>
  );
}
```

The React Native SDK uses the same hooks as the React SDK.

---

## Vanilla JavaScript

### Install Package
```bash
npm install @chatsdk/core
```

### Basic Usage
```typescript
import { ChatClient } from '@chatsdk/core';

// Initialize client
const client = new ChatClient({
  apiUrl: 'http://localhost:5500',
  wsUrl: 'ws://localhost:8001/connection/websocket',
  token: userToken,
});

// Connect to real-time
await client.connect();

// Subscribe to a channel
await client.subscribeToChannel('channel-123');

// Listen for messages
client.on('message.new', ({ channelId, message }) => {
  console.log('New message in', channelId, ':', message.text);
});

// Send a message
await client.sendMessage('channel-123', { text: 'Hello!' });

// Load messages
const { messages, hasMore } = await client.getMessages('channel-123', {
  limit: 50,
});

// Disconnect
client.disconnect();
```

### Event Types
```typescript
client.on('message.new', handler);
client.on('message.updated', handler);
client.on('message.deleted', handler);
client.on('reaction.added', handler);
client.on('reaction.removed', handler);
client.on('typing.start', handler);
client.on('typing.stop', handler);
client.on('presence.changed', handler);
client.on('connection.changed', handler);
```

---

## Framework Examples

### Next.js (App Router)

> **See Also:** [Complete Next.js Integration Guide](./NEXTJS_INTEGRATION.md) and [examples/nextjs-chat](../../examples/nextjs-chat/)

```tsx
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside useState to avoid sharing between requests
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Next.js (Pages Router)
```tsx
// pages/_app.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

function MyApp({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
```

### Remix
```tsx
// app/root.tsx
import { ChatProvider } from '@chatsdk/react';
import { useLoaderData } from '@remix-run/react';

export async function loader({ request }) {
  const session = await getSession(request);
  const chatToken = await getChatToken(session.userId);
  return json({ chatToken });
}

export default function App() {
  const { chatToken } = useLoaderData<typeof loader>();

  return (
    <ChatProvider apiUrl={ENV.CHAT_API_URL} token={chatToken}>
      <Outlet />
    </ChatProvider>
  );
}
```

### Vue.js
```typescript
// composables/useChat.ts
import { ChatClient } from '@chatsdk/core';
import { ref, onMounted, onUnmounted } from 'vue';

export function useChat(token: string) {
  const client = ref<ChatClient | null>(null);
  const messages = ref([]);

  onMounted(async () => {
    client.value = new ChatClient({
      apiUrl: import.meta.env.VITE_CHAT_API_URL,
      wsUrl: import.meta.env.VITE_CHAT_WS_URL,
      token,
    });

    await client.value.connect();

    client.value.on('message.new', ({ message }) => {
      messages.value.push(message);
    });
  });

  onUnmounted(() => {
    client.value?.disconnect();
  });

  return { client, messages };
}
```

### Svelte
```svelte
<script>
  import { ChatClient } from '@chatsdk/core';
  import { onMount, onDestroy } from 'svelte';

  export let token;

  let client;
  let messages = [];

  onMount(async () => {
    client = new ChatClient({
      apiUrl: import.meta.env.VITE_CHAT_API_URL,
      wsUrl: import.meta.env.VITE_CHAT_WS_URL,
      token,
    });

    await client.connect();

    client.on('message.new', ({ message }) => {
      messages = [...messages, message];
    });
  });

  onDestroy(() => {
    client?.disconnect();
  });
</script>

{#each messages as message}
  <div>{message.user.name}: {message.text}</div>
{/each}
```

---

## Server-Side Token Generation

### Node.js / Express
```typescript
import express from 'express';

const app = express();
const CHAT_API_KEY = process.env.CHAT_API_KEY;
const CHAT_API_URL = process.env.CHAT_API_URL;

app.get('/api/chat-token', async (req, res) => {
  // Get user from your auth system
  const user = req.user;

  // Create ChatSDK token
  const response = await fetch(`${CHAT_API_URL}/tokens`, {
    method: 'POST',
    headers: {
      'X-API-Key': CHAT_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.avatar,
    }),
  });

  const data = await response.json();
  res.json({ token: data.token });
});
```

### Python / FastAPI
```python
from fastapi import FastAPI, Depends
import httpx

app = FastAPI()

CHAT_API_KEY = os.environ["CHAT_API_KEY"]
CHAT_API_URL = os.environ["CHAT_API_URL"]

@app.get("/api/chat-token")
async def get_chat_token(user = Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CHAT_API_URL}/tokens",
            headers={
                "X-API-Key": CHAT_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "userId": user.id,
                "name": user.name,
                "email": user.email,
            },
        )
        return response.json()
```

### Go
```go
func getChatToken(w http.ResponseWriter, r *http.Request) {
    user := getUserFromContext(r.Context())

    payload := map[string]string{
        "userId": user.ID,
        "name":   user.Name,
        "email":  user.Email,
    }

    body, _ := json.Marshal(payload)

    req, _ := http.NewRequest("POST", os.Getenv("CHAT_API_URL")+"/tokens", bytes.NewBuffer(body))
    req.Header.Set("X-API-Key", os.Getenv("CHAT_API_KEY"))
    req.Header.Set("Content-Type", "application/json")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()

    io.Copy(w, resp.Body)
}
```

---

## Environment Variables

### Client-Side (.env)
```bash
# For React/Next.js/Vite
NEXT_PUBLIC_CHAT_API_URL=http://localhost:5500
NEXT_PUBLIC_CHAT_WS_URL=ws://localhost:8001/connection/websocket

# For Vite
VITE_CHAT_API_URL=http://localhost:5500
VITE_CHAT_WS_URL=ws://localhost:8001/connection/websocket
```

### Server-Side (.env)
```bash
CHAT_API_URL=http://localhost:5500
CHAT_API_KEY=your-api-key-here
```

---

## Need Help?

- [Next.js Integration Guide](./NEXTJS_INTEGRATION.md)
- [API Reference](./API_REFERENCE.md)
- [Authentication Guide](./AUTHENTICATION.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/piper5ul/ChatSDK/issues)
