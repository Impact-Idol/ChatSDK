# @chatsdk/nextjs

Next.js Server Actions adapter for ChatSDK. This package provides server-side integration with ChatSDK for Next.js 14+ applications using Server Actions.

## Installation

```bash
npm install @chatsdk/nextjs
# or
yarn add @chatsdk/nextjs
# or
pnpm add @chatsdk/nextjs
```

## Features

- ✅ Server Actions for all ChatSDK operations
- ✅ TypeScript-first with full type safety
- ✅ Zod validation for all inputs
- ✅ Support for Next.js 14+ App Router
- ✅ Automatic token management
- ✅ Built-in error handling

## Quick Start

### 1. Initialize ChatSDK

Create a utility file to manage your ChatSDK configuration:

```typescript
// lib/chatsdk.ts
import { initChatSDK } from '@chatsdk/nextjs';

export const chatSDK = initChatSDK({
  apiUrl: process.env.CHATSDK_API_URL!,
  token: process.env.CHATSDK_TOKEN, // Optional: global token
});
```

### 2. Use Server Actions in Server Components

```typescript
// app/chat/[channelId]/page.tsx
import { getMessages, getChannel } from '@chatsdk/nextjs/actions';
import { cookies } from 'next/headers';

export default async function ChatPage({ params }: { params: { channelId: string } }) {
  const token = cookies().get('chatsdk_token')?.value!;
  const apiUrl = process.env.CHATSDK_API_URL!;

  const [channel, messagesData] = await Promise.all([
    getChannel(token, apiUrl, params.channelId),
    getMessages(token, apiUrl, params.channelId, { limit: 50 }),
  ]);

  return (
    <div>
      <h1>{channel.name}</h1>
      <MessageList messages={messagesData.messages} />
    </div>
  );
}
```

### 3. Use Server Actions in Client Components

```typescript
// app/chat/[channelId]/message-input.tsx
'use client';

import { sendMessage } from '@chatsdk/nextjs/actions';
import { useState } from 'react';

export function MessageInput({ channelId, token, apiUrl }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;

    setSending(true);
    try {
      await sendMessage(token, apiUrl, channelId, { text });
      setText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <form action={handleSend}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
      />
      <button type="submit" disabled={sending}>
        Send
      </button>
    </form>
  );
}
```

### 4. Using Form Actions

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

  // Revalidate the chat page to show new message
  revalidatePath(`/chat/${channelId}`);
}
```

```typescript
// app/chat/[channelId]/message-form.tsx
'use client';

import { sendMessageAction } from '@/app/actions/chat';

export function MessageForm({ channelId }: { channelId: string }) {
  return (
    <form action={sendMessageAction.bind(null, channelId)}>
      <input name="text" placeholder="Type a message..." required />
      <button type="submit">Send</button>
    </form>
  );
}
```

## API Reference

### Client Functions

#### `initChatSDK(config: ChatSDKConfig): ChatClient`

Initialize a global ChatSDK client instance.

```typescript
import { initChatSDK } from '@chatsdk/nextjs';

const client = initChatSDK({
  apiUrl: 'https://api.example.com',
  token: 'optional-global-token',
});
```

#### `getChatSDK(): ChatClient`

Get the existing global ChatSDK client instance.

```typescript
import { getChatSDK } from '@chatsdk/nextjs';

const client = getChatSDK();
```

#### `createChatSDK(config: ChatSDKConfig): ChatClient`

Create a new ChatSDK client instance with custom configuration.

```typescript
import { createChatSDK } from '@chatsdk/nextjs';

