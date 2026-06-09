# Slice 1: Schema, Config, And Readiness

Status: completed after adversarial review and fixes

## Goal

Add the durable schema and production gates needed before implementing broker credential verification, membership sync, and server mint.

## Changes

- Added `docker/migrations/V014__client_owned_token_broker.sql`.
  - `broker_client`
  - `broker_credential`
  - `broker_app_scope`
  - `broker_mint_audit`
  - `broker_jwt_replay`
  - `broker_membership_state`
  - broker provenance columns on `auth_session`
  - system-only forced RLS for broker control-plane tables
  - app-scoped forced RLS for broker membership state
- Added config gate `CHATSDK_ENABLE_SERVER_MINT`.
- Added production validation:
  - server mint cannot be enabled with legacy `/tokens`
  - server mint cannot be enabled with API-key user connect
  - service JWT max lifetime must be 1-60 seconds in production
- Added `/ready` broker schema checks when server mint is enabled.
- Added `auth_session` and `revoked_token` to required core readiness schema.

## First Adversarial Review Findings And Fixes

GPT-5.5 high found critical/high blockers:

- Broker control-plane RLS relied on spoofable normal system context.
  - Fixed by adding `chatsdk.is_broker_system_context()` with a required `chatsdk_broker_system` DB role and switching broker control-plane policies to that function.
- Readiness could pass unsafe broker policies.
  - Fixed by checking public regular tables, exact successful V014, and expected `pg_policy` shapes.
- Sessions and membership state were not DB-tied to credential app scope.
  - Fixed with composite FKs to `broker_app_scope` and broker credential/client identity.
- Broker audit could be weakened by deletes or updates.
  - Fixed with `ON DELETE RESTRICT`, denormalized immutable identifiers, and an append-only trigger.

Antigravity found additional critical/high blockers:

- Tenant contexts could write `broker_membership_state`.
  - Fixed by replacing generic app RLS with app SELECT plus broker-system-only INSERT/UPDATE/DELETE policies.
- Audit text fields could be abused for storage exhaustion.
  - Fixed with length/cardinality constraints.
- Credential deletion could orphan sessions.
  - Fixed by removing `ON DELETE SET NULL`; broker credentials are delete-restricted by session/scope/audit references and should be disabled/revoked operationally.

Medium/low fixes also applied:

- Per-credential replay uniqueness now uses `(credential_id, jti)`.
- Lifecycle readiness no longer casts Flyway versions to integers.
- Production config rejects disabled DB SSL unless explicitly waived.
- Server mint JWT lifetime parsing is strict.
- Membership tombstone consistency is enforced.
- Broker scopes and origins have tighter DB constraints.
- Broker config strings have length/format checks.

## Verification

- Initial: `npm test --workspace=@chatsdk/api -- --run tests/readiness.test.ts tests/config-validation.test.ts`
  - 2 files passed
  - 26 tests passed
- Initial: `npm run typecheck --workspace=@chatsdk/api`
  - passed
- After adversarial fixes: `npm test --workspace=@chatsdk/api -- --run tests/readiness.test.ts tests/config-validation.test.ts`
  - 2 files passed
  - 29 tests passed
- After adversarial fixes: `npm run typecheck --workspace=@chatsdk/api`
  - passed

## Review Gate

Completed first pass:

- GPT-5.5 high adversarial review
- Antigravity adversarial review via `agy`
- Fix pass for critical/high findings

Pending:

- None.

Narrow re-review results:

- GPT-5.5 high confirmed the remaining policy-expression readiness blocker was resolved and Slice 1 can proceed.
- Antigravity confirmed no remaining blockers and Slice 1 can proceed.
