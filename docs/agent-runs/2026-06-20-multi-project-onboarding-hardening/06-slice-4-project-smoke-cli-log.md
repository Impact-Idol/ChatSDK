# Slice 4 Project Smoke CLI Log

Date: 2026-06-20
Status: complete

## Scope

Add a reusable project smoke command with seeded configuration support, redacted output, and live/deployed configuration support.

## Files Changed

- `scripts/smoke/project-smoke.mjs`
- `packages/api/tests/project-smoke-cli.test.ts`
- `package.json`
- `docs/features/multi-project-onboarding-hardening/PROJECT_ONBOARDING_RUNBOOK.md`

## Implementation Summary

- Added `npm run smoke:project`.
- Supports CLI options, environment variables, or JSON config.
- Supports `--dry-run` and `--json` for redacted operator evidence without network calls.
- Redacts API keys in output.
- Live mode checks API health, token broker health, optional app-key user ensure, token mint, optional WebSocket connect, authenticated channel query, deterministic DM ensure/open, browser channel-create denial when scoped, message send, and message readback.
- Retains the existing `smoke:shared-server` command for the Vouch/LAN handoff path.

## Verification

Passed:

```bash
npm --workspace @chatsdk/api test -- --run tests/project-smoke-cli.test.ts
```

Result: 1 test file passed, 3 tests passed.

Passed:

```bash
npm run smoke:project -- --slug seed-project-a-dev --api-key chatsdk_1234567890abcdef1234567890abcdef12345678 --dry-run --json
```

Result: dry-run output redacted the API key as `chatsdk_...345678`.

Passed live LAN/Vouch project smoke:

```bash
set -a
source .secrets/vouch-chatsdk-app-api-key.env
set +a
npm run smoke:project -- \
  --slug vouch-dev \
  --origin https://vouch.vedalogy.com \
  --primary-user-id vouch-project-smoke-primary \
  --peer-user-id vouch-project-smoke-peer \
  --message "ChatSDK project smoke live 2026-06-21T00:24:51Z" \
  --json
```

Result: 12 passed, 0 failed.

Live checks passed:

- API health
- token broker health
- ensure primary user
- ensure peer user
- mint primary user token
- WebSocket connect
- mint peer user token
- query authenticated channels
- create or open deterministic DM
- browser channel create denied without `channel:create` when scoped
- send message
- query messages

Passed:

```bash
npm --workspace @chatsdk/api run typecheck
npm --workspace @chatsdk/api test -- --run
```

Result: API typecheck passed; full API suite passed 33 files, 2 skipped; 288 tests passed, 7 skipped.

## Residual Risks and Follow-Ups

- Decide whether project smoke should grow a broker membership sync mode or keep broker membership checks in API tests plus a future broker-specific smoke.
