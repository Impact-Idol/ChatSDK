# Vouch Next.js Starter

This starter gives VNet/Vouch a copyable App Router integration shape for ChatSDK. It is intentionally an adapter, not a drop-in patch: Vouch should wire the marked auth and policy functions to its real session, user, blocking, privacy, minor, and account-status services.

This is ChatSDK-side development support: it proves the shared-server contract and gives Vouch a known-good shape to adapt. It is not a replacement for Vouch implementing its own messaging route, eligibility checks, and moderation workflow.

Files:

- `app-api-chatsdk-token-route.ts` - server-only token proxy route.
- `app-api-chatsdk-dm-ensure-route.ts` - server-only DM create/open route.
- `app-api-chatsdk-channel-ensure-route.ts` - server-only group/squad create/open route.
- `VouchChatSDKProvider.tsx` - client provider wrapper around `@chatsdk/react`.
- `messages-page.tsx` - minimal adult-only DM page using the provider.
- `.env.example` - development shared-server environment variables.

The `.env.example` file also includes the shared-server operator allowlist values needed for Vouch browser origins. Those values belong on the ChatSDK server deployment, not in the Vouch frontend bundle.

Recommended first slice:

1. Backfill eligible active adult users through ChatSDK `POST /api/users/bulk-ensure`.
2. Add signup, login, and DM creation hooks that call ChatSDK `POST /api/users/ensure`.
3. Add the DM ensure route and connect it to Vouch block, minor, account-status, and eligibility policy.
4. Add the token route and connect it to Vouch session auth.
5. Add the provider after Vouch `AuthProvider`.
6. Add a guarded `/messages` route.
7. Test with two adult Vouch test users.
8. Enable navigation only after the route verifies bootstrap, auth, token minting, REST, WebSocket, and logout behavior.

User bootstrap is server-side only:

```http
POST http://192.168.68.244:5500/api/users/ensure
X-API-Key: <chatsdk-app-api-key>
Content-Type: application/json
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

For launch backfill, use `POST /api/users/bulk-ensure` with `users` batches of 1000 or fewer. Keep the ChatSDK app API key out of frontend bundles.

DM creation is also server-side only:

```http
POST http://192.168.68.244:5500/api/channels/dm/ensure
X-API-Key: <chatsdk-app-api-key>
Content-Type: application/json
```

```json
{
  "requesterUserId": "vouch-current-user-id",
  "peerUserId": "vouch-peer-user-id",
  "custom": { "source": "vouch" }
}
```

Vouch browser tokens should not receive `channel:create`. The browser should call a Vouch route such as `/api/chatsdk-dm/ensure`, and that route should enforce Vouch policy before calling ChatSDK.

The Vouch server route should not forward the browser `Authorization` header to ChatSDK. It should send only the server-side `X-API-Key`.

Group and squad creation use the same server-side pattern:

```http
POST http://192.168.68.244:5500/api/channels/squad/ensure
X-API-Key: <chatsdk-app-api-key>
Content-Type: application/json
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

`POST /api/channels/group/ensure` and `POST /api/channels/squad/ensure` both require `X-API-Key`, reject browser bearer tokens, require all members to exist in ChatSDK, create on first call, and return the existing channel on repeat calls. The squad endpoint returns a ChatSDK `group` channel with squad metadata in `config`.

Run the ChatSDK-side shared-server smoke before handoff or when debugging:

```bash
npm run smoke:shared-server
```

Override endpoints if needed:

```bash
CHATSDK_API_URL=http://192.168.68.244:5500 \
CHATSDK_WS_URL=ws://192.168.68.244:8001/connection/websocket \
CHATSDK_TOKEN_URL=http://192.168.68.244:5511/api/chatsdk-token \
npm run smoke:shared-server
```

Known Vouch dev/demo browser origins from the 2026-06-19 probe:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:4500,http://192.168.68.245:4500,http://192.168.68.244:5173,https://vouch.vedalogy.com
CENTRIFUGO_ALLOWED_ORIGINS=http://localhost:3000 http://localhost:3001 http://localhost:4500 http://192.168.68.245:4500 http://192.168.68.244:5173 https://vouch.vedalogy.com
TOKEN_BROKER_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:4500,http://192.168.68.245:4500,http://192.168.68.244:5173,https://vouch.vedalogy.com
```

After applying those values to the running shared server, restart the API, Centrifugo, and token broker services.
