# Vouch ChatSDK Integration Packet

Date: 2026-06-19
Source guide: [Shared Server Integration](../../SHARED_SERVER_INTEGRATION.md)
Scope: VNet/Vouch integration guidance only. This packet does not require changing the Vouch repo.

## Verdict

ChatSDK is feasible for a Vouch development demo now, provided Vouch uses the shared LAN deployment exactly as a development messaging backend.

ChatSDK is feasible for production only after Vouch places its own authentication, privacy, membership, moderation, and operations controls in front of the ChatSDK primitives. The shared LAN URLs in `SHARED_SERVER_INTEGRATION.md` should not be treated as production customer infrastructure.

## Integration Shape

Vouch should integrate ChatSDK as an external messaging service behind Vouch's own policy boundary:

1. A Vouch user signs in through the existing Vouch auth flow.
2. The browser requests a Vouch-owned token endpoint, not the ChatSDK broker directly.
3. Vouch verifies the session and user eligibility.
4. Vouch calls the ChatSDK token broker server-to-server with trusted user identity.
5. The browser initializes `@chatsdk/react` with the ChatSDK API URL, WebSocket URL, and Vouch token provider.
6. Vouch UI creates or opens ChatSDK channels only after Vouch has decided the user is allowed to message those people or groups.

This keeps ChatSDK responsible for chat transport, storage, realtime delivery, and channel APIs while Vouch remains responsible for product policy.

## Concrete Vouch Implementation Map

Recommended Vouch web locations, based on the inspected app shape:

| Concern | Suggested Vouch location | Notes |
| --- | --- | --- |
| App provider | `apps/web/components/providers.tsx` | Add a Vouch wrapper around `ChatProvider` after `AuthProvider`, so it can read the current Vouch user. |
| Token proxy | `apps/web/app/api/chatsdk-token/route.ts` or `apps/api` route | Prefer the route that has the clearest access to the authenticated Vouch session. |
| Messages route | `apps/web/app/(vouch)/messages/page.tsx` or equivalent route group | Start with one simple inbox/DM screen before squad chat. |
| Navigation | `MobileBottomNav.tsx` and `AppShell.tsx` | Replace disabled Messages entries only after `/messages` exists and is verified. |
| Policy helpers | Existing Vouch API/service layer | Check blocks, account status, minor status, privacy, and squad membership before channel creation. |

Reference starter files live in [starter/](starter/). They are intended to be copied and adapted by Vouch, not applied blindly:

- [starter/app-api-chatsdk-token-route.ts](starter/app-api-chatsdk-token-route.ts)
- [starter/VouchChatSDKProvider.tsx](starter/VouchChatSDKProvider.tsx)
- [starter/messages-page.tsx](starter/messages-page.tsx)
- [starter/.env.example](starter/.env.example)

The provider should use the values from `SHARED_SERVER_INTEGRATION.md` for development:

```env
NEXT_PUBLIC_CHATSDK_API_URL=http://192.168.68.244:5500
NEXT_PUBLIC_CHATSDK_WS_URL=ws://192.168.68.244:8001/connection/websocket
CHATSDK_TOKEN_URL=http://192.168.68.244:5511/api/chatsdk-token
```

Keep `CHATSDK_TOKEN_URL` server-only for the production-style path. A public `NEXT_PUBLIC_CHATSDK_TOKEN_URL` is acceptable only for short-lived internal LAN demos where the broker origin allowlist is intentionally opened for that app.

## Token Proxy Contract

Browser request:

```http
POST /api/chatsdk-token
Cookie: Vouch session cookies
```

Vouch route behavior:

1. Verify the Vouch session.
2. Reject unauthenticated users with `401`.
3. Reject ineligible users with `403`, such as suspended accounts or users outside the approved first-slice audience.
4. Build the ChatSDK identity from trusted Vouch records:
   - `userId`: Vouch user ID
   - `displayName`: Vouch display name, username, or session name
   - `email`: Vouch email when appropriate
   - `avatar`: Vouch profile image when appropriate
5. Call `CHATSDK_TOKEN_URL` server-to-server.
6. Return the ChatSDK token response unchanged unless Vouch needs to normalize the shape for the SDK.

The browser must not be allowed to submit arbitrary `userId`, `displayName`, membership, role, or minor status fields for token minting.

## Server-Side User Bootstrap Contract

Vouch should call ChatSDK user bootstrap endpoints from the Vouch backend, not from the browser. This removes the dependency on the peer having opened Messages before a DM is created.

Single user:

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

Bulk backfill:

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

Operational recommendation:

