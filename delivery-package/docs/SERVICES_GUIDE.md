# ChatSDK Services Guide

Complete guide to required and optional services for ChatSDK deployment.

---

## 📊 Service Overview

| Service | Status | Features Enabled | Impact if Missing |
|---------|--------|------------------|-------------------|
| **PostgreSQL** | ✅ REQUIRED | All data storage | API won't start |
| **Centrifugo** | ✅ REQUIRED | Real-time messaging, presence, typing | No real-time features |
| **S3/MinIO** | ✅ REQUIRED | File uploads, avatars, attachments | API won't start |
| **Meilisearch** | ⚠️ OPTIONAL | Message search | Search returns empty results |
| **Inngest** | ⚠️ OPTIONAL | Background jobs, emails, invites | Jobs fail silently |
| **Novu** | ⚠️ OPTIONAL | Push notifications | Notifications disabled |
| **Redis** | ❌ NOT USED | - | No impact |

---

## ✅ Required Services

### 1. PostgreSQL - Database

**Why required:** Stores all application data (users, channels, messages, etc.)

**Production options:**
- AWS RDS PostgreSQL
- DigitalOcean Managed Database
- Google Cloud SQL
- Azure Database for PostgreSQL
- Self-hosted PostgreSQL

**Environment variables:**
```bash
DB_HOST=your-postgres-host.com
DB_PORT=5432
DB_NAME=chatsdk
DB_USER=chatsdk
DB_PASSWORD=your-secure-password
DB_SSL=true
```

**What breaks without it:**
- API server won't start
- Fatal error on startup

---

### 2. Centrifugo - Real-Time WebSocket Server

**Why required:** Enables real-time features (live messages, presence, typing indicators)

**Production options:**
- Centrifugo Cloud (recommended)
- Self-hosted via Docker (included in docker-compose)
- Dedicated VPS instance

**Environment variables:**
```bash
CENTRIFUGO_URL=wss://your-centrifugo.com/connection/websocket
CENTRIFUGO_API_URL=https://your-centrifugo.com/api
CENTRIFUGO_API_KEY=your-api-key
CENTRIFUGO_TOKEN_SECRET=your-token-secret
CENTRIFUGO_JWT_SECRET=your-jwt-secret
```

**What breaks without it:**
- API starts but warns
- No real-time message updates
- No presence (online/offline status)
- No typing indicators
- Messages still work (but require page refresh)

---

### 3. S3-Compatible Storage

**Why required:** Stores uploaded files, images, videos, attachments

**Production options:**
- AWS S3
- DigitalOcean Spaces
- Cloudflare R2
- Backblaze B2
- MinIO (self-hosted)

**Environment variables:**
```bash
S3_ENDPOINT=https://your-bucket.s3.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=chatsdk
S3_PUBLIC_URL=https://cdn.your-domain.com
```

**What breaks without it:**
- API server won't start
- Fatal error on startup

---

## ⚠️ Optional Services (Feature-Specific)

### 4. Meilisearch - Search Engine

**Status:** ✅ **FULLY IMPLEMENTED** - optional deployment

**Features enabled:**
- ✅ Full-text message search
- ✅ Search across channels
- ✅ Search with filters (date range, user, attachments)
- ✅ Highlighted search results
- ✅ Search autocomplete/suggestions

**What happens without it:**
- ✅ API starts successfully (logs warning)
- ✅ Search endpoints exist and respond
- ⚠️ Search calls return empty results `{ hits: [], totalHits: 0 }`
- ⚠️ Users cannot search messages

**Production options:**
- Meilisearch Cloud (recommended)
- Self-hosted via Docker
- Dedicated VPS instance

**Environment variables:**
```bash
MEILI_HOST=https://your-meilisearch.com
MEILI_MASTER_KEY=your-master-key
```

**Docker setup (self-hosted):**
```yaml
# Add to docker-compose.prod.yml
meilisearch:
  image: getmeili/meilisearch:v1.5
  ports:
    - "7700:7700"
  environment:
    MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
    MEILI_ENV: production
  volumes:
    - meilisearch_data:/meili_data
  restart: unless-stopped
```

