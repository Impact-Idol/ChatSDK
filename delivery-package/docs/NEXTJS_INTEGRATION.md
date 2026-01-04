# Next.js Integration Guide

Complete guide for integrating ChatSDK with Next.js applications (App Router and Pages Router).

## Table of Contents
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [App Router Setup](#app-router-setup)
- [Pages Router Setup](#pages-router-setup)
- [Server Actions](#server-actions)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install @chatsdk/react @tanstack/react-query centrifuge
```

### 2. Set Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5500
NEXT_PUBLIC_API_KEY=your-api-key-here
NEXT_PUBLIC_WS_URL=ws://localhost:8001/connection/websocket
NEXT_PUBLIC_APP_ID=default
```

### 3. See Complete Example

Check out the full example at `examples/nextjs-chat/` for a working implementation.

---

## Environment Variables

Next.js requires the `NEXT_PUBLIC_` prefix for client-side environment variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | ChatSDK API server | `http://localhost:5500` |
| `NEXT_PUBLIC_API_KEY` | API authentication key | `sk_...` |
| `NEXT_PUBLIC_WS_URL` | Centrifugo WebSocket URL | `ws://localhost:8001/connection/websocket` |
| `NEXT_PUBLIC_APP_ID` | Application identifier | `default` |

### Framework Compatibility

If you're migrating from Vite:

```typescript
// Vite (before)
const apiUrl = import.meta.env.VITE_API_URL;

// Next.js (after)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

### Framework-Agnostic Configuration

For shared libraries that work in both Vite and Next.js:

```typescript
function getEnvVar(viteKey: string, nextKey: string, fallback: string): string {
  // Try Vite format
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteValue = (import.meta.env as Record<string, string>)[viteKey];
    if (viteValue) return viteValue;
  }

  // Try Next.js / Node.js format
  if (typeof process !== 'undefined' && process.env) {
    const nextValue = process.env[nextKey];
    if (nextValue) return nextValue;
  }

  return fallback;
}

// Usage
const apiUrl = getEnvVar('VITE_API_URL', 'NEXT_PUBLIC_API_URL', 'http://localhost:5500');
```

---

## App Router Setup

### 1. Create Providers (Client Component)

```tsx
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient inside useState to avoid sharing between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

### 2. Update Layout

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 3. Create Chat Page (Client Component)

```tsx
// app/chat/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// API functions
async function getChannels(workspaceId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/workspaces/${workspaceId}/channels`,
    {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY!,
      },
    }
  );
  return response.json();
}

async function getMessages(channelId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channelId}/messages`,
    {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY!,
      },
    }
  );
  return response.json();
}

export default function ChatPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  // Fetch channels
  const { data: channelsData } = useQuery({
    queryKey: ['channels', 'default-workspace'],
    queryFn: () => getChannels('default-workspace'),
  });

  // Fetch messages for selected channel
  const { data: messagesData } = useQuery({
    queryKey: ['messages', selectedChannel],
    queryFn: () => getMessages(selectedChannel!),
    enabled: !!selectedChannel,
  });

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Channel list */}
      <aside style={{ width: '250px', borderRight: '1px solid #ccc' }}>
        {channelsData?.channels?.map((channel: any) => (
          <button
            key={channel.id}
            onClick={() => setSelectedChannel(channel.id)}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              textAlign: 'left',
              background: selectedChannel === channel.id ? '#e5e7eb' : 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            # {channel.name}
          </button>
        ))}
      </aside>

      {/* Messages */}
      <main style={{ flex: 1, padding: '16px' }}>
        {messagesData?.messages?.map((message: any) => (
          <div key={message.id} style={{ marginBottom: '12px' }}>
            <strong>{message.user?.name || 'Unknown'}</strong>
            <p>{message.content}</p>
          </div>
        ))}
      </main>
    </div>
  );
}
```

---

## Pages Router Setup

### 1. Create _app.tsx

```tsx
// pages/_app.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
```

### 2. Create Chat Page

```tsx
// pages/chat.tsx
import { useQuery } from '@tanstack/react-query';

export default function ChatPage() {
  const { data } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/workspaces/default/channels`,
        {
          headers: { 'X-API-Key': process.env.NEXT_PUBLIC_API_KEY! },
        }
      );
      return res.json();
    },
  });

  return (
    <div>
      <h1>Channels</h1>
      {data?.channels?.map((ch: any) => (
        <div key={ch.id}># {ch.name}</div>
      ))}
    </div>
  );
}
```

---

## Server Actions

### Using @chatsdk/nextjs

For server-side operations, use the Next.js adapter:

```bash
npm install @chatsdk/nextjs
```

```typescript
// app/actions/chat.ts
'use server';

