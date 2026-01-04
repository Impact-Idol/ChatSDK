# ChatSDK Release Notes - v1.0.2

**Release Date:** January 4, 2026
**Repository:** https://github.com/piper5ul/ChatSDK.git
**Branch:** main

---

## 🚀 v1.0.2 - v3 Integration Issues Resolved

### Critical Fixes

#### 1. CORS Preflight Headers Missing (CRITICAL)
**Problem:** OPTIONS preflight requests returned 204 but without `Access-Control-Allow-Origin` header
**Fixed:**
- ✅ OPTIONS response now ensures CORS headers are always set
- ✅ Added `Access-Control-Max-Age: 86400` for 24-hour preflight caching
- ✅ Fallback headers added when origin doesn't match allowed list

**Files Modified:** `packages/api/src/index.ts`

**Verification:**
```bash
curl -I -X OPTIONS http://localhost:5500/api/channels \
  -H "Origin: http://localhost:4500"
# Now returns: Access-Control-Allow-Origin: http://localhost:4500
```

---

#### 2. Workspace Auth Error Message Confusing (CRITICAL)
**Problem:** Error "User authentication required" didn't explain you need BOTH X-API-Key AND Bearer token
**Fixed:**
- ✅ Improved error message: "User authentication required. Include both X-API-Key and Authorization: Bearer <token> headers."

**Files Modified:** `packages/api/src/middleware/auth.ts`

**Why Both Headers:**
- X-API-Key identifies your application (app-level auth)
- Bearer token identifies the end-user (user-level auth)
- Most endpoints require BOTH for two-tier security

---

#### 3. No Default Workspace Created (CRITICAL)
**Problem:** Bootstrap created app but no workspace, causing confusion
**Fixed:**
- ✅ Bootstrap now creates "General Workspace" automatically
- ✅ Workspace ID saved to credentials JSON
- ✅ SQL includes workspace creation

**Files Modified:** `delivery-package/scripts/bootstrap.mjs`

**Bootstrap Output:**
```json
{
  "defaultWorkspace": {
    "id": "ws-1234567890",
    "name": "General Workspace",
    "type": "team"
  }
}
```

---

#### 4. React Hooks Documentation Missing (CRITICAL)
**Problem:** `@chatsdk/react` included but no docs on how to use hooks vs REST API
**Fixed:**
- ✅ Created comprehensive `API_GUIDE.md` (15KB, 800+ lines)
- ✅ Documents all React hooks with examples
- ✅ Explains two-tier authentication system clearly
- ✅ Includes NextAuth and Auth0 integration patterns
- ✅ Documents JWT token claims structure

**Files Added:** `delivery-package/docs/API_GUIDE.md`

**Hooks Documented:**
- useWorkspaces - List and manage workspaces
- useChannels - List and manage channels
- useMessages - Send/receive messages with real-time updates
- usePresence - Track online/offline status
- useTyping - Typing indicators
- usePolls - Create and vote on polls

---

### Nice-to-Have Features

#### ✅ Kubernetes Health Endpoints
Already available:
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check
- `GET /health/ready` - Readiness probe (Kubernetes)
- `GET /live` - Liveness probe (Kubernetes)

#### ✅ Token Claims Documentation
Documented in `API_GUIDE.md`:
```json
{
  "user_id": "user-123",
  "app_id": "app-1234567890-abc",
  "iat": 1704398400,
  "exp": 1704484800
}
```

#### ✅ Next.js App Router Example
Available at `examples/integrations/nextauth-integration.ts`

#### ✅ Project Cleanup Tools
- `cleanup-project.sh` - Automated cleanup script
- `PROJECT_STRUCTURE.md` - Best practices guide for large projects
- `.archive/README.md` - Archive documentation

---

### Files Changed (v1.0.2)

**Core API:**
- `packages/api/src/index.ts` - Fixed CORS preflight response
- `packages/api/src/middleware/auth.ts` - Improved error messages

**Documentation:**
- `delivery-package/docs/API_GUIDE.md` - **NEW** Complete API + React hooks guide (15KB)
- `PROJECT_STRUCTURE.md` - **NEW** Project organization best practices

**Scripts:**
- `delivery-package/scripts/bootstrap.mjs` - Added default workspace creation
- `cleanup-project.sh` - **NEW** Automated cleanup tool

---

### Issue Summary (v1.0.2)

| Issue | Severity | Status | Impact |
|-------|----------|--------|---------|
| CORS preflight headers missing | CRITICAL | ✅ Fixed | OPTIONS now works correctly |
| Workspace auth error confusing | HIGH | ✅ Fixed | Clear error messages |
| No default workspace | CRITICAL | ✅ Fixed | Bootstrap creates workspace |
| React hooks docs missing | CRITICAL | ✅ Fixed | Comprehensive guide added |
| /health/ready endpoint | MEDIUM | ✅ Exists | Already available |
| Token claims docs | LOW | ✅ Fixed | Documented in API_GUIDE.md |
| Next.js example | LOW | ✅ Exists | Already available |

