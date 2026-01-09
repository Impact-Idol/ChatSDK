# Week 1 Implementation - Single Token Authentication DEMO

## What We Built

✅ **Backend**: New `/api/auth/connect` endpoint that combines token generation
✅ **SDK**: New `ChatSDK.connect()` static method for simplified integration
✅ **Dev Mode**: `ChatSDK.connectDevelopment()` for zero-config testing

---

## Before vs After Comparison

### BEFORE (ChatSDK 1.x) - 4 Steps

```typescript
// Step 1: Import and create client
import { createChatClient } from '@chatsdk/core';
const client = createChatClient({
  apiKey: 'your-api-key',
  apiUrl: 'http://localhost:5500',
  wsUrl: 'ws://localhost:8001/connection/websocket',
});

// Step 2: Fetch tokens from backend
const response = await fetch('http://localhost:5500/tokens', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key',
  },
  body: JSON.stringify({
    userId: 'user123',
    name: 'John Doe',
  }),
});
const { token, wsToken } = await response.json();

// Step 3: Connect user with both tokens
await client.connectUser(
  { id: 'user123', name: 'John Doe' },
  { token, wsToken } // Two separate tokens!
);

// Step 4: Now you can use the client
const channels = await client.getChannels();
```

**Pain Points:**
- ❌ 4 separate steps to get started
- ❌ Developer must understand dual-token system
- ❌ Manual token fetching from backend
- ❌ Confusing for beginners

---

### AFTER (ChatSDK 2.0) - 1 Step

```typescript
// One line - that's it!
import { ChatSDK } from '@chatsdk/core';

const client = await ChatSDK.connect({
  apiKey: 'your-api-key',
  userId: 'user123',
  displayName: 'John Doe',
});

// Ready to use immediately
const channels = await client.getChannels();
```

**Benefits:**
- ✅ **1 step** instead of 4
- ✅ Tokens managed internally
- ✅ No backend endpoint needed
- ✅ Beginner-friendly

---

## Development Mode (Zero Config)

For quick testing and prototyping:

```typescript
// No API key needed in development!
const client = await ChatSDK.connectDevelopment({
  userId: 'alice',
  displayName: 'Alice Johnson',
});

// Immediately start building
await client.sendMessage({
  channelId: 'general',
  text: 'Hello from dev mode!',
});
```

**Perfect for:**
- 🏃 Quick prototyping
- 🧪 Testing
- 📚 Tutorials
- 🎓 Learning ChatSDK

---

## API Endpoint Details

### POST /api/auth/connect

**Request:**
```json
{
  "userId": "user123",
  "displayName": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "email": "john@example.com",
  "metadata": {
    "department": "Engineering"
  }
}
```

**Headers:**
```
X-API-Key: your-api-key
Content-Type: application/json
```

**Response:**
```json
{
  "user": {
    "id": "user123",
    "displayName": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "metadata": { "department": "Engineering", "email": "john@example.com" }
  },
  "token": "eyJhbGci...15min-token",
  "refreshToken": "eyJhbGci...24hour-token",
  "expiresIn": 900,
  "_internal": {
    "wsToken": "eyJhbGci...websocket-token"
  }
}
```

**Features:**
- ✅ Auto-creates or updates user
- ✅ Generates 3 tokens (access, refresh, WebSocket)
- ✅ Access token expires in 15 minutes (short-lived)
- ✅ Refresh token expires in 24 hours
- ✅ WebSocket token expires in 24 hours
- ✅ Returns user info for confirmation

---

## Error Handling

ChatSDK 2.0 provides helpful error messages:

```typescript
try {
  const client = await ChatSDK.connect({
    apiKey: 'invalid-key',
    userId: 'user123',
  });
} catch (error) {
  console.error(error.message);
  // Output:
  // Failed to connect to ChatSDK: Invalid API key
  //
  // 💡 Check that your API key is correct. You can find it in the ChatSDK dashboard.
}
```

**Error Codes:**
- `MISSING_API_KEY` - No X-API-Key header
- `INVALID_API_KEY` - API key not found
- `DATABASE_ERROR` - Server-side error
- `REFRESH_TOKEN_EXPIRED` - Token refresh needed

---

## Migration Guide (1.x → 2.0)

### Step 1: Update imports

```diff
- import { createChatClient } from '@chatsdk/core';
+ import { ChatSDK } from '@chatsdk/core';
```

### Step 2: Simplify connection

```diff
- const client = createChatClient({ apiKey: 'xxx' });
- const { token, wsToken } = await fetchToken();
- await client.connectUser(user, { token, wsToken });

+ const client = await ChatSDK.connect({
+   apiKey: 'xxx',
+   userId: 'user123',
+   displayName: 'John Doe',
+ });
```

### Step 3: Remove token fetching logic

```diff
- // Delete this entire function
- async function fetchToken(userId, name) {
-   const response = await fetch('/tokens', {
-     method: 'POST',
-     headers: { 'X-API-Key': apiKey },
-     body: JSON.stringify({ userId, name }),
-   });
-   return response.json();
- }
```

Done! Your code is now using ChatSDK 2.0.

---

## Testing

### Manual Test (Backend API)

```bash
# 1. Start the API server
cd packages/api
npm run dev

# 2. Test the new endpoint
curl -X POST http://localhost:5500/api/auth/connect \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key" \
  -d '{
    "userId": "test-user",
    "displayName": "Test User",
    "avatar": "https://i.pravatar.cc/150?u=test-user"
  }'

# Expected: JSON with token, refreshToken, user, _internal.wsToken
```

### Manual Test (SDK)

Create a test file: `test-week1.ts`

```typescript
import { ChatSDK } from '@chatsdk/core';

async function testWeek1() {
  console.log('🧪 Testing Week 1: Single Token Authentication\n');

  try {
    // Test 1: Connect with API key
    console.log('Test 1: ChatSDK.connect()');
    const client = await ChatSDK.connect({
      apiKey: 'dev-api-key',
      userId: 'alice',
      displayName: 'Alice Johnson',
      avatar: 'https://i.pravatar.cc/150?u=alice',
      debug: true,
    });
    console.log('✅ Connected successfully!\n');

    // Test 2: Get channels
    console.log('Test 2: Get channels');
    const channels = await client.getChannels();
    console.log(`✅ Found ${channels.length} channels\n`);

    // Test 3: Disconnect
    console.log('Test 3: Disconnect');
    client.disconnect();
    console.log('✅ Disconnected\n');

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testWeek1();
```

Run:
```bash
npx tsx test-week1.ts
```

---

## What's Next

✅ **Week 1 Complete**: Single token authentication implemented

**Coming in Week 2:**
- CLI tool: `npx create-chatsdk-app`
- Project templates (Next.js, Vite, React Native)
- Quickstart documentation
- 5 example applications

**Goal:** Time to first message: 2 hours → **5 minutes** 🚀
