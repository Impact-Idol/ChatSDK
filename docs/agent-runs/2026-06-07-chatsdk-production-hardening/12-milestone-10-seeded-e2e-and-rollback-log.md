# Milestone 10: Seeded E2E And Real-Postgres Rollback Coverage

Date: 2026-06-08
Status: completed

## Scope

Add test coverage that proves the realtime outbox and browser realtime path against real infrastructure, not only mocks.

This milestone focuses on:

- physical Postgres transaction rollback for domain writes plus outbox rows
- seeded Chromium/WebSocket delivery against the deployed LXC environment
- recipient-side realtime delivery, unauthorized subscription denial, and durable outbox publication checks
- CI guardrails so environment-dependent integration tests cannot silently pass in CI when misconfigured

## Changes

- Added `packages/api/tests/realtime-outbox-transaction.integration.test.ts`.
  - Skips locally unless `TEST_DATABASE_URL` is set.
  - Fails in CI if `TEST_DATABASE_URL` is missing.
  - Uses real Postgres and the production `db.transaction` implementation.
  - Proves a workspace row and a valid `event_outbox` row roll back together by throwing a sentinel error after enqueue.
  - Proves a successful transaction commits both the workspace row and outbox row together.
  - Allows outbox status to be `pending`, `processing`, or `published` on commit assertion so a concurrently running outbox worker cannot make the test flaky.
- Added root Playwright harness.
  - `playwright.config.ts`
  - `tests/playwright/realtime-browser.spec.ts`
  - `package.json` script: `test:playwright`
  - root dev dependency: `@playwright/test`
- Added seeded browser realtime coverage.
  - Connects two seeded users through `/api/auth/connect`.
  - Creates a messaging channel with user1 and user2.
  - Asserts user1 cannot obtain an API subscription token for user2's personal `user:*` channel.
  - Asserts a raw WebSocket subscribe to user2's personal channel without a subscription token is denied by Centrifugo.
  - Subscribes Chromium as recipient user2.
  - Sends a message as user1 only after user2's Centrifugo subscribe acknowledgement.
  - Asserts user2 receives `message.new`.
  - When `PLAYWRIGHT_CHATSDK_DATABASE_URL` is set, polls `event_outbox` by `message.new:${appId}:${clientMsgId}` and requires `status = 'published'`.
  - Cleans up seeded channel and users after the run.
- Added security guardrails to the Playwright harness.
  - Fails in CI if API, WS, API key, or DB URL env is missing.
  - Blocks non-loopback `http:`/`ws:` targets unless `PLAYWRIGHT_CHATSDK_ALLOW_INSECURE_LAN=true` is explicitly set.
  - Handles IPv4 and IPv6 loopback hosts.
  - Disables Playwright traces for secret-bearing live runs.
  - Rejects promptly on WebSocket command errors and unexpected close events.

## Tests And Builds

Local guarded checks:

- `npm run test:playwright`: passed with 1 skipped when live env is absent.
- `npm test --workspace=@chatsdk/api -- realtime-outbox-transaction.integration`: passed with 2 skipped when `TEST_DATABASE_URL` is absent.
- `CI=1 npm test --workspace=@chatsdk/api -- realtime-outbox-transaction.integration`: failed intentionally with a clear missing `TEST_DATABASE_URL` error.
- `CI=1 npm run test:playwright`: failed intentionally with clear missing Playwright env errors.
- Non-loopback plaintext target without `PLAYWRIGHT_CHATSDK_ALLOW_INSECURE_LAN=true`: failed intentionally.
- IPv6 loopback plaintext target listed successfully without requiring the insecure LAN override.

Real Postgres:

- Started a disposable `postgres:16-alpine` container.
- Loaded `docker/init-db.sql`.
- Waited until `public.event_outbox` was visible from the host connection.
- Ran:

```text
TEST_DATABASE_URL=postgresql://...@127.0.0.1:55435/chatsdk npm test --workspace=@chatsdk/api -- realtime-outbox-transaction.integration
```

Result:

```text
Test Files  1 passed (1)
Tests       2 passed (2)
```

Full API verification after M10 changes:

- `npm run typecheck --workspace=@chatsdk/api`: passed.
- `npm test --workspace=@chatsdk/api`: 102 passed, 2 skipped.
- `npm run build --workspace=@chatsdk/api`: passed.
- `git diff --check`: passed.

## Live Verification

Deployment target:

- LXC: `chatsdk-hardening`
- API: `http://192.168.68.113:5500`
- Centrifugo: `ws://192.168.68.113:8001/connection/websocket`
- Database: external DB host configured by the deployed API container.

Live command shape:

```text
PLAYWRIGHT_CHATSDK_API_URL=http://192.168.68.113:5500
PLAYWRIGHT_CHATSDK_WS_URL=ws://192.168.68.113:8001/connection/websocket
PLAYWRIGHT_CHATSDK_ALLOW_INSECURE_LAN=true
PLAYWRIGHT_CHATSDK_API_KEY=<fetched from deployed DB without printing>
PLAYWRIGHT_CHATSDK_DATABASE_URL=<fetched from deployed API env without printing>
npm run test:playwright
```

Result:

```text
Test Files: 1
Chromium: passed
Scenario: recipient user2 received durable message.new sent by user1
Outbox: message.new idempotency key reached status=published
```

## Reviews

- GPT-5.5 high adversarial review found:
  - the first rollback test could pass even if outbox writes were not transactional
  - the first browser test proved live publish, not durable outbox publication
  - secret-bearing Playwright traces and plaintext LAN targets needed explicit handling
  - the recipient path was not tested
  - raw Centrifugo protocol errors could be hidden
  - seeded data cleanup was missing
- Fixes implemented:
  - sentinel rollback after successful outbox enqueue with a valid app id
  - optional DB-backed outbox `published` assertion, required in CI
  - trace disabled for secret-bearing runs
  - explicit insecure-LAN opt-in
  - recipient-side subscription and delivery
  - API and raw WebSocket unauthorized-subscribe assertions
  - protocol error and close handling
  - seeded channel/user cleanup
- GPT-5.5 follow-up review found no blockers or high-severity issues. It identified two medium gaps:
  - DB outbox verification was optional in CI
  - unauthorized subscribe did not exercise the API token broker
- Fixes implemented:
  - CI now requires `PLAYWRIGHT_CHATSDK_DATABASE_URL`
  - browser spec now asserts `/api/realtime/subscription-token` rejects user1 for user2's personal channel
- Antigravity follow-up review found:
  - IPv6 loopback host parsing needed bracket normalization
  - WebSocket close events should fail fast
  - Playwright device configuration was redundant
- Fixes implemented:
  - bracket normalization for IPv6 loopback
  - close event rejection in both browser WebSocket helpers
  - simplified Playwright config

## Residuals

- The Playwright spec still uses a raw WebSocket shim instead of the packaged ChatSDK browser client. A later SDK-focused milestone should exercise the actual SDK client in a browser bundle.
- Live Playwright is pointed at the deployed LXC stack rather than a fully disposable local stack started by Playwright. The CI guardrails prevent silent skips, but a future CI workflow should own stack bootstrap explicitly.
- The broader production vulnerability audit remains open for the later security sweep. Installing Playwright changed the lockfile and the workspace still reports known vulnerabilities that should be handled as a dedicated audit milestone.
- The Antigravity first-pass critical claim about unauthenticated namespace subscription did not reproduce live: a direct unauthorized `user:*` subscribe without a subscription token returned Centrifugo `permission denied`. The browser spec now guards this behavior.
