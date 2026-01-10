# Migrating from ChatSDK 1.5 to 2.0

This guide helps you upgrade from v1.5 to v2.0 with minimal hassle.

**Estimated Migration Time:** 30 minutes - 2 hours (depending on project size)

---

## 🎯 Quick Start

```bash
# 1. Update dependencies
npm install @chatsdk/core@latest @chatsdk/react@latest

# 2. Update authentication code (see below)

# 3. Update React hooks (see below)

# 4. Clean up environment variables (see below)

# 5. Test
npm run dev
```

---

## ⚠️ Breaking Changes

### 1. Authentication API

**Impact:** HIGH - Affects all projects

#### Before (v1.5)

```typescript
import { createClient } from '@chatsdk/core';

const client = createClient({ apiKey: process.env.API_KEY });

await client.connectUser(
  {
    id: 'user-123',
    displayName: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
  },
  userToken // Separate token
);
```

#### After (v2.0)

```typescript
import { ChatSDK } from '@chatsdk/core';

const client = await ChatSDK.connect({
  apiKey: process.env.API_KEY,
  userId: 'user-123',
  displayName: 'John Doe',
  avatar: 'https://example.com/avatar.jpg',
});
```

#### Migration Steps

1. **Replace `createClient` with `ChatSDK.connect`:**

   ```typescript
   // Find and replace in your codebase
   - import { createClient } from '@chatsdk/core';
   + import { ChatSDK } from '@chatsdk/core';

   - const client = createClient({ ... });
   - await client.connectUser({ ... }, token);
   + const client = await ChatSDK.connect({ ... });
   ```

2. **Merge user data into connect options:**

   User properties (id, displayName, avatar) are now part of `connect()` options:

   ```typescript
   // Before
   const user = {
     id: 'user-123',
     displayName: 'John',
     avatar: 'https://...'
   };
   await client.connectUser(user, token);

   // After
   await ChatSDK.connect({
     apiKey: apiKey,
     userId: 'user-123',
     displayName: 'John',
     avatar: 'https://...'
   });
   ```

3. **Remove separate token management:**

   v2.0 handles tokens internally - you don't need to pass a separate user token.

#### Benefits

- **Simpler:** One call instead of two
- **Faster:** Eliminates extra network request
- **Safer:** No token exposure in client code
- **Automatic refresh:** Tokens refresh seamlessly

---

### 2. React Hooks API

**Impact:** MEDIUM - Affects React projects using hooks

#### Before (v1.5)

```typescript
import { useMessages, useChannels, usePresence } from '@chatsdk/react';

const messages = useMessages({ channelId: '123', limit: 50 });
const channels = useChannels({ userId: 'user-123' });
const presence = usePresence({ userId: 'user-123' });
```

#### After (v2.0)

```typescript
import { useMessages, useChannels, usePresence } from '@chatsdk/react';

// ID is first argument, options are second
const messages = useMessages('123', { limit: 50 });
const channels = useChannels('user-123');
const presence = usePresence('user-123');
```

#### Migration Steps

1. **Update `useMessages` calls:**

   ```typescript
   // Before
   const messages = useMessages({ channelId: '123', limit: 50, offset: 0 });

   // After
   const messages = useMessages('123', { limit: 50, offset: 0 });
   ```

2. **Update `useChannels` calls:**

   ```typescript
   // Before
   const channels = useChannels({ userId: 'user-123' });

   // After
   const channels = useChannels('user-123');
   ```

3. **Update `usePresence` calls:**

   ```typescript
   // Before
   const presence = usePresence({ userId: 'user-123' });

   // After
   const presence = usePresence('user-123');
   ```

#### Automated Migration

Use this find-and-replace regex in your editor:

```regex
# Find
useMessages\(\{\s*channelId:\s*['"]([^'"]+)['"],\s*(.+)\s*\}\)

# Replace
useMessages('$1', { $2 })
```

#### Benefits

- **Cleaner:** Less verbose syntax
- **Consistent:** Matches standard React hook patterns
- **Better TypeScript:** Improved type inference

---

### 3. Environment Variables

**Impact:** LOW - Mostly removes unused variables

#### Before (v1.5)

Required **20+ environment variables:**

```bash
# API
API_URL=http://localhost:3000
API_PORT=3000
API_HOST=localhost

# Database
DATABASE_URL=postgresql://...
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Centrifugo (WebSocket)
CENTRIFUGO_URL=http://localhost:8000
CENTRIFUGO_API_KEY=xxx
CENTRIFUGO_SECRET=xxx
CENTRIFUGO_TOKEN_HMAC_SECRET=xxx

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_BUCKET=chatsdk

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=xxx

# JWT
JWT_SECRET=xxx
JWT_EXPIRATION=7d

# ... 10 more
```

