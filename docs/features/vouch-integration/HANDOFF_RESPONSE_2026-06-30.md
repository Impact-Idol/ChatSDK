# Vouch ChatSDK Handoff Response

Date: 2026-06-30
Source request: `/Users/pushkar/vnet/docs/features/chatsdk-vouch-dm/CHATSDK_HANDOFF_REQUEST.md`

## Status

ChatSDK now has repo-side support for Vouch's feature-complete browser messaging path, except for the final package publication step. The browser packages are versioned at `2.0.8` and now export built `dist` artifacts instead of TypeScript source files, so they are suitable for a registry or generated tarball source without Next.js source-transpilation hacks.

Required publication gate:

- Publish `@chatsdk/core@2.0.8` and `@chatsdk/react@2.0.8` to an npm registry, or provide checked-in `npm pack` tarballs from this repo's build output.
- Vouch should not depend on `file:/Users/...`, sibling workspaces, or package `src` entrypoints.
- Before sending this to Vouch, run the exact package-consumer and API security checks listed below against the artifacts being handed off.

Current generated tarballs:

- `assets/delivery-package/vouch-chatsdk-2026-07-01/chatsdk-core-2.0.8.tgz`
- `assets/delivery-package/vouch-chatsdk-2026-07-01/chatsdk-react-2.0.8.tgz`

These tarballs were generated from this repo with `npm pack`, installed into a blank consumer project, runtime-imported successfully, and typechecked with `npx tsc --noEmit`.

## Browser SDK Package Contract

Packages:

- `@chatsdk/core@2.0.8`
- `@chatsdk/react@2.0.8`

Package shape:

- `main`, `module`, `types`, and `exports` point at `dist`.
- `@chatsdk/react` depends on `@chatsdk/core@2.0.8`.
- `@chatsdk/core` declares runtime dependencies used by its public entrypoint, including `zod`.
- `@chatsdk/react/themes/*` exports copied CSS from `dist/themes/*`.
- Built ESM output has Node-compatible `.js` relative import/export specifiers.

Build and pack checks:

```bash
npm run build --workspace=@chatsdk/core
npm run build --workspace=@chatsdk/react
npm pack --workspace=@chatsdk/core
npm pack --workspace=@chatsdk/react
```

Consumer artifact check:

```bash
rm -rf /tmp/chatsdk-e2e-pack /tmp/chatsdk-consumer-test
mkdir -p /tmp/chatsdk-e2e-pack /tmp/chatsdk-consumer-test/src
npm pack --workspace=@chatsdk/core --pack-destination /tmp/chatsdk-e2e-pack
npm pack --workspace=@chatsdk/react --pack-destination /tmp/chatsdk-e2e-pack
cd /tmp/chatsdk-consumer-test
npm init -y
npm install /tmp/chatsdk-e2e-pack/chatsdk-core-2.0.8.tgz \
  /tmp/chatsdk-e2e-pack/chatsdk-react-2.0.8.tgz \
  react@18 react-dom@18 @tanstack/react-query@5 typescript@5 \
  @types/react @types/react-dom --ignore-scripts
npx tsc --noEmit
node --input-type=module -e "const core = await import('@chatsdk/core'); const react = await import('@chatsdk/react'); console.log(typeof core.createChatClient, typeof react.ChatProvider, typeof react.useMessages);"
```

Latest local result: TypeScript passed and the runtime import printed `function function function`.

Live shared-server package-independent smoke:

```bash
set -a
source .secrets/vouch-chatsdk-app-api-key.env
set +a
npm run smoke:project -- --origin https://vouch.vedalogy.com
npm run smoke:private-isolation
```

Latest live results against `http://192.168.68.244:5500`, `http://192.168.68.244:5511/api/chatsdk-token`, and `ws://192.168.68.244:8001/connection/websocket`:

- Project smoke passed 12/12, including token broker health, WebSocket connect, deterministic DM ensure, browser `channel:create` denial, message send, and message query.
- Private-isolation smoke passed 16/16. The two DM members could read the private message. A third minted user was excluded from channel list and denied message-list read, single-message read, send, and read-status access for that DM.

