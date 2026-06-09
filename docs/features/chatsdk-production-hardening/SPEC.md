# ChatSDK Production Hardening Spec

Status: Draft for implementation
Owner: Vouch/VNet platform
Source reviewed: `Impact-Idol/ChatSDK`
Reviewed commit: `3036bf68cbe7d2f35b4e1dd14e0fe973dfcac0ae`
Local review path: `/tmp/impact-idol-chatsdk`
Date: 2026-06-07

## Executive Verdict

Hardening ChatSDK is a real option and is likely the best long-term path if Vouch wants native embedded DMs and squad chat without Stream/Sendbird concurrency pricing. The current codebase already has the right broad shape: API server, Postgres schema, Centrifugo realtime, React/React Native clients, unread/read state, uploads, devices, workspaces, and examples.

It is not production-ready today. The hardening program must start with security boundaries and install reliability, not UI polish. The current implementation exposes server-grade app credentials to clients, lacks membership checks on critical read paths, uses insecure realtime defaults, has inconsistent token refresh, and fails API typecheck/tests.

Production recommendation: proceed only if we commit to the full P0/P1 hardening plan below. Do not embed the current SDK directly in Vouch clients.

## Product Goal

Provide a Vouch-native chat service for:

- 1:1 direct messages.
- Squad/group chat.
- Attachments and media.
- Push notification handoff.
- Read/unread state.
- Delivery state sufficient for mobile UX.
- Realtime updates with reconnect/backfill.
- Moderation/reporting hooks.
- Server-side integration with Vouch identity, session, squads, and permissions.

Non-goals for the first production release:

- Federation.
- End-to-end encryption.
- Public community chat at Discord scale.
- Chat as a standalone workspace product.
- Client-side app API keys.
- Running ChatSDK as an unauthenticated public API.

## Current Fit

### Strengths

- Architecture is closer to an embeddable SDK than Zulip, Rocket.Chat, Raven, Matrix, or Stoat.
- Existing packages cover API, core client, React, React Native, Next.js, iOS SDK, migration CLI, Docker examples, docs, and examples.
- Existing backend has tables for apps, users, channels, members, messages, uploads, read receipts, devices, workspaces, polls, reports, and blocks.
- Existing client already includes reconnect-related concepts, event bus, request retry/deduplication, offline queue primitives, and tests in core.
- MIT license gives us freedom to modify and productize internally.

### Production Blockers

- Client SDK exposes the ChatSDK app API key.
- Any client request can carry `X-API-Key`, which some routes treat as app-level authority.
- Several private read paths do not enforce channel membership.
- Realtime subscription authorization is not production-safe.
- Token refresh is not wired end-to-end.
- API typecheck and API tests fail.
- Dependency audit has production high/critical vulnerabilities.
- Docker production configuration is inconsistent with runtime configuration.
- Package publishing/install surface is not reliable.

## Source-Grounded Findings

### F1: Client API Key Exposure

`ChatSDK.connect()` requires `apiKey` and sends it from the client as `X-API-Key`:

- `/tmp/impact-idol-chatsdk/packages/core/src/ChatSDK.ts:27`
- `/tmp/impact-idol-chatsdk/packages/core/src/ChatSDK.ts:91`
- `/tmp/impact-idol-chatsdk/packages/core/src/ChatSDK.ts:120`
- `/tmp/impact-idol-chatsdk/packages/core/src/ChatSDK.ts:124`

The lower-level client also sends `X-API-Key` on every request:

- `/tmp/impact-idol-chatsdk/packages/core/src/client/ChatClient.ts:799`
- `/tmp/impact-idol-chatsdk/packages/core/src/client/ChatClient.ts:801`

The server accepts that key to mint arbitrary users/tokens:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/auth.ts:47`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/auth.ts:87`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/tokens.ts:36`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/tokens.ts:62`

Production impact: a browser/mobile client with the app API key can impersonate arbitrary users, create/update users, and potentially trigger app-level bypasses.

### F2: Token Refresh Mismatch

