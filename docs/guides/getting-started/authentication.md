# Authentication Guide

Learn how authentication works in ChatSDK 2.0, including automatic token refresh and secure token management for mobile-first applications.

## Overview

ChatSDK uses a **hybrid authentication model** that combines your existing auth system with ChatSDK's token-based security:

1. **Your Backend** - Handles user authentication (email/password, OAuth, SSO, etc.)
2. **ChatSDK API** - Generates short-lived chat tokens for your authenticated users
3. **ChatSDK Client** - Auto-refreshes tokens before expiration (no user interruption!)

This architecture ensures:
- ✅ You keep full control of user authentication
- ✅ Users never see "token expired" errors
- ✅ Tokens are automatically refreshed in the background
- ✅ Mobile apps work offline and reconnect seamlessly

---

## Architecture Flow

```
┌──────────────┐
│  Your User   │
│ (Mobile App) │
└──────┬───────┘
       │ 1. Login with email/password or OAuth
       ▼
┌──────────────┐
│ Your Backend │ ◄─── YOUR authentication logic
│  (Node/Python│
│   /Ruby/Go)  │
└──────┬───────┘
       │ 2. POST /auth/tokens with user data + YOUR api key
       ▼
┌──────────────┐
│ ChatSDK API  │ ◄─── Validates API key, generates JWT tokens
└──────┬───────┘
       │ 3. Returns { accessToken, refreshToken, expiresAt }
       ▼
┌──────────────┐
│ Your Frontend│ ◄─── Initializes ChatSDK with tokens
│ (React/RN)   │
└──────┬───────┘
       │ 4. Auto-refresh 5 min before expiration
       ▼
┌──────────────┐
│ ChatSDK 2.0  │ ◄─── TokenManager handles refresh automatically
│(TokenManager)│
└──────────────┘
```

---

## Quick Start

### Step 1: Generate Tokens on Your Backend

Create an endpoint in YOUR backend that generates ChatSDK tokens:

**Node.js Example:**
```javascript
// routes/auth.js
app.post('/api/chat/token', async (req, res) => {
  // 1. Verify user is authenticated (YOUR auth middleware)
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Generate ChatSDK token
  const response = await fetch(`${CHATSDK_API_URL}/auth/tokens`, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.CHATSDK_API_KEY, // Keep this secret!
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: user.id,
      name: user.name,
      avatar: user.avatarUrl,
      // Optional custom data
      custom: {
        email: user.email,
        role: user.role,
      },
    }),
  });

  const tokens = await response.json();

  // 3. Return tokens to frontend
  res.json(tokens);
});
```

**Python (FastAPI) Example:**
```python
from fastapi import FastAPI, Depends
import httpx
import os

@app.post("/api/chat/token")
async def get_chat_token(user = Depends(get_current_user)):
    """Generate ChatSDK token for authenticated user"""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{os.getenv('CHATSDK_API_URL')}/auth/tokens",
            headers={
                "X-API-Key": os.getenv("CHATSDK_API_KEY"),
                "Content-Type": "application/json"
            },
            json={
                "userId": user.id,
                "name": user.name,
                "avatar": user.avatar_url,
                "custom": {
                    "email": user.email,
                    "department": user.department
                }
            }
        )

        return response.json()
```

### Step 2: Initialize ChatSDK in Your Frontend

**React Example:**
```typescript
import { ChatSDK } from '@chatsdk/core';
import { useEffect, useState } from 'react';

function App() {
  const [sdk, setSDK] = useState<ChatSDK | null>(null);

  useEffect(() => {
    const initChat = async () => {
      // 1. Get tokens from YOUR backend
      const response = await fetch('/api/chat/token', {
        headers: {
          'Authorization': `Bearer ${yourAuthToken}`,
        },
      });
      const { accessToken, refreshToken, expiresAt } = await response.json();

      // 2. Initialize ChatSDK with automatic token refresh
      const chatSDK = new ChatSDK({
        apiUrl: 'http://localhost:5500',
        wsUrl: 'ws://localhost:8001/connection/websocket',

        // Token refresh callback (saves new tokens)
        onTokenRefresh: (tokens) => {
          console.log('✅ Tokens auto-refreshed!');
          // Save to localStorage or secure storage
          localStorage.setItem('chatTokens', JSON.stringify(tokens));
        },
      });

      // 3. Connect with tokens
      await chatSDK.connect({
        userID: 'user-123',
        token: accessToken,
        refreshToken: refreshToken,
        expiresAt: expiresAt,
      });

      setSDK(chatSDK);
    };

    initChat();
  }, []);

  return <div>{sdk ? 'Connected!' : 'Connecting...'}</div>;
}
```