## Browser Runtime Contract

Provider:

```tsx
<ChatProvider
  apiUrl={process.env.NEXT_PUBLIC_CHATSDK_API_URL}
  wsUrl={process.env.NEXT_PUBLIC_CHATSDK_WS_URL}
  tokenProvider={() =>
    fetch('/api/chatsdk-token', { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to get ChatSDK token');
        return response.json();
      })
  }
>
  {children}
</ChatProvider>
```

Connect/disconnect:

- `useChatContext().connectUser({ id, name, image })` connects the authenticated Vouch user.
- `useChatContext().disconnect()` unsubscribes, disconnects realtime, clears user/token state, and should be called on logout or user switch.
- `useConnectionState()` returns `{ state, isConnected, isConnecting, reconnectIn }`.

Core client methods:

- `client.queryChannels({ type?, limit?, offset? }): Promise<Channel[]>`
- `client.queryMessages(channelId, { sinceSeq?, limit?, before?, after? }): Promise<{ messages, maxSeq, hasMore }>`
- `client.sendMessage(channelId, { text, attachments?, parentId?, clientMsgId? }): Promise<MessageWithSeq>`
- `client.sendTypingStart(channelId): Promise<void>`
- `client.sendTypingStop(channelId): Promise<void>`
- `client.markRead(channelId, messageId?): Promise<void>`

React hooks:

- `useMessages(channelId, { limit?, initialLoad? })` loads history, subscribes to realtime message events, and returns `sendMessage`, `loadMore`, reactions, update, and delete helpers.
- `useTypingIndicator(channelId)` returns `typingUsers`, `startTyping`, and `stopTyping`.
- `usePresence()` supports online/offline heartbeat, single/multiple presence query, and channel presence query.
- `useReadState(channelId)` returns `unreadCount`, `readReceipts`, and `markAsRead`.
- `useReadReceipts(channelId)` is available for per-message read receipt flows.

Reconnect/token refresh:

- Reconnect is handled by Centrifuge with automatic backoff and subscription recovery.
- `tokenProvider` is called during connect and from the realtime `getToken` callback when Centrifuge needs a new token.
- Expired REST tokens surface as API errors; Vouch should remount/reconnect or refresh its provider token when its `/api/chatsdk-token` route returns a new token set.

Error behavior:

- Non-2xx REST responses throw typed SDK errors when the server returns a known error code, otherwise a generic `ChatSDKError`.
- Browser route guards return `401` for missing/invalid auth, `403` for insufficient scopes or membership, `404` for missing resources, `409` for idempotency/type conflicts, `413` for oversized ensure payloads, and `422` for schema validation failures.

## Browser Token Permissions

Vouch browser tokens should request only:

- `chat:read`
- `chat:write`
- `typing:write`

Browser tokens must not receive:

- `channel:create`
- user ensure/bulk ensure access
- app-auth endpoint access
- group/squad ensure access
- membership mutation access
- moderation/admin access

Current server behavior:

- `POST /api/channels` requires `channel:create`.
- `POST /api/users/ensure`, `POST /api/users/bulk-ensure`, `POST /api/channels/dm/ensure`, `POST /api/channels/group/ensure`, and `POST /api/channels/squad/ensure` require `X-API-Key` app auth and reject browser bearer tokens.

## App-Auth Endpoint Contracts

All endpoints require:

```http
Content-Type: application/json
X-API-Key: <server-only ChatSDK app API key>
```

`POST /api/users/ensure`

```json
{
  "userId": "vouch-user-id",
  "name": "Display Name",
  "email": "user@example.com",
  "image": "https://example.com/avatar.png",
  "custom": { "source": "vouch", "username": "handle", "displayName": "Display Name", "avatarUrl": "https://example.com/avatar.png" }
}
```

Returns `201` with `action: "created"` or `200` with `action: "updated" | "existing"`. Repeated calls update supplied safe fields and merge `custom`; omitted fields are preserved. Bulk endpoint accepts up to 1000 users.

