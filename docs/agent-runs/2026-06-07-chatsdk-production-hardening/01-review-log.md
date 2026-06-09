# ChatSDK Production Hardening Review Log

Date: 2026-06-07
Source: `/tmp/impact-idol-chatsdk`
Commit: `3036bf68cbe7d2f35b4e1dd14e0fe973dfcac0ae`

## Agents Used

- Nash: security, auth, tenant isolation.
- Ramanujan: backend, data, realtime reliability.
- Erdos: SDK, client, product install surface.

## Graphify Context

Ran:

```bash
./scripts/graphify query "What existing Vouch chat, DM, squad messaging, notification, and realtime architecture exists, and how would an external ChatSDK likely integrate?"
```

Graphify found current Vouch chat-like behavior primarily in mock squad UI (`ui-playground/src/components/SquadDetailDialog.tsx`) rather than a mature existing chat backend. This supports treating ChatSDK as a new infrastructure integration rather than a replacement of local production chat code.

## Local Checks

```bash
npm run typecheck --workspace=@chatsdk/api
```

Result: failed with 17 TypeScript errors.

```bash
npm test --workspace=@chatsdk/api -- --run
```

Result: failed with 12 failed tests and 3 unhandled errors.

```bash
npm audit --omit=dev --audit-level=high
```

Result: failed with 35 production vulnerabilities: 25 moderate, 8 high, 2 critical.

## Consolidated Verdict

ChatSDK is a viable strategic base only after a production hardening program. Current code is not safe to embed in Vouch clients because it exposes app credentials, has missing private membership checks, has insecure realtime defaults, and has failing release gates.

The recommended next step is a P0/P1 hardening spike focused on:

- Removing client-side app API key flow.
- Adding Vouch server-side token broker.
- Splitting user/server/admin credentials.
- Centralizing route authorization guards.
- Locking down Centrifugo subscriptions.
- Making production startup reject unsafe defaults.
- Getting API typecheck/tests/audit green.

## Source Review Highlights

- `packages/core/src/ChatSDK.ts`: client API key connect flow.
- `packages/core/src/client/ChatClient.ts`: API key sent on every request; subscription lifecycle; token refresh gap.
- `packages/api/src/routes/auth.ts`: arbitrary user minting with API key.
- `packages/api/src/routes/tokens.ts`: legacy token minting with API key.
- `packages/api/src/routes/messages.ts`: missing membership checks, racy idempotency, non-durable publish.
- `packages/api/src/routes/channels.ts`: channel detail/member exposure.
- `packages/api/src/routes/receipts.ts`: app scoping gaps and expensive read receipt model.
- `packages/api/src/routes/uploads.ts`: upload authorization gaps.
- `docker/centrifugo.json`: insecure development config.
- `packages/api/src/config/defaults.ts`: production config validation incomplete.
