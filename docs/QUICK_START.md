# ChatSDK Quick Start Guide

This guide will help you get ChatSDK running in under 5 minutes.

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for development)
- PostgreSQL client (optional, for debugging)

## 1. Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/piper5ul/ChatSDK.git
cd ChatSDK

# Start all services
docker compose -f docker/docker-compose.yml up -d

# Verify services are running
curl http://localhost:5501/health
```

**Services started:**
| Service | Port | Description |
|---------|------|-------------|
| API Server | 5501 | REST API & WebSocket |
| PostgreSQL | 5434 | Database |
| Redis | 6380 | Pub/Sub & Caching |
| Centrifugo | 8001 | Real-time WebSocket |

## 2. Get Your API Key

### Option A: Use the Default Development Key

For development/testing, use the pre-configured key:

```
API_KEY: 57b53ba6e530cd1cf5041a931fc89136e75af3ab735bd8fb1090c0f42f6e7570
```

First, set it in the database:
```sql
-- Connect to PostgreSQL
docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk

-- Set the standard dev API key
UPDATE app
SET api_key = '57b53ba6e530cd1cf5041a931fc89136e75af3ab735bd8fb1090c0f42f6e7570'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Option B: Query Your Auto-Generated Key

```bash
docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk \
  -c "SELECT id, name, api_key FROM app;"
```

### Option C: Create a New App via Admin API

```bash
curl -X POST http://localhost:5501/admin/apps \
  -H "X-Admin-Key: YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'
```

## 3. Generate User Tokens

The `/tokens` endpoint generates JWT tokens for user authentication:

```bash
curl -X POST http://localhost:5501/tokens \
  -H "X-API-Key: 57b53ba6e530cd1cf5041a931fc89136e75af3ab735bd8fb1090c0f42f6e7570" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-1",
    "name": "Alice Johnson",
    "image": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "wsToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "user-1",
    "name": "Alice Johnson",
    "image": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"
  },
  "expiresIn": 86400
}
```

- `token`: Use in `Authorization: Bearer <token>` header for API requests
- `wsToken`: Use for Centrifugo WebSocket connection
- `expiresIn`: Token validity in seconds (24 hours)

## 4. Make Your First API Call

### Create a Channel

```bash
curl -X POST http://localhost:5501/api/channels \
  -H "X-API-Key: 57b53ba6e530cd1cf5041a931fc89136e75af3ab735bd8fb1090c0f42f6e7570" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "General",
    "type": "group",
    "description": "General discussion channel"
  }'
```

### Send a Message

```bash
curl -X POST http://localhost:5501/api/channels/CHANNEL_ID/messages \
  -H "X-API-Key: 57b53ba6e530cd1cf5041a931fc89136e75af3ab735bd8fb1090c0f42f6e7570" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, ChatSDK!"
  }'
```

## 5. Run the Demo UI

```bash
cd examples/react-chat-huly
npm install
npm run dev
```

Open http://localhost:5175 and select a demo user to start chatting!

## 6. Environment Variables

Create a `.env` file for your application:

```env
# Required
VITE_API_URL=http://localhost:5501
VITE_API_KEY=57b53ba6e530cd1cf5041a931fc89136e75af3ab735bd8fb1090c0f42f6e7570
VITE_WS_URL=ws://localhost:8001/connection/websocket

# Optional
VITE_DEBUG=true
```

## 7. Run Tests

```bash
# E2E flow test
node tests/e2e-basic-flow-test.mjs

# Message operations (CRUD, reactions, pins, mentions)
node tests/message-operations-test.mjs

# Real-time WebSocket test
node tests/realtime-messaging-test.mjs
```

## Next Steps

- [API Reference](./API_REFERENCE.md) - Complete REST API documentation
- [React Integration](./guides/react.md) - React hooks and components
- [WebSocket Events](./WEBSOCKET_EVENTS.md) - Real-time event reference
- [Production Deployment](./production/PRODUCTION_READINESS_CHECKLIST.md) - Go to production

## Troubleshooting

### "Missing API key" Error
Ensure you're passing `X-API-Key` header with a valid key from your database.

### "Invalid token" Error
Your JWT token may be expired. Generate a new one via `/tokens`.

### Connection Refused
Check that all Docker services are running:
```bash
docker compose -f docker/docker-compose.yml ps
```

### Database Connection Issues
Verify PostgreSQL is accessible:
```bash
docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk -c "SELECT 1;"
```
