# Milestone 2: Token Broker Hardening And Revocation

Date: 2026-06-08
Status: completed after adversarial review and fixes

## Scope

Implemented the P0 token/revocation hardening slice:

- centralized token issuance and verification in `packages/api/src/services/tokens.ts`
- access, refresh, and realtime tokens include `kid`, `iss`, `aud`, `sub`, `jti`, `sid`, `nbf`, `iat`, and `exp`
- app-scoped Centrifugo subjects use `${appId}:${userId}` to avoid cross-tenant realtime identity collisions
- durable `auth_session`, `revoked_token`, and `app_user.tokens_valid_after` schema in Flyway V008
- RLS enabled and forced for new token tables
- refresh-token rotation with replay detection
- server-side user token revocation endpoint
- app-scoped realtime disconnect/unsubscribe on user revocation and membership removal
- API-key user token broker and legacy `/tokens` endpoint are disabled in production unless explicitly enabled
- `docker-compose.test.yml` now uses Flyway migrations instead of stale `docker/init-db.sql`

## Changed Files

- `packages/api/src/services/tokens.ts`
- `packages/api/src/middleware/auth.ts`
- `packages/api/src/routes/auth.ts`
- `packages/api/src/routes/tokens.ts`
- `packages/api/src/routes/realtime.ts`
- `packages/api/src/routes/users.ts`
- `packages/api/src/routes/channels.ts`
- `packages/api/src/routes/workspaces.ts`
- `packages/api/src/config/defaults.ts`
- `docker/migrations/V008__token_revocation_sessions.sql`
- `docker/docker-compose.prod.yml`
- `docker-compose.test.yml`
- `.env.production.example`
- `.env.production.minimal`
- `packages/api/tests/auth-modes.test.ts`
- `packages/api/tests/realtime-auth.test.ts`
- `packages/api/tests/token-revocation.test.ts`
- `packages/api/tests/config-validation.test.ts`
- `packages/api/tests/production-contract.test.ts`

## Verification

Commands run:

```bash
npm --workspace @chatsdk/api run typecheck
npm --workspace @chatsdk/api test -- --run
npm --workspace @chatsdk/api run build
docker compose -f docker-compose.test.yml config
docker run --rm --network host -v /Users/pushkar/chatsdk/docker/migrations:/flyway/sql flyway/flyway:10 -url=jdbc:postgresql://127.0.0.1:55432/chatsdk -user=chatsdk -password=chatsdk_test -connectRetries=10 migrate
git diff --check
```

Results:

- API typecheck passed.
- Full API test suite passed: 20 files passed, 2 skipped; 130 tests passed, 7 skipped.
- API build passed.
- `docker-compose.test.yml` renders successfully.
- Flyway V001-V008 applied successfully to a throwaway Postgres 16 database.
- Verified `auth_session` and `revoked_token` have RLS enabled and forced.
- `git diff --check` passed.

## Adversarial Review

GPT-5.5 high findings fixed:

- Refresh-token replay protection was raceable. Fixed by making rotation require `INSERT ... ON CONFLICT DO NOTHING RETURNING token_id`; replay now revokes the session and fails closed.
- Workspace member removal left channel memberships for workspace-scoped channels. Fixed by deleting the removed user's `channel_member` rows for channels in that workspace.
- `docker-compose.test.yml` initialized Postgres from stale `docker/init-db.sql`. Fixed by adding a Flyway service and making API wait for successful migrations.

Antigravity via `agy`:

- Command exited without review text. Recorded as inconclusive, not as a pass.

## Residual Risks

- The future Vouch-owned backend token broker is still the intended production mint authority. This milestone makes existing ChatSDK mint surfaces safer and production-disabled by default, but does not yet add a full service-JWT/mTLS `/api/tokens/mint` boundary.
- Realtime disconnect/unsubscribe calls are still fire-and-forget; durable retryable ejection jobs are a follow-up reliability improvement.
- Broader seeded Playwright coverage for refresh replay, revocation, and removed-member realtime behavior remains pending.

## Next Required Step

Start Milestone 3: private media hardening with private object access, signed/proxy download authorization, upload metadata validation, and seeded Playwright coverage.
