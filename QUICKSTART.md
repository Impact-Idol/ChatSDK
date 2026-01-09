# ChatSDK 2.0 - 5-Minute Quickstart

Get from zero to your first chat message in 5 minutes. No complex configuration needed.

## Prerequisites

- **Node.js 18+** installed ([download](https://nodejs.org/))
- **Docker Desktop** running ([download](https://www.docker.com/products/docker-desktop))

That's it! No other setup required.

---

## Step 1: Create Your Chat App (30 seconds)

Run one command:

```bash
npx create-chatsdk-app my-chat-app
```

When prompted:
- **Template**: Hit Enter (Next.js recommended)
- **TypeScript or JavaScript**: Hit Enter (TypeScript recommended)
- **Include examples**: Hit Enter (Yes)

Wait ~1 minute for installation.

---

## Step 2: Start Your App (10 seconds)

```bash
cd my-chat-app
npm run dev
```

Your app is now running at **http://localhost:3000**

> **Note**: Docker services and the ChatSDK API server start automatically. You'll see a configuration summary showing all services running.

---

## Step 3: Send Your First Message (30 seconds)

1. Open **http://localhost:3000?user=alice** in your browser
2. Open **http://localhost:3000?user=bob** in another tab
3. Type "Hello!" as Alice and press Enter
4. See it appear instantly in Bob's tab! 💬

**🎉 Congratulations!** You just built a real-time chat app in under 5 minutes.

---

## What Just Happened?

The CLI tool:
1. ✅ Created a Next.js app with ChatSDK integrated
2. ✅ Started 6 Docker services (PostgreSQL, Centrifugo, Redis, MinIO, Meilisearch, Flyway)
3. ✅ Started the ChatSDK API server (port 5500)
4. ✅ Configured everything automatically (zero manual config!)

You can verify services are running:

```bash
docker compose ps
```

All services should show "healthy" status.

---

## What's Next?

### Option 1: Customize the UI

Edit `components/chat/MessageList.tsx`:

```tsx
// Change message bubble colors
<div className="bg-blue-500 text-white rounded-lg p-3">
  {message.text}
</div>
```

### Option 2: Add More Features

```tsx
import { useChat } from '@chatsdk/react';

function MyComponent() {
  const chat = useChat();

  // Send a message
  await chat.sendMessage({ text: 'Hello!' });

  // React to a message
  await chat.addReaction({ messageId: '123', reaction: '👍' });

  // Upload a file
  await chat.uploadFile({ file: myFile });

  // Search messages
  const results = await chat.searchMessages({ query: 'hello' });
}
```

### Option 3: Connect Real Users

Replace demo authentication with your own:

```tsx
// app/layout.tsx
import { ChatSDK } from '@chatsdk/react';

const client = await ChatSDK.connect({
  apiKey: process.env.NEXT_PUBLIC_CHATSDK_API_KEY!,
  userId: currentUser.id,        // From your auth system
  displayName: currentUser.name,
  avatar: currentUser.avatar,
});
```

---

## Available Templates

Try different templates:

```bash
# Vite + React (fast development)
npx create-chatsdk-app my-app --template vite-react

# React Native + Expo (mobile)
npx create-chatsdk-app my-app --template react-native-expo

# Express + React (backend/frontend split)
npx create-chatsdk-app my-app --template express-react

# Minimal (SDK only)
npx create-chatsdk-app my-app --template minimal
```

---

## Troubleshooting

### Docker Not Running

**Error**: `Cannot connect to Docker daemon`

**Fix**: Start Docker Desktop, then run:

```bash
docker compose up -d
npm run dev
```

### Port Already in Use

**Error**: `Port 3000 is already allocated`

**Fix**: Stop the other process, or change the port:

```json
// package.json
{
  "scripts": {
    "dev": "next dev -p 3001"
  }
}
```

### Database Connection Failed

**Error**: `Connection refused to localhost:5432`

**Fix**: Restart Docker services:

```bash
docker compose down
docker compose up -d
```

### API Server Not Starting

**Check API logs**:

```bash
docker logs chatsdk-api
```

**Restart API**:

```bash
docker compose restart api
```

---

## Smart Defaults Explained

In development mode, ChatSDK auto-configures everything:

| Service | Default URL | Purpose |
|---------|-------------|---------|
| **App** | http://localhost:3000 | Your chat application |
| **API** | http://localhost:5500 | ChatSDK REST API |
| **WebSocket** | ws://localhost:8001 | Real-time messaging |
| **Database** | postgresql://localhost:5432 | PostgreSQL |
| **Redis** | redis://localhost:6379 | Pub/sub & caching |
| **MinIO** | http://localhost:9000 | S3-compatible storage |
| **Meilisearch** | http://localhost:7700 | Full-text search |

All connection details are in `.env.local` - no manual configuration needed!

---

## Production Deployment

Ready to deploy? See our production guide:

**[Production Deployment →](./docs/PRODUCTION.md)**

Key changes for production:
1. Set 3 environment variables (DATABASE_URL, JWT_SECRET, CENTRIFUGO_TOKEN_SECRET)
2. Use managed services (AWS RDS, Redis Cloud, S3)
3. Enable SSL/TLS
4. Set up monitoring

That's it! ChatSDK auto-configures everything else.

---

## What Makes ChatSDK 2.0 Different?

### Before (ChatSDK 1.x)

```typescript
// 4 steps, manual token fetching, complex setup
const client = createChatClient({ apiKey: 'xxx' });
const { token, wsToken } = await fetchTokenFromBackend();
await client.connectUser(user, { token, wsToken });
// Now you can use it
```

**Setup time**: ~2 hours
**Required config**: 20+ env vars
**Difficulty**: Intermediate

### After (ChatSDK 2.0)

```typescript
// 1 step, everything automatic
const client = await ChatSDK.connect({
  apiKey: 'xxx',
  userId: 'alice',
});
// That's it!
```

**Setup time**: ~5 minutes ✅
**Required config**: 0 env vars (dev), 3 env vars (prod) ✅
**Difficulty**: Beginner ✅

---

## Example Use Cases

### Team Messaging (Slack Clone)
```bash
npx create-chatsdk-app slack-clone
# Workspaces, channels, threads, reactions
```

### Customer Support Chat
```bash
npx create-chatsdk-app support-chat
# Embeddable widget, agent dashboard
```

### Marketplace Messaging
```bash
npx create-chatsdk-app marketplace-chat
# Buyer-seller conversations, in-chat payments
```

### Telehealth (HIPAA Compliant)
```bash
npx create-chatsdk-app telehealth
# Doctor-patient chat, E2E encryption
```

---

## Get Help

- 📖 **[Full Documentation](https://docs.chatsdk.dev)**
- 💬 **[Discord Community](https://discord.gg/chatsdk)**
- 🐛 **[GitHub Issues](https://github.com/chatsdk/chatsdk/issues)**
- 📧 **[Email Support](mailto:support@chatsdk.dev)**

---

## Next Steps

1. **[API Reference](./docs/API.md)** - Complete SDK documentation
2. **[UI Components](./docs/COMPONENTS.md)** - Pre-built chat UI
3. **[Advanced Features](./docs/ADVANCED.md)** - Threads, reactions, files
4. **[Production Guide](./docs/PRODUCTION.md)** - Deploy to production

---

**Built with ❤️ by the ChatSDK Team**

**Ready to build something amazing? Let's chat! 🚀**
