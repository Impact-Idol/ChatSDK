# ChatSDK Integration Guide for Impact Idol

This directory contains example code and documentation for integrating ChatSDK with Impact Idol's Next.js application.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Integration Steps](#integration-steps)
6. [Usage Examples](#usage-examples)
7. [Theming](#theming)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

ChatSDK provides real-time messaging, offline support, and advanced chat features for Impact Idol. This integration uses a **dual-write pattern**:

- **Prisma DB** = Source of truth for Impact Idol's data
- **ChatSDK** = Real-time sync, offline support, advanced messaging features

### Key Features

✅ Real-time messaging with WebSocket support
✅ Offline message queue and sync
✅ Polls, reactions, threads, mentions
✅ File uploads with image processing
✅ Workspace management
✅ Read receipts and typing indicators
✅ Full-text search
✅ Mobile-first responsive design

## Architecture

```
┌─────────────────────────────────────────┐
│         Impact Idol (Next.js)           │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Prisma DB  │◄───┤ Server Actions│  │
│  │ (Source of   │    │               │  │
│  │  Truth)      │    └───────┬───────┘  │
│  └──────────────┘            │          │
│         ▲                    │          │
│         │                    ▼          │
│         │            ┌──────────────┐   │
│         └────────────┤ Sync Service │   │
│                      └──────┬───────┘   │
│                             │           │
└─────────────────────────────┼───────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    ChatSDK      │
                    │  (Real-time,    │
                    │   Offline)      │
                    └─────────────────┘
```

### Data Flow

1. **User sends message** → Server Action receives request
2. **Write to Prisma** → Message saved to Impact Idol's database (source of truth)
3. **Async sync to ChatSDK** → Message synced to ChatSDK for real-time delivery
4. **Real-time broadcast** → ChatSDK broadcasts message to all connected clients
5. **Offline queue** → If user offline, message queued for later sync

## Installation

### 1. Install ChatSDK packages

```bash
npm install @chatsdk/core @chatsdk/react
```

### 2. Copy integration files to your Impact Idol project

```bash
# Sync service
cp services/chatsdk-sync.ts <YOUR_IMPACT_IDOL_PROJECT>/app/services/

# Server actions
cp actions/chat.ts <YOUR_IMPACT_IDOL_PROJECT>/app/actions/

# Prisma client setup (if needed)
cp lib/prisma.ts <YOUR_IMPACT_IDOL_PROJECT>/app/lib/
```

## Configuration

### 1. Environment Variables

Add to your `.env.local`:

```bash
# ChatSDK Configuration
CHATSDK_API_URL=http://localhost:5500
CHATSDK_API_KEY=your-api-key-here

# For production
NEXT_PUBLIC_CHATSDK_API_URL=https://chat.impactidol.com
```

### 2. Generate ChatSDK API Key

```bash
# Run ChatSDK API server
cd <CHATSDK_REPO>/packages/api
npm run dev

# Generate API key
curl -X POST http://localhost:5500/api/auth/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Impact Idol Integration",
    "app_id": "impact-idol",
    "scopes": ["channels:read", "channels:write", "messages:read", "messages:write"]
  }'
```

## Integration Steps

### Step 1: Update Prisma Schema

Add ChatSDK-related fields to your existing Prisma schema:

```prisma
model Message {
  id          String   @id @default(cuid())
  channelId   String
  userId      String
  content     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  // ChatSDK sync fields
  chatsdkSyncedAt  DateTime?
  chatsdkSyncError String?

  channel Channel @relation(fields: [channelId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@index([channelId])
  @@index([userId])
}

model Channel {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  isPrivate   Boolean  @default(false)
  createdAt   DateTime @default(now())

  // ChatSDK sync fields
  chatsdkSyncedAt  DateTime?

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  messages  Message[]

  @@index([workspaceId])
}
```

### Step 2: Update Server Actions

Replace your existing message sending logic with the dual-write pattern:

```typescript
'use server';

import { syncMessageToChatSDK } from '@/services/chatsdk-sync';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function sendMessage(channelId: string, content: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // 1. Write to Prisma (source of truth)
  const message = await prisma.message.create({
    data: {
      channelId,
      userId: session.user.id,
      content,
    },
    include: {
      user: true,
    },
  });

  // 2. Async sync to ChatSDK (non-blocking)
  syncMessageToChatSDK(message.id).catch((error) => {
    console.error('ChatSDK sync failed:', error);
    // Log error but don't block the UI
  });

  return message;
}
```

### Step 3: Add ChatSDK Provider to Your App

Update your root layout to include ChatSDK:

```typescript
// app/layout.tsx
import { ChatProvider } from '@chatsdk/react';
import { impactIdolTheme } from '@chatsdk/react';
import { ChatClient } from '@chatsdk/core';

const chatClient = new ChatClient({
  apiUrl: process.env.NEXT_PUBLIC_CHATSDK_API_URL!,
  apiKey: process.env.NEXT_PUBLIC_CHATSDK_API_KEY!,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ChatProvider client={chatClient} theme={impactIdolTheme}>
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
```

### Step 4: Use ChatSDK Components

Replace your existing chat UI with ChatSDK components:

```typescript
// app/channels/[channelId]/page.tsx
'use client';

import {
  MessageList,
  MessageInput,
  TypingIndicator,
  Thread,
} from '@chatsdk/react';
import { useMessages, useChannel } from '@chatsdk/react';

export default function ChannelPage({ params }: { params: { channelId: string } }) {
  const { channel } = useChannel(params.channelId);
  const { messages, sendMessage, loading } = useMessages(params.channelId);

  return (
    <div className="flex flex-col h-screen">
      {/* Channel Header */}
      <header className="border-b p-4">
        <h1 className="text-xl font-bold">{channel?.name}</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          loading={loading}
          currentUserId={session.user.id}
        />
        <TypingIndicator channelId={params.channelId} />
      </div>

      {/* Message Input */}
      <MessageInput
        channelId={params.channelId}
        onSend={sendMessage}
        placeholder="Type a message..."
      />
    </div>
  );
}
```

## Usage Examples

### Example 1: Send a Message with Poll

```typescript
import { sendMessage } from '@/actions/chat';
import { CreatePollDialog } from '@chatsdk/react';

function MessageWithPoll() {
  const [isPollOpen, setIsPollOpen] = useState(false);

  const handleSendWithPoll = async (text: string) => {
    // Send message first
    const message = await sendMessage(channelId, text);

    // Then attach poll
    setIsPollOpen(true);
  };

  return (
    <>
      <MessageInput onSend={handleSendWithPoll} />
      <CreatePollDialog
        messageId={messageId}
        isOpen={isPollOpen}
        onClose={() => setIsPollOpen(false)}
      />
    </>
  );
}
```

### Example 2: Workspace Switcher

```typescript
import { WorkspaceSwitcher } from '@chatsdk/react';
import { useWorkspaces } from '@chatsdk/react';

function AppSidebar() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspaces();

  return (
    <aside className="w-64 bg-gray-50 p-4">
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSwitch={setActiveWorkspace}
      />

      {/* Channel list for active workspace */}
      <ChannelList workspaceId={activeWorkspace?.id} />
    </aside>
  );
}
```

### Example 3: File Upload with Image Processing

```typescript
import { useFileUpload } from '@chatsdk/react';

function MessageInputWithFiles() {
  const { upload, uploading, progress } = useFileUpload({
    channelId,
    onComplete: (file) => {
      console.log('File uploaded:', file);
      // file.thumbnailUrl - auto-generated thumbnail
      // file.blurhash - blurhash for progressive loading
    },
  });

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            upload(e.target.files[0]);
          }
        }}
        accept="image/*,video/*,application/pdf"
      />
      {uploading && <ProgressBar progress={progress} />}
    </div>
  );
}
```

## Theming

ChatSDK includes a custom **Impact Idol theme** that matches your brand:

```typescript
import { impactIdolTheme, themeToCSSVariables } from '@chatsdk/react';

// Option 1: Use theme with ChatProvider
<ChatProvider client={client} theme={impactIdolTheme}>
  <App />
</ChatProvider>

// Option 2: Generate CSS variables
const cssVars = themeToCSSVariables(impactIdolTheme);
// Inject into <style> tag

// Option 3: Customize theme
import { createTheme } from '@chatsdk/react';

const customTheme = createTheme({
  colors: {
    primary: '#YOUR_BRAND_COLOR',
    secondary: '#YOUR_SECONDARY_COLOR',
  },
  fonts: {
    body: 'Your Font Family',
  },
});
```

### Impact Idol Theme Colors

```css
Primary:   #8b5cf6 (Purple - Creativity & Inspiration)
Secondary: #f97316 (Orange - Energy & Achievement)
Success:   #10b981 (Green - Growth & Positive Impact)
```

## Best Practices

### 1. Error Handling

Always handle sync errors gracefully:

```typescript
syncMessageToChatSDK(message.id).catch((error) => {
  // Log to error tracking (Sentry, etc.)
  console.error('[ChatSDK Sync] Failed:', error);

  // Update Prisma with sync error
  await prisma.message.update({
    where: { id: message.id },
    data: {
      chatsdkSyncError: error.message,
    },
  });
});
```

### 2. Retry Failed Syncs

Create a background job to retry failed syncs:

```typescript
// app/cron/retry-chatsdk-sync.ts
export async function retryChatSDKSync() {
  const failedMessages = await prisma.message.findMany({
    where: {
      chatsdkSyncError: { not: null },
      chatsdkSyncedAt: null,
    },
    take: 100,
  });

  for (const message of failedMessages) {
    await syncMessageToChatSDK(message.id);
  }
}
```

### 3. Batch Sync for Data Migration

If migrating existing data:

```typescript
import { batchSyncMessages } from '@/services/chatsdk-sync';

// Get all message IDs
const messageIds = await prisma.message.findMany({
  select: { id: true },
});

// Batch sync (handles errors gracefully)
await batchSyncMessages(messageIds.map(m => m.id));
```

## Troubleshooting

### Issue: Messages not syncing to ChatSDK

**Solution:**
1. Check environment variables are set correctly
2. Verify ChatSDK API is running
3. Check API key has correct permissions
4. Look for errors in console logs

### Issue: Real-time updates not working

**Solution:**
1. Ensure WebSocket connection is established
2. Check firewall/proxy settings
3. Verify CORS settings allow your domain

### Issue: Sync errors in production

**Solution:**
1. Set up error tracking (Sentry)
2. Create retry mechanism for failed syncs
3. Monitor sync success rate in dashboard

## Next Steps

1. ✅ Complete integration setup
2. ✅ Customize theme to match Impact Idol brand
3. ✅ Test in development environment
4. ✅ Set up error tracking and monitoring
5. ✅ Deploy to production
6. ✅ Monitor sync performance and errors

## Support

For questions or issues:
- ChatSDK Documentation: [Link to docs]
- Impact Idol Integration Issues: [GitHub Issues]
- Real-time Support: [Discord/Slack]