#### After (v2.0)

**Development:** Zero required (all have smart defaults)

**Production:** Only **3 required:**

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-here
CENTRIFUGO_SECRET=your-centrifugo-secret
```

**Optional (override defaults):**

```bash
# API Configuration
API_PORT=3000                    # Default: 3000
CORS_ORIGIN=https://example.com  # Default: *

# Redis (optional - uses in-memory if not provided)
REDIS_URL=redis://localhost:6379

# File Storage (optional - uses local storage if not provided)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# Search (optional - disables search if not provided)
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=xxx
```

#### Migration Steps

1. **Create new `.env` file:**

   ```bash
   # Copy your existing values
   DATABASE_URL=postgresql://...  # Keep
   JWT_SECRET=xxx                  # Keep
   CENTRIFUGO_SECRET=xxx           # Keep (was CENTRIFUGO_TOKEN_HMAC_SECRET)
   ```

2. **Remove unnecessary variables:**

   Delete these (v2.0 has smart defaults):
   - `API_URL`, `API_PORT`, `API_HOST`
   - `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`
   - `REDIS_HOST`, `REDIS_PORT` (use `REDIS_URL`)
   - `CENTRIFUGO_URL`, `CENTRIFUGO_API_KEY`, `CENTRIFUGO_TOKEN_HMAC_SECRET`
   - `S3_BUCKET` (auto-created)
   - `JWT_EXPIRATION` (now 7d by default)

3. **Rename if needed:**

   ```bash
   # Before
   CENTRIFUGO_TOKEN_HMAC_SECRET=xxx

   # After
   CENTRIFUGO_SECRET=xxx
   ```

4. **Test in development:**

   ```bash
   # Should work with no .env file!
   rm .env
   npm run dev
   ```

#### Benefits

- **Simpler:** 85% fewer required variables
- **Faster:** Zero-config development
- **Safer:** Smart defaults prevent misconfiguration

---

## 🆕 New Features to Adopt

### 1. Automatic Retry

**No code changes needed!** Messages now automatically retry on failure.

```typescript
// This now retries automatically (3 attempts by default)
await chat.sendMessage({ text: 'Hello' });
```

**Customize retry behavior:**

```typescript
await chat.sendMessage(
  { text: 'Hello' },
  {
    retry: {
      maxAttempts: 5,
      backoff: 'exponential', // or 'linear', 'fixed'
    },
  }
);
```

---

### 2. Offline Queue

**No code changes needed!** Messages are queued when offline and sent when reconnected.

**Monitor offline queue:**

```typescript
import { offlineQueue } from '@chatsdk/core';

// Get pending messages
const pending = offlineQueue.getPending();
console.log(`${pending.length} messages queued`);

// Listen for queue changes
offlineQueue.on('queued', (message) => {
  console.log('Message queued:', message);
});

offlineQueue.on('sent', (message) => {
  console.log('Message sent from queue:', message);
});
```

---

### 3. Network Indicator

**New React component** for showing connection status:

```tsx
import { NetworkIndicator } from '@chatsdk/react';

function App() {
  return (
    <>
      <NetworkIndicator /> {/* Shows connection status */}
      <Chat />
    </>
  );
}
```

**Or use the hook:**

```tsx
import { useNetworkQuality } from '@chatsdk/react';

function ConnectionStatus() {
  const { quality, latency, isOnline } = useNetworkQuality();

  return (
    <div>
      Quality: {quality}  {/* EXCELLENT, GOOD, FAIR, POOR */}
      Latency: {latency}ms
      {!isOnline && <span>Offline</span>}
    </div>
  );
}
```

---

### 4. Debug Mode

**Enable comprehensive logging:**

```bash
# Via URL (easiest for development)
http://localhost:3000?chatsdk_debug=true

# Via localStorage (persistent)
localStorage.setItem('chatsdk_debug', 'true');

# Programmatically
import { logger, LogLevel } from '@chatsdk/core';
logger.setLevel(LogLevel.DEBUG);
```

**Export logs for debugging:**

```typescript
import { logger } from '@chatsdk/core';

// Export logs as JSON
const logsJson = logger.exportLogs();
console.log(logsJson);

