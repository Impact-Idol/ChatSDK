# ⚠️ START HERE - ChatSDK Setup Guide

> **CRITICAL:** Follow these steps IN ORDER or deployment will fail!

## 🚨 BEFORE You Do Anything Else

ChatSDK requires **secret generation** and **authentication setup** BEFORE it can run.

**Do NOT skip Step 1** or you will get authentication errors!

---

## ✅ Step-by-Step Setup (15 Minutes)

### Step 1: Generate Secrets & Create Your First App (REQUIRED!)

**Run this command first:**
```bash
node scripts/bootstrap.mjs --app-name="My Chat App"
```

**What this does:**
- ✅ Generates `JWT_SECRET` (for user tokens)
- ✅ Generates `ADMIN_API_KEY` (for admin operations)
- ✅ Generates `CENTRIFUGO_TOKEN_SECRET` (for WebSocket)
- ✅ Creates `.env.production` file automatically
- ✅ Creates your first application
- ✅ Generates database initialization SQL
- ✅ Saves credentials in `credentials/` folder

**Expected output:**
```
🚀 ChatSDK Bootstrap Tool

📝 Step 1: Generating Secure Secrets
─────────────────────────────────────────────────────────
✓ ADMIN_API_KEY: abc123...
✓ JWT_SECRET: def456... (128 chars)
✓ CENTRIFUGO_TOKEN_SECRET: ghi789...
✓ APP_API_KEY: jkl012...
✓ APP_SECRET_KEY: mno345...

📝 Step 2: Updating Environment Configuration
─────────────────────────────────────────────────────────
✓ Updated .env.production

📝 Step 3: Saving Application Credentials
─────────────────────────────────────────────────────────
✓ Saved to: credentials/app-xyz.json

✅ Bootstrap Complete!

📋 NEXT STEPS:
─────────────────────────────────────────────────────────
1️⃣  Apply database migration:
   docker-compose exec postgres psql -U chatsdk -d chatsdk -f credentials/bootstrap-*.sql

2️⃣  Restart your API server to load new environment variables:
   docker-compose restart api

3️⃣  Test token creation:
   curl -X POST http://localhost:5500/api/tokens \
     -H "X-API-Key: <your-api-key>" \
     -d '{"userId": "user-1", "name": "Test User"}'
```

**If you skip this step:**
- ❌ API will fail to start (missing JWT_SECRET)
- ❌ Token creation will fail (missing API key)
- ❌ Authentication won't work
- ❌ You'll waste hours debugging

---

### Step 2: Validate Your Setup (Recommended)

**Check that everything is configured correctly:**
```bash
node scripts/validate.mjs
```

**This catches common mistakes:**
- Missing secrets in .env
- Wrong database credentials
- S3 not configured
- Docker not running
- Port conflicts

**Expected output:**
```
✅ Node.js 20.10.0 ✓
✅ .env.production exists
✅ JWT_SECRET: abc123... (128 chars)
✅ ADMIN_API_KEY: def456... (64 chars)
✅ CENTRIFUGO_TOKEN_SECRET: ghi789... (64 chars)
✅ Database: chatsdk@localhost:5432/chatsdk

🎉 Perfect! Your ChatSDK deployment is ready!
```

**If validation fails:**
- Read the error messages carefully
- Fix the issues it mentions
- Run validation again until all ✅

---

### Step 3: Start Services

**Configure database and S3 in `.env.production`:**
```bash
# Edit these lines in .env.production
DB_HOST=your-postgres-host.com
DB_PASSWORD=your-secure-password
S3_ACCESS_KEY=your-s3-key
S3_SECRET_KEY=your-s3-secret
S3_BUCKET=your-bucket-name
```

**Start Docker services:**
```bash
cd docker
docker-compose -f docker-compose.prod.yml up -d
```

**Wait for services to start (~30 seconds)**

---

### Step 4: Initialize Database

**Apply migrations and bootstrap SQL:**
```bash
# Run migrations
docker exec chatsdk-api npm run migrate

# Apply bootstrap SQL (created in Step 1)
docker exec -i chatsdk-postgres psql -U chatsdk -d chatsdk < ../credentials/bootstrap-*.sql

# Verify app was created
docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk -c "SELECT id, name, api_key FROM app;"
```

**Expected output:**
```
                  id                  |     name      |              api_key
--------------------------------------+---------------+------------------------------------
 app-1704330000000-abc123            | My Chat App   | d3b07384d113edec49eaa6238ad5ff00
```

---

### Step 5: Verify Deployment

**Run health check:**
```bash
cd ..
node scripts/health-check.mjs
```

