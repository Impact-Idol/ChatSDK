# ChatSDK Troubleshooting Guide

This guide covers common issues and their solutions.

---

## Table of Contents

1. [CORS Errors](#cors-errors)
2. [Authentication Errors](#authentication-errors)
3. [Database Connection Issues](#database-connection-issues)
4. [WebSocket Connection Failures](#websocket-connection-failures)
5. [File Upload Issues](#file-upload-issues)
6. [Performance Issues](#performance-issues)

---

## CORS Errors

### Problem: "Access to fetch at 'http://localhost:5500' from origin 'http://localhost:4500' has been blocked by CORS policy"

**Symptoms:**
- Browser console shows CORS errors
- API requests fail with status 0 or CORS error
- Error message mentions "Access-Control-Allow-Origin"

**Root Cause:**
The ChatSDK API is rejecting requests from your frontend's domain because it's not in the allowed origins list.

**Solution 1: Use Environment Variable (Recommended)**

Add the `ALLOWED_ORIGINS` environment variable to your `.env.production` file:

```bash
# For development - allow all origins
ALLOWED_ORIGINS=*

# For production - list specific domains (comma-separated)
ALLOWED_ORIGINS=https://chat.example.com,https://app.example.com,https://mobile.example.com
```

**Solution 2: Add to Default Ports**

If you're using a non-standard localhost port, edit `packages/api/src/index.ts`:

```typescript
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:4500',  // Add your port here
  'http://localhost:5173',
  // ... other ports
];
```

Then rebuild the API:

```bash
cd packages/api
npm run build
```

**Quick Fix for Development:**

Set wildcard in your environment:

```bash
export ALLOWED_ORIGINS="*"
docker compose restart api
```

**Production Best Practices:**

1. **Never use wildcard (`*`) in production**
2. **List specific domains only:**
   ```bash
   ALLOWED_ORIGINS=https://chat.example.com,https://app.example.com
   ```

3. **Include all frontend domains:**
   - Main web app
   - Admin panel
   - Mobile web views
   - Staging environments

4. **Use HTTPS in production:**
   ```bash
   ALLOWED_ORIGINS=https://chat.example.com  # ✅ Secure
   # NOT: http://chat.example.com  # ❌ Insecure
   ```

**Verify CORS Configuration:**

```bash
# Test with curl
curl -I -X OPTIONS http://localhost:5500/api/channels \
  -H "Origin: http://localhost:4500" \
  -H "Access-Control-Request-Method: GET"

# Should return:
# Access-Control-Allow-Origin: http://localhost:4500
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

---

## Authentication Errors

### Problem: "Missing API key" or "Invalid API key"

**Symptoms:**
- API returns 401 Unauthorized
- Error message: "Missing API key" or "Invalid API key"

**Root Cause:**
Your request is missing the `X-API-Key` header or using an incorrect API key.

**Solution:**

1. **Get your API key:**
   ```bash
   cat credentials/app-*.json
   # Look for the "apiKey" field
   ```

2. **Include in API requests:**
   ```javascript
   fetch('http://localhost:5500/tokens', {
     method: 'POST',
     headers: {
       'X-API-Key': 'your-api-key-here',  // ✅ Required!
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       userId: 'user-123',
       name: 'John Doe',
     }),
   });
   ```

3. **Verify API key is correct:**
   ```bash
   # Test token generation
   curl -X POST http://localhost:5500/tokens \
     -H "X-API-Key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"userId": "test", "name": "Test User"}'
   ```

### Problem: "Token expired" or "Invalid token"

**Symptoms:**
- API returns 401 after token was working
- Error: "Token expired" or "Invalid token"

**Root Cause:**
JWT tokens expire after 24 hours by default.

**Solution:**

1. **Implement token refresh:**
   ```javascript
   // Check token expiration before API calls
   if (tokenExpiresAt < Date.now()) {
     // Fetch new token
     const newToken = await refreshToken();
   }
   ```

2. **Use integration code:**
   - See `examples/integrations/nextauth-integration.ts`
   - See `examples/integrations/auth0-integration.ts`
   - Both handle token refresh automatically

---

## Database Connection Issues

### Problem: "Connection to database failed" or "ECONNREFUSED"

**Symptoms:**
- API fails to start
- Error: "Connection refused" or "Failed to connect to database"

**Root Cause:**
Database is not accessible or credentials are wrong.

**Solution:**

1. **Verify database is running:**
   ```bash
   docker ps | grep postgres
   # Should show chatsdk-postgres container running
   ```

2. **Check database credentials in `.env.production`:**
   ```bash
   DB_HOST=postgres  # Use 'postgres' for Docker, or actual host
   DB_PORT=5432
   DB_NAME=chatsdk
   DB_USER=chatsdk
   DB_PASSWORD=your-password
   ```

3. **Test database connection:**
   ```bash
   docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk
   # Should connect successfully
   ```

4. **Check database logs:**
   ```bash
   docker logs chatsdk-postgres
   ```

### Problem: "Relation does not exist" or "Table not found"

**Symptoms:**
- API starts but queries fail
- Error: "relation 'app' does not exist"

**Root Cause:**
Database migrations haven't been run.

**Solution:**

1. **Run migrations:**
   ```bash
   docker exec chatsdk-api npm run migrate
   ```

2. **Apply bootstrap SQL:**
   ```bash
   docker exec -i chatsdk-postgres psql -U chatsdk -d chatsdk < credentials/bootstrap-*.sql
   ```

3. **Verify tables exist:**
   ```bash
   docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk -c "\dt"
   # Should show: app, user, channel, message, etc.
   ```

---

## WebSocket Connection Failures

### Problem: "invalid token" or "unauthorized" from WebSocket

**Symptoms:**
- WebSocket connects but immediately disconnects
- Browser console: "invalid token" or "unauthorized"
- Centrifugo rejects connection

**Root Cause:**
The `wsToken` was generated with an OLD `CENTRIFUGO_TOKEN_SECRET`, but Centrifugo is now using a NEW secret.

**Why This Happens:**
1. Tokens are cached in localStorage
2. You changed `CENTRIFUGO_TOKEN_SECRET` in `.env.production`
3. Old cached tokens use old secret → Centrifugo rejects them

**Solution:**

**Option 1: Clear Browser Cache (Quick Fix)**
```javascript
// In browser console
localStorage.clear();
// Then refresh the page
```

**Option 2: Force New Token**
```javascript
// Delete specific token cache
localStorage.removeItem('chatsdk_tokens');
localStorage.removeItem('chatsdk_tokens_auth0');
// Then refresh the page
```

**Option 3: Restart and Clear (Complete Fix)**
```bash
# 1. Restart API with new secret
docker compose restart api

# 2. Clear browser cache (see above)

# 3. Get fresh tokens
curl -X POST http://localhost:5500/tokens \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"userId": "test", "name": "Test"}'
```

**Verify Secrets Match:**
```bash
# Check API secret
cat .env.production | grep CENTRIFUGO_TOKEN_SECRET

# Check Centrifugo config
cat docker/centrifugo.json | grep token_hmac_secret_key

# They MUST be identical!
```

**Prevention:**
After changing any secrets, always:
1. Restart all services: `docker compose restart`
2. Clear browser localStorage
3. Regenerate all tokens

### Problem: WebSocket connection fails or disconnects immediately

**Symptoms:**
- Real-time features don't work
- Browser console: "WebSocket connection failed"
- No live updates for messages

**Root Cause:**
Centrifugo is not accessible or using wrong URL.

**Solution:**

1. **Verify Centrifugo is running:**
   ```bash
   docker ps | grep centrifugo
   # Should show chatsdk-centrifugo running
   ```

2. **Check Centrifugo health:**
   ```bash
   curl http://localhost:8000/health
   # Should return: {"healthy": true}
   ```

3. **Verify WebSocket URL in frontend:**
   ```javascript
   // Should connect to public Centrifugo URL
   const wsUrl = 'ws://localhost:8000/connection/websocket';
   ```

4. **Check CORS for WebSocket:**
   Centrifugo also needs CORS configured. Edit `docker/centrifugo.json`:
   ```json
   {
     "allowed_origins": ["*"]  // Development
     // OR
     "allowed_origins": ["https://chat.example.com"]  // Production
   }
   ```

5. **Verify WebSocket token:**
   ```javascript
   // Use the wsToken from /tokens response
   const response = await fetch('/tokens', {
     headers: { 'X-API-Key': apiKey }
   });
   const { wsToken } = await response.json();

   // Connect with wsToken
   centrifuge.setToken(wsToken);
   ```

---

## File Upload Issues

### Problem: File uploads fail or return 403/404

**Symptoms:**
- Upload API returns error
- Files don't appear in S3 bucket

**Root Cause:**
S3 configuration is incorrect or bucket doesn't exist.

**Solution:**

1. **Verify S3 credentials in `.env.production`:**
   ```bash
   S3_ENDPOINT=https://s3.amazonaws.com
   S3_REGION=us-east-1
   S3_ACCESS_KEY=your-access-key
   S3_SECRET_KEY=your-secret-key
   S3_BUCKET=chatsdk-uploads
   ```

2. **Test S3 connection:**
   ```bash
   # Using AWS CLI
   aws s3 ls s3://chatsdk-uploads \
     --endpoint-url=https://s3.amazonaws.com \
     --region=us-east-1
   ```

3. **Check bucket permissions:**
   - Bucket must be readable/writable by the API
   - For DigitalOcean Spaces, check CORS settings
   - For AWS S3, check IAM permissions

4. **Verify bucket exists:**
   ```bash
   # For MinIO (development)
   docker exec chatsdk-minio mc ls minio/chatsdk
   ```

---

## Performance Issues

### Problem: API is slow or times out

**Symptoms:**
- Requests take >1s to complete
- Frequent timeouts
- High CPU/memory usage

**Common Causes & Solutions:**

### 1. Database Queries

**Check slow queries:**
```bash
docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"
```

**Add indexes:**
```sql
CREATE INDEX idx_message_channel ON message(channel_id);
CREATE INDEX idx_message_created ON message(created_at);
```

### 2. Redis Connection

**Verify Redis is running:**
```bash
docker ps | grep redis
docker exec chatsdk-redis redis-cli ping
# Should return: PONG
```

### 3. Too Many Concurrent Connections

**Check database connections:**
```bash
docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk -c "
  SELECT count(*) FROM pg_stat_activity;
"
```

**Increase connection pool in `.env.production`:**
```bash
DB_POOL_SIZE=20  # Default: 10
```

### 4. Large Message History

**Implement pagination:**
```javascript
// Fetch messages with limit
fetch('/api/channels/123/messages?limit=50&offset=0')
```

**Archive old messages:**
```sql
-- Move messages older than 1 year to archive table
INSERT INTO message_archive SELECT * FROM message WHERE created_at < NOW() - INTERVAL '1 year';
DELETE FROM message WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## Still Having Issues?

### Debugging Checklist

1. **Check all services are running:**
   ```bash
   docker ps
   # Should show: api, postgres, centrifugo, redis
   ```

2. **Check API logs:**
   ```bash
   docker logs -f chatsdk-api
   ```

3. **Check database logs:**
   ```bash
   docker logs -f chatsdk-postgres
   ```

4. **Run health check:**
   ```bash
   node scripts/health-check.mjs
   ```

5. **Run validation:**
   ```bash
   node scripts/validate.mjs
   ```

6. **Test authentication:**
   ```bash
   node scripts/test-auth.mjs
   ```

### Get Help

- Check docs: `docs/`
- Review examples: `examples/react-chat-huly/`
- Check integration guides: `examples/integrations/README.md`

---

## Environment Variables Reference

Quick reference for common environment variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://chat.example.com,https://app.example.com` |
| `JWT_SECRET` | JWT signing secret | `(64-char hex string)` |
| `ADMIN_API_KEY` | Admin API key | `(64-char hex string)` |
| `DB_HOST` | Database host | `postgres` (Docker) or `db.example.com` |
| `DB_PASSWORD` | Database password | `your-secure-password` |
| `S3_ENDPOINT` | S3 endpoint URL | `https://s3.amazonaws.com` |
| `S3_BUCKET` | S3 bucket name | `chatsdk-uploads` |
| `CENTRIFUGO_URL` | WebSocket URL (internal) | `ws://centrifugo:8000/connection/websocket` |
| `CENTRIFUGO_API_URL` | Centrifugo API (internal) | `http://centrifugo:8000/api` |
| `REDIS_HOST` | Redis host | `redis` (Docker) or `redis.example.com` |

For complete reference, see `.env.production.example`.
