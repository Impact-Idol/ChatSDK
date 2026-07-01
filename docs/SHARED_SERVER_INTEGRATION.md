# Using the Shared ChatSDK Server

Use this guide when you are building an app on the local network and want to use the existing ChatSDK server instead of running your own stack.

## Server URLs

The current shared ChatSDK deployment is:

| Service | URL | Purpose |
|---------|-----|---------|
| Demo UI | `http://192.168.68.244:5173` | Existing React demo app |
| API | `http://192.168.68.244:5500` | REST API for channels, messages, users |
| WebSocket | `ws://192.168.68.244:8001/connection/websocket` | Realtime events via Centrifugo |
| Token broker | `http://192.168.68.244:5511/api/chatsdk-token` | LAN token minting for app users |

Health checks:

```bash
curl http://192.168.68.244:5500/health
curl http://192.168.68.244:5511/health
```

## Recommended App Flow

Your app should treat ChatSDK as a messaging backend:

1. Your user signs in to your app.
2. Your app gets a ChatSDK token for that same user.
3. Your frontend initializes ChatSDK with the API URL, WebSocket URL, and token provider.
4. Your app creates or queries channels.
5. Your app sends messages into those channels.

For internal development, the frontend can call the LAN token broker directly. For production, call the token broker from your backend after your normal authentication check.

## Environment Variables

For a web app:

```env
NEXT_PUBLIC_CHATSDK_API_URL=http://192.168.68.244:5500
NEXT_PUBLIC_CHATSDK_WS_URL=ws://192.168.68.244:8001/connection/websocket
NEXT_PUBLIC_CHATSDK_TOKEN_URL=http://192.168.68.244:5511/api/chatsdk-token
```

For Vite:

```env
VITE_CHATSDK_API_URL=http://192.168.68.244:5500
VITE_CHATSDK_WS_URL=ws://192.168.68.244:8001/connection/websocket
VITE_CHATSDK_TOKEN_URL=http://192.168.68.244:5511/api/chatsdk-token
```

## React Integration

Install the SDK packages:

```bash
npm install @chatsdk/core @chatsdk/react
```

Wrap your app with `ChatProvider`:

```tsx
import { ChatProvider } from '@chatsdk/react';

const apiUrl = process.env.NEXT_PUBLIC_CHATSDK_API_URL!;
const wsUrl = process.env.NEXT_PUBLIC_CHATSDK_WS_URL!;
const tokenUrl = process.env.NEXT_PUBLIC_CHATSDK_TOKEN_URL!;

export function ChatSDKProvider({ children, user }: {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
}) {
  return (
    <ChatProvider
      apiUrl={apiUrl}
      wsUrl={wsUrl}
      tokenProvider={() =>
        fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            displayName: user.name,
            email: user.email,
            avatar: user.avatar,
          }),
        }).then((response) => {
          if (!response.ok) {
            throw new Error('Failed to get ChatSDK token');
          }
          return response.json();
        })
      }
    >
      {children}
    </ChatProvider>
  );
}
```

## Creating DMs and Group Chats

ChatSDK models both DMs and group chats as channels.

Create or open a 1:1 DM:

```ts
const dm = await client.createChannel({
  type: 'messaging',
  memberIds: ['other-user-id'],
});
```

`messaging` channels require exactly one other user ID. The server uses a deterministic channel ID convention, so asking for the same two users again returns the existing DM instead of creating duplicates.

Create a group chat:

```ts
const group = await client.createChannel({
  type: 'group',
  name: 'Project Chat',
  memberIds: ['user-2', 'user-3'],
  idempotencyKey: 'project-chat-user-1-user-2-user-3',
});
```

Send a message:

```ts
await client.sendMessage(dm.id, {
  text: 'Hello from my app',
});
```

List DMs and group chats:

```ts
const dms = await client.queryChannels({ type: 'messaging' });
const groups = await client.queryChannels({ type: 'group' });
```

## Backend Token Proxy