**Expected output:**
```
🏥 ChatSDK Health Check

═══════════════════════════════════════
1. API Server Health
═══════════════════════════════════════
✅ API server is running (200)

═══════════════════════════════════════
2. Database Connection
═══════════════════════════════════════
✅ Database connection is working

═══════════════════════════════════════
3. Token Generation
═══════════════════════════════════════
✅ Token generation is working

...

🎉 All systems operational!
```

**If health check fails:**
- Check logs: `docker-compose logs -f api`
- Verify .env.production settings
- Ensure database is accessible
- Check Step 1 was completed

---

### Step 6: Test Authentication (Critical!)

**Verify the complete auth flow works:**
```bash
node scripts/test-auth.mjs
```

**This tests:**
1. Admin app creation
2. User token generation
3. API authentication
4. Token refresh
5. WebSocket tokens

**Expected output:**
```
🧪 ChatSDK Authentication Flow Test

1️⃣ Health Check
─────────────────────────────────────────────────────────
✅ Health: Success

2️⃣ Application Setup
─────────────────────────────────────────────────────────
✅ Using existing app: My Chat App
   App ID: app-abc123
   API Key: d3b07384d113edec...

3️⃣ User Token Generation
─────────────────────────────────────────────────────────
✅ Create Token: Success
   User ID: test-user-1704330000
   JWT Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   WS Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

4️⃣ Authenticated API Requests
─────────────────────────────────────────────────────────
✅ Get Current User: Success
✅ Get Channels: Success

5️⃣ Token Refresh
─────────────────────────────────────────────────────────
✅ Refresh Token: Success

✅ All Authentication Tests Passed!
```

---

### Step 7: Get Your API Key for Integration

**Your API key is in the credentials file:**
```bash
cat credentials/app-*.json
```

**Example output:**
```json
{
  "app": {
    "id": "app-abc123",
    "name": "My Chat App",
    "apiKey": "d3b07384d113edec49eaa6238ad5ff00",
    "secretKey": "c157a79031e1c40f85931829bc5fc552",
    "createdAt": "2026-01-04T10:30:00Z"
  }
}
```

**Use the `apiKey` in your application:**
```javascript
// Your backend code
const response = await fetch('http://localhost:5500/api/tokens', {
  method: 'POST',
  headers: {
    'X-API-Key': 'd3b07384d113edec49eaa6238ad5ff00',  // From credentials file
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: session.user.id,
    name: session.user.name,
    image: session.user.avatar
  })
});
```

---

## 🆘 Troubleshooting

### "Missing API key" Error
**Problem:** You skipped Step 1 (bootstrap)

**Solution:**
```bash
node scripts/bootstrap.mjs --app-name="My Chat App"
```

### "Invalid token" Error
**Problem:** JWT_SECRET not configured or mismatched

**Solution:**
```bash
# Check if JWT_SECRET is set
cat .env.production | grep JWT_SECRET

# If missing, run bootstrap again
node scripts/bootstrap.mjs
```

### "Database connection failed"
**Problem:** Database credentials wrong or database not running

**Solution:**
```bash
# Check database is running
docker-compose ps postgres

# Test connection manually
docker exec -it chatsdk-postgres psql -U chatsdk -d chatsdk
```

### API Won't Start
**Problem:** Missing environment variables

**Solution:**
```bash
# Run validation to find the issue
node scripts/validate.mjs

# Check API logs
docker-compose logs -f api
```

---

## 📚 Next Steps

Once all tests pass:

1. **Deploy frontend:**
   ```bash
   cd examples/react-chat-huly
   npm install
   npm run build
   # Deploy dist/ folder to your CDN
   ```

2. **Read integration guides:**
   - NextAuth: `examples/integrations/README.md`
   - Auth0: `examples/integrations/README.md`

3. **Read complete docs:**
   - Authentication: `docs/AUTHENTICATION.md`
   - Deployment: `docs/DEPLOYMENT.md`
   - API Reference: `docs/API_REFERENCE.md`

---

## 🔐 Security Checklist

Before going live:

- [ ] Changed all default secrets (run bootstrap if using defaults)
- [ ] Using strong database password
- [ ] S3 bucket has proper permissions
- [ ] HTTPS enabled (not HTTP)
- [ ] CORS configured for your domain only
- [ ] Secrets stored securely (AWS Secrets Manager, K8s secrets, etc.)
- [ ] `.env.production` not committed to git

---

## 📞 Need Help?

1. **Run validation:** `node scripts/validate.mjs`
2. **Run health check:** `node scripts/health-check.mjs`
3. **Check logs:** `docker-compose logs -f api`
4. **Read troubleshooting:** `docs/AUTHENTICATION.md#troubleshooting`

---

**Remember:** The bootstrap script (Step 1) is NOT optional!

✅ **Next file to read:** `docs/AUTHENTICATION.md` for complete auth details