The auth route issues 15-minute access tokens and 24-hour refresh tokens:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/auth.ts:119`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/auth.ts:154`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/auth.ts:155`

`ChatSDK.connect()` stores refresh metadata on ad-hoc private fields instead of an integrated token manager:

- `/tmp/impact-idol-chatsdk/packages/core/src/ChatSDK.ts:161`
- `/tmp/impact-idol-chatsdk/packages/core/src/ChatSDK.ts:162`

REST calls continue using `this.token`:

- `/tmp/impact-idol-chatsdk/packages/core/src/client/ChatClient.ts:799`
- `/tmp/impact-idol-chatsdk/packages/core/src/client/ChatClient.ts:802`

WebSocket token refresh returns the old token:

- `/tmp/impact-idol-chatsdk/packages/core/src/client/ChatClient.ts:314`
- `/tmp/impact-idol-chatsdk/packages/core/src/client/ChatClient.ts:316`

`TokenManager` posts the refresh token in JSON, but `/api/auth/refresh` expects it in the Authorization header:

- `/tmp/impact-idol-chatsdk/packages/core/src/auth/token-manager.ts:164`
- `/tmp/impact-idol-chatsdk/packages/core/src/auth/token-manager.ts:167`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/auth.ts:171`

Production impact: users will eventually hit 401s/reconnect failures, and refresh semantics are not secure or testable.

### F3: Missing Private Channel Membership Checks

Message listing does not verify channel membership before querying messages:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:274`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:295`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:337`

Single-message fetch lacks membership enforcement:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:392`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:397`

Channel details return members without enforcing caller membership:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/channels.ts:293`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/channels.ts:311`

Some upload/search/receipt checks omit `app_id`:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/uploads.ts:51`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/uploads.ts:118`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/uploads.ts:285`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/search.ts:135`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/receipts.ts:34`

Production impact: private DMs and squad chats can leak to non-members who know or guess IDs.

### F4: App-Level Bypass Confused With User Requests

The security review found workspace routes use `isAppLevelAuth()` to bypass role checks when `X-API-Key` exists. Because clients always send `X-API-Key`, normal clients can become app-level callers. Source locations from reviewer:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/workspaces.ts:21`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/workspaces.ts:203`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/workspaces.ts:289`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/workspaces.ts:332`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/workspaces.ts:402`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/workspaces.ts:476`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/workspaces.ts:600`

Production impact: workspace membership/admin operations can be incorrectly exposed to client users.

### F5: Realtime Subscription Security Is Insecure

Current Centrifugo config contains hardcoded defaults and insecure client settings:

- `/tmp/impact-idol-chatsdk/docker/centrifugo.json:2`
- `/tmp/impact-idol-chatsdk/docker/centrifugo.json:3`
- `/tmp/impact-idol-chatsdk/docker/centrifugo.json:4`
- `/tmp/impact-idol-chatsdk/docker/centrifugo.json:5`
- `/tmp/impact-idol-chatsdk/docker/centrifugo.json:8`
- `/tmp/impact-idol-chatsdk/docker/centrifugo.json:26`
- `/tmp/impact-idol-chatsdk/docker/centrifugo.json:36`

Client constructs channel names directly:

- `/tmp/impact-idol-chatsdk/packages/core/src/client/ChatClient.ts:479`
- `/tmp/impact-idol-chatsdk/packages/core/src/client/ChatClient.ts:487`

Current WebSocket token includes user and app, not channel grants:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/auth.ts:133`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/auth.ts:135`

Production impact: a connected user can potentially subscribe to arbitrary guessed `chat:{appId}:{channelId}` or `user:{appId}:{userId}` channels unless Centrifugo enforces server-side authorization.

### F6: Realtime Publish Is Non-Durable

Message writes commit, then Centrifugo publish happens outside the transaction:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:103`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:175`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:176`

Centrifugo requests have no timeout/retry/outbox:

- `/tmp/impact-idol-chatsdk/packages/api/src/services/centrifugo.ts:29`
- `/tmp/impact-idol-chatsdk/packages/api/src/services/centrifugo.ts:30`

Production impact: if the API crashes after DB commit or Centrifugo is unavailable, realtime delivery can be lost. Slow Centrifugo can block message send responses.

### F7: Message Idempotency Is Racy

`clientMsgId` is optional arbitrary string:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:17`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:19`

Duplicate detection is a pre-insert read:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:83`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:85`

The client message ID is reused as the message primary ID:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:112`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/messages.ts:116`

