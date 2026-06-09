# Final Security and Code Review Sweep

Date: 2026-06-08
Status: completed after adversarial review and fixes

## Scope

Performed the final comprehensive hardening review after Milestones 1-7:

- Auth/token broker and legacy token gating.
- API-key versus bearer-token boundaries.
- Tenant DB context and RLS bypass risk.
- Private media and object storage access.
- Rate limiting, Redis fail-closed behavior, and readiness.
- Realtime authorization and token subjects.
- Search outbox, data lifecycle, backup/restore, and chaos ops.
- Production compose/env defaults and Flyway migration readiness.

## Critical/High Findings Fixed

- Production rate limiting could fail all traffic with managed TLS Redis while `/ready` stayed green.
  - Added `REDIS_TLS` runtime config.
  - Passed TLS options to `ioredis`.
  - Added `checkRateLimitHealth()`.
  - Added rate-limit readiness to `/ready`.
  - Added config/readiness/contract coverage.

- Core message sends/thread replies could fail in least-privilege deployments with separate Flyway/runtime DB roles.
  - Added `docker/migrations/V013__runtime_role_sequence_execute.sql`.
  - Restored `EXECUTE` on `next_channel_seq(uuid)` for runtime compatibility.
  - Kept the function `SECURITY DEFINER`, pinned search path, and tenant-context checks from V007.
  - Raised production schema readiness to require V013.
  - Verified fresh Flyway replay through V013 and function execute ACL.

## Verification

Commands run:

```bash
npm --workspace @chatsdk/api test -- --run tests/config-validation.test.ts tests/readiness.test.ts tests/rate-limit.test.ts tests/production-contract.test.ts
npm --workspace @chatsdk/api run typecheck
npm --workspace @chatsdk/api test -- --run
npm --workspace @chatsdk/api run build
npx playwright test tests/playwright/chat-chaos.spec.ts
git diff --check
docker run --name chatsdk-final-pg ... postgres:16-alpine
docker run --rm --network host -v "$PWD/docker/migrations:/flyway/sql:ro" flyway/flyway:10 ... migrate
docker exec chatsdk-final-pg psql ... "SELECT MAX(version::int) ...; SELECT COALESCE(array_to_string(proacl, ','), '') LIKE '%=X/postgres%' ...; SELECT relname ..."
```

Results:

- Focused config/readiness/rate-limit/contract tests passed: 4 files, 49 tests.
- API typecheck passed.
- Final full API suite passed: 28 files passed, 2 skipped; 206 tests passed, 7 skipped.
- API build passed.
- Playwright chaos spec passed in default mode with 1 skipped because `CHATSDK_CHAOS=1` was not set.
- `git diff --check` passed.
- Fresh Flyway replay applied V001-V013 successfully.
- Fresh schema check showed:
  - latest migration version `13`
  - `next_channel_seq(uuid)` has public execute ACL after V013
  - M7 backup/search audit/outbox tables still have RLS enabled and forced.

Expected test logs:

- Search tests intentionally log mocked Meilisearch failures.
- Rate-limit tests intentionally log mocked Redis/limit failures.

## Adversarial Review

- GPT-5.5 xhigh final comprehensive review found two high blockers: Redis TLS/readiness and separated Flyway/runtime DB role grants.
- Both blockers were fixed and re-verified.
- GPT-5.5 xhigh narrow re-review found no remaining critical/high blockers in those areas.
- Antigravity was launched for the final review via `agy`; it exited 0 with blank output. Recorded as launched/no usable findings, not as approval.

## Residual Risk

- Live `CHATSDK_CHAOS=1` chaos execution remains opt-in and requires a running `COMPOSE_PROJECT_NAME=chatsdk-chaos docker compose -f docker-compose.test.yml up -d` stack.
- This host lacks local PostgreSQL client tools, so local `pg_dump`/`pg_restore` drills were verified by explicit fail-fast preflights plus Docker-based Flyway replay, not a full dump/restore cycle.
- A deployed seeded validation run against the intended Proxmox/VM database and object storage stack is still the next practical sign-off step.
