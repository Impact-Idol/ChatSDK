# Authentication Guide

Complete guide to ChatSDK authentication, token management, and security.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Authentication Flow](#authentication-flow)
- [Secret Management](#secret-management)
- [API Reference](#api-reference)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

ChatSDK uses a **two-tier authentication system**:

1. **Admin Authentication** - For managing applications (creating apps, regenerating keys)
2. **User Authentication** - For end-users to access chat features

```
┌─────────────────────────────────────────────────────────────┐
│                     Authentication Flow                      │
└─────────────────────────────────────────────────────────────┘

Admin (You)                    App (Client)                 End Users
     │                              │                            │
     │  1. Bootstrap Setup          │                            │
     │────────────────────>         │                            │
     │  ADMIN_API_KEY               │                            │
     │  JWT_SECRET                  │                            │
     │                              │                            │
     │  2. Create App               │                            │
     │────────────────────>         │                            │
     │  Returns: API_KEY            │                            │
     │                              │                            │
     │                              │  3. Request Token          │
     │                              │<───────────────────────    │
     │                              │  (userId, name, image)     │
     │                              │                            │
     │                              │  4. Generate JWT           │
     │                              │  POST /tokens          │
     │                              │  X-API-Key: <API_KEY>      │
     │                              │                            │
     │                              │  5. Return Tokens          │
     │                              │────────────────────>       │
     │                              │  {token, wsToken}          │
     │                              │                            │
     │                              │  6. Use ChatSDK            │
     │                              │<───────────────────────>   │
     │                              │  Authorization: Bearer ... │
```

## Quick Start

### 1. Bootstrap Your ChatSDK Instance

Run the bootstrap script to generate all required secrets:

```bash
# Navigate to delivery package
cd delivery-package

# Run bootstrap tool
node scripts/bootstrap.mjs --app-name="My Chat App"
```

**What this does:**
- ✅ Generates `ADMIN_API_KEY` (for admin operations)
- ✅ Generates `JWT_SECRET` (for signing user tokens)
- ✅ Generates `CENTRIFUGO_TOKEN_SECRET` (for WebSocket auth)
- ✅ Creates first application with `API_KEY` and `SECRET_KEY`
- ✅ Updates `.env.production` with all secrets
- ✅ Creates SQL file to insert app into database
- ✅ Saves credentials to `credentials/` directory

### 2. Apply Database Migration

```bash
# If using Docker
docker-compose exec postgres psql -U chatsdk -d chatsdk < credentials/bootstrap-*.sql

# If using external database
psql -h your-db-host -U chatsdk -d chatsdk < credentials/bootstrap-*.sql
```

### 3. Restart API Server

```bash
# Load new environment variables
docker-compose restart api

# Verify server is running
curl http://localhost:5500/health
```

### 4. Test Token Creation

```bash
# Use the API_KEY from credentials/*.json
export API_KEY="your-api-key-from-credentials"

# Create a user token
curl -X POST http://localhost:5500/tokens \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "name": "John Doe",
    "image": "https://example.com/avatar.jpg"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "image": "https://example.com/avatar.jpg"
  },
  "expiresIn": 86400
}
```

### 5. Use Token in Chat Requests

```bash
# Use the token from previous step
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get user's channels
curl http://localhost:5500/api/channels \
  -H "Authorization: Bearer $TOKEN"
```

## Authentication Flow

### Admin Authentication (Creating Apps)

**Use Case:** You need to create a new application for a new client/tenant.

**Endpoint:** `POST /admin/apps`

**Headers:**
```
Authorization: Bearer <ADMIN_API_KEY>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Acme Corp Chat",
  "settings": {
    "ai_enabled": true,
    "max_file_size": 10485760,
    "allowed_file_types": ["image", "video", "audio", "file"]
  }
}
```

**Response:**
```json
{
  "id": "app-abc123",
  "name": "Acme Corp Chat",
  "apiKey": "d3b07384d113edec49eaa6238ad5ff00",
  "secretKey": "c157a79031e1c40f85931829bc5fc552",
  "settings": {
    "ai_enabled": true,
    "max_file_size": 10485760,
    "allowed_file_types": ["image", "video", "audio", "file"]
  },
  "createdAt": "2026-01-04T10:30:00Z"
}
```

**Important:** Save the `apiKey` securely - you'll need it to generate user tokens.

### User Authentication (Getting Tokens)

**Use Case:** An end-user logs into your application and needs to access chat.

**Flow:**
1. User logs into your application (using your own auth system)
2. Your backend calls ChatSDK token endpoint with user details
3. ChatSDK returns JWT tokens
4. Your frontend uses these tokens to access chat features

**Endpoint:** `POST /tokens`

**Headers:**
```
X-API-Key: <YOUR_APP_API_KEY>
Content-Type: application/json
```

**Request:**
```json
{
  "userId": "user-456",
  "name": "Jane Smith",
  "image": "https://cdn.example.com/avatars/jane.jpg",
  "custom": {
    "email": "jane@example.com",
    "department": "Engineering",
    "role": "developer"
  }
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci00NTYiLCJhcHBfaWQiOiJhcHAtYWJjMTIzIiwiaWF0IjoxNjQwMTAwMDAwLCJleHAiOjE2NDAxODY0MDB9.abc123",
  "wsToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTQ1NiIsImFwcF9pZCI6ImFwcC1hYmMxMjMiLCJpYXQiOjE2NDAxMDAwMDAsImV4cCI6MTY0MDE4NjQwMH0.xyz789",
  "user": {
    "id": "user-456",
    "name": "Jane Smith",
    "image": "https://cdn.example.com/avatars/jane.jpg"
  },
  "expiresIn": 86400
}
```

**Token Types:**
- `token` - JWT for REST API requests (use in `Authorization: Bearer <token>`)
- `wsToken` - JWT for WebSocket connection (pass to Centrifugo)
- `expiresIn` - Token lifetime in seconds (default: 24 hours)

### Token Refresh

**Use Case:** User's token is about to expire, refresh without re-authentication.

**Endpoint:** `POST /tokens/refresh`

**Headers:**
```
Authorization: Bearer <EXPIRED_OR_EXPIRING_TOKEN>
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

**Note:** Tokens can be refreshed within 24 hours after expiration.

## Secret Management

### Environment Variables

Your `.env.production` file should contain:

```bash
# Admin Authentication
ADMIN_API_KEY=<64-character hex string>

# User Token Signing
JWT_SECRET=<128-character hex string>

# WebSocket Authentication
CENTRIFUGO_TOKEN_SECRET=<64-character hex string>
CENTRIFUGO_API_KEY=<same as CENTRIFUGO_TOKEN_SECRET>
```

### Generating Secrets Manually

If you need to generate secrets manually:

```bash
# ADMIN_API_KEY (32 bytes = 64 hex chars)
openssl rand -hex 32

# JWT_SECRET (64 bytes = 128 hex chars)
openssl rand -hex 64

# CENTRIFUGO_TOKEN_SECRET (32 bytes = 64 hex chars)
openssl rand -hex 32
```

**Node.js:**
```javascript
import { randomBytes } from 'crypto';

const adminApiKey = randomBytes(32).toString('hex');
const jwtSecret = randomBytes(64).toString('hex');
const centrifugoSecret = randomBytes(32).toString('hex');

console.log('ADMIN_API_KEY=' + adminApiKey);
console.log('JWT_SECRET=' + jwtSecret);
console.log('CENTRIFUGO_TOKEN_SECRET=' + centrifugoSecret);
```

**Python:**
```python
import secrets

admin_api_key = secrets.token_hex(32)
jwt_secret = secrets.token_hex(64)
centrifugo_secret = secrets.token_hex(32)

print(f'ADMIN_API_KEY={admin_api_key}')
print(f'JWT_SECRET={jwt_secret}')
print(f'CENTRIFUGO_TOKEN_SECRET={centrifugo_secret}')
```

### Production Secret Storage

**Do NOT store secrets in:**
- Git repositories
- Docker images
- Client-side code
- Log files

**Use secure storage:**

**AWS:**
```bash
# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name chatsdk/production/admin-api-key \
  --secret-string "your-secret-here"

# Reference in ECS task definition
{
  "secrets": [
    {
      "name": "ADMIN_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:chatsdk/production/admin-api-key"
    }
  ]
}
```

**Docker Secrets:**
```bash
# Create secret
echo "your-secret-here" | docker secret create admin_api_key -

# Use in docker-compose.yml
services:
  api:
    secrets:
      - admin_api_key
    environment:
      ADMIN_API_KEY_FILE: /run/secrets/admin_api_key

secrets:
  admin_api_key:
    external: true
```

**Kubernetes:**
```yaml
# Create secret
kubectl create secret generic chatsdk-secrets \
  --from-literal=admin-api-key='your-secret-here'

# Reference in deployment
env:
  - name: ADMIN_API_KEY
    valueFrom:
      secretKeyRef:
        name: chatsdk-secrets
        key: admin-api-key
```

## API Reference

### Admin Endpoints

#### Create App
```
POST /admin/apps
Authorization: Bearer <ADMIN_API_KEY>

Body: {
  "name": "App Name",
  "settings": { ... }
}

Returns: {
  "id": "app-xxx",
  "apiKey": "...",
  "secretKey": "...",
  ...
}
```

#### List Apps
```
GET /admin/apps?limit=50&offset=0
Authorization: Bearer <ADMIN_API_KEY>

Returns: {
  "apps": [...],
  "total": 123,
  "limit": 50,
  "offset": 0
}
```

#### Get App Details
```
GET /admin/apps/:appId
Authorization: Bearer <ADMIN_API_KEY>

Returns: {
  "id": "app-xxx",
  "name": "...",
  "apiKey": "...",
  "stats": { ... }
}
```

#### Regenerate API Key
```
POST /admin/apps/:appId/regenerate-key
Authorization: Bearer <ADMIN_API_KEY>

Returns: {
  "id": "app-xxx",
  "name": "...",
  "apiKey": "new-key-here"
}
```

### User Token Endpoints

#### Create Token
```
POST /tokens
X-API-Key: <APP_API_KEY>

Body: {
  "userId": "user-123",
  "name": "User Name",
  "image": "https://...",
  "custom": { ... }
}

Returns: {
  "token": "...",
  "wsToken": "...",
  "user": { ... },
  "expiresIn": 86400
}
```

#### Refresh Token
```
POST /tokens/refresh
Authorization: Bearer <EXPIRED_TOKEN>

Returns: {
  "token": "...",
  "wsToken": "...",
  "expiresIn": 86400
}
```

## Security Best Practices

### 1. Secret Rotation

Rotate secrets periodically:

```bash
# Generate new JWT_SECRET
NEW_JWT_SECRET=$(openssl rand -hex 64)

# Update environment
echo "JWT_SECRET=$NEW_JWT_SECRET" >> .env.production

# Restart API
docker-compose restart api

# Note: All existing user tokens will be invalidated
```

### 2. API Key Security

- **Never expose `ADMIN_API_KEY`** - Only use server-side
- **Never expose app `SECRET_KEY`** - Internal use only
- **App `API_KEY` can be used client-side** - But prefer server-side token generation
- **Use HTTPS in production** - All token exchanges must be encrypted

### 3. Token Lifetime

Adjust token expiry in [tokens.ts](../packages/api/src/routes/tokens.ts#L14):

```typescript
// Shorter lifetime for sensitive applications
const TOKEN_EXPIRY = '1h';  // 1 hour

// Longer lifetime for mobile apps
const TOKEN_EXPIRY = '7d';  // 7 days
```

### 4. Rate Limiting

Implement rate limiting for token endpoints:

```nginx
# In nginx.conf
limit_req_zone $binary_remote_addr zone=token_limit:10m rate=10r/m;

location /tokens {
    limit_req zone=token_limit burst=5 nodelay;
    proxy_pass http://api:5500;
}
```

### 5. CORS Configuration

Restrict CORS to your domains:

```typescript
// In packages/api/src/index.ts
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,
}));
```

## Troubleshooting

### "Missing API key" Error

**Problem:** Getting 401 when calling `/tokens`

**Solution:**
```bash
# Verify API key exists
psql -U chatsdk -d chatsdk -c "SELECT id, name, api_key FROM app;"