Production impact: concurrent retries can race and fail; arbitrary client IDs can conflict with UUID assumptions.

### F8: Read/Delivery Receipts Are Inconsistent

Receipt routes omit `app_id` in multiple checks and writes:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/receipts.ts:34`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/receipts.ts:44`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/receipts.ts:56`

Mark-read writes rows for every historical message up to the target:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/receipts.ts:65`

Receipt event publishes to `chat:${channelId}`, while other events publish to `chat:${appId}:${channelId}`:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/receipts.ts:91`
- `/tmp/impact-idol-chatsdk/packages/api/src/services/centrifugo.ts:153`

Production impact: read state can leak across apps/channels, and large channels will make mark-read expensive.

### F9: Upload Authorization Leaks

Presigned upload membership check omits `app_id`:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/uploads.ts:50`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/uploads.ts:52`

Direct upload buffers entire file in memory:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/uploads.ts:142`

Presigned confirm updates DB state without verifying object existence and does not scope by app:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/uploads.ts:205`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/uploads.ts:210`

Download URL generation does not check DB ownership, app, or channel membership:

- `/tmp/impact-idol-chatsdk/packages/api/src/routes/uploads.ts:233`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/uploads.ts:236`

Production impact: private attachments can leak, pending uploads can be falsely confirmed, and direct uploads can exhaust memory.

### F10: Production Secrets And Defaults Are Unsafe

Known development secrets are used as fallbacks:

- `/tmp/impact-idol-chatsdk/packages/api/src/middleware/auth.ts:11`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/auth.ts:14`
- `/tmp/impact-idol-chatsdk/packages/api/src/routes/tokens.ts:12`
- `/tmp/impact-idol-chatsdk/packages/api/src/services/centrifugo.ts:6`
- `/tmp/impact-idol-chatsdk/packages/api/src/services/centrifugo.ts:7`

Configuration validates some but not all production secrets:

- `/tmp/impact-idol-chatsdk/packages/api/src/config/defaults.ts:253`
- `/tmp/impact-idol-chatsdk/packages/api/src/config/defaults.ts:260`

Production impact: a missed environment variable can silently deploy with public demo secrets.

### F11: Dependency And Build Health Are Not Acceptable

`npm audit --omit=dev --audit-level=high` found 35 production vulnerabilities: 25 moderate, 8 high, 2 critical. Critical/high vulnerable families included Hono, `@hono/node-server`, Novu, OpenTelemetry/Prometheus exporter, Axios, AWS SDK/`fast-xml-parser`, Inngest, and `protobufjs`.

`npm run typecheck --workspace=@chatsdk/api` failed with 17 TypeScript errors, including notification implicit `any`, message strict-nullability, route issues, and `database.ts` generic constraint.

`npm test --workspace=@chatsdk/api -- --run` failed: 44 passed, 12 failed, 3 unhandled errors. Failures included E2E tests expecting a server on `localhost:5500`, incomplete Vitest mocks for `initDB`/`initCentrifugo`, and `process.exit(1)` firing during tests.

Production impact: the API package cannot be treated as releasable until typecheck, tests, and audit gates pass.

### F12: Package Install Surface Is Not Reliable

Reviewer found:

- `@chatsdk/core` and `@chatsdk/react` package entrypoints publish raw `src/index.ts`.
- `@chatsdk/react-native` points to `dist/*`, but no `dist` exists at the reviewed commit.
- Docs/examples disagree on whether `ChatProvider` accepts a client or config.
- Quickstart imports `ChatSDK` from `@chatsdk/react`, while `ChatSDK` is exported from core.
- React Native push permission implementation is a placeholder that always returns false.

Production impact: package consumers can fail in Vite, Next, Metro, Node ESM, and app-store builds.

## Target Architecture

### Trust Boundary

Vouch owns identity. ChatSDK owns chat storage and realtime delivery.

Client:

- Holds only Vouch user session and short-lived ChatSDK user credentials.
- Never receives ChatSDK app API key, admin key, Centrifugo API key, or JWT signing secret.
- Can only request user-scoped chat operations.

Vouch backend:

- Authenticates the Vouch session.
- Validates that the Vouch user can access the requested chat scope.
- Calls ChatSDK server endpoints using server-only credentials.
- Mints ChatSDK tokens for the exact Vouch user, not arbitrary user IDs.
- Syncs squad/DM membership from Vouch to ChatSDK.

ChatSDK API:

- Validates user tokens on user-originated APIs.
- Validates server-only credentials on administrative APIs.
- Enforces app/tenant and membership on every route.
- Emits durable realtime events through an outbox.

Centrifugo:

- Authenticates connections with short-lived user tokens.
- Authorizes subscriptions per channel through server-side subscribe proxy or channel-scoped subscription tokens.
- Does not allow open client subscriptions.

### Required Credential Model

Use separate credentials:

- `CHATSDK_PUBLIC_APP_ID`: safe to expose if needed.
- `CHATSDK_SERVER_API_KEY`: Vouch backend only.
- `CHATSDK_ADMIN_API_KEY`: internal admin jobs only.
- `CHATSDK_JWT_SECRET_CURRENT`: token signing.
- `CHATSDK_JWT_SECRET_PREVIOUS`: optional rotation.
- `CENTRIFUGO_TOKEN_SECRET_CURRENT`: WebSocket token signing.
- `CENTRIFUGO_API_KEY`: API server to Centrifugo only.
- `CENTRIFUGO_ADMIN_PASSWORD`: not enabled in production unless explicitly needed and protected.
- `DATABASE_URL`: required.
- `REDIS_URL`: required if used for rate limit, queues, or presence.
- `S3_*`: required for production uploads.
- `ALLOWED_ORIGINS`: exact origins only; no wildcard with credentials.

Startup must fail if any secret:

- Is absent in production.
- Matches known dev defaults.
- Is shorter than 32 bytes of entropy.
- Is reused across JWT, Centrifugo, API, and admin contexts.

### Token Flow

1. Client calls Vouch backend: `POST /api/chat/session`.
2. Vouch backend validates the Vouch session.
3. Vouch backend ensures/syncs `app_user`.
4. Vouch backend mints or requests ChatSDK credentials for that exact user.
5. Client initializes SDK with `tokenProvider`, not `apiKey`.
6. SDK uses access token for REST and ws token for Centrifugo.
7. SDK refreshes both before expiry via Vouch backend or ChatSDK refresh broker.
8. Logout clears local tokens, unregisters push token if requested, unsubscribes, disconnects.

Preferred SDK shape:

```ts
const client = await ChatSDK.connect({
  apiUrl: CHAT_API_URL,
  wsUrl: CHAT_WS_URL,
  tokenProvider: async () => {
    const res = await fetch('/api/chat/session', { method: 'POST' });
    if (!res.ok) throw new Error('Unable to start chat session');
    return res.json();
  },
});
```

Deprecated:

```ts
ChatSDK.connect({ apiKey, userId, displayName })
```

This may remain only as a development/server-side helper and must throw in browser/RN production builds.

## Implementation Plan

### P0: Stop The Bleeding

Goal: make it impossible to accidentally deploy insecure ChatSDK.

Tasks:

- Remove app API key from browser/RN SDK paths.
- Add explicit server-only auth middleware separate from user auth.
- Disable or production-guard `/api/auth/connect`, `/api/auth/connect-dev`, and `/tokens` flows that accept arbitrary `userId` with app key only.
- Fail production startup on default secrets.
- Replace `docker/centrifugo.json` with a production template that disables `client_insecure`, admin, debug, and client free-subscribe.
- Restrict CORS to explicit origins.
- Remove app-level bypass from all user-originated workspace routes.
- Mark existing docs/examples that expose API key as development-only or remove them.
- Rotate any real deployment secrets if this code was ever exposed.

Acceptance tests:

- Browser/RN package has no required `apiKey` config for production connect.
- `rg "NEXT_PUBLIC_CHATSDK_API_KEY|VITE_API_KEY|X-API-Key" docs examples packages/create-chatsdk-app` finds no production client examples.
- Production boot fails with known dev secrets.
- Client user token cannot create arbitrary `userId`.
- `ALLOWED_ORIGINS='*'` is rejected when credentials are enabled.

### P1: Authorization And Tenant Isolation

Goal: every route enforces app and membership consistently.

Tasks:

- Create shared guards:
  - `requireAppUser()`
  - `requireServerAppKey()`
  - `requireChannelMember(channelId)`
  - `requireChannelMemberOrPublic(channelId)`
  - `requireWorkspaceMember(workspaceId)`
  - `requireChannelRole(channelId, roles)`
  - `requireWorkspaceRole(workspaceId, roles)`
- Apply guards to:
  - Channel list/detail/member routes.
  - Message list/detail/send/update/delete/reaction/pin/save routes.
  - Thread routes.
  - Read/delivery receipt routes.
  - Upload direct/presigned/confirm/download/delete/list.
  - Search and mention routes.
  - Poll routes.
  - Typing/presence routes.
  - Device/push registration routes.
  - User-management routes.
- Ensure every SQL query involving tenant data includes `app_id`.
- Return 404 for inaccessible private resources where enumeration matters.
- Add tenant isolation helpers for SQL fixtures.

Acceptance tests:

- App A cannot read or mutate App B users/channels/messages/uploads/receipts.
- User A cannot read User B/User C DM by guessed channel ID.
- Non-member cannot list channel members.
- Non-member cannot search within private channel.
- Non-member cannot get upload download URL.
- Member cannot perform owner/admin operations.
- App server key can perform explicitly documented server operations only.

### P2: Database Integrity And Migrations

Goal: missed predicates become database errors, not security incidents.

Tasks:

- Add composite uniqueness where missing:
  - `app(id)` already global.
  - `app_user(app_id, id)`.
  - `channel(app_id, id)`.
  - `message(app_id, id)`.
  - `workspace(app_id, id)`.
  - `upload(app_id, id)`.
- Add composite foreign keys from child rows to `(app_id, id)`.
- Add `message_client_dedup` or message columns:
  - `client_msg_id text`.
  - Unique `(app_id, channel_id, user_id, client_msg_id)` where not null.
  - Keep `message.id` server-generated UUID.
- Add unique `(app_id, channel_id, seq)` or `(channel_id, seq)` with channel tenant FK.
- Add outbox table:
  - `event_outbox(id, app_id, aggregate_type, aggregate_id, event_type, payload, status, attempts, next_attempt_at, created_at, published_at, idempotency_key)`.
- Add delivery/read state cleanup:
  - Prefer monotonic `channel_member.last_read_seq`.
  - Add `last_delivered_seq` if needed.
  - Keep per-message read receipts only where product requires reader lists.
- Add upload authorization metadata:
  - `storage_key` unique per app/bucket.
  - Object status lifecycle.
  - Optional checksum/content length/content type.
- Create pre-migration validation scripts for mismatched rows.

Acceptance tests:

- Inserting `message(app_id=A, channel_id=channelB)` fails.
- Inserting `channel_member(app_id=A, channel_id=channelB)` fails.
- Duplicate `client_msg_id` returns original message atomically under concurrency.
- `(channel_id, seq)` cannot duplicate under concurrent sends.
- Migration runs from empty DB and from current baseline with seeded data removed or isolated.

### P3: Realtime Security And Durability

Goal: authorized subscriptions only, durable event delivery, graceful degradation.

Tasks:

- Configure Centrifugo for production:
  - `client_insecure=false`.
  - No hardcoded secrets.
  - Admin disabled or private/internal only.
  - Debug disabled.
  - Client subscribe disabled unless using subscription tokens.
- Choose one authorization model:
  - Preferred: Centrifugo subscribe proxy calls ChatSDK API to authorize each subscription.
  - Alternative: server issues short-lived per-channel subscription tokens with allowed channel claims.
- Prevent app-wide channel subscriptions for normal clients unless explicitly needed and filtered.
- Publish all realtime events through outbox worker.
- Add retries with exponential backoff and dead-letter state.
- Add lag, failure, and publish duration metrics.
- Add backfill strategy:
  - Client reconnect uses `since_seq`.
  - Server exposes stable cursor by `(seq, id)`.
  - Deleted/thread messages do not poison `hasMore`.

Acceptance tests:

- User cannot subscribe to non-member `chat:{appId}:{channelId}`.
- User cannot subscribe to another user's `user:{appId}:{userId}`.
- User cannot subscribe to arbitrary `workspace:{appId}:{workspaceId}`.
- Message commit succeeds even if Centrifugo is down; outbox later publishes.
- Publish failures are retried and observable.
- Client reconnect after missed messages backfills exactly once.