import { sendMessage } from '@chatsdk/nextjs/actions';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function sendMessageAction(channelId: string, formData: FormData) {
  const token = cookies().get('chatsdk_token')?.value!;
  const apiUrl = process.env.CHATSDK_API_URL!;
  const text = formData.get('text') as string;

  await sendMessage(token, apiUrl, channelId, { text });

  revalidatePath(`/chat/${channelId}`);
}
```

### API Routes (Alternative)

```typescript
// app/api/chat/send/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { channelId, content, userId } = await req.json();

  const response = await fetch(
    `${process.env.CHATSDK_API_URL}/api/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CHATSDK_API_KEY!,
      },
      body: JSON.stringify({ content, userId }),
    }
  );

  const data = await response.json();
  return NextResponse.json(data);
}
```

---

## Common Patterns

### WebSocket Connection

```typescript
// lib/websocket.ts
'use client';

import { Centrifuge } from 'centrifuge';

let client: Centrifuge | null = null;

export function getWebSocketClient(token: string): Centrifuge {
  if (!client) {
    client = new Centrifuge(process.env.NEXT_PUBLIC_WS_URL!, { token });
  }
  return client;
}

export function disconnectWebSocket() {
  client?.disconnect();
  client = null;
}
```

### Using WebSocket in Component

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getWebSocketClient, disconnectWebSocket } from '@/lib/websocket';

export function ChatRoom({ channelId, wsToken }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const client = getWebSocketClient(wsToken);

    client.on('connected', () => {
      console.log('Connected to WebSocket');
    });

    const sub = client.newSubscription(`chat:${channelId}`);

    sub.on('publication', (ctx) => {
      if (ctx.data.type === 'message.new') {
        setMessages((prev) => [...prev, ctx.data.payload.message]);
      }
    });

    sub.subscribe();
    client.connect();

    return () => {
      sub.unsubscribe();
      disconnectWebSocket();
    };
  }, [channelId, wsToken]);

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

### Authentication Flow

```typescript
// lib/auth.ts
export async function getChatToken(userId: string): Promise<string> {
  const response = await fetch(`${process.env.CHATSDK_API_URL}/api/auth/ws-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.CHATSDK_API_KEY!,
    },
    body: JSON.stringify({ userId, appId: process.env.NEXT_PUBLIC_APP_ID }),
  });

  const data = await response.json();
  return data.token;
}
```

### Using Utility Functions

Import utilities from @chatsdk/react:

```typescript
import {
  getInitials,
  getAvatarColor,
  formatMessageTime,
  formatRelativeTime,
} from '@chatsdk/react';

// Or define your own if you prefer:
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
```

---

## Troubleshooting

### "import.meta.env is not defined"

This happens when using Vite-style environment variables in Next.js.

**Solution**: Use `process.env.NEXT_PUBLIC_*` instead:

```typescript
// Before (Vite)
const apiUrl = import.meta.env.VITE_API_URL;

// After (Next.js)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

### "Hydration mismatch" errors

Client components that depend on environment variables may cause hydration issues.

**Solution**: Initialize state on the client only:

```tsx
'use client';

import { useState, useEffect } from 'react';

function MyComponent() {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    setConfig({
      apiUrl: process.env.NEXT_PUBLIC_API_URL!,
    });
  }, []);

  if (!config) return null;

  // Render with config...
}
```

### QueryClient shared between requests

In App Router, creating QueryClient at module level can cause issues.

**Solution**: Create inside useState:

```tsx
// BAD - shared between requests
const queryClient = new QueryClient();

// GOOD - unique per request
const [queryClient] = useState(() => new QueryClient());
```

### WebSocket doesn't reconnect after navigation

Next.js App Router may unmount components on navigation.

**Solution**: Use a singleton pattern or context:

```tsx
// contexts/WebSocketContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Centrifuge } from 'centrifuge';

const WebSocketContext = createContext<Centrifuge | null>(null);

export function WebSocketProvider({ children, token }: Props) {
  const [client] = useState(
    () => new Centrifuge(process.env.NEXT_PUBLIC_WS_URL!, { token })
  );

  useEffect(() => {
    client.connect();
    return () => client.disconnect();
  }, [client]);

  return (
    <WebSocketContext.Provider value={client}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext);
```

---

## Related Documentation

- [SDK Integration Guide](./SDK_INTEGRATION.md)
- [API Reference](./API_REFERENCE.md)
- [Authentication Guide](./AUTHENTICATION.md)
- [Example: examples/nextjs-chat](../../examples/nextjs-chat/)
