# Slice 2: Broker Credential Verification, Replay, Audit, And Membership Sync

Status: implemented, awaiting adversarial review

## Goal

Implement the server-to-server broker foundation before token minting:

- dedicated broker-system DB context
- RS256 broker service JWT verification
- credential/app-scope enforcement
- service JWT replay denial
- mandatory broker audit inserts
- broker-authenticated membership sync with anti-rollback state

## Changes

- Added `db.withBrokerSystemContext()` using `BROKER_DATABASE_URL`.
- Production config now requires `BROKER_DATABASE_URL` when `CHATSDK_ENABLE_SERVER_MINT=true`.
- Added broker rate-limit policies:
  - `broker.pre_auth`
  - `broker.membership_sync`
- Added `packages/api/src/services/broker-auth.ts`.
  - Requires `RS256` and `kid`.
  - Looks up active broker client/credential.
  - Verifies audience/issuer/lifetime/JTI.
  - Inserts `broker_jwt_replay` atomically.
  - Enforces active `broker_app_scope`.
  - Writes mandatory broker audit rows.
- Added `packages/api/src/routes/server.ts`.
  - Mounted under `/api/server` before normal `/api/*` user/app auth middleware.
  - Added `PUT /api/server/apps/:appId/memberships/:userId`.
  - Applies pre-auth rate limit before body parsing.
  - Authenticates broker service JWT before body validation.
  - Enforces external tenant, user prefix, channel prefix, and fanout constraints.
  - Stores `broker_membership_state` with revision/freshness/tombstone data.
  - Rejects lower revisions and conflicting equal revisions.
  - Revokes sessions and disconnects realtime user on non-active status.

## Tests

- Added `packages/api/tests/broker-auth.test.ts`.
- Added `packages/api/tests/broker-membership-sync.test.ts`.
- Extended config tests for `BROKER_DATABASE_URL`.

## Verification

- `npm test --workspace=@chatsdk/api -- --run tests/broker-auth.test.ts tests/broker-membership-sync.test.ts tests/readiness.test.ts tests/config-validation.test.ts`
  - 4 files passed
  - 41 tests passed
- `npm run typecheck --workspace=@chatsdk/api`
  - passed

## Deferred To Slice 3

- `POST /api/server/tokens/mint`
- Inline membership apply-and-mint
- Token claims and `auth_session` provenance writes
- No-refresh browser token response
- Stale membership denial during mint

## Deferred To Slice 4/Playwright

- Full seeded browser flow through a reference broker
- Cross-client UI isolation
- Browser direct-mint denial in Playwright

## Adversarial Review Resolution

### GPT-5.5 High Review

Initial Slice 2 review found high blockers in broker RLS/context trust, JWT lifetime handling, audit FK resilience, idempotency, body limits, and durable realtime commands.

Resolved:

- Removed the normal `chatsdk` runtime role from broker RLS; broker-only tables now require `current_user = 'chatsdk_broker_system'` plus system context.
- Made the broker DB context marker internal (`brokerClient`) instead of caller-settable `TenantDbContext.brokerSystem`.
- Added broker runtime role verification: exact role, non-superuser, no BYPASSRLS.
- Added service JWT future-`iat` and absolute expiry checks.
- Added `requested_app_id` audit storage and only writes FK-backed `app_id` after verifying the app exists.
- Replaced `Content-Length`-only body guarding with Hono `bodyLimit`.
- Tightened equal-revision idempotency to include stored `fresh_until`.
- Added durable `realtime.unsubscribe_user` outbox commands for channel removals.
- Capped membership revision to JS safe integer and added matching DB check.
- Resolved membership channel IDs through `channel.cid` to internal `channel.id` before writing `channel_member`.
- Batched channel snapshot DB operations and sorted channel IDs for deterministic lock order.
- Added explicit broker runtime role grants and readiness validation for required privileges.
- Fixed replay cleanup to retain rows through the JWT clock-tolerance window and added required DELETE grant.

### Antigravity Review

Antigravity identified high/medium issues around sequential per-channel DB loops, event outbox pruning, replay cleanup frequency, and published outbox cleanup frequency.

Resolved:

- Replaced per-channel membership upsert loop with one `unnest` batch insert/upsert.
- Replaced per-channel member-count loop with one batch `UPDATE` over affected channel IDs.
- Replaced per-channel unsubscribe outbox insert loop with one batch insert.
- Added deterministic sorting for batch channel IDs to reduce concurrent lock-order deadlocks.
- Added published outbox pruning with a once-per-minute process throttle and configurable retention.
- Added expired broker JWT replay pruning with a once-per-minute process throttle.

### Verification

- `npm test --workspace=@chatsdk/api -- --run tests/broker-auth.test.ts tests/broker-membership-sync.test.ts tests/database-context.test.ts tests/realtime-outbox.test.ts tests/readiness.test.ts tests/config-validation.test.ts`
  - 6 files passed
  - 65 tests passed
- `npm run typecheck --workspace=@chatsdk/api`
  - passed

### Remaining Notes

- Slice 2 is ready to proceed from the focused broker-auth/membership-sync hardening perspective.
- Full live DB migration validation and later seeded browser/Playwright coverage remain scheduled for later slices because token mint and the reference broker UI flow are not implemented in Slice 2.
