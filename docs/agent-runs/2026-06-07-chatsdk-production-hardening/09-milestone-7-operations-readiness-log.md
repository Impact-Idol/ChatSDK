# Milestone 7: Production Operations And Readiness Hardening

Date: 2026-06-08
Status: completed

## Scope

Harden production configuration, startup dependency wiring, Docker health checks, CORS origin handling, storage env names, and readiness probes so the deployment fails closed on unsafe production config and reports dependency health through `/ready`.

This milestone intentionally keeps `/health` as process liveness. Durable realtime outbox delivery and degraded-start readiness mode remain follow-on reliability work.

## Changes

- Added production env validation through `validateProductionEnv`.
  - Requires `DATABASE_URL`, `JWT_SECRET`, `CENTRIFUGO_TOKEN_SECRET`, `CENTRIFUGO_API_URL`, `CENTRIFUGO_API_KEY`, `ALLOWED_ORIGINS`, and `CENTRIFUGO_ALLOWED_ORIGINS`.
  - Rejects placeholder values including `replace-with`, `test_`, and `for_testing`.
  - Rejects low-entropy secrets, short secrets, and equal API JWT/Centrifugo token secrets.
  - Rejects any parsed `*` token in production API or Centrifugo browser origins.
- Centralized origin parsing and made runtime CORS consume the shared config instead of hardcoded localhost production defaults.
- Split liveness and readiness semantics.
  - `/health` remains process-only.
  - `/ready` checks database connectivity, required core schema tables, optional Flyway history, and Centrifugo API ping.
  - `REQUIRE_FLYWAY_HISTORY=true` enables the migration-history readiness gate.
- Made Centrifugo service wiring use shared config for `CENTRIFUGO_API_URL` and `CENTRIFUGO_API_KEY`.
- Made storage service consume canonical `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` with legacy aliases still accepted.
- Moved Prometheus metrics to `GET /metrics`; the API root no longer serves the metrics payload.
- Updated production compose and examples.
  - Production compose now uses `DATABASE_URL`, canonical S3 env names, `ALLOWED_ORIGINS`, `CENTRIFUGO_ALLOWED_ORIGINS`, and `/ready` healthchecks.
  - Removed dead `CENTRIFUGO_JWT_SECRET`.
  - Added `docker/centrifugo.prod.json` with no embedded secrets, admin disabled, debug disabled, no broad client subscription/publish, and required namespaces.
  - Bound the production Centrifugo host port to localhost by default.
- Updated test compose env names, secrets, allowed origins, and healthcheck to match runtime production contracts.

## Tests And Builds

- `npm test --workspace=@chatsdk/api`: 83 passed.
- `npm run typecheck --workspace=@chatsdk/api`: passed.
- `npm run build --workspace=@chatsdk/api`: passed.
- `git diff --check`: passed.

New focused coverage:

- `packages/api/tests/config-validation.test.ts`
  - complete production env accepted
  - missing required production env rejected
  - placeholder/equal/short/wildcard production values rejected
  - repeated or single-class secrets rejected
  - non-production env skipped
- `packages/api/tests/readiness.test.ts`
  - healthy readiness
  - DB down
  - missing required schema tables
  - required Flyway history missing
  - Centrifugo ping failure
- `packages/api/tests/production-contract.test.ts`
  - service-scoped prod compose env names and `/ready` healthcheck
  - test compose production env validates and matches Centrifugo secrets/origins
  - production env examples expose required vars
  - production example placeholders are rejected
  - prod Centrifugo config has no embedded secrets or broad client subscriptions
  - `/metrics` route matches Prometheus and nginx config
  - canonical and legacy S3 runtime env names are covered

## Live Verification

Deployment target:

- LXC: `chatsdk-hardening`
- API: `http://192.168.68.113:5500`
- Centrifugo: `http://192.168.68.113:8001`
- Database: external DB host configured in container environment.

Deploy actions:

- Synced local source to `/opt/chatsdk/source`.
- Patched live deployment env to include `ALLOWED_ORIGINS`, `CENTRIFUGO_ALLOWED_ORIGINS`, and canonical S3 aliases while preserving existing secrets.
- Rebuilt and recreated the API container.
- Patched the live LXC compose API healthcheck from `/health` to `/ready`.
- Restarted API and confirmed both API and Centrifugo containers healthy.