**All v3 issues resolved. API documentation complete.**

---

## 📋 Previous Release - v1.0.1

---

## 📦 Getting This Release

```bash
# Clone repository
git clone https://github.com/piper5ul/ChatSDK.git
cd ChatSDK/delivery-package/

# Run setup wizard
./start.sh
```

Or update existing installation:
```bash
git pull origin main
cd delivery-package/
./start.sh
```

---

## 🐛 Critical Bug Fixes

This release resolves **7 critical integration issues** reported by client teams:

### 1. CORS Configuration Not Working (CRITICAL)
**Problem:** API rejected requests from `localhost:4500` and other ports
**Fixed:**
- ✅ Added `ALLOWED_ORIGINS` environment variable support
- ✅ Included `localhost:4500` and `localhost:6001` in default ports
- ✅ Supports wildcard (`*`) for development mode
- ✅ Supports comma-separated list for production

**Configuration:**
```bash
# Development
ALLOWED_ORIGINS=*

# Production
ALLOWED_ORIGINS=https://chat.example.com,https://app.example.com
```

**Files Modified:** `packages/api/src/index.ts`

---

### 2. Documentation Endpoint Mismatch (CRITICAL)
**Problem:** Docs said `POST /api/tokens`, actual endpoint was `POST /tokens`
**Fixed:**
- ✅ Corrected all documentation to use `/tokens`
- ✅ Updated 18+ files across docs, scripts, and examples
- ✅ Fixed integration examples (NextAuth, Auth0)

**Correct Endpoints:**
- `POST /tokens` - Create token
- `POST /tokens/refresh` - Refresh token

**Files Modified:** All `*.md`, `*.mjs`, `*.ts` files in delivery-package and examples

---

### 3. Bootstrap SQL Schema Mismatch (CRITICAL)
**Problem:** Generated SQL used wrong column name (`secret_key` instead of `api_secret`)
**Fixed:**
- ✅ Bootstrap script now generates correct SQL
- ✅ Matches actual database schema

**Impact:** Bootstrap script now works without errors

**Files Modified:** `delivery-package/scripts/bootstrap.mjs`

---

### 4. Centrifugo Missing Common Ports
**Problem:** WebSocket CORS errors for ports `4500` and `6001`
**Fixed:**
- ✅ Added `localhost:4500` to allowed_origins
- ✅ Added `localhost:6001` to allowed_origins
- ✅ Updated both main and delivery package configs

**Files Modified:**
- `docker/centrifugo.json`
- `delivery-package/docker/centrifugo.json`

---

### 5. Secrets Mismatch Between Services (CRITICAL)
**Problem:** Bootstrap didn't sync secrets between API and Centrifugo
**Fixed:**
- ✅ Bootstrap now updates Centrifugo config automatically
- ✅ Ensures `CENTRIFUGO_TOKEN_SECRET` matches `token_hmac_secret_key`
- ✅ Prevents WebSocket authentication failures

**New Bootstrap Features:**
- Auto-updates `.env.production`
- Auto-updates `docker/centrifugo.json`
- Adds missing ports to allowed_origins
- Validates secret synchronization

**Files Modified:** `delivery-package/scripts/bootstrap.mjs`

---

### 6. WebSocket "invalid token" Error
**Problem:** Cached tokens caused authentication failures after secret rotation
**Fixed:**
- ✅ Added comprehensive troubleshooting guide
- ✅ Clear instructions for clearing localStorage
- ✅ Documented in START_HERE.md and TROUBLESHOOTING.md

**Solution:**
```javascript
// In browser console
localStorage.clear();
// Then refresh
```

**Files Added:**
- `delivery-package/docs/TROUBLESHOOTING.md` (600+ lines)

**Files Modified:**
- `delivery-package/START_HERE.md`

---

### 7. Missing Full Stack Health Check
**Problem:** No way to validate entire deployment
**Fixed:**
- ✅ Enhanced health-check.mjs to validate:
  - API server health
  - Database connection
  - Token generation
  - Authentication flow
  - Protected endpoints
  - WebSocket connectivity
  - CORS configuration

**Usage:**
```bash
node scripts/health-check.mjs
```

**Files Modified:** `delivery-package/scripts/health-check.mjs`

---

## ✨ New Features

### Integration Examples (Ready-to-Use)
- ✅ NextAuth integration with automatic token caching
- ✅ Auth0 integration with automatic token caching
- ✅ Complete setup guides for both

**Files Added:**
- `examples/integrations/nextauth-integration.ts`
- `examples/integrations/auth0-integration.ts`
- `examples/integrations/README.md`

