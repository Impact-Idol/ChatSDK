# ChatSDK 2.0 - 5-Minute Quickstart

Get from zero to first message in 5 minutes. No complex configuration needed.

## Prerequisites

- **Node.js 18+** installed
- **Docker Desktop** running (for backend services)

## Step 1: Clone & Setup (1 minute)

```bash
# Clone repository
git clone https://github.com/yourusername/ChatSDK.git
cd ChatSDK

# Install dependencies
npm install
```

## Step 2: Start Services (1 minute)

```bash
# Start all backend services (PostgreSQL, Centrifugo, Redis, MinIO, Meilisearch)
docker compose up -d

# Wait for services to be healthy (~30 seconds)
docker compose ps
```

You should see all services as "healthy":
```
NAME                  STATUS
chatsdk-postgres      Up (healthy)
chatsdk-centrifugo    Up (healthy)
chatsdk-redis         Up (healthy)
chatsdk-minio         Up (healthy)
chatsdk-meilisearch   Up (healthy)
```

## Step 3: Start API Server (30 seconds)

```bash
# Start the API server
cd packages/api
npm run dev
```

You should see:
```
📋 ChatSDK Configuration Summary (Development Mode)

Database:      postgresql://chatsdk:chatsdk_dev@localhost:5432/chatsdk
Centrifugo:    http://localhost:8001
Redis:         redis://localhost:6379
S3 Storage:    http://localhost:9000
Meilisearch:   http://localhost:7700
Server:        http://0.0.0.0:5500

💡 Using smart defaults for local development

✅ Database connected
Latest migration: V003 - Add channel starring feature
✅ Centrifugo connected
✅ Novu initialized
✅ Storage initialized
✅ Search initialized

🚀 ChatSDK API Server running
   URL: http://localhost:5500
   Health: http://localhost:5500/health
   Environment: development
```

## Step 4: Test Connection (1 minute)

### Test the simplified authentication endpoint:

```bash
curl -X POST http://localhost:5500/api/auth/connect \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key" \
  -d '{
    "userId": "alice",
    "displayName": "Alice Johnson",
    "avatar": "https://i.pravatar.cc/150?u=alice"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "alice",
    "displayName": "Alice Johnson",
    "avatar": "https://i.pravatar.cc/150?u=alice",
    "metadata": {}
  },
  "token": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "expiresIn": 900,
  "_internal": {
    "wsToken": "eyJhbGci..."
  }
}
```

## Step 5: Use the SDK (2 minutes)

Create a test file `test-chat.ts`:

```typescript
import { ChatSDK } from '@chatsdk/core';

async function main() {
  // Connect to ChatSDK (1 line!)
  const client = await ChatSDK.connectDevelopment({
    userId: 'alice',
    displayName: 'Alice Johnson',
    debug: true,
  });

  console.log('✅ Connected to ChatSDK!');

  // Get channels
  const channels = await client.getChannels();
  console.log(`Found ${channels.length} channels`);

  // Create a channel
  const channel = await client.createChannel({
    type: 'messaging',
    id: 'general',
    name: 'General',
  });
  console.log('Created channel:', channel.name);

  // Send a message
  const message = await client.sendMessage({
    channelId: channel.id,
    text: 'Hello from ChatSDK 2.0! 🚀',
  });
  console.log('Sent message:', message.text);

  // Listen for new messages
  client.on('message.new', (msg) => {
    console.log('New message:', msg.text);
  });

  console.log('\n🎉 Success! You\'re now chatting with ChatSDK.');
}

main().catch(console.error);
```

Run it:
```bash
npx tsx test-chat.ts
```

Output:
```
✅ Connected to ChatSDK!
Found 0 channels
Created channel: General
Sent message: Hello from ChatSDK 2.0! 🚀

🎉 Success! You're now chatting with ChatSDK.
```

---

## 🎊 Congratulations!

You just:
- ✅ Started 5 backend services with one command
- ✅ Connected to ChatSDK with zero configuration
- ✅ Sent your first message in under 5 minutes

## What's Different in ChatSDK 2.0?

### Before (1.x)
```typescript
// 4 steps, manual token fetching
const client = createChatClient({ apiKey: 'xxx' });
const { token, wsToken } = await fetchTokenFromBackend();
await client.connectUser(user, { token, wsToken });
// Now you can use it
```

### After (2.0)
```typescript
// 1 step, everything automatic
const client = await ChatSDK.connect({
  apiKey: 'xxx',
  userId: 'alice',
});
// That's it!
```

## What's Next?

### Explore the Example App
```bash
cd examples/react-chat
npm run dev
# Open http://localhost:3000
```

### Read the Documentation
- [API Reference](./docs/api-reference.md)
- [SDK Strategy](./docs/sdk-strategy/README.md)
- [Week 1 Implementation](./docs/sdk-strategy/implementation/week-01-DEMO.md)

### Start Building
- **Team messaging**: Build a Slack clone
- **Customer support**: Add live chat to your website
- **Marketplace**: Enable buyer-seller messaging
- **Healthcare**: HIPAA-compliant patient-doctor chat

## Smart Defaults in Action

In development mode, you don't need ANY environment variables:

```bash
# No .env file needed!
npm run dev
```

ChatSDK auto-configures:
- ✅ PostgreSQL connection
- ✅ Centrifugo WebSocket
- ✅ Redis pub/sub
- ✅ MinIO S3 storage
- ✅ Meilisearch
- ✅ JWT secrets (dev-only)

### Production (Only 3 Variables Required)

Create `.env.production`:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-here
CENTRIFUGO_TOKEN_SECRET=your-centrifugo-secret
```

That's it! Everything else auto-configures.

## Troubleshooting

### Docker services won't start

```bash
# Check Docker is running
docker info

# Reset Docker
docker compose down -v
docker compose up -d
```

### Port already in use

```bash
# Find what's using port 5500
lsof -i :5500

# Kill it or change port
PORT=5501 npm run dev
```

### Database connection failed

```bash
# Check PostgreSQL is healthy
docker compose ps postgres

# View logs
docker compose logs postgres
```

## Need Help?

- 📖 [Documentation](./docs)
- 💬 [Discord Community](https://discord.gg/chatsdk)
- 🐛 [GitHub Issues](https://github.com/chatsdk/chatsdk/issues)
- 📧 [Email Support](mailto:support@chatsdk.dev)

---

**Built with ❤️ by the ChatSDK Team**

**Ready to ship ChatSDK 2.0? Let's go! 🚀**
