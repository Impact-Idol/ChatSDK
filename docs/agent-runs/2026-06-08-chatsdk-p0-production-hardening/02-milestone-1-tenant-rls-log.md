# Milestone 1: Shared-DB Tenant Isolation And RLS

Date: 2026-06-08
Status: completed after adversarial review and fixes

## Scope

Implemented the first P0 shared-database tenant isolation slice:

- request-scoped DB tenant context with `AsyncLocalStorage`
- protected-route tenant context middleware
- auth-time app/user lookup under tenant context
- tenant-aware `db.query` and nested transaction behavior
- explicit system context helper for cross-app workers
- Flyway RLS migrations V006 and V007
- app-scoped `channel_seq`
- app-scoped `webhook_delivery`
- app-scoped workspace templates with global public read policy
- realtime outbox worker system context for cross-app drain/health updates
- webhook delivery system context for cross-app worker operations
- focused tests for DB context and tenant middleware
- real-Postgres non-owner runtime-role RLS integration tests

## Changed Files

- `packages/api/src/services/database.ts`
- `packages/api/src/middleware/tenant-context.ts`
- `packages/api/src/middleware/auth.ts`
- `packages/api/src/index.ts`
- `packages/api/src/routes/channels.ts`
- `packages/api/src/routes/messages.ts`
- `packages/api/src/routes/templates.ts`
- `packages/api/src/services/realtime-outbox.ts`
- `packages/api/src/services/webhook-delivery.ts`
- `docker/migrations/V006__tenant_rls_context.sql`
- `docker/migrations/V007__adversarial_rls_fixes.sql`
- `packages/api/tests/database-context.test.ts`
- `packages/api/tests/tenant-context-middleware.test.ts`
- `packages/api/tests/tenant-rls.integration.test.ts`
- `packages/api/tests/message-outbox.test.ts`
- `packages/api/tests/thread-outbox.test.ts`

## Agent Inputs

- Ampere confirmed RLS/context is P0 for shared DB and flagged `channel_seq`, `webhook_delivery`, `workspace_template`, outbox/system jobs, and direct-query guardrails.
- Russell identified token/revocation/demo-kill items for the next milestone.
- Parfit proposed the deterministic seeded API/Playwright strategy for later milestones.

## Verification

Commands run:

```bash
npm --workspace @chatsdk/api run typecheck
npm --workspace @chatsdk/api test -- --run tests/database-context.test.ts tests/tenant-context-middleware.test.ts
npm --workspace @chatsdk/api test -- --run
npm --workspace @chatsdk/api run build
docker run -d --rm --name chatsdk-rls-pg-verify -e POSTGRES_USER=chatsdk -e POSTGRES_PASSWORD=chatsdk_test -e POSTGRES_DB=chatsdk -p 55432:5432 postgres:16-alpine
docker run --rm --network host -v /Users/pushkar/chatsdk/docker/migrations:/flyway/sql flyway/flyway:10 -url=jdbc:postgresql://127.0.0.1:55432/chatsdk -user=chatsdk -password=chatsdk_test -connectRetries=10 migrate
docker exec -i chatsdk-rls-pg-verify psql -U chatsdk -d chatsdk
TEST_DATABASE_URL=postgresql://chatsdk_app:runtime_test_123@localhost:55432/chatsdk npm --workspace @chatsdk/api test -- --run tests/tenant-rls.integration.test.ts
```

Results:

- API typecheck passed.
- Focused tenant context tests passed: 2 files, 9 tests.
- Full API test suite passed: 19 files passed, 2 skipped; 127 tests passed, 7 skipped.
- API build passed.

Migration validation:

- Ran Flyway against a throwaway Postgres 16 container.
- V001-V007 applied successfully.
- Created separate non-owner runtime role `chatsdk_app` and ran the RLS integration suite through that role.
- Verified tenant context only sees current-app `app_user` rows.
- Verified system context can see cross-app worker rows explicitly.
- Verified cross-app tenant writes are blocked by RLS.
- Verified `next_channel_seq()` increments own-tenant channel sequences and rejects another tenant's channel.
- Verified global public workspace templates are readable by tenants but cannot be mutated by tenant context.

## Adversarial Review

GPT-5.5 high findings fixed:

- Outbox/system worker context could reuse request-scoped clients and observe uncommitted or rolled-back data. Fixed by making system context isolated with a fresh client outside the active request context.
- API-key requests were being treated as SQL system context. Fixed so API-key authenticated requests remain app-scoped in RLS.
- Token/auth mint routes and bearer auth-time user lookups needed tenant context under RLS. Fixed in auth and token routes.
- Webhook worker queries needed explicit cross-app system context. Fixed delivery, logging, retry, and failure-update queries.
- Production must not run with a superuser or `BYPASSRLS` database role. Added startup guard for production or `REQUIRE_RLS_ROLE_CHECK=true`.

Antigravity findings fixed or reconciled:

- Confirmed webhook delivery needed system context and completed the remaining worker queries.
- Added `V007__adversarial_rls_fixes.sql` to harden `next_channel_seq()` as `SECURITY DEFINER` with pinned search path, explicit tenant check for non-system callers, and restricted execute grants.
- Reconfirmed `pinned_message` and `saved_message` RLS are covered by V006; V007 is idempotent reinforcement for those policies.
- Reconfirmed global public workspace templates are read-only for tenants; V007 preserves this and adds an app-or-public check constraint.
- Rejected and fixed an Antigravity-introduced regression that promoted API-key requests to SQL system context.
- Rejected and fixed an Antigravity-introduced nested-context regression that changed PG session RLS variables on a reused request client without restoring them. Nested tenant identity switches now fail closed.

## Known Residual Risks

- This milestone adds the RLS/context foundation but does not yet add a static direct-query lint/guardrail for future raw pool usage.
- Existing route SQL still relies on route-level authorization plus app-scoped RLS; broader seeded cross-route tenant tests remain part of later Playwright/API coverage.
- Token revocation, demo/legacy mint kill switches, private media, and rate limits are follow-on milestones.

## Next Required Step

Start Milestone 2: token broker hardening, token revocation, production demo/legacy mint kill switches, and connected membership removal behavior.