### Comprehensive Troubleshooting Guide
600+ line guide covering:
- CORS errors and solutions
- Authentication issues
- Database connection problems
- WebSocket failures
- File upload issues
- Performance troubleshooting
- Environment variables reference

**File Added:** `delivery-package/docs/TROUBLESHOOTING.md`

### Enhanced Documentation
- ✅ Added CORS configuration section
- ✅ Updated .env.production.example with ALLOWED_ORIGINS
- ✅ Clear secret management instructions
- ✅ Migration guide for existing deployments

---

## 📊 Files Changed Summary

### Core API
- `packages/api/src/index.ts` - CORS configuration

### Bootstrap & Setup
- `delivery-package/scripts/bootstrap.mjs` - SQL fix, Centrifugo sync, endpoint corrections
- `delivery-package/start.sh` - Interactive setup wizard
- `delivery-package/START_HERE.md` - Added CORS and WebSocket troubleshooting

### Configuration
- `docker/centrifugo.json` - Added ports 4500, 6001
- `delivery-package/docker/centrifugo.json` - Added ports 4500, 6001
- `delivery-package/.env.production.example` - Added CORS documentation

### Documentation (All Updated)
- `delivery-package/docs/AUTHENTICATION.md` - Endpoint corrections
- `delivery-package/docs/TROUBLESHOOTING.md` - **NEW** (600+ lines)
- `delivery-package/docs/API_REFERENCE.md` - Endpoint corrections
- `delivery-package/README.md` - Updated endpoints
- All scripts and examples updated

### Integration Examples
- `examples/integrations/nextauth-integration.ts` - **NEW**
- `examples/integrations/auth0-integration.ts` - **NEW**
- `examples/integrations/README.md` - **NEW**

---

## 🔧 Migration Guide

### For Existing Deployments

#### 1. Update CORS Configuration

Add to your `.env.production`:
```bash
ALLOWED_ORIGINS=http://localhost:4500,http://localhost:6001,<your other origins>
```

Restart API:
```bash
docker compose restart api
```

#### 2. Sync Centrifugo Secrets

```bash
# Get your CENTRIFUGO_TOKEN_SECRET
cat .env.production | grep CENTRIFUGO_TOKEN_SECRET

# Update docker/centrifugo.json manually
{
  "token_hmac_secret_key": "YOUR_CENTRIFUGO_TOKEN_SECRET_HERE",
  "api_key": "YOUR_CENTRIFUGO_TOKEN_SECRET_HERE"
}

# Restart Centrifugo
docker compose restart centrifugo
```

#### 3. Clear Token Cache

Tell all users to clear browser cache:
```javascript
// Browser console
localStorage.clear();
```

#### 4. Update API Calls

Change all references:
```javascript
// OLD
fetch('/api/tokens', ...)

// NEW
fetch('/tokens', ...)
```

---

## 🧪 Testing

Verify all fixes:

```bash
# 1. Validate configuration
node scripts/validate.mjs

# 2. Run bootstrap (if fresh install)
node scripts/bootstrap.mjs --app-name="Test App"

# 3. Start services
cd docker && docker compose -f docker-compose.prod.yml up -d

# 4. Run health check
cd .. && node scripts/health-check.mjs

# 5. Test authentication
node scripts/test-auth.mjs

# 6. Test CORS
curl -I -X OPTIONS http://localhost:5500/api/channels \
  -H "Origin: http://localhost:4500"

# 7. Test token generation
curl -X POST http://localhost:5500/tokens \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "name": "Test User"}'
```

---

## 📋 Issue Summary

| Issue | Severity | Status | Impact |
|-------|----------|--------|---------|
| CORS not configurable | CRITICAL | ✅ Fixed | Unblocks integration |
| Wrong endpoint in docs | CRITICAL | ✅ Fixed | Eliminates confusion |
| SQL schema mismatch | CRITICAL | ✅ Fixed | Bootstrap now works |
| Centrifugo missing ports | HIGH | ✅ Fixed | WebSocket CORS works |
| Secrets mismatch | CRITICAL | ✅ Fixed | Auth now works |
| WebSocket invalid token | HIGH | ✅ Documented | Clear resolution |
| No health check | MEDIUM | ✅ Enhanced | Faster debugging |

**All critical blockers resolved. Integration ready for production.**

---

## 📞 Support

- Full docs: `delivery-package/docs/`
- Troubleshooting: `delivery-package/docs/TROUBLESHOOTING.md`
- Integration examples: `examples/integrations/README.md`
- Health check: `node scripts/health-check.mjs`
- Validation: `node scripts/validate.mjs`

---

## 🎯 Next Release

Future improvements being considered:
- Additional auth provider integrations (Firebase, Clerk, Supabase)
- Docker Compose health check improvements
- Automated secret rotation tools
- Performance monitoring dashboards

---

**Questions?** Check `CRITICAL_FIXES.md` for detailed technical information.
