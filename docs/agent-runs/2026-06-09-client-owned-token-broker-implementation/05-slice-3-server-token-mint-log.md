# Slice 3: Broker Token Mint Endpoint

Status: implemented, reviewed, and verified

## Goal

Implement the client-owned server token mint path:

- broker-authenticated `POST /api/server/apps/:appId/tokens/mint`
- active/fresh membership required before mint
- token scopes and TTL constrained by `broker_app_scope`
- real `auth_session` rows with broker provenance
- no refresh token returned to browser clients
- success/denied/error broker audit rows

## Changes

- Added `RATE_LIMIT_POLICIES.brokerTokenMint`.
- Added `issueBrokerTokenBundle()` in `packages/api/src/services/tokens.ts`.
  - Inserts `auth_session` under broker system context.
  - Records broker client/credential IDs, external tenant/user/session hash, device ID, auth source, and membership version.
  - Mints short-lived access and realtime tokens.
  - Does not create or return a refresh token.
- Added `POST /api/server/apps/:appId/tokens/mint` in `packages/api/src/routes/server.ts`.
  - Applies broker pre-auth rate limit and body limit.
  - Authenticates RS256 broker service JWT.
  - Applies credential-scoped token mint rate limit.
  - Validates requested scopes against `broker_app_scope.allowed_scopes`.
  - Requires active, fresh `broker_membership_state` for `(app_id,user_id,external_tenant_id)`.
  - Audits success, denied, and unexpected error outcomes.
- Extended V014 and readiness privilege matrix so `chatsdk_broker_system` can insert `auth_session` rows.
- Added scoped route enforcement for broker-minted tokens across the core user chat surface.
- Added an explicit `/api/server` auth middleware bypass so broker routes do not depend on registration order.
- Cached broker runtime role verification for the broker pool lifetime, while keeping production fail-closed role checks.
- Blocked tenant context switching and isolated context escapes from active broker DB contexts.

## Tests

- Added `packages/api/tests/broker-token-mint.test.ts`.
  - Mints access/realtime tokens without refresh token.
  - Inserts auth session with broker provenance.
  - Denies stale/missing membership before session creation.
  - Denies disallowed requested scopes before session creation.
- Extended `packages/api/tests/message-outbox.test.ts` with a read-only scoped token denial regression.
- Extended `packages/api/tests/auth-modes.test.ts` with an explicit `/api/server` auth middleware bypass regression.
- Extended `packages/api/tests/database-context.test.ts` with broker role-cache and broker-context escape regressions.

## Verification

- `npm test --workspace=@chatsdk/api -- --run tests/database-context.test.ts tests/broker-token-mint.test.ts tests/message-outbox.test.ts tests/broker-auth.test.ts tests/broker-membership-sync.test.ts tests/auth-modes.test.ts tests/realtime-outbox.test.ts tests/readiness.test.ts tests/config-validation.test.ts`
  - 9 files passed
  - 93 tests passed
- `npm run typecheck --workspace=@chatsdk/api`
  - passed

## Adversarial Review Resolution

### GPT-5.5 High Review

Initial Slice 3 review found:

- Critical: broker token scopes were minted/audited but not enforced downstream.
- High: `chatsdk_broker_system` role was required but not provisioned by migrations.
- Medium: `allowed_origins` was stored but not enforced.
- Medium: audit `caller_ip` was not captured as a raw `inet` value.

Resolved:

- Broker access and realtime JWTs include signed `scopes` claims.
- Auth middleware propagates token scopes to `AuthContext`.
- Added `requireScope()` middleware; legacy tokens without scopes remain unrestricted for backward compatibility.
- Applied route scope gates across the core chat surface:
  - `chat:read`: message/channel/read receipt/presence/media read routes.
  - `chat:write`: message/channel/read-state/star/mute/export-style write routes.
  - `reaction:write`: reaction add/remove routes.
  - `typing:write`: typing and presence heartbeat/online/offline routes.
  - `upload:write`: upload presign/direct/confirm/delete routes.
  - `search:read`: search routes.
- Added a read-only scoped token regression proving message send is denied before mutation/outbox work.
- V014 now provisions `chatsdk_broker_system` and grants required runtime privileges.
- Broker auth enforces configured `allowed_origins` when an Origin header is present.
- Broker audit now writes a raw validated caller IP when available instead of a hashed rate-limit key.
- Broker token mint rejects TTL requests above the scoped maximum rather than silently capping.

### Follow-up GPT-5.5 High Reviews

Narrow follow-up reviews found:

- High: representative scoped route gaps after the first scope-enforcement pass.
- No critical/high/medium findings after the broader route-scope pass.
- No critical/high/medium findings for the explicit `/api/server` auth bypass and cached broker runtime role verification.
- No critical/high/medium findings for the final broker context escape fixes.

Resolved:

- Applied `requireScope()` gates to messages, channels, uploads, search, realtime, presence, and receipts.
- Added `/api/server` bypass directly inside `authMiddleware`; broker routes still authenticate with `authenticateBrokerRequest`.
- Cached broker runtime role verification per broker pool lifetime and reset it on `closeDB()`.
- Blocked `withTenantContext()` and `withIsolatedTenantContext()` inside active broker DB contexts.
- Changed nested tenant context comparison to compare merged context values so explicit `userId: undefined` cannot erase a user context.

### Antigravity Reviews

Antigravity defensive review found:

- High: membership sync can serialize on hot shared `channel.member_count` updates.
- Medium: `/api/server` broker route bypass depended on Hono registration order.
- Medium: repeated broker runtime role checks added unnecessary DB overhead.
- Medium: broker context escape paths in database context helpers.
- Operational: inline replay cleanup, broker role password provisioning, unvalidated constraints, hardcoded broker role name, idle pool error handling, and related deployment concerns.

Resolved now:

- Made `/api/server` bypass explicit in `authMiddleware`.
- Cached broker runtime role verification for the broker pool lifetime.
- Added broker context guards to normal and isolated tenant context helpers.
- Added focused regression tests for those fixes.

Deferred to the next hardening/performance sweep:

- Move `channel.member_count` recalculation out of the hot membership sync transaction or replace it with a lower-contention counter strategy.
- Add production pool idle error handlers and operational deployment guidance for broker role credentials.
- Decide whether/when to validate `NOT VALID` constraints in a separate low-lock migration step.
- Move replay cleanup to a scheduled worker/maintenance path if request-adjacent cleanup shows pressure under load.

### Final Verification

- `npm test --workspace=@chatsdk/api -- --run tests/database-context.test.ts tests/broker-token-mint.test.ts tests/message-outbox.test.ts tests/broker-auth.test.ts tests/broker-membership-sync.test.ts tests/auth-modes.test.ts tests/realtime-outbox.test.ts tests/readiness.test.ts tests/config-validation.test.ts`
  - 9 files passed
  - 93 tests passed
- `npm run typecheck --workspace=@chatsdk/api`
  - passed
