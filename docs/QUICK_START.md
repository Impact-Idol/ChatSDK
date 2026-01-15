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
API_KEY: your-api-key-here
```

First, set it in the database:
```sql
-- Connect to PostgreSQL
docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk

-- Set the standard dev API key
UPDATE app
SET api_key = 'your-api-key-here'
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
  -H "X-API-Key: your-api-key-here" \
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
  -H "X-API-Key: your-api-key-here" \
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
  -H "X-API-Key: your-api-key-here" \
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

### Frontend (React/Vite)

Create a `.env` file for your frontend application:

```env
# Required
VITE_API_URL=http://localhost:5501
VITE_API_KEY=your-api-key-here
VITE_WS_URL=ws://localhost:8001/connection/websocket

# Optional
VITE_DEBUG=true
```

### Backend (API Server)

Configure these in your backend `.env` or Docker environment:

```env
# Required
DATABASE_URL=postgresql://chatsdk:chatsdk@localhost:5434/chatsdk
CENTRIFUGO_API_URL=http://localhost:8000/api
CENTRIFUGO_TOKEN_SECRET=your-secret-key

# CORS Configuration (see section below)
ALLOWED_ORIGINS=https://your-app.com,https://admin.your-app.com
```

## 7. CORS Configuration

The API server has built-in CORS handling. By default, it allows common localhost ports for development.

### Default Behavior (Development)

Without any configuration, these origins are allowed:
- `http://localhost:3000` - `http://localhost:3002`
- `http://localhost:4500`
- `http://localhost:5173`, `http://localhost:5175`
- `http://localhost:5500`, `http://localhost:5502`
- `http://localhost:6001`, `http://localhost:6007`

### Production Configuration

**You MUST set `ALLOWED_ORIGINS` for production deployments.**

| Configuration | Value | Use Case |
|--------------|-------|----------|
| Specific origins | `https://app.example.com,https://admin.example.com` | Production (recommended) |
| Allow all | `*` | Development only (insecure) |
| Not set | *(uses localhost defaults)* | Local development |

**Examples:**

```bash
# Single origin
ALLOWED_ORIGINS=https://chat.mycompany.com

# Multiple origins (comma-separated)
ALLOWED_ORIGINS=https://app.mycompany.com,https://admin.mycompany.com,https://mobile.mycompany.com

# Development: allow all (NOT for production!)
ALLOWED_ORIGINS=*
```

**Docker Compose example:**

```yaml
services:
  api:
    environment:
      - ALLOWED_ORIGINS=https://your-production-domain.com
```

### CORS Headers Set

When a request matches an allowed origin, these headers are returned:
- `Access-Control-Allow-Origin`: The requesting origin
- `Access-Control-Allow-Credentials`: `true`
- `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, PATCH, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization, X-API-Key`
- `Access-Control-Max-Age`: `86400` (24 hours)

## 8. Run Tests

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

### CORS Errors
If you see `Access-Control-Allow-Origin` errors in the browser console:

1. **Check your frontend origin** - Make sure the URL your app runs on is in `ALLOWED_ORIGINS`
2. **Include the protocol** - Use `https://example.com` not just `example.com`
3. **No trailing slashes** - Use `https://example.com` not `https://example.com/`
4. **Restart the API server** after changing `ALLOWED_ORIGINS`

Quick fix for development:
```bash
ALLOWED_ORIGINS=* npm run dev
```