For a real app, prefer a backend route that verifies your own app session first, then calls the ChatSDK token broker. This keeps token issuance tied to your auth system and avoids trusting arbitrary browser input.

Example Next.js route:

```ts
// app/api/chat-token/route.ts
import { NextResponse } from 'next/server';

const tokenUrl = process.env.CHATSDK_TOKEN_URL!;

export async function POST() {
  const user = await getCurrentUserSomehow();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      displayName: user.name,
      email: user.email,
      avatar: user.avatarUrl,
    }),
  });

  return NextResponse.json(await response.json(), { status: response.status });
}
```

Then the frontend token provider calls your app:

```tsx
<ChatProvider
  apiUrl="http://192.168.68.244:5500"
  wsUrl="ws://192.168.68.244:8001/connection/websocket"
  tokenProvider={() =>
    fetch('/api/chat-token', { method: 'POST' }).then((response) => response.json())
  }
>
  <App />
</ChatProvider>
```

## Server-Side User Bootstrap

For integrations that need reliable DM creation before both users have opened Messages, use the server-side user bootstrap API. This is separate from browser token minting and must be called from your backend with the ChatSDK app API key.

Ensure one user:

```http
POST http://192.168.68.244:5500/api/users/ensure
Content-Type: application/json
X-API-Key: <chatsdk-app-api-key>
```

```json
{
  "userId": "vouch-user-id",
  "name": "Display Name",
  "email": "user@example.com",
  "image": "https://example.com/avatar.png",
  "custom": { "source": "vouch" }
}
```

Behavior:

- Creates the ChatSDK user if missing and returns `201`.
- Returns the existing user when no supplied fields change and returns `200`.
- Updates safe profile fields when supplied and returns `200`.
- Stores `email` in `custom.email`.
- Rejects browser bearer tokens; this endpoint requires `X-API-Key`.

Response shape:

```json
{
  "action": "created",
  "created": true,
  "updated": false,
  "user": {
    "id": "vouch-user-id",
    "name": "Display Name",
    "image": "https://example.com/avatar.png",
    "email": "user@example.com",
    "custom": { "source": "vouch", "email": "user@example.com" },
    "lastActiveAt": "2026-06-19T00:00:00.000Z",
    "createdAt": "2026-06-19T00:00:00.000Z",
    "updatedAt": "2026-06-19T00:00:00.000Z"
  }
}
```

Ensure users in bulk:

```http
POST http://192.168.68.244:5500/api/users/bulk-ensure
Content-Type: application/json
X-API-Key: <chatsdk-app-api-key>
```

```json
{
  "users": [
    { "userId": "vouch-user-1", "name": "One", "custom": { "source": "vouch" } },
    { "userId": "vouch-user-2", "name": "Two", "email": "two@example.com" }
  ]
}
```

Bulk requests accept up to 1000 users. For a Vouch launch backfill, send eligible active adult users in batches of 1000 or fewer, then call the single-user ensure endpoint on signup, login, and before DM creation.

## Server-Side DM Creation

Apps that need their own policy gate for direct messages should create/open DMs from their backend. This lets the app enforce blocks, minor status, account status, privacy, and relationship eligibility before ChatSDK creates the channel.

Ensure a DM:

```http
POST http://192.168.68.244:5500/api/channels/dm/ensure
Content-Type: application/json
X-API-Key: <chatsdk-app-api-key>
```

```json
{
  "requesterUserId": "vouch-current-user-id",
  "peerUserId": "vouch-peer-user-id",
  "idempotencyKey": "optional-policy-decision-id",
  "custom": { "source": "vouch" }
}
```

Behavior:

- Requires server/app auth via `X-API-Key`.
- Rejects browser bearer tokens.
- Requires both users to already exist in ChatSDK.
- Creates the deterministic DM if missing and returns `201`.
- Returns the existing deterministic DM if present and returns `200`.
- Returns `action` as `created` or `existing`.

For scoped browser tokens, channel creation is separated from message sending. `POST /api/channels` now requires `channel:create` when the token carries scopes. Vouch browser tokens should receive read/write messaging scopes only, not `channel:create`; Vouch should call `/api/channels/dm/ensure` from its backend after policy approval.

