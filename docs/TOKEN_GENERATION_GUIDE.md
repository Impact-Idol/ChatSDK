# ChatSDK Token Generation Guide

## Overview

ChatSDK uses an **SDK-as-Service** architecture where your application handles user authentication and ChatSDK validates tokens. This pattern is similar to services like Twilio, Stream, and SendGrid.

**In this model:**
- ✅ Your backend authenticates users (email/password, OAuth, SAML, etc.)
- ✅ Your backend calls ChatSDK's `/tokens` endpoint to generate chat tokens
- ✅ Your frontend receives tokens and initializes ChatSDK
- ✅ ChatSDK validates tokens for all subsequent API calls

## Architecture Flow

```
┌─────────────────┐
│   Your User     │
└────────┬────────┘
         │ 1. Login (email/password, OAuth, etc.)
         ▼
┌─────────────────┐
│  Your Backend   │
│  (Node, Python, │
│   Ruby, etc.)   │
└────────┬────────┘
         │ 2. POST /tokens with user data
         ▼
┌─────────────────┐
│   ChatSDK API   │ ◄─── You are here
│   (validates    │
│    API keys)    │
└────────┬────────┘
         │ 3. Returns JWT tokens
         ▼
┌─────────────────┐
│  Your Frontend  │
│  (React, Vue,   │
│   Native, etc.) │
└────────┬────────┘
         │ 4. Initialize ChatSDK with tokens
         ▼
┌─────────────────┐
│ ChatSDK Client  │
│  (REST + WS)    │
└─────────────────┘
```

## Prerequisites

1. **ChatSDK Application**: Create an application in ChatSDK to get your `API_KEY`
2. **Backend Server**: Any backend that can make HTTP requests (Node.js, Python, Ruby, PHP, etc.)
3. **Secure Environment**: NEVER expose your ChatSDK API key on the frontend

## Step 1: Generate Tokens on Your Backend

### Endpoint

```
POST https://your-chatsdk-instance.com/tokens
```

### Headers

```
X-API-Key: your_chatsdk_api_key
Content-Type: application/json
```

### Request Body

```json
{
  "userId": "user-123",           // Required: Your internal user ID
  "name": "Alice Johnson",        // Optional: Display name
  "image": "https://...",         // Optional: Avatar URL
  "custom": {                     // Optional: Custom metadata
    "department": "Engineering",
    "role": "Senior Developer"
  }
}
```

### Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",      // JWT for REST API calls
  "wsToken": "eyJhbGciOiJIUzI1NiJ9...",   // JWT for WebSocket connection
  "user": {
    "id": "user-123",
    "name": "Alice Johnson",
    "image": "https://..."
  },
  "expiresIn": 86400                       // Token lifetime in seconds (24h)
}
```

## Step 2: Implementation Examples

### Node.js (Express)

```javascript
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const CHATSDK_API_URL = process.env.CHATSDK_API_URL;
const CHATSDK_API_KEY = process.env.CHATSDK_API_KEY;

app.post('/api/auth/chat-token', async (req, res) => {
  // 1. Verify user is authenticated (your existing auth middleware)
  const user = req.user; // From your auth system

  // 2. Generate ChatSDK token
  try {
    const response = await fetch(`${CHATSDK_API_URL}/tokens`, {
      method: 'POST',
      headers: {
        'X-API-Key': CHATSDK_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.id,
        name: user.name,
        image: user.avatarUrl,
        custom: {
          email: user.email,
          department: user.department
        }
      })
    });

    const tokens = await response.json();
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate chat token' });
  }
});
```

### Python (FastAPI)

```python
from fastapi import FastAPI, Depends
import httpx
import os

app = FastAPI()
CHATSDK_API_URL = os.getenv("CHATSDK_API_URL")
CHATSDK_API_KEY = os.getenv("CHATSDK_API_KEY")

@app.post("/api/auth/chat-token")
async def get_chat_token(user: User = Depends(get_current_user)):
    """Generate ChatSDK token for authenticated user"""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CHATSDK_API_URL}/tokens",
            headers={
                "X-API-Key": CHATSDK_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "userId": user.id,
                "name": user.name,
                "image": user.avatar_url,
                "custom": {
                    "email": user.email,
                    "department": user.department
                }
            }
        )

        return response.json()
