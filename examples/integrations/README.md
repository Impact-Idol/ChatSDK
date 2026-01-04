# ChatSDK Authentication Integrations

**Copy-paste code for popular auth providers** - Get ChatSDK working with your existing authentication in minutes!

## Available Integrations

| Provider | File | Status |
|----------|------|--------|
| **NextAuth** | [nextauth-integration.ts](nextauth-integration.ts) | ✅ Production Ready |
| **Auth0** | [auth0-integration.ts](auth0-integration.ts) | ✅ Production Ready |

---

## NextAuth Integration (Next.js)

### 1. Copy Integration File
```bash
cp integrations/nextauth-integration.ts lib/chatsdk-nextauth.ts
```

### 2. Install Dependencies
```bash
npm install next-auth @chatsdk/core @chatsdk/react
```

### 3. Create API Route
**File:** `pages/api/chatsdk/token.ts`

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const response = await fetch(`${process.env.CHATSDK_API_URL}/tokens`, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.CHATSDK_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: session.user.id || session.user.email,
      name: session.user.name,
      image: session.user.image,
    }),
  });

  const tokens = await response.json();
  res.json(tokens);
}
```

### 4. Environment Variables
**File:** `.env.local`

```bash
# ChatSDK (Server-side)
CHATSDK_API_KEY=your-api-key-from-credentials-json
CHATSDK_API_URL=http://localhost:5500

# ChatSDK (Client-side)
NEXT_PUBLIC_CHATSDK_API_URL=http://localhost:5500
```

### 5. Wrap Your App
**File:** `pages/_app.tsx`

```typescript
import { SessionProvider } from 'next-auth/react';
import { ChatSDKProvider } from '../lib/chatsdk-nextauth';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <ChatSDKProvider>
        <Component {...pageProps} />
      </ChatSDKProvider>
    </SessionProvider>
  );
}
```

### 6. Use in Components
```typescript
import { useChannels, useMessages } from '@chatsdk/react';

export function ChatComponent() {
  const { channels } = useChannels();
  const { messages } = useMessages(channelId);

  // Your chat UI here
}
```

---

## Auth0 Integration (React)

### 1. Copy Integration File
```bash
cp integrations/auth0-integration.ts src/lib/chatsdk-auth0.ts
```

### 2. Install Dependencies
```bash
npm install @auth0/auth0-react @chatsdk/core @chatsdk/react
```

### 3. Backend API Route (Express)
**File:** `server/routes/chatsdk.js`

```javascript
import express from 'express';
import { auth } from 'express-oauth2-jwt-bearer';

const router = express.Router();

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
});

router.post('/api/chatsdk/token', checkJwt, async (req, res) => {
  const response = await fetch(`${process.env.CHATSDK_API_URL}/tokens`, {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.CHATSDK_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: req.auth.sub,
      name: req.auth.name,
    }),
  });

  const tokens = await response.json();
  res.json(tokens);
});

export default router;
```

### 4. Environment Variables

**Frontend (.env):**
```bash
REACT_APP_AUTH0_DOMAIN=your-domain.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your-client-id
REACT_APP_AUTH0_AUDIENCE=https://your-api
REACT_APP_CHATSDK_API_URL=http://localhost:5500
```

**Backend (.env):**
```bash
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=https://your-api
CHATSDK_API_KEY=your-api-key-from-credentials-json
CHATSDK_API_URL=http://localhost:5500
```

### 5. Wrap Your App
**File:** `src/index.tsx`

```typescript
import { ChatSDKWithAuth0Provider } from './lib/chatsdk-auth0';

root.render(
  <ChatSDKWithAuth0Provider
    auth0Domain={process.env.REACT_APP_AUTH0_DOMAIN!}
    auth0ClientId={process.env.REACT_APP_AUTH0_CLIENT_ID!}
    chatsdkApiUrl={process.env.REACT_APP_CHATSDK_API_URL}
  >
    <App />
  </ChatSDKWithAuth0Provider>
);
```

### 6. Use in Components
```typescript
import { useChannels, useMessages } from '@chatsdk/react';

export function ChatComponent() {
  const { channels } = useChannels();
  const { messages } = useMessages(channelId);

  // Your chat UI here
}
```

---

## How It Works

```
User logs in (NextAuth/Auth0)
            ↓
Your backend calls: POST /api/chatsdk/token
  with X-API-Key header
            ↓
ChatSDK returns: { token, wsToken }
            ↓
Tokens cached in localStorage
            ↓
ChatSDK hooks use tokens automatically
```

---

## Get Your API Key

```bash
# After running bootstrap.mjs, check:
cat ../credentials/app-*.json

# Use the "apiKey" field
```

---

## Troubleshooting

### "Failed to fetch tokens"
**Problem:** Backend can't reach ChatSDK

**Fix:**
```bash
# Test token endpoint
curl -X POST http://localhost:5500/tokens \
  -H "X-API-Key: your-api-key" \
  -d '{"userId": "test", "name": "Test"}'
```

### "Not authenticated"
**Problem:** Session not found

**Fix:** Check your auth provider's session management

### Tokens not persisting
**Problem:** localStorage not working

**Fix:** Check browser permissions, try sessionStorage

---

## Next Steps

1. **Test:** See example apps in `examples/react-chat-huly`
2. **Deploy:** Read `docs/DEPLOYMENT.md`
3. **API Docs:** See `docs/API_REFERENCE.md`