// Get log statistics
const stats = logger.getStats();
console.log('Total logs:', stats.total);
console.log('By level:', stats.byLevel);
```

---

### 5. Chrome DevTools Extension

**Install the extension:**

1. Go to Chrome Web Store (link coming soon)
2. Search "ChatSDK DevTools"
3. Click "Add to Chrome"

**Or load unpacked (development):**

1. Clone repo: `git clone https://github.com/chatsdk/chatsdk`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `chatsdk/extension/` directory

**Use the extension:**

1. Open DevTools (F12)
2. Click "ChatSDK" tab
3. Explore:
   - **Logs:** Real-time log streaming
   - **Messages:** View all messages
   - **State:** SDK state inspector
   - **Performance:** Performance metrics

---

### 6. Enhanced Error Handling

**Errors now include fix suggestions:**

```typescript
import { createError } from '@chatsdk/core';

try {
  await chat.sendMessage({ text: '' }); // Empty text
} catch (err) {
  const error = createError(err);
  console.error(error.toString());
  // Output:
  // ValidationError [VALIDATION_ERROR]: Message text cannot be empty
  // 💡 Provide text content for the message.
  // 📖 Learn more: https://docs.chatsdk.dev/api/messages
}
```

**Error types:**

- `AuthenticationError` - Token/auth issues
- `NetworkError` - Connection problems
- `PermissionError` - Authorization failures
- `RateLimitError` - Too many requests
- `ValidationError` - Invalid input
- `ConnectionError` - WebSocket issues
- `TimeoutError` - Request timeouts
- `ConfigurationError` - Setup issues

---

### 7. Performance Profiler

**Track operation performance:**

```typescript
import { profiler } from '@chatsdk/core';

// Manual timing
const end = profiler.start('message.send');
await sendMessage(data);
end();

// View stats
const stats = profiler.getStats('message.send');
console.log('Average:', stats.avg + 'ms');
console.log('p95:', stats.p95 + 'ms');

// Generate report
profiler.report(); // Pretty console.table()
```

**Or use decorator (TypeScript):**

```typescript
import { Profile } from '@chatsdk/core';

class ChatService {
  @Profile('chat.sendMessage')
  async sendMessage(data: MessageData) {
    // Automatically profiled!
  }
}
```

---

## 🧪 Testing Your Migration

### 1. Smoke Tests

Run these basic tests to verify migration:

```bash
# Start dev server
npm run dev

# Should start without errors ✅

# Open app
http://localhost:3000

# Should load ✅

# Enable debug mode
http://localhost:3000?chatsdk_debug=true

# Should see debug logs ✅
```

---

### 2. Authentication Test

```typescript
// Test new authentication
const client = await ChatSDK.connect({
  apiKey: process.env.API_KEY,
  userId: 'test-user',
  displayName: 'Test User',
});

console.log('Connected:', client.isConnected()); // Should be true ✅
console.log('User:', client.getCurrentUser()); // Should return user ✅
```

---

### 3. Messaging Test

```typescript
// Test message send
const message = await client.sendMessage({
  channelId: 'test-channel',
  text: 'Test message',
});

console.log('Message sent:', message.id); // Should have ID ✅
```

---

### 4. Offline Test

```typescript
// Test offline queue
// 1. Open DevTools → Network → Enable "Offline"
// 2. Send message
await client.sendMessage({ channelId: 'test', text: 'Offline message' });

// 3. Check offline queue
import { offlineQueue } from '@chatsdk/core';
console.log('Queued:', offlineQueue.getPending().length); // Should be 1 ✅

// 4. Disable "Offline"
// 5. Message should send automatically ✅
```

---

### 5. React Hooks Test

```tsx
function TestComponent() {
  const messages = useMessages('test-channel', { limit: 50 });

  console.log('Messages:', messages.length); // Should work ✅
  return <div>{messages.length} messages</div>;
}
```

---

## 🔄 Rollback Plan

If you need to rollback to v1.5:

```bash
# 1. Revert dependencies
npm install @chatsdk/core@1.5.0 @chatsdk/react@1.5.0

# 2. Restore old .env file
cp .env.backup .env

# 3. Revert code changes (use git)
git checkout main -- src/

# 4. Test
npm run dev
```

**Note:** Keep your v1.5 code in a git branch before migrating!

---

## 📊 Migration Checklist

Use this checklist to track your migration:

### Pre-Migration

- [ ] Read this guide completely
- [ ] Review [CHANGELOG.md](./CHANGELOG.md)
- [ ] Create git branch for migration: `git checkout -b upgrade-to-v2`
- [ ] Backup current .env: `cp .env .env.backup`
- [ ] Run existing tests to ensure they pass
- [ ] Document current behavior (screenshots/videos)