`POST /api/users/bulk-ensure`

```json
{ "users": [{ "userId": "vouch-user-id", "name": "Display Name", "custom": { "source": "vouch" } }] }
```

Returns `200` with aggregate counts, or `207` when some users fail and `errors` is non-empty.

`POST /api/channels/dm/ensure`

```json
{
  "requesterUserId": "vouch-current-user-id",
  "peerUserId": "vouch-peer-user-id",
  "idempotencyKey": "optional-vouch-policy-decision-id",
  "custom": { "source": "vouch" }
}
```

Requires both users to already exist. Creates or returns a deterministic two-user `messaging` channel. DM channel config is not user-controlled.

`POST /api/channels/group/ensure` and `POST /api/channels/squad/ensure`

```json
{
  "externalId": "vouch:squad:squad-id",
  "name": "Squad Name",
  "memberIds": ["vouch-user-1", "vouch-user-2"],
  "custom": { "source": "vouch", "kind": "squad", "squadId": "squad-id" }
}
```

Requires `externalId` or `idempotencyKey`, all member users to exist, and 1-500 members. Creates or returns a deterministic `group` channel. Repeated calls return the existing channel and do not mutate its membership or metadata.

Retry guidance:

- Retry idempotent `ensure` calls on network errors and 5xx responses with short exponential backoff.
- Do not retry `400`, `401`, `403`, `404`, `409`, `413`, or `422` without changing input or auth.

## Origin Readiness

The current shared-server handoff allowlist includes:

- `http://localhost:4500`
- `https://vouch.vedalogy.com`

Relevant environment variables:

```env
CHATSDK_API_URL=<server ChatSDK API URL>
CHATSDK_TOKEN_URL=<server token broker URL>
NEXT_PUBLIC_CHATSDK_WS_URL=<browser WebSocket URL>
CHATSDK_APP_API_KEY=<server-only app key>
```

## Identity And Search Guidance

For first production DM launch, Vouch should use its own people search and call Vouch's server-side DM ensure route with selected Vouch user IDs. That keeps block, adult-only, account-status, and discovery policy in Vouch.

ChatSDK preserves Vouch metadata when Vouch sends it through `custom`, for example:

```json
{
  "source": "vouch",
  "vouchUserId": "vouch-user-id",
  "username": "handle",
  "displayName": "Display Name",
  "avatarUrl": "https://example.com/avatar.png"
}
```

Message `user.custom` already includes stored custom metadata. Channel member payloads now also include `custom`, so inbox/thread UI can read Vouch profile fields from channel and message responses.

## Private Message Isolation Verification

Latest local API/security checks:

```bash
npm --workspace @chatsdk/api test -- --run tests/private-data-auth.test.ts
npm --workspace @chatsdk/api test
npm --workspace @chatsdk/core test -- --run
npm run build --workspace=@chatsdk/react
npm --workspace @chatsdk/react test -- --run
```

Latest results:

- Private-data authorization suite passed 37/37.
- Full API suite passed 33 files, skipped 2 files, passed 298 tests, skipped 7 tests.
- Core suite passed 18 files and 351 tests.
- React package build passed.
- React suite passed 4 files and 43 tests.

The private-data suite covers nonmember denial before querying or mutating private message bodies, single-message reads, read receipts, read status, thread replies, thread participants, saved-message writes, poll result vote data, and poll voting. The pinned-message route currently returns `403` or `404` depending on route matching, but the test asserts nonmembers do not reach the `pinned_message` query.

Live shared-server isolation check:

```bash
npm run smoke:private-isolation
```

Latest result: passed 16/16. This creates three live smoke users, opens a DM between two of them, sends a private message, confirms both DM members can read it, and confirms the third user cannot list the DM, query its messages, query the single message, send into the DM, or read its read-status endpoint.

Remaining limit: this is local API/package verification plus live ChatSDK shared-server smoke. A live authenticated Vouch browser Playwright flow should still be treated as the final acceptance check before a production launch.