```

### Ruby (Rails)

```ruby
class ChatTokensController < ApplicationController
  before_action :authenticate_user!

  def create
    # Generate ChatSDK token for current user
    response = HTTParty.post(
      "#{ENV['CHATSDK_API_URL']}/tokens",
      headers: {
        'X-API-Key' => ENV['CHATSDK_API_KEY'],
        'Content-Type' => 'application/json'
      },
      body: {
        userId: current_user.id,
        name: current_user.name,
        image: current_user.avatar_url,
        custom: {
          email: current_user.email,
          department: current_user.department
        }
      }.to_json
    )

    render json: response.body
  end
end
```

### PHP (Laravel)

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatTokenController extends Controller
{
    public function generate(Request $request)
    {
        $user = $request->user(); // Authenticated user

        $response = Http::withHeaders([
            'X-API-Key' => env('CHATSDK_API_KEY'),
            'Content-Type' => 'application/json'
        ])->post(env('CHATSDK_API_URL') . '/tokens', [
            'userId' => $user->id,
            'name' => $user->name,
            'image' => $user->avatar_url,
            'custom' => [
                'email' => $user->email,
                'department' => $user->department
            ]
        ]);

        return $response->json();
    }
}
```

## Step 3: Initialize ChatSDK on Your Frontend

### React Example

```typescript
import { ChatClient } from '@chatsdk/core';
import { ChatProvider } from '@chatsdk/react';

function App() {
  const [chatTokens, setChatTokens] = useState(null);

  useEffect(() => {
    // Fetch tokens from YOUR backend
    async function initChat() {
      const response = await fetch('/api/auth/chat-token', {
        credentials: 'include' // Include your auth cookies
      });
      const tokens = await response.json();
      setChatTokens(tokens);
    }

    initChat();
  }, []);

  if (!chatTokens) return <div>Loading chat...</div>;

  return (
    <ChatProvider
      apiUrl="https://your-chatsdk-instance.com/api"
      wsUrl="wss://your-chatsdk-instance.com/ws"
      token={chatTokens.token}
      wsToken={chatTokens.wsToken}
    >
      <YourChatUI />
    </ChatProvider>
  );
}
```

### React Native Example

```typescript
import { ChatClient } from '@chatsdk/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function initializeChatSDK(userAccessToken: string) {
  // 1. Call your backend to get ChatSDK tokens
  const response = await fetch('https://your-api.com/chat-token', {
    headers: {
      'Authorization': `Bearer ${userAccessToken}`
    }
  });

  const { token, wsToken } = await response.json();

  // 2. Store tokens securely
  await AsyncStorage.setItem('chat_token', token);
  await AsyncStorage.setItem('chat_ws_token', wsToken);

  // 3. Initialize ChatSDK client
  const client = new ChatClient({
    apiUrl: 'https://your-chatsdk-instance.com/api',
    wsUrl: 'wss://your-chatsdk-instance.com/ws',
    token,
    wsToken
  });

  await client.connect();
  return client;
}
```

## Token Lifecycle Management

### Token Expiration

Tokens expire after **24 hours**. Handle expiration gracefully:

```typescript
// React hook example
function useChatToken() {
  const [token, setToken] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshToken = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/auth/chat-token');
      const tokens = await response.json();
      setToken(tokens);
      localStorage.setItem('chat_tokens', JSON.stringify(tokens));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh token proactively before expiration
  useEffect(() => {
    const interval = setInterval(refreshToken, 20 * 60 * 60 * 1000); // 20 hours
    return () => clearInterval(interval);
  }, []);

  // Handle 401 errors by refreshing token
  useEffect(() => {
    const interceptor = chatClient.on('unauthorized', () => {
      refreshToken();
    });
    return () => interceptor.remove();
  }, []);

  return { token, isRefreshing, refreshToken };
}
```

### Token Storage