### Code Changes

- [ ] Update dependencies: `npm install @chatsdk/core@latest @chatsdk/react@latest`
- [ ] Replace `createClient` with `ChatSDK.connect`
- [ ] Update `connectUser()` calls
- [ ] Update React hook calls (`useMessages`, `useChannels`, etc.)
- [ ] Remove separate token management code
- [ ] Add TypeScript types if missing

### Configuration Changes

- [ ] Update .env file (keep only 3 required vars)
- [ ] Remove unused environment variables
- [ ] Test with zero-config development (`rm .env && npm run dev`)
- [ ] Update production .env for deployment

### Testing

- [ ] Run smoke tests (app starts, loads)
- [ ] Test authentication flow
- [ ] Test message sending
- [ ] Test offline queue
- [ ] Test React hooks
- [ ] Run full test suite: `npm test`
- [ ] Test in production-like environment

### Optional Enhancements

- [ ] Add NetworkIndicator component
- [ ] Enable debug mode for development
- [ ] Install Chrome DevTools extension
- [ ] Add error handling with createError()
- [ ] Add performance profiling for critical paths
- [ ] Update documentation/README

### Deployment

- [ ] Deploy to staging environment
- [ ] Test all critical flows in staging
- [ ] Monitor error logs for issues
- [ ] Deploy to production
- [ ] Monitor production metrics (latency, errors)
- [ ] Celebrate! 🎉

---

## 🆘 Common Migration Issues

### Issue: "Cannot find module '@chatsdk/core'"

**Cause:** Dependencies not installed

**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: "ChatSDK.connect is not a function"

**Cause:** Still importing old `createClient`

**Fix:**
```typescript
// Wrong
import { createClient } from '@chatsdk/core';

// Correct
import { ChatSDK } from '@chatsdk/core';
```

---

### Issue: "useMessages returns undefined"

**Cause:** Using old hook API

**Fix:**
```typescript
// Wrong
const messages = useMessages({ channelId: '123' });

// Correct
const messages = useMessages('123');
```

---

### Issue: "Authentication failed"

**Cause:** Missing JWT_SECRET or incorrect API key

**Fix:**
```bash
# Ensure these are set
echo $JWT_SECRET     # Should not be empty
echo $API_KEY        # Should be valid
```

---

### Issue: "WebSocket connection failed"

**Cause:** CENTRIFUGO_SECRET not set

**Fix:**
```bash
# Set in .env
CENTRIFUGO_SECRET=your-secret-here
```

---

### Issue: "Database connection error"

**Cause:** DATABASE_URL not set or incorrect

**Fix:**
```bash
# Test connection
psql $DATABASE_URL

# Should connect successfully
```

---

## 📞 Getting Help

If you're stuck during migration:

### Documentation
- **Migration Guide:** This document
- **API Docs:** https://docs.chatsdk.dev
- **Troubleshooting:** https://docs.chatsdk.dev/troubleshooting

### Community
- **Discord:** https://discord.gg/chatsdk (#migration-help channel)
- **GitHub Issues:** https://github.com/chatsdk/chatsdk/issues (tag: migration)
- **Stack Overflow:** Tag questions with `chatsdk`

### Support
- **Email:** support@chatsdk.dev
- **Response time:** <24 hours

---

## 🎉 Migration Complete!

Once you've completed the checklist, you should have:

✅ ChatSDK 2.0 installed and running
✅ All breaking changes addressed
✅ Tests passing
✅ Production deployment updated

**Enjoy the new features:**
- 5-minute setup
- 99.9% message delivery
- Comprehensive debugging tools
- 35% smaller bundle
- Better documentation

**Welcome to ChatSDK 2.0!** 🚀

---

## 📈 Post-Migration

### Recommended Next Steps

1. **Enable Debug Mode:** Add `?chatsdk_debug=true` to development URLs
2. **Install DevTools Extension:** For better debugging experience
3. **Review Performance:** Use the new profiler to identify bottlenecks
4. **Update Documentation:** Update your project docs to reflect v2.0 changes
5. **Share Feedback:** Let us know how migration went!

### Migration Feedback

Help us improve this guide! If you:
- Found issues not covered here
- Have suggestions for better migration
- Discovered useful patterns

Please share:
- Discord: #migration-help
- GitHub: Create issue with "migration" label
- Email: feedback@chatsdk.dev

---

**Last Updated:** January 9, 2026
**For ChatSDK:** v2.0.0
**Maintained By:** ChatSDK Core Team