### P4: Message Send, Sync, Receipts

Goal: mobile-quality messaging semantics.

Tasks:

- Refactor send message:
  - Validate membership.
  - Generate server message ID.
  - Atomically reserve `client_msg_id`.
  - Assign monotonic seq.
  - Insert message and member state updates transactionally.
  - Insert outbox event transactionally.
- Refactor pagination:
  - Use `before_seq`, `after_seq`, and `since_seq`.
  - Avoid `created_at` cursor.
  - Scope cursor subqueries by app/channel.
  - Return stable `nextCursor`, `prevCursor`, `maxSeq`.
- Refactor read state:
  - Mark read by seq or message ID after verifying message belongs to same app/channel.
  - Do not insert per-message read rows for every historical message by default.
  - Publish read state to authorized members.
- Add delivery state:
  - Track `last_delivered_seq` when client acknowledges receipt or when push/realtime send succeeds if product accepts approximation.
  - Expose minimal `sent`, `delivered`, `read` state for DM messages.

Acceptance tests:

- Concurrent sends get unique seq.
- Retried send with same client ID returns same message.
- Pagination is stable across equal timestamps.
- Deleted messages and thread replies do not cause incorrect `hasMore`.
- Read movement is monotonic and cannot move across channels.
- Large channel mark-read is O(1) or bounded.

### P5: Uploads And Media

Goal: attachments are private, bounded, and verifiable.

Tasks:

- Make upload objects private by default.
- Presigned upload:
  - Validate app/channel membership with `app_id`.
  - Generate app/channel/user-scoped object keys.
  - Store pending upload with expected size/type/checksum.
  - Confirm via object metadata lookup.
- Download:
  - Lookup upload row by app/storage key.
  - Verify channel membership or message access.
  - Return short-lived presigned URL.
- Direct upload:
  - Stream instead of buffering entire file.
  - Enforce body limits at middleware/reverse proxy.
- Add virus/malware scanning hook if required for public launch.
- Add image/video processing queue for thumbnails/blurhash.

Acceptance tests:

- Non-member cannot get download URL.
- Confirm fails if object missing or metadata mismatches.
- Cross-app storage key cannot be accessed.
- Direct large upload does not allocate full file in memory.
- Upload row cannot be attached to message in a different channel/app.

### P6: SDK And Client Product Surface

Goal: clean, installable SDKs for Vouch web and mobile.

Tasks:

- Replace production `apiKey` connect flow with `tokenProvider`.
- Integrate `TokenManager` into `ChatClient`.
- Fix refresh request shape to match server.
- Refresh REST and WS tokens together.
- Retry one request after 401 with fresh token.
- Add logout/disconnect cleanup.
- Add subscription reference counting or subscription handles:
  - Multiple hooks can subscribe to same channel.
  - Unmount decrements one owner; does not break other consumers.
- Provide blessed APIs:
  - Core: `ChatSDK.connect({ apiUrl, wsUrl, tokenProvider })`.
  - React: `<ChatProvider client={client}>` or `<ChatProvider tokenProvider=...>`, pick one and make docs match.
  - React Native: explicit Expo and Firebase push helpers or remove placeholder claims.
- Build packages to `dist`.
- Fix `exports`, `main`, `module`, `types`, peer deps, and `files`.
- Add package consumer smoke tests.

Acceptance tests:

- `npm pack` each SDK and install into clean Vite app.
- `npm pack` each SDK and install into clean Next app.
- React Native/Expo sample resolves package entrypoints.
- Token refresh test passes for REST and WebSocket.
- React Strict Mode double mount does not drop subscriptions.
- Push registration works for Expo and Firebase examples or docs mark manual integration explicitly.

### P7: Runtime, Observability, Operations

Goal: deployable, monitorable, recoverable ChatSDK service.

Tasks:

- Align `docker-compose.prod.yml` with runtime env; code requires `DATABASE_URL`.
- Remove seeded demo app/users from production migrations.
- Add health endpoints:
  - Liveness: process alive.
  - Readiness: DB, Centrifugo, Redis/queue, storage.
