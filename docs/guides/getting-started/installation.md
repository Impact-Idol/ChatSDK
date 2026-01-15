# Installation & Setup

Complete guide to installing ChatSDK 2.0 and setting up your development environment for building mobile-first chat applications.

## System Requirements

### Required
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- **npm or yarn** - Package manager (comes with Node.js)

### Recommended
- **Git** - Version control ([Download](https://git-scm.com/))
- **VS Code** - Code editor with TypeScript support ([Download](https://code.visualstudio.com/))
- **Postman** or **Insomnia** - For API testing ([Postman](https://www.postman.com/) | [Insomnia](https://insomnia.rest/))

### Hardware
- **Minimum**: 4GB RAM, 2 CPU cores, 10GB free disk space
- **Recommended**: 8GB RAM, 4 CPU cores, 20GB free disk space (for smooth local development)

---

## Installation Methods

Choose the installation method that best fits your needs:

### Method 1: Install SDK Package (Recommended for existing projects)

Add ChatSDK to your existing React or React Native project:

```bash
npm install @chatsdk/core
# or
yarn add @chatsdk/core
```

For React-specific hooks and components:
```bash
npm install @chatsdk/react
```

For React Native mobile apps:
```bash
npm install @chatsdk/react-native
```

**Skip to:** [Backend Setup](#backend-setup)

### Method 2: Clone Full Repository (For contributors or customization)

```bash
git clone https://github.com/yourusername/ChatSDK.git
cd ChatSDK
npm install
```

**Continue with:** [Backend Setup](#backend-setup)

---

## Backend Setup

ChatSDK requires several backend services. We provide Docker Compose for easy local development.

### 1. Start All Services

From the project root:

```bash
docker compose up -d
```

This starts 6 essential services:

| Service | Port | Purpose | Admin Access |
|---------|------|---------|--------------|
| **PostgreSQL** | 5432 | Primary database | - |
| **Centrifugo** | 8001 | Real-time WebSocket | http://localhost:8001 |
| **Redis** | 6379 | Pub/sub & caching | - |
| **MinIO** | 9000 (API)<br/>9001 (Console) | S3-compatible file storage | http://localhost:9001<br/>User: `chatsdk`<br/>Pass: `YOUR_MINIO_PASSWORD` |
| **Meilisearch** | 7700 | Full-text search | http://localhost:7700 |
| **Flyway** | - | Database migrations (auto-runs once) | - |

### 2. Verify Services are Running

```bash
docker compose ps
```

All services should show `Up` and `healthy` status.

### 3. Check Service Logs (if needed)

```bash
# All services
docker compose logs

# Specific service
docker compose logs postgres
docker compose logs centrifugo
```

### 4. Database Initialization

The database is automatically initialized by Flyway on first startup with:
- Users table
- Messages table
- Channels/groups tables
- Workspace management
- Indexes and constraints

**Check migrations ran successfully:**
```bash
docker compose logs flyway
```

You should see: `Successfully applied X migrations`

---

## Environment Configuration

ChatSDK uses smart defaults for development - **zero configuration needed!**

### Development Mode (Default)

No `.env` file needed! ChatSDK automatically uses:
- Database: `postgresql://chatsdk:YOUR_PASSWORD@localhost:5432/chatsdk`
- WebSocket: `ws://localhost:8001`
- Redis: `redis://localhost:6379`
- MinIO: `http://localhost:9000`
- JWT Secret: Auto-generated development secret

### Custom Development Setup (Optional)

Create `.env.local` if you want to override defaults:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Only set values you want to customize
NODE_ENV=development
PORT=5500

# Override database (optional)
DATABASE_URL=postgresql://chatsdk:YOUR_PASSWORD@localhost:5432/chatsdk

# Override WebSocket URL (optional)
CENTRIFUGO_URL=http://localhost:8001

# Custom JWT secret (optional)
JWT_SECRET=my-custom-dev-secret
```

### Production Setup

For production deployment, create `.env.production`:

```bash
# Required: Set these 3 variables for production
DATABASE_URL=postgresql://user:pass@prod-host:5432/chatsdk
JWT_SECRET=your-cryptographically-secure-random-secret-min-32-chars
CENTRIFUGO_TOKEN_SECRET=another-cryptographically-secure-random-secret

# Optional: Use managed services
REDIS_URL=redis://your-redis-cloud-url
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=your-production-bucket
S3_ACCESS_KEY_ID=your-aws-key
S3_SECRET_ACCESS_KEY=your-aws-secret
MEILISEARCH_HOST=https://your-meilisearch-url
MEILISEARCH_API_KEY=your-api-key

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

**See:** [Production Deployment Guide](../advanced/deployment.md) for full production setup

---

## Verify Installation

### 1. Start the API Server

From `packages/server` (if you cloned the repo):
```bash
cd packages/server
npm run dev
```

Or if you're building your own app:
```bash
# Your app's dev server
npm run dev
```

### 2. Test Health Endpoints

```bash
# API health check
curl http://localhost:5500/health
# Should return: {"status":"ok","timestamp":"2024-01-09T..."}

# Database health check
curl http://localhost:5500/health/db
# Should return: {"status":"ok","database":"connected"}

# Services health check
curl http://localhost:5500/health/services
# Should return status of all services
```

### 3. Test WebSocket Connection

Create a test file `test-connection.ts`:

```typescript
import { ChatSDK } from '@chatsdk/core';

const testConnection = async () => {
  const sdk = new ChatSDK({
    apiUrl: 'http://localhost:5500',
    wsUrl: 'ws://localhost:8001/connection/websocket',
  });

  // Test connection
  await sdk.connect({
    userID: 'test-user-123',
    token: 'test-token',
  });

  console.log('✅ Connected successfully!');
  console.log('Connection state:', sdk.isConnected());

  sdk.disconnect();
};

testConnection();
```

Run it:
```bash
ts-node test-connection.ts
# or with tsx
npx tsx test-connection.ts
```

### 4. Test Message Sending

```typescript
import { ChatSDK } from '@chatsdk/core';

const testMessage = async () => {
  const sdk = new ChatSDK({
    apiUrl: 'http://localhost:5500',
    wsUrl: 'ws://localhost:8001/connection/websocket',
  });

  await sdk.connect({
    userID: 'alice',
    token: 'alice-token',
  });

  // Send a test message
  const result = await sdk.sendTextMessage({
    receiverID: 'bob',
    message: 'Hello from ChatSDK 2.0!',
  });

  console.log('✅ Message sent:', result);

  sdk.disconnect();
};

testMessage();
```

---

## Development Workflow

### Day-to-Day Development

**1. Start services (once per day):**
```bash
docker compose up -d
```

**2. Start your dev server:**
```bash
npm run dev
```

**3. Make changes, auto-reload works! 🔥**

**4. Stop services when done:**
```bash
docker compose down
```

### Reset Everything

If something breaks, reset to clean state:

```bash
# Stop all services
docker compose down

# Remove volumes (deletes all data!)
docker compose down -v

# Restart fresh
docker compose up -d
```

### Update to Latest Version

```bash
# Update SDK package
npm install @chatsdk/core@latest

# Restart Docker services
docker compose down
docker compose up -d
```

---

## Troubleshooting

### Services Won't Start

**Problem:** `docker compose up -d` fails

**Solutions:**
1. Check Docker is running: `docker ps`
2. Check port conflicts: `lsof -i :5432 -i :8001 -i :6379`
3. Free up ports or change them in `docker-compose.yml`
4. Check Docker has enough resources (8GB RAM recommended)

### Database Connection Failed

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
1. Check Postgres is running: `docker compose ps postgres`
2. Check logs: `docker compose logs postgres`
3. Restart: `docker compose restart postgres`
4. Wait 30s for health check, then retry

### WebSocket Connection Failed

**Problem:** `WebSocket connection to 'ws://localhost:8001' failed`

**Solutions:**
1. Check Centrifugo is running: `docker compose ps centrifugo`
2. Check logs: `docker compose logs centrifugo`
3. Verify config: `cat docker/centrifugo.json`
4. Check firewall isn't blocking port 8001

### Token Errors

**Problem:** `Error: Token expired` or `Error: Invalid token`

**Solutions:**
1. ChatSDK 2.0 auto-refreshes tokens - ensure you're on latest version
2. Check JWT_SECRET matches between API and tokens
3. For development, use a consistent JWT_SECRET in `.env.local`
4. See: [Authentication Guide](./authentication.md)

### MinIO Connection Failed

**Problem:** `Error: Access Denied` when uploading files

**Solutions:**
1. Check MinIO is running: `docker compose ps minio`
2. Check credentials in `.env.local` match `docker-compose.yml`:
   ```
   S3_ACCESS_KEY_ID=chatsdk
   S3_SECRET_ACCESS_KEY=YOUR_MINIO_PASSWORD
   ```
3. Create bucket manually via console: http://localhost:9001

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::5500`

**Solutions:**
1. Find what's using the port: `lsof -i :5500`
2. Kill the process: `kill -9 <PID>`
3. Or change the port in `.env.local`: `PORT=5501`

---

## Next Steps

Now that ChatSDK is installed:

1. **[Authentication →](./authentication.md)** - Learn how to authenticate users and generate tokens
2. **[Quickstart →](./quickstart.md)** - Send your first message in 5 minutes
3. **[React Guide →](./react-first-steps.md)** - Build a React chat app
4. **[React Native Guide →](./react-native-first-steps.md)** - Build a mobile chat app

---

## Additional Resources

- **[Docker Compose Reference](https://docs.docker.com/compose/)** - Docker Compose documentation
- **[PostgreSQL Docs](https://www.postgresql.org/docs/)** - Database documentation
- **[Centrifugo Docs](https://centrifugal.dev/)** - Real-time messaging
- **[MinIO Docs](https://min.io/docs/)** - S3-compatible storage

---

**Need help?** Join our [Discord community](https://discord.gg/chatsdk) or [open an issue](https://github.com/chatsdk/chatsdk/issues).