- Backfill all eligible active adult Vouch users before launch with `bulk-ensure`.
- Call `ensure` on signup after Vouch has created the account.
- Call `ensure` on login after Vouch confirms the account is eligible for messaging.
- Call `ensure` for both participants before DM creation.
- Batch backfills at 1000 users or fewer per request.
- Keep the ChatSDK app API key server-only.

Returned `action` is one of `created`, `updated`, or `existing`. The stable ChatSDK user ID is exactly the `userId` Vouch sends.

## Server-Side DM Creation Contract

Vouch should not rely on browser channel creation for DMs. The browser should ask Vouch to open a DM; Vouch should enforce product policy; then Vouch should call ChatSDK with app/server auth.

```http
POST http://192.168.68.244:5500/api/channels/dm/ensure
Content-Type: application/json
X-API-Key: <chatsdk-app-api-key>
```

```json
{
  "requesterUserId": "vouch-current-user-id",
  "peerUserId": "vouch-peer-user-id",
  "idempotencyKey": "optional-vouch-policy-decision-id",
  "custom": { "source": "vouch" }
}
```

ChatSDK behavior:

- Requires `X-API-Key`.
- Rejects browser bearer tokens.
- Requires both users to already exist in ChatSDK.
- Creates a deterministic DM if missing.
- Returns the existing deterministic DM if already present.
- Returns `action` as `created` or `existing`.
- Treats the requester/peer pair as the idempotency key.

Vouch behavior before calling ChatSDK:

- Confirm requester is authenticated and eligible.
- Confirm both accounts are active and adult for the first launch slice.
- Enforce block checks in both directions.
- Enforce privacy and relationship/squad/org rules.
- Call `POST /api/users/ensure` for both participants if the user may not have been bootstrapped yet.
- Strip browser `Authorization` before calling ChatSDK; send only the server-side `X-API-Key`.

Scoped channel creation:

- `POST /api/channels` requires `channel:create` when a browser token carries scopes.
- Vouch browser tokens should not receive `channel:create`.
- Vouch browser tokens can still receive `chat:read` and `chat:write` for reading and sending inside channels that Vouch already allowed.

## Server-Side Group/Squad Creation Contract

Vouch should use the same backend-mediated pattern for group, squad, and nonprofit-volunteer conversations. Vouch enforces membership and eligibility first, then calls ChatSDK with app/server auth.

```http
POST http://192.168.68.244:5500/api/channels/group/ensure
Content-Type: application/json
X-API-Key: <chatsdk-app-api-key>
```

or:

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

ChatSDK behavior:

- Requires `X-API-Key`.
- Rejects browser bearer tokens.
- Requires `externalId` or `idempotencyKey`; this value is the deterministic channel CID.
- Requires all `memberIds` to already exist in ChatSDK.
- Creates the channel if missing.
- Returns the existing channel when already present.
- Returns `action` as `created` or `existing`.
- `/api/channels/squad/ensure` returns a normal ChatSDK `group` channel with squad semantics in `config`.

Vouch behavior before calling ChatSDK:

- Confirm requester is authenticated and belongs to the group/squad/org relationship.
- Confirm the provided `memberIds` are the approved membership set for that conversation.
- Ensure all accounts are active and eligible.
- Enforce blocks, privacy, adult/minor rules, and nonprofit/squad membership policy.
- Call `POST /api/users/ensure` or backfill first so every member exists in ChatSDK.
- Strip browser `Authorization` before calling ChatSDK; send only the server-side `X-API-Key`.

## Frontend Provider Shape

Vouch should wrap ChatSDK in a small app-specific provider rather than dropping the generic provider directly into the root.

Responsibilities:

- Read `user`, `displayName`, `username`, `isLoggedIn`, `isMinor`, `accountStatus`, and auth loading state from Vouch auth context.
- Avoid connecting while auth is pending.
- Avoid connecting logged-out users.
- Disconnect on logout or user ID change.
- Call the Vouch token proxy from `tokenProvider`.
- Pass `apiUrl` and `wsUrl` from Vouch environment variables.

Expected SDK shape:

```tsx
<ChatProvider
  apiUrl={process.env.NEXT_PUBLIC_CHATSDK_API_URL}
  wsUrl={process.env.NEXT_PUBLIC_CHATSDK_WS_URL}
  tokenProvider={() =>
    fetch('/api/chatsdk-token', {
      method: 'POST',
      credentials: 'include',
    }).then(async (response) => {
      if (!response.ok) throw new Error('Failed to get ChatSDK token');
      return response.json();
    })
  }
>
  {children}
</ChatProvider>
```

The app-specific wrapper should call `connectUser` only after Vouch has a stable authenticated user.

## Messaging Policy Checklist

Before enabling production messaging, Vouch should explicitly decide and enforce:

