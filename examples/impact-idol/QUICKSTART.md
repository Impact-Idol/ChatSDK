# Impact Idol + ChatSDK - Quick Start Guide

## 5-Minute Integration

Get ChatSDK running in your Impact Idol project in 5 minutes.

## Prerequisites

- Impact Idol Next.js project
- Prisma ORM set up
- Node.js 18+

## Step 1: Install Packages (1 min)

```bash
npm install @chatsdk/core @chatsdk/react
```

## Step 2: Copy Integration Files (1 min)

```bash
# From ChatSDK repo
cd examples/impact-idol/

# Copy to your Impact Idol project
cp services/chatsdk-sync.ts ~/impact-idol/app/services/
cp actions/chat.ts ~/impact-idol/app/actions/
cp lib/prisma.ts ~/impact-idol/app/lib/
```

## Step 3: Set Environment Variables (1 min)

Create `.env.local`:

```bash
# ChatSDK API
CHATSDK_API_URL=http://localhost:5500
CHATSDK_API_KEY=your-api-key-here

# For client-side
NEXT_PUBLIC_CHATSDK_API_URL=http://localhost:5500
```

**Get API Key:**
```bash
# Start ChatSDK API server
cd chatsdk/packages/api
npm run dev

# Generate API key
curl -X POST http://localhost:5500/api/auth/api-keys \
  -H "Content-Type: application/json" \
  -d '{"name": "Impact Idol", "app_id": "impact-idol"}'
```

## Step 4: Update Root Layout (1 min)

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
    <html>
      <body>
        <ChatProvider client={chatClient} theme={impactIdolTheme}>
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
```

## Step 5: Use ChatSDK Components (1 min)

```typescript
// app/channels/[channelId]/page.tsx
'use client';

import {
  MessageList,
  MessageInput,
  useMessages,
} from '@chatsdk/react';

export default function ChannelPage({ params }) {
  const { messages, sendMessage } = useMessages(params.channelId);

  return (
    <div className="flex flex-col h-screen">
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

## Done! 🎉

You now have:
- ✅ Real-time messaging
- ✅ Offline support
- ✅ File uploads
- ✅ Reactions, threads, mentions
- ✅ Impact Idol theme

## Optional: Update Server Actions

Replace your existing message sending with dual-write pattern:

```typescript
// app/actions/chat.ts
'use server';

import { syncMessageToChatSDK } from '@/services/chatsdk-sync';
import { prisma } from '@/lib/prisma';

export async function sendMessage(channelId: string, content: string) {
  // 1. Write to Prisma (source of truth)
  const message = await prisma.message.create({
    data: { channelId, userId: auth.userId, content },
  });

  // 2. Async sync to ChatSDK (non-blocking)
  syncMessageToChatSDK(message.id).catch(console.error);

  return message;
}
```

## Troubleshooting

### Messages not appearing?

1. Check ChatSDK API is running: `http://localhost:5500`
2. Verify API key is set in `.env.local`
3. Check browser console for errors

### Theme not matching?

1. Verify `impactIdolTheme` is imported
2. Check `ChatProvider` has `theme={impactIdolTheme}`
3. Customize theme if needed:

```typescript
import { createTheme } from '@chatsdk/react';

const myTheme = createTheme({
  colors: {
    primary: '#YOUR_COLOR',
  },
});
```

### Sync errors?

1. Check sync service is imported correctly
2. Verify Prisma client is configured
3. Look for errors in server logs

## Next Steps

- Read full documentation: `examples/impact-idol/README.md`
- Customize theme to match your brand
- Add polls, reactions, and other features
- Set up production deployment

## Support

Questions? Check:
- Full README: `examples/impact-idol/README.md`
- Integration summary: `docs/enterprise/PHASE3_IMPACT_IDOL_INTEGRATION.md`
- ChatSDK documentation

---

**That's it!** You've integrated ChatSDK with Impact Idol in 5 minutes. 🚀
