# Milestone 11: Security, Config, Dependency, And Deployment Sweep

Date: 2026-06-08
Status: completed

## Scope

Close the production hardening sweep after seeded E2E coverage:

- fix the broken root install path
- reduce production dependency audit severity without forced major upgrades
- remove runtime secret fallbacks from token/auth paths
- make production configuration explicit and fail-fast
- wire readiness for storage, search, Inngest, schema, and realtime outbox health
- tighten production compose defaults
- deploy the final runtime to the LXC and re-run seeded browser realtime
- run adversarial GPT-5.5 high and Antigravity reviews, then address findings

## Changes

- Root install and dependency floors:
  - `npm ci` now succeeds from the repository root.
  - Updated API/core/react dependency floors and regenerated the root lockfile.
  - Updated the Novu API call shape for the upgraded `@novu/api`.
  - Fixed Vitest 4 constructor-mock and decorator parser regressions in tests.
- Runtime secret/config hardening:
  - JWT and Centrifugo signing secrets now come from centralized validated config in auth, token, realtime, and middleware modules.
  - `NODE_ENV` must be explicitly `development`, `test`, or `production`.
  - `/api/auth/connect-dev` is registered only when `NODE_ENV=development` and `ALLOW_DEV_AUTH=true`.
  - Production database SSL defaults to true when `DATABASE_SSL` is absent.
  - Logger redacts common auth, API key, token, secret, password, database URL, and Redis URL fields.
- Readiness and startup hardening:
  - `/ready` now checks database, expanded schema, optional Flyway history, storage, Centrifugo, realtime outbox, search, and Inngest wiring.
  - Public health/readiness responses return generic backend failure messages and log details server-side.
  - Required schema tables now include `app`, `app_user`, `channel`, `channel_member`, `event_outbox`, `message`, and `workspace`.
  - S3-compatible storage is required in production, lazy-initialized, checked at startup, and checked in readiness.
  - Configured Meilisearch now requires host plus key validation, authenticated index access in readiness, and production startup failure when initialization cannot complete.
  - Inngest readiness reports skipped/error/ok based on event/signing key presence.
- Realtime outbox:
  - Overlapping drain requests now coalesce into a follow-up pass instead of returning while work may be newly queued.
- Production compose:
  - API port is bound to `127.0.0.1:${API_PORT:-5500}:5500` so public traffic goes through nginx.
  - Core API, Centrifugo, CORS, and S3 upload variables are required by compose interpolation.
  - Optional Redis, Inngest, Meilisearch, and OpenAI variables are explicit.
  - Flyway profile is present for one-shot migrations without poisoning normal `docker compose config`.
  - Obsolete compose `version` field was removed.
- Legacy token refresh:
  - `/tokens` now returns typed `access` and `refresh` JWTs while preserving the existing `token` and `wsToken` response fields.
  - `/tokens/refresh` now requires `type: refresh`, validates required claims, rotates refresh tokens, and no longer uses a 24-hour `clockTolerance`.

## Tests And Builds

Local verification:

```text
npm ci
passed

npm test --workspace=@chatsdk/api
17 passed | 1 skipped files
118 passed | 2 skipped tests

npm test --workspace=@chatsdk/core
18 passed files
351 passed tests

npm run typecheck --workspace=@chatsdk/api
passed

npm run build --workspace=@chatsdk/api
passed

npm run build --workspace=@chatsdk/core
passed

npm run test:playwright
passed with 1 skipped when live env is absent

git diff --check
passed
```

Focused regression coverage added or extended:

- `packages/api/tests/auth-modes.test.ts`
  - legacy `/tokens` returns typed access and refresh tokens
  - legacy `/tokens/refresh` rejects access tokens
  - legacy `/tokens/refresh` rejects expired refresh tokens without broad clock tolerance
  - legacy `/tokens/refresh` rotates refresh and websocket tokens
- `packages/api/tests/config-validation.test.ts`
  - explicit `NODE_ENV`
  - production S3 requirements
  - Meilisearch host/key pairing and secret validation
- `packages/api/tests/dev-auth-registration.test.ts`
  - dev auth route is absent in test/prod-style envs and present only with explicit dev opt-in
- `packages/api/tests/production-contract.test.ts`
  - runtime secret modules use centralized config
  - prod compose binds API to loopback
  - prod compose requires storage variables
  - prod compose exposes Flyway migration profile
- `packages/api/tests/readiness.test.ts`
  - expanded schema checks
  - sanitized backend failures
  - storage, search, and Inngest readiness modes
- `packages/api/tests/realtime-outbox.test.ts`
  - overlapping drain coalescing