- Whether minors can use messaging. The safest first slice is adult accounts only.
- Whether accounts with `PENDING_PARENTAL_APPROVAL`, `SUSPENDED`, or incomplete onboarding can message.
- Whether a block in either direction prevents DM creation and hides existing conversations.
- Whether privacy settings limit discovery, invitations, or DM eligibility.
- Whether DM creation requires an existing relationship, shared squad, org relationship, or explicit acceptance.
- Whether squad chat membership mirrors `SquadMember.status === ACTIVE`.
- Whether squad leaders/admins can create, archive, or moderate squad chat channels.
- How message reports flow into the existing Vouch moderation/reporting workflow.
- How deletions, exports, retention, and account deletion are handled across Vouch and ChatSDK.

These are Vouch policy decisions. ChatSDK can enforce channel membership and token scopes, but it should not be the source of truth for Vouch eligibility.

## First Implementation Slice

Recommended first slice:

1. Adult logged-in Vouch users only.
2. Backfill eligible active adult users with `POST /api/users/bulk-ensure`.
3. Add Vouch signup/login/DM hooks that call `POST /api/users/ensure`.
4. Add Vouch backend DM ensure route that calls ChatSDK `POST /api/channels/dm/ensure`.
5. Add Vouch token proxy that omits `channel:create` from browser tokens.
6. Add Vouch ChatSDK provider.
7. Add a basic `/messages` route.
8. Connect the current Vouch user.
9. Open or create a 1:1 DM through the Vouch backend route with one known adult test user.
10. Send and receive text messages.
11. Keep attachments, squad chats, search, message reports, and minor support out of scope.

This slice proves auth, token minting, REST calls, WebSocket connection, reload behavior, and basic realtime delivery without taking on the full product policy surface.

## Validation Checks

Development checks:

- `npm run smoke:shared-server` passes from `/Users/pushkar/chatsdk`.
- `curl http://192.168.68.244:5500/health` returns OK from the developer machine.
- `curl http://192.168.68.244:5511/health` returns OK from the developer machine.
- Vouch token proxy returns `401` when logged out.
- Vouch token proxy returns a token set when logged in as an eligible test user.
- Vouch backend can call `POST /api/users/ensure` with the ChatSDK app API key.
- Vouch backend can backfill eligible users with `POST /api/users/bulk-ensure`.
- Vouch backend can call `POST /api/channels/dm/ensure` with the ChatSDK app API key.
- Browser does not call the ChatSDK broker directly in the production-style path.
- Browser does not call ChatSDK user bootstrap endpoints.
- Browser does not receive `channel:create` in scoped ChatSDK tokens.
- Browser does not call ChatSDK channel creation directly for Vouch DMs.
- ChatSDK REST requests include bearer auth.
- WebSocket connects to `ws://192.168.68.244:8001/connection/websocket`.
- Reload restores the inbox and reconnects.
- Logout disconnects ChatSDK and clears visible chat state.
- A blocked or ineligible user cannot create a new DM.

Production readiness checks:

- Replace LAN IPs with stable HTTPS/WSS URLs.
- Confirm `ALLOWED_ORIGINS`, `CENTRIFUGO_ALLOWED_ORIGINS`, and `TOKEN_BROKER_ALLOWED_ORIGINS`.
- Confirm TLS termination for API and WebSocket traffic.
- Confirm monitoring, alerting, logs, and backup ownership.
- Confirm retention, export, deletion, abuse handling, and moderation runbooks.
- Confirm rate limits for token minting, channel creation, message sends, uploads, and reports.

## Open Items Requiring Source Verification

The following should be rechecked against the exact ChatSDK and Vouch commits used for implementation:

- Exact `@chatsdk/react` exports and import path for `ChatProvider`, `useChatContext`, and related hooks.
- Exact token response shape expected by `ChatClient.connectUser`.
- Whether the shared token broker currently returns `token`, `refreshToken`, and `wsToken` at top level or nests any WebSocket token under an internal field.
- Current ChatSDK channel creation constraints for `messaging` and `group` channels.
- Current ChatSDK membership enforcement for channel read/write, realtime subscriptions, and member changes.
- Current Vouch session helper available in a Next route handler versus the Hono API.
- Current Vouch block/privacy/minor/account-status APIs available to the token proxy and message route.

## Recommended Message Back To VNet/Vouch

The shared guide gives the correct ChatSDK connection primitives. For Vouch, the integration should go through a Vouch-owned token proxy and policy layer so existing auth, privacy, minors, blocking, squad membership, and moderation rules are not bypassed. A narrow adult-only DM demo is the best first slice; production rollout should wait for public HTTPS/WSS deployment and explicit policy/operations sign-off.
