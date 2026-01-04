# ChatSDK API Guide

Complete guide to using the ChatSDK API, including authentication, endpoints, and React hooks.

---

## Table of Contents

1. [Authentication System](#authentication-system)
2. [Getting Started](#getting-started)
3. [REST API Endpoints](#rest-api-endpoints)
4. [React Hooks](#react-hooks)
5. [React Native](#react-native)
6. [Common Patterns](#common-patterns)
7. [Error Handling](#error-handling)

---

## Authentication System

ChatSDK uses a **two-tier authentication system**:

### 1. App-Level Authentication (X-API-Key)

**Purpose:** Identifies your application
**Header:** `X-API-Key: your-api-key`
**Used for:** Server-to-server calls, token generation

```bash
# Get your API key from bootstrap credentials
cat credentials/app-*.json | grep apiKey

# Use it in requests
curl http://localhost:5500/tokens \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "name": "John Doe"}'
```

### 2. User-Level Authentication (Bearer Token)

**Purpose:** Identifies individual end-users
**Header:** `Authorization: Bearer <token>`
**Used for:** End-user actions (sending messages, creating channels)

```bash
# First, get a token using X-API-Key
TOKEN=$(curl -X POST http://localhost:5500/tokens \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "name": "John Doe"}' \
  | jq -r '.token')

# Then use the token for user actions
curl http://localhost:5500/api/channels \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $TOKEN"
```

### Why Both Headers?

**Most endpoints require BOTH headers:**

```bash
# ✅ CORRECT - Both headers
curl http://localhost:5500/api/workspaces \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $TOKEN"

# ❌ WRONG - Only Bearer token
curl http://localhost:5500/api/workspaces \
  -H "Authorization: Bearer $TOKEN"
# Error: Missing API key

# ❌ WRONG - Only X-API-Key
curl http://localhost:5500/api/workspaces \
  -H "X-API-Key: your-api-key"
# Error: User authentication required. Include both X-API-Key and Authorization: Bearer <token> headers.
```

**Exception:** Token generation endpoint (`POST /tokens`) only needs X-API-Key.

---

## Getting Started

### 1. Bootstrap Your App

```bash
cd delivery-package/
node scripts/bootstrap.mjs --app-name="My Chat App"
```

This creates:
- `credentials/app-*.json` - Your API keys
- `credentials/bootstrap-*.sql` - SQL to initialize database
- `.env.production` - Updated with secrets
- `docker/centrifugo.json` - Updated WebSocket config

### 2. Run the SQL

```bash
# Copy the SQL from credentials/
cat credentials/bootstrap-*.sql

# Execute against your database
docker exec -i chatsdk-postgres psql -U chatsdk -d chatsdk < credentials/bootstrap-*.sql
```

### 3. Start Services

```bash
cd docker/
docker compose -f docker-compose.prod.yml up -d
```

### 4. Test Authentication

```bash
cd ..
node scripts/test-auth.mjs
```

---

## REST API Endpoints

### Token Management

#### Create User Token

**Endpoint:** `POST /tokens`
**Auth:** X-API-Key only
**Purpose:** Generate access token and WebSocket token for a user

```bash
curl -X POST http://localhost:5500/tokens \
  -H "X-API-Key: your-api-key" \
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
  "expiresIn": 86400,
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "image": "https://example.com/avatar.jpg"
  }
}
```

**Token Claims:**
```json
{
  "user_id": "user-123",
  "app_id": "app-1234567890-abc",
  "iat": 1704398400,
  "exp": 1704484800
}
```

#### Refresh Token

**Endpoint:** `POST /tokens/refresh`
**Auth:** X-API-Key + Bearer token

```bash
curl -X POST http://localhost:5500/tokens/refresh \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $OLD_TOKEN"
```

---

### Workspaces

All workspace endpoints require **both X-API-Key and Bearer token**.

#### List User's Workspaces

**Endpoint:** `GET /api/workspaces`
**Auth:** X-API-Key + Bearer token

```bash
curl http://localhost:5500/api/workspaces \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "workspaces": [
    {
      "id": "ws-1234567890",
      "name": "General Workspace",
      "type": "team",
      "memberCount": 5,
      "channelCount": 3,
      "role": "owner",
      "isDefault": true
    }
  ]
}
```

#### Create Workspace

**Endpoint:** `POST /api/workspaces`
**Auth:** X-API-Key + Bearer token

```bash
curl -X POST http://localhost:5500/api/workspaces \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering Team",
    "type": "team"
  }'
```

#### Get Workspace Channels

**Endpoint:** `GET /api/workspaces/:id/channels`
**Auth:** X-API-Key + Bearer token

```bash
curl http://localhost:5500/api/workspaces/ws-123/channels \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Channels

#### List Channels

**Endpoint:** `GET /api/channels`
**Auth:** X-API-Key + Bearer token

```bash
curl http://localhost:5500/api/channels \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $TOKEN"
```

#### Create Channel

**Endpoint:** `POST /api/channels`
**Auth:** X-API-Key + Bearer token

```bash
curl -X POST http://localhost:5500/api/channels \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "general",
    "type": "public",
    "workspaceId": "ws-123"
  }'
```

---

### Messages

#### Send Message

**Endpoint:** `POST /api/channels/:channelId/messages`
**Auth:** X-API-Key + Bearer token

```bash
curl -X POST http://localhost:5500/api/channels/ch-123/messages \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, world!",
    "mentions": ["user-456"]
  }'
```

#### Get Messages

**Endpoint:** `GET /api/channels/:channelId/messages`
**Auth:** X-API-Key + Bearer token

```bash
curl "http://localhost:5500/api/channels/ch-123/messages?limit=50" \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $TOKEN"
```

---

## React Hooks

The `@chatsdk/react` package provides hooks that handle authentication and real-time updates automatically.

### Installation

```bash
npm install @chatsdk/core @chatsdk/react
```

### Setup

#### 1. Wrap Your App with ChatProvider

```tsx
import { ChatProvider } from '@chatsdk/react';

function App() {
  const [tokens, setTokens] = useState(null);

  // Get tokens from your auth system
  useEffect(() => {
    async function fetchTokens() {
      const response = await fetch('/tokens', {
        method: 'POST',
        headers: { 'X-API-Key': 'your-api-key' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: currentUser.name,
          image: currentUser.avatar,
        }),
      });
      const data = await response.json();
      setTokens(data);
    }
    fetchTokens();
  }, []);

  if (!tokens) return <div>Loading...</div>;

  return (
    <ChatProvider
      token={tokens.token}
      wsToken={tokens.wsToken}
      apiUrl="http://localhost:5500"
    >
      <YourApp />
    </ChatProvider>
  );
}
```

**Important:** `ChatProvider` handles the X-API-Key automatically from the token. You only need to provide the user token and WebSocket token.

---

### useWorkspaces

List and manage workspaces.

```tsx
import { useWorkspaces } from '@chatsdk/react';

function WorkspaceList() {
  const { workspaces, loading, error, createWorkspace } = useWorkspaces();

  const handleCreate = async () => {
    const workspace = await createWorkspace({
      name: 'New Team',
      type: 'team',
    });
    console.log('Created:', workspace);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={handleCreate}>Create Workspace</button>
      {workspaces.map(ws => (
        <div key={ws.id}>
          {ws.name} ({ws.memberCount} members)
        </div>
      ))}
    </div>
  );
}
```

---

### useChannels

List and manage channels in a workspace.

```tsx
import { useChannels } from '@chatsdk/react';

function ChannelList({ workspaceId }) {
  const { channels, loading, createChannel } = useChannels(workspaceId);

  const handleCreate = async () => {
    await createChannel({
      name: 'engineering',
      type: 'public',
    });
  };

  return (
    <div>
      <button onClick={handleCreate}>New Channel</button>
      {channels.map(ch => (
        <div key={ch.id}>
          #{ch.name} - {ch.unreadCount} unread
        </div>
      ))}
    </div>
  );
}
```

---

### useMessages

Send and receive messages with real-time updates.

```tsx
import { useMessages } from '@chatsdk/react';

function Chat({ channelId }) {
  const { messages, loading, sendMessage, deleteMessage } = useMessages(channelId);
  const [text, setText] = useState('');

  const handleSend = async () => {
    await sendMessage({ text });
    setText('');
  };

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.user.name}:</strong> {msg.text}
            <button onClick={() => deleteMessage(msg.id)}>Delete</button>
          </div>
        ))}
      </div>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

**Features:**
- ✅ Real-time message updates via WebSocket
- ✅ Optimistic updates (message shows immediately)
- ✅ Automatic retry on failure
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Reactions support

---

### usePresence

Track online/offline status of users.

```tsx
import { usePresence } from '@chatsdk/react';

function UserStatus({ userId }) {
  const { isOnline, lastSeen } = usePresence(userId);

  return (
    <div>
      {isOnline ? (
        <span style={{ color: 'green' }}>● Online</span>
      ) : (
        <span>Last seen: {lastSeen}</span>
      )}
    </div>
  );
}
```

---

### useTyping

Show typing indicators.

```tsx
import { useTyping } from '@chatsdk/react';

function TypingIndicator({ channelId }) {
  const { typingUsers, startTyping, stopTyping } = useTyping(channelId);

  const handleInputChange = () => {
    startTyping();
    // Auto-stops after 3 seconds of inactivity
  };

  if (typingUsers.length === 0) return null;

  return (
    <div>
      {typingUsers.map(u => u.name).join(', ')} is typing...
    </div>
  );
}
```

---

### usePolls

Create and vote on polls in channels.

```tsx
import { usePolls } from '@chatsdk/react';

function PollComponent({ messageId }) {
  const { polls, createPoll, vote } = usePolls(messageId);

  const handleCreatePoll = async () => {
    await createPoll({
      question: 'Favorite color?',
      options: ['Red', 'Blue', 'Green'],
      allowMultiple: false,
    });
  };

  return (
    <div>
      {polls.map(poll => (
        <div key={poll.id}>
          <h3>{poll.question}</h3>
          {poll.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => vote(poll.id, opt.id)}
            >
              {opt.text} ({opt.votes})
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## React Native

Same hooks work in React Native with `@chatsdk/react-native`:

```bash
npm install @chatsdk/core @chatsdk/react @chatsdk/react-native
```

```tsx
import { ChatProvider } from '@chatsdk/react';
import { ChannelList, Chat } from '@chatsdk/react-native';

function App() {
  return (
    <ChatProvider token={token} wsToken={wsToken}>
      <ChannelList />
      <Chat channelId="ch-123" />
    </ChatProvider>
  );
}
```

---

## Common Patterns

### Integration with NextAuth

```tsx
import { useSession } from 'next-auth/react';
import { ChatProvider } from '@chatsdk/react';

function ChatWrapper({ children }) {
  const { data: session } = useSession();
  const [tokens, setTokens] = useState(null);

  useEffect(() => {
    if (!session?.user) return;

    async function getTokens() {
      const res = await fetch('/tokens', {
        method: 'POST',
        headers: { 'X-API-Key': process.env.NEXT_PUBLIC_CHATSDK_API_KEY },
        body: JSON.stringify({
          userId: session.user.id,
          name: session.user.name,
          image: session.user.image,
        }),
      });
      setTokens(await res.json());
    }
    getTokens();
  }, [session]);

  if (!tokens) return <div>Loading chat...</div>;

  return (
    <ChatProvider token={tokens.token} wsToken={tokens.wsToken}>
      {children}
    </ChatProvider>
  );
}
```

See `examples/integrations/nextauth-integration.ts` for complete example.

---

### Integration with Auth0

```tsx
import { useAuth0 } from '@auth0/auth0-react';

function ChatWrapper({ children }) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [tokens, setTokens] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function getTokens() {
      const accessToken = await getAccessTokenSilently();
      const res = await fetch('/tokens', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      setTokens(await res.json());
    }
    getTokens();
  }, [isAuthenticated]);

  return tokens ? (
    <ChatProvider token={tokens.token} wsToken={tokens.wsToken}>
      {children}
    </ChatProvider>
  ) : null;
}
```

See `examples/integrations/auth0-integration.ts` for complete example.

---

### Token Refresh

```tsx
function useTokenRefresh(token, refreshToken) {
  useEffect(() => {
    // Refresh 5 minutes before expiry
    const refreshIn = (jwt_decode(token).exp * 1000) - Date.now() - 300000;

    const timeout = setTimeout(async () => {
      const res = await fetch('/tokens/refresh', {
        headers: {
          'X-API-Key': apiKey,
          'Authorization': `Bearer ${token}`
        },
      });
      const newTokens = await res.json();
      updateTokens(newTokens);
    }, refreshIn);

    return () => clearTimeout(timeout);
  }, [token]);
}
```

---

## Error Handling

### Common Errors

#### Missing API Key
```json
{
  "error": {
    "message": "Missing API key",
    "code": "UNAUTHORIZED"
  }
}
```

**Solution:** Add `X-API-Key` header to your request.

---

#### User Authentication Required
```json
{
  "error": {
    "message": "User authentication required. Include both X-API-Key and Authorization: Bearer <token> headers."
  }
}
```

**Solution:** Add `Authorization: Bearer <token>` header to your request.

---

#### Invalid Token
```json
{
  "error": {
    "message": "Invalid token",
    "code": "UNAUTHORIZED"
  }
}
```

**Solution:**
1. Check token is not expired
2. Ensure token was generated for this app
3. Clear cached tokens: `localStorage.clear()`

---

#### WebSocket "invalid token"

**Problem:** WebSocket connects but immediately disconnects with code 3500.

**Solution:**
```javascript
// Clear cached tokens
localStorage.clear();
// Refresh page
```

**Why:** You likely changed `CENTRIFUGO_TOKEN_SECRET` in `.env.production`, but old tokens are cached.

---

### Debugging Requests

```bash
# Enable debug mode
curl http://localhost:5500/api/channels \
  -H "X-API-Key: your-api-key" \
  -H "Authorization: Bearer $TOKEN" \
  -v  # Verbose mode shows all headers

# Check logs
docker logs chatsdk-api --tail 100
```

---

## Next Steps

- Read [AUTHENTICATION.md](./AUTHENTICATION.md) for deeper auth concepts
- See [API_REFERENCE.md](./API_REFERENCE.md) for complete endpoint list
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- Explore integration examples in `examples/integrations/`

---

## Questions?

- **CORS errors?** See [START_HERE.md](../START_HERE.md#cors-errors-in-browser)
- **WebSocket issues?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#websocket-issues)
- **Performance?** See [DEPLOYMENT.md](./DEPLOYMENT.md#performance-tuning)