Live readiness and CORS smoke:

```text
LIVE_READY_SMOKE code=200 ready=True checks=centrifugo:ok,database:ok,migrations:skipped,schema:ok
LIVE_METRICS_SMOKE code=200 content_type=text/plain; version=0.0.4; charset=utf-8 has_http_metric=True
LIVE_ROOT_NOT_METRICS_SMOKE code=404 has_metric=False
LIVE_CORS_ALLOWED_SMOKE code=200 acao=http://192.168.68.113:5500
LIVE_CORS_DISALLOWED_SMOKE code=200 acao=none
LIVE_PROTECTED_CORS_SMOKE code=401 acao=http://192.168.68.113:5500
```

Controlled Centrifugo outage smoke:

```text
READY_INITIAL_code=200
READY_INITIAL_checks={"centrifugo": {"status": "ok"}, "database": {"status": "ok"}, "migrations": {"message": "Flyway history not required", "status": "skipped"}, "schema": {"status": "ok"}}
READY_CENTRIFUGO_DOWN_code=503
READY_CENTRIFUGO_DOWN_checks={"centrifugo": {"message": "Centrifugo API ping failed", "status": "error"}, "database": {"status": "ok"}, "migrations": {"message": "Flyway history not required", "status": "skipped"}, "schema": {"status": "ok"}}
READY_RECOVERED_code=200
READY_RECOVERED_checks={"centrifugo": {"status": "ok"}, "database": {"status": "ok"}, "migrations": {"message": "Flyway history not required", "status": "skipped"}, "schema": {"status": "ok"}}
```

Final container status:

```text
chatsdk-hardening-api: healthy
chatsdk-hardening-centrifugo: healthy
```

## Reviews

- GPT-5.5 env/compose contract review found:
  - storage still reading legacy S3 names
  - minimal production env mismatch
  - placeholder validation gaps
  - dead `CENTRIFUGO_JWT_SECRET`
  - missing production contract tests
- GPT-5.5 readiness/startup review found:
  - DB env mismatch
  - Centrifugo startup/readiness gaps
  - healthchecks using liveness instead of readiness
  - migration check only informational
  - missing Centrifugo API validation
  - missing dependency-failure readiness tests
- GPT-5.5 adversarial review after implementation found:
  - prod Centrifugo browser origins would be rejected
  - wildcard CORS bypass through comma lists
  - runtime CORS still had localhost production defaults
  - low-entropy secrets were accepted
  - production compose exposed the full Centrifugo HTTP surface
- Fixes were implemented and covered by focused tests.
- GPT-5.5 follow-up review found residual reliability concerns:
  - no durable realtime outbox yet
  - API still fail-fasts on startup dependency failure instead of serving readiness-fail mode
  - readiness does not cover storage, queue, or outbox health yet
- GPT-5.5 final adversarial review found:
  - prod compose did not pass `CENTRIFUGO_ALLOWED_ORIGINS` to the API service
  - test compose production API env omitted required origins and did not match Centrifugo secrets
  - metrics were mounted at `/` while Prometheus/nginx expected `/metrics`
- GPT-5.5 post-fix adversarial review found one remaining test-compose issue:
  - test Centrifugo still allowed wildcard browser origins while API used explicit origins
- These final review issues were fixed and covered by service-scoped production contract tests.
- Antigravity was launched through `agy` for this milestone before and after fixes, but the CLI exited successfully without returning review text. This is recorded as inconclusive, not as an approval signal.

## Residuals

- Durable realtime outbox remains the next major reliability milestone. Message persistence can still be followed by failed publish when Centrifugo is unavailable.
- Startup still fails fast on dependency initialization failure. Runtime `/ready` reports dependency health after the service has started; degraded-start readiness mode is not implemented yet.
- Readiness does not yet cover storage, queue, or outbox lag. Those checks should be added when the queue/outbox layer is implemented.
- Full browser-level Playwright coverage with seeded UI journeys is still pending. This milestone used unit/integration tests plus live HTTP dependency smokes.
- `REQUIRE_FLYWAY_HISTORY` is opt-in in the live LXC because the current external database does not yet expose `flyway_schema_history`.
