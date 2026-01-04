# ChatSDK Instant Setup

**One command. Zero configuration. Ready to chat in 60 seconds.**

## Quick Start

```bash
# Basic setup
./instant-setup.sh

# With demo data (users, workspaces, channels, messages)
./instant-setup.sh --with-demo

# Custom app name
./instant-setup.sh "My Chat App"

# Reset and start over
./instant-setup.sh --reset
```

## What Gets Created

### Services (Docker)
| Service | Port | Description |
|---------|------|-------------|
| API Server | 5500 | ChatSDK REST API |
| Demo UI | 5501 | React chat interface |
| WebSocket | 8001 | Real-time messaging (Centrifugo) |
| PostgreSQL | 5434 | Database |
| MinIO | 9004/9006 | S3-compatible file storage |

### Files
```
credentials/
├── secrets.json      # All secrets (single source of truth)
├── bootstrap.sql     # Database initialization
├── QUICKSTART.md     # Integration guide
└── demo-users.json   # Demo user tokens (if --with-demo)

.env.production       # Environment configuration
```

## After Setup

### Test the API
```bash
# Quick health check
curl http://localhost:5500/health

# Create a user token
curl -X POST http://localhost:5500/tokens \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "name": "John Doe"}'
```

### Open the Demo UI
Navigate to **http://localhost:5501** in your browser.

### Add Demo Data
If you didn't use `--with-demo`, you can add demo data anytime:
```bash
node scripts/seed-demo-data.mjs
```

This creates:
- 5 demo users (Alice, Bob, Carol, David, Emma)
- 3 workspaces (Engineering, Marketing, Company Hub)
- 11 channels with realistic names
- Sample messages in each channel

### Test API Routes
```bash
node scripts/test-api-routes.mjs
```

This tests all endpoints:
- Health check
- Token creation
- Workspaces CRUD
- Channels CRUD
- Messages CRUD
- Reactions
- File uploads
- Search

### Create Your Own App
```bash
./create-chat-app.sh my-chat-app
cd my-chat-app
npm install
npm run dev
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `./instant-setup.sh` | Start ChatSDK |
| `./instant-setup.sh --with-demo` | Start with demo data |
| `./instant-setup.sh --reset` | Reset everything |
| `./create-chat-app.sh <name>` | Create new chat app |
| `node scripts/seed-demo-data.mjs` | Add demo users/channels |
| `node scripts/test-api-routes.mjs` | Test all API endpoints |

## Docker Commands

```bash
# View logs
docker compose -f docker/docker-compose.instant.yml logs -f api

# Stop services
docker compose -f docker/docker-compose.instant.yml down

# Stop and remove data
docker compose -f docker/docker-compose.instant.yml down -v

# Restart a service
docker compose -f docker/docker-compose.instant.yml restart api
```

## Troubleshooting

### Port already in use
```bash
# Check what's using the port
lsof -i :5500

# Kill the process or change ports in docker-compose.instant.yml
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker exec chatsdk-postgres pg_isready -U chatsdk

# View database logs
docker logs chatsdk-postgres
```

### API not starting
```bash
# Check API logs
docker logs chatsdk-api

# Verify environment
cat .env.production
```

### Reset everything
```bash
./instant-setup.sh --reset
./instant-setup.sh
```

## Integration Examples

### React
```tsx
import { ChatProvider, useMessages } from '@chatsdk/react';

function App() {
  return (
    <ChatProvider
      apiUrl="http://localhost:5500"
      token={userToken}
    >
      <ChatRoom channelId="general" />
    </ChatProvider>
  );
}

function ChatRoom({ channelId }) {
  const { messages, sendMessage } = useMessages(channelId);
  // ...
}
```

### REST API
```bash
# Get your API key from credentials/secrets.json

# Create token
curl -X POST http://localhost:5500/tokens \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "u1", "name": "Alice"}'

# Use the returned token for authenticated requests
TOKEN="eyJ..."

# List channels
curl http://localhost:5500/api/channels \
  -H "Authorization: Bearer $TOKEN"

# Send message
curl -X POST http://localhost:5500/api/channels/ch-123/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world!"}'
```

## Next Steps

1. **Explore the Demo UI** at http://localhost:5501
2. **Read the API Guide** at docs/API_GUIDE.md
3. **Create your own app** with `./create-chat-app.sh`
4. **Deploy to production** - see docs/DEPLOYMENT.md