- Protect `/metrics`.
- Wire metrics:
  - API request duration/status.
  - DB query errors.
  - Message send latency.
  - Outbox lag/failures.
  - Centrifugo publish duration/failures.
  - Active websocket connections if available.
  - Upload size/failure counts.
  - Push notification success/failure.
- Add structured logs with request IDs and app/user/channel IDs.
- Add rate limiting:
  - Auth/session mint.
  - Message send.
  - Upload request/confirm.
  - Search.
  - Typing events.
- Add backups:
  - Postgres PITR.
  - Object storage lifecycle.
  - Secret rotation runbook.
- Add deployment:
  - Container image build.
  - Migration job.
  - Smoke test job.
  - Rollback plan.

Acceptance tests:

- Production compose boots from empty env only when required variables are set.
- Readiness fails when DB/Centrifugo/storage unavailable.
- Metrics endpoint requires auth/network allowlist.
- Load test reaches agreed baseline without p95 regressions.
- Outbox backlog alert fires in test mode.

### P8: Vouch Integration

Goal: Vouch membership and identity are source of truth.

Tasks:

- Add Vouch chat token endpoint:
  - `POST /api/chat/session`.
  - Validates Vouch user session.
  - Ensures ChatSDK user.
  - Returns access/ws/refresh credentials.
- Add Vouch membership sync:
  - DM channel creation.
  - Squad channel creation.
  - Squad member add/remove maps to ChatSDK channel member add/remove.
  - User deactivation blocks future token mint and optionally marks user inactive.
- Add Vouch UI integration:
  - Inbox list.
  - DM thread.
  - Squad chat tab.
  - Push deep links to channel/message.
- Add moderation:
  - Report message.
  - Block user for DMs.
  - Admin hide/delete message.
  - Audit log.
- Define data retention:
  - Soft-delete semantics.
  - User deletion/anonymization.
  - Export path if needed.

Acceptance tests:

- Vouch user can mint only their own chat token.
- User removed from squad loses channel access and subscription authorization.
- Deactivated Vouch user cannot refresh ChatSDK token.
- Vouch push notification opens correct chat screen.
- Reported/hidden message no longer appears for normal users.

## Production Install Spec

### Services

Minimum production deployment:

- ChatSDK API.
- Postgres.
- Centrifugo.
- Redis or queue backend if outbox workers use it.
- Object storage compatible with S3.
- Outbox worker.
- Optional media processor worker.
- Optional push notification worker.
- Metrics/logging stack.

### Network

- Public:
  - ChatSDK API behind TLS, only routes intended for clients.
  - Centrifugo WebSocket behind TLS.
- Private/internal:
  - Postgres.
  - Redis/queue.
  - Centrifugo API.
  - Metrics.
  - Admin routes.
  - Object storage admin credentials.

### Required Environment

API:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET_CURRENT=...
JWT_SECRET_PREVIOUS=
CENTRIFUGO_TOKEN_SECRET_CURRENT=...
CENTRIFUGO_API_URL=http://centrifugo:8000/api
CENTRIFUGO_API_KEY=...
CHATSDK_SERVER_API_KEY=...
CHATSDK_ADMIN_API_KEY=...
ALLOWED_ORIGINS=https://app.vouch.example
S3_BUCKET=...
S3_REGION=...
S3_ENDPOINT=
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
REDIS_URL=redis://...
METRICS_AUTH_TOKEN=...
```

Centrifugo:

```bash
CENTRIFUGO_TOKEN_HMAC_SECRET_KEY=...
CENTRIFUGO_API_KEY=...
CENTRIFUGO_CLIENT_INSECURE=false
CENTRIFUGO_ADMIN=false
CENTRIFUGO_DEBUG=false
```

### Deployment Sequence

1. Build images.
2. Run dependency audit gate.
3. Run typecheck/test gate.
4. Apply DB migrations.
5. Start API in readiness-fail mode until dependencies pass.
6. Start Centrifugo.
7. Start outbox worker.
8. Run smoke tests:
   - Create test user through server broker.
   - Create DM.
   - Send message.
   - Receive realtime event.
   - Disconnect/reconnect and backfill.
   - Upload attachment.
   - Verify unauthorized user cannot access channel/upload.
9. Enable traffic.

### Rollback

- Keep previous API image available.
- Migrations must be forward-compatible or include explicit rollback steps.
- Outbox events must be idempotent.
- Token signing rotation should allow previous secret during rollback window.
- If realtime fails, REST send/list must continue and clients must backfill after recovery.

## Test Plan

### Required CI Gates

- `npm ci`
- `npm run typecheck --workspaces`
- `npm test --workspaces`
- `npm audit --omit=dev --audit-level=high`
- DB migration test from empty DB.
- DB migration test from current baseline snapshot.
- API integration tests with Postgres + Centrifugo + storage.
- Package pack/install smoke tests.
- Docker production boot smoke.

### Security Test Matrix

- Cross-app isolation for every route.
- Same-app non-member isolation for private channels.
- Workspace role enforcement.
- Channel role enforcement.
- Server-only routes reject user tokens.
- User routes reject server key where user context required.
- Token broker rejects arbitrary user IDs.
- Expired access token refreshes correctly.
- Expired refresh token logs out.
- Realtime unauthorized subscribe denied.
- Upload unauthorized download denied.
- Rate limits enforced.

### Reliability Test Matrix

- Centrifugo down during send.
- Centrifugo recovers and outbox drains.
- DB transient error retry behavior.
- Duplicate client message sends under concurrency.
- Mobile reconnect after app background/foreground.
- Backfill after missed events.
- Large channel mark-read.
- Pagination with identical timestamps.
- Upload confirm with missing object.
- Worker crash and restart.

### Product Test Matrix

- Create DM.
- Reopen existing DM idempotently.
- Create squad/group chat.
- Add/remove squad member.
- Send text message.
- Send attachment.
- Receive unread count.
- Mark read.
- Typing indicator.
- Push token register/unregister.
- Push deep link to message.
- Block user.
- Report message.
- Admin delete/hide message.

## Release Gates

ChatSDK can be used in Vouch production only when:

- P0 through P4 are complete.
- Vouch token broker is complete.
- API typecheck passes.
- API tests pass.
- Production audit has zero high/critical vulnerabilities or documented accepted exceptions.
- Realtime unauthorized subscription tests pass.
- Package install smoke tests pass for Vouch web and mobile.
- Load test meets initial baseline:
  - 1,000 connected clients.
  - 100 messages/sec burst for 5 minutes.
  - p95 send API under 300ms without Centrifugo outage.
  - p95 list latest messages under 250ms for 50-message page.
  - Outbox drain lag under 5s under normal load.
- Runbook exists for:
  - Secret rotation.
  - DB restore.
  - Outbox backlog.
  - Centrifugo outage.
  - Push notification failure.
  - Abuse/moderation escalation.

## Suggested Work Breakdown

### Sprint 1: Security Boundary

- Remove client API key production flow.
- Add token broker contract.
- Split user/server/admin auth.
- Add production secret validation.
- Lock down CORS.
- Lock down Centrifugo config.
- Disable unsafe docs/examples.

### Sprint 2: Authorization Coverage

- Add shared guards.
- Apply guards to routes.
- Add cross-tenant and non-member tests.
- Fix workspace app-level bypass.
- Restrict user-management routes.

### Sprint 3: DB Integrity And Message Semantics

- Add composite FKs.
- Add idempotency schema.
- Refactor send transaction.
- Add stable seq cursor.
- Refactor read state.

### Sprint 4: Realtime Durability

- Add outbox.
- Add worker.
- Add publish retries/metrics.
- Add subscription authorization.
- Add reconnect/backfill tests.

### Sprint 5: Uploads, SDK Packaging, Vouch Integration

- Secure uploads.
- Fix token manager.
- Fix subscription ref counting.
- Build dist packages.
- Add Vouch integration endpoints.
- Add package smoke tests.

## Decision

Proceed with ChatSDK hardening if we want control and lower long-run vendor cost. Do not proceed if the goal is fastest possible production launch with minimal platform ownership; in that case, use Stream/Sendbird and manage concurrency carefully.

My recommendation: proceed with a P0/P1 spike first. If we cannot close client-key removal, route authorization, and realtime subscription security quickly, stop and reevaluate OpenIM or a hosted vendor.
