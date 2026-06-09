# ChatSDK Production Hardening Test Plan

Status: Draft
Date: 2026-06-07

## Gate 0: Current Baseline

Known baseline at reviewed commit `3036bf68cbe7d2f35b4e1dd14e0fe973dfcac0ae`:

- `npm run typecheck --workspace=@chatsdk/api` fails with 17 TypeScript errors.
- `npm test --workspace=@chatsdk/api -- --run` fails with 12 failed tests and 3 unhandled errors.
- `npm audit --omit=dev --audit-level=high` reports 35 production vulnerabilities: 25 moderate, 8 high, 2 critical.

No production hardening PR may merge until baseline gates are green or explicitly waived with a security owner sign-off.

## Gate 1: Security

Required tests:

- Client SDK cannot be initialized with app API key in production/browser/RN mode.
- App API key is never required in browser/RN examples.
- User token cannot mint tokens for another user.
- Server key cannot be used as a user token.
- User token cannot access server/admin routes.
- Production startup rejects default or missing secrets.
- Wildcard CORS is rejected with credentials.

Authorization matrix:

- App A user cannot read App B channels.
- App A user cannot read App B messages.
- App A user cannot read App B uploads.
- App A user cannot read App B receipts.
- Non-member cannot list private channel detail.
- Non-member cannot list private channel messages.
- Non-member cannot fetch a single private message.
- Non-member cannot react, type, mark read, search, upload, download, pin, save, or report in private channel unless explicitly allowed.

Realtime matrix:

- User cannot subscribe to another user's personal channel.
- User cannot subscribe to a private channel they are not in.
- User removed from channel loses subscription on refresh/reconnect.
- Expired ws token refreshes correctly.

## Gate 2: Data Integrity

Required tests:

- Composite FK rejects mismatched `app_id` and `channel_id`.
- Composite FK rejects mismatched `app_id` and `message_id`.
- Composite FK rejects mismatched `app_id` and `workspace_id`.
- Duplicate `(app_id, channel_id, user_id, client_msg_id)` returns the existing message.
- Concurrent duplicate sends return one message and one seq.
- `(channel_id, seq)` uniqueness holds under concurrent sends.

## Gate 3: Messaging

Required tests:

- Create DM idempotently.
- Create group/squad channel idempotently.
- Send message.
- Update own message.
- Delete own message.
- Admin delete any message.
- Blocked user cannot create new DM.
- Removed squad member cannot send/read.
- Pagination by seq works forward and backward.
- `since_seq` backfill returns missed events exactly once.
- Deleted/thread messages do not break `hasMore`.

## Gate 4: Receipts

Required tests:

- Mark read by message ID validates app/channel membership.
- Mark read by seq is monotonic.
- Read state cannot move across channels.
- Large channel mark-read remains bounded.
- Read event is published to `chat:{appId}:{channelId}` only.
- Delivery ack updates `last_delivered_seq`.

## Gate 5: Uploads

Required tests:

- Presigned URL requires channel membership.
- Confirm fails if object is missing.
- Confirm fails if content type/size/checksum mismatch.
- Download requires upload row plus channel membership.
- Cross-app storage key access fails.
- Direct upload streams large files.
- Upload cannot be attached to a message in another channel.

## Gate 6: SDK

Required tests:

- `npm pack` core and install in clean Node ESM app.
- `npm pack` React and install in clean Vite app.
- `npm pack` React and install in clean Next app.
- `npm pack` React Native and install in clean Expo app.
- Token refresh happens before access token expiry.
- 401 triggers one refresh/retry.
- Refresh failure logs out/disconnects.
- Multiple React components subscribing to same channel do not break each other on unmount.
- React Strict Mode double mount is safe.

## Gate 7: Operations

Required tests:

- Production Docker stack boots with required env.
- Production Docker stack refuses missing/default secrets.
- Readiness fails when DB unavailable.
- Readiness fails when Centrifugo unavailable.
- Message send works while Centrifugo down by writing outbox.
- Outbox drains after Centrifugo recovers.
- Metrics require auth or private network.
- Load baseline passes.