When proxying this call from an app backend, do not forward the browser `Authorization` header to ChatSDK. Send only the server-side `X-API-Key`; ChatSDK intentionally treats bearer/user auth as non-app auth for app-only routes.

## Server-Side Group/Squad Creation

Apps that need policy-gated non-DM conversations should also create/open those channels from their backend. ChatSDK does not evaluate app policy; the app decides the approved membership set first, then calls ChatSDK with server/app auth.

Ensure a group channel:

```http
POST http://192.168.68.244:5500/api/channels/group/ensure
Content-Type: application/json
X-API-Key: <chatsdk-app-api-key>
```

Ensure a squad channel:

```http
POST http://192.168.68.244:5500/api/channels/squad/ensure
Content-Type: application/json
X-API-Key: <chatsdk-app-api-key>
```

```json
{
  "externalId": "vouch:squad:squad-id",
  "name": "Squad Name",
  "memberIds": ["vouch-user-1", "vouch-user-2"],
  "custom": {
    "source": "vouch",
    "kind": "squad",
    "squadId": "squad-id"
  }
}
```

Behavior:

- Requires server/app auth via `X-API-Key`.
- Rejects browser bearer tokens.
- Requires `externalId` or `idempotencyKey`; this becomes the deterministic channel CID.
- Requires all `memberIds` to already exist in ChatSDK.
- Creates the channel if missing and returns `201`.
- Returns the existing channel if present and returns `200`.
- Returns `action` as `created` or `existing`.
- `/api/channels/squad/ensure` creates a ChatSDK `group` channel and records squad semantics in `config`.
- Browser tokens should continue to omit `channel:create`.

## Next.js App Router Starter

For teams using Next.js App Router, copy the reference starter in:

```text
docs/features/vouch-integration/starter/
```

The starter includes:

- a server-only `/api/chatsdk-token` proxy route,
- a client `ChatProvider` wrapper that connects the current authenticated user,
- a minimal `/messages` page for an adult-only DM first slice,
- the development shared-server environment variables.

The starter intentionally leaves app-specific auth and policy functions as adapters. Your app should wire those adapters to its real session, account-status, privacy, blocking, minor-safety, and membership rules.

Before debugging an app integration, verify the shared server from this repo:

```bash
npm run smoke:shared-server
```

Optional overrides:

```bash
CHATSDK_API_URL=http://192.168.68.244:5500 \
CHATSDK_WS_URL=ws://192.168.68.244:8001/connection/websocket \
CHATSDK_TOKEN_URL=http://192.168.68.244:5511/api/chatsdk-token \
npm run smoke:shared-server
```

## CORS and Origins

The shared server currently allows common local development origins. If your app runs on a different origin, such as `http://localhost:3001` or a custom LAN hostname, the ChatSDK API and token broker need that origin added to their allowlists.

Symptoms of a missing origin:

- Token request fails with `403 origin_not_allowed`
- Browser console shows CORS errors
- WebSocket connection fails immediately

Ask the server operator to add your app origin to:

- `ALLOWED_ORIGINS`
- `CENTRIFUGO_ALLOWED_ORIGINS`
- `TOKEN_BROKER_ALLOWED_ORIGINS`

Then restart the affected services.

For the current Vouch dev/demo handoff, use:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:4500,http://192.168.68.245:4500,http://192.168.68.244:5173,https://vouch.vedalogy.com
CENTRIFUGO_ALLOWED_ORIGINS=http://localhost:3000 http://localhost:3001 http://localhost:4500 http://192.168.68.245:4500 http://192.168.68.244:5173 https://vouch.vedalogy.com
TOKEN_BROKER_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:4500,http://192.168.68.245:4500,http://192.168.68.244:5173,https://vouch.vedalogy.com
```

## Current Scope

This shared server is useful for internal app development and demos. Do not assume it is internet-facing or production-grade for customer traffic until deployment, auth, backups, monitoring, TLS, and origin policy are reviewed for that app.