**Web Applications:**
- ✅ Store in memory (most secure, lost on refresh)
- ✅ Store in `sessionStorage` (lost when tab closes)
- ✅ Store in `localStorage` (persists across tabs)
- ❌ DO NOT store in cookies accessible by JavaScript

**Mobile Applications:**
- ✅ Use secure storage (iOS Keychain, Android KeyStore)
- ✅ Use libraries like `react-native-keychain`
- ❌ DO NOT store in AsyncStorage for production

## Security Best Practices

### 1. Never Expose API Keys on Frontend

❌ **WRONG - API key exposed:**
```javascript
// DO NOT DO THIS
const tokens = await fetch('https://chatsdk.com/tokens', {
  headers: {
    'X-API-Key': 'chatsdk_abc123...' // ❌ Exposed to client!
  }
});
```

✅ **CORRECT - API key on backend:**
```javascript
// Your backend endpoint
const tokens = await fetch('https://your-backend.com/api/chat-token', {
  headers: {
    'Authorization': `Bearer ${userAccessToken}` // ✅ Your auth system
  }
});
```

### 2. Validate Users Before Generating Tokens

Always verify the user is authenticated in YOUR system before generating ChatSDK tokens:

```javascript
app.post('/api/chat-token', authenticateUser, async (req, res) => {
  // authenticateUser middleware ensures user is logged in
  // Only generate token for verified users
});
```

### 3. Rate Limiting

Implement rate limiting on your token generation endpoint:

```javascript
const rateLimit = require('express-rate-limit');

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 requests per window
  message: 'Too many token requests, please try again later'
});

app.post('/api/chat-token', tokenLimiter, async (req, res) => {
  // Generate token
});
```

### 4. Custom Metadata

Use the `custom` field to store app-specific data:

```javascript
{
  "userId": "user-123",
  "name": "Alice Johnson",
  "custom": {
    "organizationId": "org-456",
    "role": "admin",
    "permissions": ["read", "write", "delete"],
    "tenantId": "tenant-789"
  }
}
```

This metadata is stored with the user and can be used for:
- Access control
- Analytics
- User segmentation
- Custom UI rendering

## Troubleshooting

### "Invalid API key" Error

**Problem:** `POST /tokens` returns 401 Unauthorized

**Solution:**
1. Verify your API key is correct: `X-API-Key: chatsdk_...`
2. Check the API key is for the correct ChatSDK application
3. Ensure the API key hasn't been revoked

### "User already exists" Conflicts

**Problem:** Token generation creates duplicate users

**Solution:** ChatSDK automatically handles this with upserts. If you provide the same `userId`, it updates the existing user's name/image/metadata instead of creating duplicates.

### Token Validation Failures

**Problem:** REST API calls return 401 after token generation

**Solution:**
1. Verify you're using the `token` field (not `wsToken`) for REST API calls
2. Check token hasn't expired (24 hour lifetime)
3. Ensure `Authorization: Bearer <token>` header format is correct

### WebSocket Connection Failures

**Problem:** Real-time features don't work

**Solution:**
1. Verify you're using `wsToken` (not `token`) for WebSocket connections
2. Check WebSocket URL is correct (wss:// for production)
3. Verify Centrifugo is running and accessible

## Demo Implementation

See our demo implementation in [`/examples/react-chat-huly/src/lib/auth.ts`](../examples/react-chat-huly/src/lib/auth.ts) for a complete example of:
- Token generation
- Token storage
- Token refresh
- Error handling

## Next Steps

1. **Implement Backend Endpoint**: Create `/api/chat-token` endpoint in your backend
2. **Secure API Keys**: Store ChatSDK API key in environment variables
3. **Test Token Generation**: Verify tokens are generated correctly
4. **Initialize Frontend**: Integrate ChatSDK client with generated tokens
5. **Handle Expiration**: Implement token refresh logic
6. **Production Checklist**: Review security best practices

## Support

For questions or issues:
- 📖 Documentation: https://docs.chatsdk.dev
- 💬 Discord: https://discord.gg/chatsdk
- 📧 Email: support@chatsdk.dev
- 🐛 Issues: https://github.com/your-org/chatsdk/issues