const client = createChatSDK({
  apiUrl: 'https://api.example.com',
  token: userToken,
});
```

### Server Actions

All server actions follow the same pattern: `(token, apiUrl, ...params) => Promise<Response>`

#### Channels

- `getChannels(token, apiUrl, options?)` - Get user's channels
- `getChannel(token, apiUrl, channelId)` - Get channel by ID
- `createChannel(token, apiUrl, data)` - Create a new channel
- `updateChannel(token, apiUrl, channelId, data)` - Update channel
- `deleteChannel(token, apiUrl, channelId)` - Delete channel
- `addChannelMembers(token, apiUrl, channelId, userIds)` - Add members
- `removeChannelMember(token, apiUrl, channelId, userId)` - Remove member
- `markChannelRead(token, apiUrl, channelId, lastReadSeq)` - Mark as read

#### Messages

- `getMessages(token, apiUrl, channelId, options?)` - Get channel messages
- `sendMessage(token, apiUrl, channelId, data)` - Send a message
- `updateMessage(token, apiUrl, channelId, messageId, data)` - Update message
- `deleteMessage(token, apiUrl, channelId, messageId)` - Delete message
- `addReaction(token, apiUrl, channelId, messageId, emoji)` - Add reaction
- `removeReaction(token, apiUrl, channelId, messageId, emoji)` - Remove reaction
- `pinMessage(token, apiUrl, channelId, messageId)` - Pin message
- `unpinMessage(token, apiUrl, channelId, messageId)` - Unpin message
- `getPinnedMessages(token, apiUrl, channelId)` - Get pinned messages
- `saveMessage(token, apiUrl, messageId)` - Save/bookmark message
- `unsaveMessage(token, apiUrl, messageId)` - Unsave message
- `getSavedMessages(token, apiUrl, options?)` - Get saved messages
- `reportMessage(token, apiUrl, messageId, reason, details?)` - Report message

#### Workspaces

- `getWorkspaces(token, apiUrl)` - Get user's workspaces
- `getWorkspace(token, apiUrl, workspaceId)` - Get workspace by ID
- `createWorkspace(token, apiUrl, data)` - Create workspace
- `updateWorkspace(token, apiUrl, workspaceId, data)` - Update workspace
- `deleteWorkspace(token, apiUrl, workspaceId)` - Delete workspace
- `addWorkspaceMembers(token, apiUrl, workspaceId, data)` - Add members
- `removeWorkspaceMember(token, apiUrl, workspaceId, userId)` - Remove member
- `getWorkspaceChannels(token, apiUrl, workspaceId)` - Get channels

#### Polls

- `createPoll(token, apiUrl, messageId, data)` - Create poll
- `votePoll(token, apiUrl, pollId, data)` - Vote on poll
- `getPollResults(token, apiUrl, pollId)` - Get poll results
- `removeVote(token, apiUrl, pollId)` - Remove vote

#### Users

- `getCurrentUser(token, apiUrl)` - Get current user
- `updateCurrentUser(token, apiUrl, data)` - Update current user
- `getUser(token, apiUrl, userId)` - Get user by ID
- `queryUsers(token, apiUrl, options?)` - Search users
- `blockUser(token, apiUrl, userId)` - Block a user
- `unblockUser(token, apiUrl, userId)` - Unblock a user
- `getBlockedUsers(token, apiUrl)` - Get blocked users list

## Advanced Usage

### Using with Server Components and Streaming

```typescript
// app/chat/[channelId]/page.tsx
import { Suspense } from 'react';
import { getMessages } from '@chatsdk/nextjs/actions';

async function MessageList({ channelId, token, apiUrl }: Props) {
  const { messages } = await getMessages(token, apiUrl, channelId);

  return (
    <div>
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </div>
  );
}

export default function ChatPage({ params }: { params: { channelId: string } }) {
  const token = cookies().get('chatsdk_token')?.value!;
  const apiUrl = process.env.CHATSDK_API_URL!;

  return (
    <Suspense fallback={<MessageSkeleton />}>
      <MessageList channelId={params.channelId} token={token} apiUrl={apiUrl} />
    </Suspense>
  );
}
```

### Workspace Management

```typescript
// app/workspaces/page.tsx
import { getWorkspaces } from '@chatsdk/nextjs/actions';

export default async function WorkspacesPage() {
  const token = cookies().get('chatsdk_token')?.value!;
  const apiUrl = process.env.CHATSDK_API_URL!;

  const { workspaces } = await getWorkspaces(token, apiUrl);

  return (
    <div>
      <h1>Your Workspaces</h1>
      <ul>
        {workspaces.map((workspace) => (
          <li key={workspace.id}>
            <a href={`/workspaces/${workspace.id}`}>{workspace.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Creating Polls

```typescript
// app/actions/polls.ts
'use server';

import { createPoll } from '@chatsdk/nextjs/actions';
import { cookies } from 'next/headers';

export async function createPollAction(messageId: string, formData: FormData) {
  const token = cookies().get('chatsdk_token')?.value!;
  const apiUrl = process.env.CHATSDK_API_URL!;

  const question = formData.get('question') as string;
  const options = JSON.parse(formData.get('options') as string);

  await createPoll(token, apiUrl, messageId, {
    question,
    options,
    isAnonymous: false,
    isMultiChoice: false,
  });
}
```

### Error Handling

All server actions throw errors with descriptive messages. Handle them in your components:

```typescript
'use client';

import { sendMessage } from '@chatsdk/nextjs/actions';
import { useState } from 'react';

export function MessageInput({ channelId, token, apiUrl }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (text: string) => {
    try {
      await sendMessage(token, apiUrl, channelId, { text });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {/* ... input UI ... */}
    </div>
  );
}
```

## Environment Variables

```bash
# .env.local
CHATSDK_API_URL=https://your-chatsdk-api.com
CHATSDK_TOKEN=your-optional-global-token
```

## TypeScript Support

All server actions are fully typed with TypeScript. The package includes comprehensive type definitions for all request/response schemas.

```typescript
import type { Message, Channel, Workspace, Poll } from '@chatsdk/core';
```

## License

MIT

## Contributing

Contributions are welcome! Please read our [contributing guide](../../CONTRIBUTING.md) before submitting pull requests.

## Support

- [Documentation](https://chatsdk.dev/docs)
- [GitHub Issues](https://github.com/yourusername/chatsdk/issues)
- [Discord Community](https://discord.gg/chatsdk)