- `packages/api/tests/search-health.test.ts`
  - Meilisearch readiness uses authenticated index stats rather than public health
  - invalid search key fails readiness
  - configured production search initialization failures are not swallowed

Compose checks:

```text
docker compose -f docker/docker-compose.prod.yml config
failed intentionally when required production vars were absent

env DATABASE_URL=... S3_ENDPOINT=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...
    S3_BUCKET=... CENTRIFUGO_API_KEY=... CENTRIFUGO_TOKEN_SECRET=...
    JWT_SECRET=... ALLOWED_ORIGINS=... CENTRIFUGO_ALLOWED_ORIGINS=...
    docker compose -f docker/docker-compose.prod.yml config
passed
```

Rendered prod compose confirmed:

```text
api port: 127.0.0.1:5500 -> 5500
nginx ports: 80, 443
```

Audit:

```text
npm audit --omit=dev
0 critical, 0 high, 3 moderate

npm audit
0 critical, 0 high, 8 moderate
```

The remaining production audit findings are moderate and tied to dependency chains that require forced/breaking upgrades.

## Live Verification

Deployment target:

- LXC: `chatsdk-hardening`
- API: `http://192.168.68.113:5500`
- Centrifugo: `ws://192.168.68.113:8001/connection/websocket`
- Database/storage backing services: external host `192.168.68.110`

Deployment actions:

- Synced the current workspace to `/opt/chatsdk/source`.
- Rebuilt `chatsdk-hardening-api:local` from `docker/Dockerfile.api`.
- Restarted `chatsdk-hardening-api` through `/opt/chatsdk/deploy/compose.yml`.

Final live readiness:

```text
READY_STATUS=200
database=ok
schema=ok
migrations=skipped
storage=ok
centrifugo=ok
realtimeOutbox=ok pending=0 failed=0 oldest_pending_seconds=0
search=skipped Meilisearch not configured
inngest=skipped Inngest not configured
```

Final seeded browser realtime:

```text
PLAYWRIGHT_CHATSDK_API_URL=http://192.168.68.113:5500
PLAYWRIGHT_CHATSDK_WS_URL=ws://192.168.68.113:8001/connection/websocket
PLAYWRIGHT_CHATSDK_ALLOW_INSECURE_LAN=true
PLAYWRIGHT_CHATSDK_API_KEY=<fetched without printing>
PLAYWRIGHT_CHATSDK_DATABASE_URL=<fetched without printing>
npm run test:playwright

Chromium: passed
Scenario: recipient user2 received durable message.new sent by user1
Outbox: message.new idempotency key reached status=published
```

## Reviews

First Antigravity adversarial review found high issues:

- legacy `/tokens/refresh` accepted access tokens and used a 24-hour `clockTolerance`
- public readiness/health could leak backend error messages
- schema readiness omitted `event_outbox`
- production DB SSL default could be false outside compose
- Meilisearch configured key validation was missing
- prod compose used `:latest` and API direct exposure remained a risk

Fixes implemented:

- strict typed refresh-token validation and token rotation
- sanitized public readiness/health messages
- expanded schema checks
- production DB SSL default true
- Meilisearch host/key validation
- loopback API port binding and stricter production compose

GPT-5.5 high adversarial review found high issues:

- prod compose exposed the API directly, bypassing nginx `/metrics` protections
- minimal production env omitted S3, while storage could be broken or crash at import/startup without readiness visibility

Fixes implemented:

- prod API port now binds to loopback
- S3-compatible storage is required in production compose/env examples
- storage client is lazy and fails startup/readiness when unavailable
- readiness includes storage

Follow-up GPT-5.5 high review found one remaining high issue:

- Meilisearch `/health` may be public, so readiness could pass with an invalid key

Fixes implemented:

- readiness now uses authenticated `messages` index stats
- production `initSearch()` throws on configured initialization failure
- `search-health.test.ts` covers authenticated health and production fast-fail

Final narrow Antigravity review:

- no blockers or high findings

Final narrow GPT-5.5 high review:

- no blockers or high findings

## Residuals

- Current LXC deployment has Meilisearch and Inngest intentionally unconfigured; readiness reports both as skipped.
- Existing legacy refresh tokens without `type: refresh` will no longer refresh through `/tokens/refresh`; affected clients must request fresh tokens.
- Root audit still reports moderate-only dependency findings. No critical or high vulnerabilities remain after non-forced remediation.
- The live deployment compose used on the LXC is separate from `docker/docker-compose.prod.yml`; production compose hardening was verified locally, while the LXC deployment retained its existing environment and direct API port for LAN test access.