**When to enable:**
- ✅ Users need to search old messages
- ✅ Large message history (1000+ messages)
- ✅ Compliance/audit requirements
- ❌ Simple chat (recent messages only)

---

### 5. Inngest - Background Jobs

**Status:** ✅ **FULLY IMPLEMENTED** - optional deployment

**Features enabled:**
- ✅ **Email invitations to workspaces** (most important)
- ✅ Push notifications (mobile/browser)
- ✅ Reaction notifications
- ✅ Thread reply notifications
- ✅ Link preview generation
- ✅ Notification cleanup (scheduled)

**What are "Email Invitations"?**

When workspace admins invite users:
```javascript
POST /api/workspaces/engineering/invite
{
  "emails": ["alice@company.com", "bob@company.com"],
  "role": "member",
  "message": "Join our team!"
}
```

**With Inngest:**
- ✅ System sends professional invite emails automatically
- ✅ Each user gets: "Join Engineering Team" email with invite link
- ✅ User clicks link → auto-joins workspace
- ✅ Fully automated onboarding

**Without Inngest:**
- ⚠️ API returns invite URLs but doesn't email them
- ⚠️ You must manually send URLs (via Slack, text, etc.)
- ⚠️ Works for small teams (< 10 people), not scalable

**Example invite email (sent by Inngest):**
```
From: noreply@yourapp.com
Subject: You've been invited to join "Engineering Team"

Hi Alice,

John Doe has invited you to join the "Engineering Team" workspace.

Message: "Join our team!"

[Accept Invitation] ← Click here

Expires in 7 days.
```

**What happens without it:**
- ✅ API starts successfully
- ✅ `/api/inngest` endpoint exists
- ✅ Invite tokens still created
- ❌ **No automated emails sent**
- ❌ **No push notifications**
- ⚠️ Must manually share invite URLs

**Production options:**
- Inngest Cloud (recommended)
- Self-hosted Inngest Dev Server

**Environment variables:**
```bash
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

**Docker setup (development):**
```yaml
# Add to docker-compose.prod.yml
inngest:
  image: inngest/inngest:latest
  ports:
    - "8288:8288"
  environment:
    INNGEST_DEV: "true"
  command: inngest dev -u http://api:5500/api/inngest
```

**When to enable:**
- ✅ Need workspace invitations
- ✅ Need email notifications
- ✅ Need scheduled tasks
- ✅ Need automated workflows
- ❌ API-only integration (no emails)

---

### 6. Novu - Push Notifications

**Status:** ✅ **FULLY IMPLEMENTED** - optional deployment

**Features enabled:**
- ✅ Browser push notifications
- ✅ Mobile push notifications (iOS/Android)
- ✅ In-app notification center
- ✅ Email notifications (via Novu)
- ✅ SMS notifications (via Novu)

**What happens without it:**
- ✅ API starts successfully (logs warning)
- ⚠️ Push notification endpoints fail silently
- ⚠️ No browser/mobile push
- ⚠️ Users miss messages when offline

**Production options:**
- Novu Cloud (recommended)
- Self-hosted Novu

**Environment variables:**
```bash
NOVU_SECRET_KEY=your-novu-secret-key
NOVU_SERVER_URL=https://api.novu.co  # Or self-hosted URL
```

**When to enable:**
- ✅ Mobile app integration
- ✅ Users need offline notifications
- ✅ Email/SMS notifications needed
- ❌ Web-only, always online users

---

## 🚀 Deployment Scenarios

### Scenario 1: Minimal Chat (Core Features Only)

**Use case:** Simple team chat, web-only, no search

**Required services:**
```bash
✅ PostgreSQL (managed)
✅ Centrifugo (Docker or Cloud)
✅ S3/Spaces (managed)
```

**Features:**
- ✅ Real-time messaging
- ✅ File uploads
- ✅ Channels & DMs
- ✅ Reactions, threads
- ❌ No search
- ❌ No email invites
- ❌ No push notifications

**Monthly cost:** ~$20-50 (managed database + S3 + Centrifugo)

---

### Scenario 2: Full-Featured Chat (All Features)

**Use case:** Production app with search, invites, notifications

**Required services:**
```bash
✅ PostgreSQL (managed)
✅ Centrifugo (Cloud)
✅ S3/Spaces (managed)
✅ Meilisearch (Cloud)
✅ Inngest (Cloud)
✅ Novu (Cloud)
```

**Features:**
- ✅ Everything in Scenario 1
- ✅ Full-text search
- ✅ Email invitations
- ✅ Push notifications
- ✅ Background jobs
- ✅ Email/SMS via Novu

**Monthly cost:** ~$100-200 (all managed services)

---

### Scenario 3: Self-Hosted (Cost-Optimized)

**Use case:** Self-hosted on single VPS, all features

**Required services:**
```bash
✅ PostgreSQL (Docker)
✅ Centrifugo (Docker)
✅ MinIO (Docker)
✅ Meilisearch (Docker)
✅ Inngest Dev Server (Docker)
```

**Features:**
- ✅ All features enabled
- ⚠️ No Novu (push notifications)
- ⚠️ Single point of failure
- ⚠️ Manual backups needed

**Monthly cost:** ~$20-40 (VPS only - 4GB RAM, 80GB disk)

---

## 📋 Quick Setup Guides

### Enable Meilisearch (Message Search)

**1. Choose deployment:**

**Option A: Meilisearch Cloud (Recommended)**
```bash
# Sign up at https://www.meilisearch.com/cloud
# Get your endpoint and master key