**React Native Example:**
```typescript
import { ChatSDK } from '@chatsdk/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initChat = async () => {
  // 1. Get tokens from YOUR backend
  const authToken = await AsyncStorage.getItem('authToken');
  const response = await fetch('https://yourapi.com/chat/token', {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  const { accessToken, refreshToken, expiresAt } = await response.json();

  // 2. Initialize ChatSDK
  const sdk = new ChatSDK({
    apiUrl: 'https://your-chatsdk-api.com',
    wsUrl: 'wss://your-chatsdk-api.com/ws',

    // Auto-refresh callback
    onTokenRefresh: async (tokens) => {
      // Save to secure storage
      await AsyncStorage.setItem('chatTokens', JSON.stringify(tokens));
    },
  });

  // 3. Connect
  await sdk.connect({
    userID: user.id,
    token: accessToken,
    refreshToken: refreshToken,
    expiresAt: expiresAt,
  });

  return sdk;
};
```

---

## Automatic Token Refresh (New in 2.0)

ChatSDK 2.0 automatically refreshes tokens **5 minutes before expiration**. This prevents users from ever experiencing "token expired" errors.

### How It Works

1. **Proactive Scheduling** - TokenManager schedules refresh 5 minutes before expiry
2. **Background Refresh** - Tokens refresh automatically while user is using the app
3. **No Interruption** - User never sees loading screens or errors
4. **Request Deduplication** - Concurrent refresh requests are deduplicated
5. **Reconnection** - WebSocket auto-reconnects with fresh token

### Token Lifecycle

```
Token Created
│  expiresIn: 3600s (1 hour)
│
├─ 0-55 min: Token is valid, no refresh needed
│  └─ SDK uses token for all requests
│
├─ 55 min: TokenManager triggers automatic refresh
│  ├─ POST /auth/refresh with refreshToken
│  ├─ Receives new accessToken + refreshToken
│  ├─ Calls onTokenRefresh callback
│  └─ Schedules next refresh
│
└─ 60 min: Old token expires (but new token already in use!)
```

### Configuration

**Default (recommended for mobile):**
```typescript
const sdk = new ChatSDK({
  apiUrl: 'https://api.yourdomain.com',
  wsUrl: 'wss://api.yourdomain.com/ws',

  // Refresh 5 minutes before expiration (default)
  refreshBufferMs: 5 * 60 * 1000,

  // Save refreshed tokens
  onTokenRefresh: (tokens) => {
    saveTokensSecurely(tokens);
  },

  // Handle refresh errors
  onRefreshError: (error) => {
    console.error('Token refresh failed:', error);
    // Redirect to login
    redirectToLogin();
  },
});
```

**Custom Buffer (e.g., refresh 10 min early):**
```typescript
const sdk = new ChatSDK({
  apiUrl: '...',
  wsUrl: '...',
  refreshBufferMs: 10 * 60 * 1000, // 10 minutes
});
```

---

## Token Storage

### Web (React)

**localStorage (simple, less secure):**
```typescript
// Save tokens
const saveTokens = (tokens: Tokens) => {
  localStorage.setItem('chatTokens', JSON.stringify(tokens));
};

// Load tokens
const loadTokens = (): Tokens | null => {
  const stored = localStorage.getItem('chatTokens');
  return stored ? JSON.parse(stored) : null;
};

// Initialize SDK with stored tokens
useEffect(() => {
  const tokens = loadTokens();
  if (tokens) {
    sdk.connect({
      userID: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
  }
}, []);
```

**httpOnly Cookies (more secure):**
```typescript
// Backend sets httpOnly cookie with refreshToken
res.cookie('chatRefreshToken', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Frontend only stores accessToken in memory
const [accessToken, setAccessToken] = useState<string>('');
```

### Mobile (React Native)

**AsyncStorage (simple):**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const saveTokens = async (tokens: Tokens) => {
  await AsyncStorage.setItem('chatTokens', JSON.stringify(tokens));
};

const loadTokens = async (): Promise<Tokens | null> => {
  const stored = await AsyncStorage.getItem('chatTokens');
  return stored ? JSON.parse(stored) : null;
};
```

**Secure Storage (recommended for production):**
```typescript
import * as SecureStore from 'expo-secure-store';

const saveTokens = async (tokens: Tokens) => {
  await SecureStore.setItemAsync('chatTokens', JSON.stringify(tokens));
};