# Make sure you're sending the header
curl -X POST http://localhost:5500/tokens \
  -H "X-API-Key: YOUR_ACTUAL_API_KEY" \  # ← Must match database
  -H "Content-Type: application/json" \
  -d '{"userId": "test", "name": "Test"}'
```

### "Invalid token" Error

**Problem:** Token not accepted by API

**Solution:**
```bash
# 1. Verify JWT_SECRET matches between token creation and verification
echo $JWT_SECRET

# 2. Check token hasn't expired
# Decode token at https://jwt.io
# Look at "exp" claim

# 3. Verify token format
curl http://localhost:5500/api/channels \
  -H "Authorization: Bearer eyJhbGc..."  # ← Must start with "Bearer "
```

### "Admin API not configured" Error

**Problem:** Admin endpoints return 503

**Solution:**
```bash
# Verify ADMIN_API_KEY is set
docker-compose exec api env | grep ADMIN_API_KEY

# If missing, add to .env.production and restart
echo "ADMIN_API_KEY=$(openssl rand -hex 32)" >> .env.production
docker-compose restart api
```

### Bootstrap Script Fails

**Problem:** `node scripts/bootstrap.mjs` fails

**Solution:**
```bash
# Ensure Node.js 18+ is installed
node --version  # Should be v18 or higher

# Check file permissions
chmod +x scripts/bootstrap.mjs

# Run with explicit path
node ./scripts/bootstrap.mjs
```

### Tokens Work but WebSocket Fails

**Problem:** REST API works but real-time features don't

**Solution:**
```bash
# 1. Verify CENTRIFUGO_TOKEN_SECRET matches between API and Centrifugo
docker-compose exec api env | grep CENTRIFUGO_TOKEN_SECRET
docker-compose exec centrifugo env | grep CENTRIFUGO_TOKEN_HMAC_SECRET_KEY

# 2. Check Centrifugo is running
curl http://localhost:8000/health

# 3. Test WebSocket token
# Use wsToken from /tokens response
# Connect to: ws://localhost:8000/connection/websocket
```

## Next Steps

- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to production
- **[API Reference](API_REFERENCE.md)** - Complete API documentation
- **[Security Hardening](DEPLOYMENT.md#security)** - Production security checklist

---

**Need Help?**
- Check [API Reference](API_REFERENCE.md) for endpoint details
- Review [Docker logs](../docker/README.md#troubleshooting) for errors
- Open an issue in the repository