# Add to .env.production
MEILI_HOST=https://your-instance.meilisearch.io
MEILI_MASTER_KEY=your_master_key_here
```

**Option B: Self-Hosted via Docker**
```bash
# Add to docker-compose.prod.yml
meilisearch:
  image: getmeili/meilisearch:v1.5
  ports:
    - "7700:7700"
  environment:
    MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
    MEILI_ENV: production
  volumes:
    - meilisearch_data:/meili_data
  healthcheck:
    test: ["CMD", "wget", "--spider", "-q", "http://localhost:7700/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  restart: unless-stopped

volumes:
  meilisearch_data:
```

```bash
# Add to .env.production
MEILI_HOST=http://meilisearch:7700
MEILI_MASTER_KEY=generate-a-secure-key-here
```

**2. Restart API:**
```bash
docker compose restart api
```

**3. Verify:**
```bash
# Check logs
docker logs chatsdk-api | grep -i meilisearch
# Should see: "Meilisearch connected"

# Test search
curl http://localhost:5500/api/search?q=test \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer your-token"
```

---

### Enable Inngest (Background Jobs)

**1. Choose deployment:**

**Option A: Inngest Cloud (Recommended)**
```bash
# Sign up at https://www.inngest.com/
# Get your event key and signing key

# Add to .env.production
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
```

**Option B: Self-Hosted Dev Server**
```bash
# Add to docker-compose.prod.yml
inngest:
  image: inngest/inngest:latest
  ports:
    - "8288:8288"
  environment:
    INNGEST_DEV: "true"
  command: inngest dev -u http://api:5500/api/inngest --no-discovery
  volumes:
    - inngest_data:/var/lib/inngest
  restart: unless-stopped

volumes:
  inngest_data:
```

```bash
# Add to .env.production
INNGEST_EVENT_KEY=test_inngest_event_key_123
INNGEST_SIGNING_KEY=test_inngest_signing_key_123
```

**2. Restart services:**
```bash
docker compose restart api inngest
```

**3. Verify:**
```bash
# Check Inngest UI
open http://localhost:8288

# Check logs
docker logs chatsdk-api | grep -i inngest
```

---

### Enable Novu (Push Notifications)

**1. Novu Cloud (Recommended):**
```bash
# Sign up at https://novu.co/
# Get your secret key from dashboard

# Add to .env.production
NOVU_SECRET_KEY=your_novu_secret_key
NOVU_SERVER_URL=https://api.novu.co
```

**2. Restart API:**
```bash
docker compose restart api
```

**3. Configure notification templates in Novu dashboard**

**4. Verify:**
```bash
docker logs chatsdk-api | grep -i novu
# Should see: "Novu initialized"
```

---

## 🔍 Service Health Checks

### Check what's running:
```bash
curl http://localhost:5500/health/detailed
```

**Example response:**
```json
{
  "status": "ok",
  "checks": {
    "database": { "status": "ok", "message": "Connected" },
    "memory": { "status": "ok", "usage": 245, "limit": 512 }
  }
}
```

### Check logs for service initialization:
```bash
docker logs chatsdk-api | grep -E "connected|initialized|Failed"
```

**Expected output (all services enabled):**
```
Database connected
Centrifugo connected
Novu initialized
Storage initialized
Meilisearch connected
```

**Expected output (minimal setup):**
```
Database connected
Centrifugo connected
NOVU_SECRET_KEY not set - notifications will be disabled
Storage initialized
Failed to initialize Meilisearch: <error>
```

---

## 📞 Troubleshooting

### "Search returns no results"
**Cause:** Meilisearch not running or not configured

**Solution:**
1. Check `.env.production` has `MEILI_HOST` and `MEILI_MASTER_KEY`
2. Check Meilisearch is running: `curl http://localhost:7700/health`
3. Restart API: `docker compose restart api`
4. Check logs: `docker logs chatsdk-api | grep -i meili`

---

### "Email invites not sending"
**Cause:** Inngest not running or not configured

**Solution:**
1. Check `.env.production` has `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`
2. Check Inngest is running: `curl http://localhost:8288/health`
3. Check Inngest dashboard for failed jobs
4. Verify API registered functions: `curl http://localhost:5500/api/inngest`

---

### "Push notifications not working"
**Cause:** Novu not configured

**Solution:**
1. Check `.env.production` has `NOVU_SECRET_KEY`
2. Check Novu dashboard for notification templates
3. Verify API key is correct
4. Check logs: `docker logs chatsdk-api | grep -i novu`

---

## 💰 Cost Breakdown

### Minimal Setup (Core only)
```
PostgreSQL (DO)    $15/mo  (1GB RAM)
S3/Spaces (DO)     $5/mo   (250GB)
Centrifugo (Docker) Free   (self-hosted)
────────────────────────────
Total:             ~$20/mo
```

### Full-Featured Setup (All services)
```
PostgreSQL (AWS RDS)  $30/mo  (db.t3.micro)
S3 (AWS)              $10/mo  (1TB transfer)
Centrifugo Cloud      $29/mo  (Starter)
Meilisearch Cloud     $29/mo  (Starter)
Inngest Cloud         Free    (up to 1M steps)
Novu Cloud            Free    (up to 30K events)
────────────────────────────────────
Total:                ~$98/mo
```

### Self-Hosted (VPS)
```
Hetzner VPS (4GB)     €8/mo   (~$9)
All services via Docker
────────────────────────────────
Total:                ~$9/mo
```

---

## 🎯 Recommendations

### For MVP/Testing:
- ✅ Use Scenario 1 (Core only)
- ✅ Add Meilisearch later if needed
- ✅ Skip Inngest/Novu initially

### For Production Launch:
- ✅ Use Scenario 2 (Full-featured)
- ✅ Enable Meilisearch (users expect search)
- ✅ Enable Inngest (email invites are important)
- ✅ Consider Novu if mobile app

### For Cost Optimization:
- ✅ Use Scenario 3 (Self-hosted)
- ✅ Start with managed DB + S3
- ✅ Self-host Centrifugo, Meilisearch, Inngest
- ✅ Scale to managed services as you grow

---

## 📚 Related Documentation

- [Installation Guide](./INSTALLATION.md) - Getting started
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [API Guide](./API_GUIDE.md) - Using the API
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues

---

## Questions?

Need help choosing services? See `START_HERE.md` or check the troubleshooting guide.