const loadTokens = async (): Promise<Tokens | null> => {
  const stored = await SecureStore.getItemAsync('chatTokens');
  return stored ? JSON.parse(stored) : null;
};
```

---

## Security Best Practices

### 1. Never Expose API Keys

❌ **NEVER do this:**
```typescript
// DANGEROUS! API key exposed in frontend code
const tokens = await fetch('https://chatsdk-api.com/auth/tokens', {
  headers: { 'X-API-Key': 'YOUR_API_KEY' }, // ⚠️ Anyone can steal this!
});
```

✅ **Always do this:**
```typescript
// Safe: API key stays on your backend
const tokens = await fetch('https://YOUR-backend.com/api/chat/token', {
  headers: { 'Authorization': `Bearer ${yourAuthToken}` },
});
```

### 2. Use HTTPS in Production

```typescript
// Development
apiUrl: 'http://localhost:5500',
wsUrl: 'ws://localhost:8001/connection/websocket',

// Production
apiUrl: 'https://api.yourdomain.com',
wsUrl: 'wss://api.yourdomain.com/ws', // Note: wss:// not ws://
```

### 3. Validate Users on Your Backend

```javascript
app.post('/api/chat/token', authenticateUser, async (req, res) => {
  // authenticateUser middleware ensures user is logged in
  const user = req.user; // From JWT, session, etc.

  if (!user.hasAccessToChat) {
    return res.status(403).json({ error: 'No chat access' });
  }

  // Generate ChatSDK token
  // ...
});
```

### 4. Set Appropriate Token Expiry

```javascript
// Recommended: 1 hour access token, 7 day refresh token
const tokens = await generateChatSDKToken({
  userId: user.id,
  accessTokenExpiry: '1h',    // Short-lived
  refreshTokenExpiry: '7d',   // Longer-lived
});
```

### 5. Handle Logout Properly

```typescript
const logout = async () => {
  // 1. Disconnect from ChatSDK
  sdk.disconnect();

  // 2. Clear tokens
  localStorage.removeItem('chatTokens');

  // 3. Invalidate refresh token on backend
  await fetch('/api/auth/logout', { method: 'POST' });

  // 4. Redirect to login
  router.push('/login');
};
```

---

## Error Handling

### Token Expired (shouldn't happen with auto-refresh!)

```typescript
const sdk = new ChatSDK({
  apiUrl: '...',
  wsUrl: '...',

  onRefreshError: async (error) => {
    console.error('Token refresh failed:', error);

    // Clear invalid tokens
    localStorage.removeItem('chatTokens');

    // Redirect to login
    window.location.href = '/login';
  },
});
```

### Network Errors During Refresh

```typescript
// ChatSDK automatically retries failed refreshes with exponential backoff
// You just need to handle the final failure:

onRefreshError: (error) => {
  if (error.message.includes('Network')) {
    // Show offline banner
    showOfflineBanner();
  } else {
    // Token is invalid, require re-login
    redirectToLogin();
  }
},
```

---

## Testing Authentication

### Test Token Generation

```bash
curl -X POST http://localhost:5500/auth/tokens \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "name": "Test User",
    "avatar": "https://example.com/avatar.jpg"
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresAt": 1704835200000,
  "user": {
    "id": "test-user-123",
    "name": "Test User",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

### Test Token Refresh

```bash
curl -X POST http://localhost:5500/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGc..."
  }'
```

---

## Advanced: Custom Claims

Add custom data to tokens for permissions and role-based access:

```javascript
// Backend: Add custom claims
const tokens = await generateChatSDKToken({
  userId: user.id,
  name: user.name,
  custom: {
    role: 'admin',
    workspaceId: 'ws-123',
    permissions: ['read', 'write', 'delete'],
  },
});
```

```typescript
// Frontend: Access custom claims
const userInfo = sdk.getCurrentUser();
console.log(userInfo.custom.role); // 'admin'

// Use for UI permissions
if (userInfo.custom.role === 'admin') {
  return <AdminPanel />;
}
```

---

## Troubleshooting

**Problem:** "API key invalid"
- Check your backend is using correct `X-API-Key` header
- Verify API key in environment variable matches ChatSDK dashboard

**Problem:** "Tokens not refreshing"
- Check `onTokenRefresh` callback is defined
- Verify tokens are being saved to storage
- Check network tab for `/auth/refresh` calls

**Problem:** "WebSocket not connecting"
- Ensure `wsUrl` uses `wss://` in production (not `ws://`)
- Check CORS headers allow WebSocket upgrades
- Verify token is not expired

---

## Next Steps

- **[React Integration →](./react-first-steps.md)** - Build a full React chat UI
- **[React Native Guide →](./react-native-first-steps.md)** - Mobile app with offline auth
- **[Channel Management →](../features/channels.md)** - Create and manage chat channels
- **[Security Best Practices →](../advanced/security.md)** - Harden production auth

---

**Need help?** Join our [Discord community](https://discord.gg/chatsdk) or check the [API Reference](../../API_REFERENCE.md).
