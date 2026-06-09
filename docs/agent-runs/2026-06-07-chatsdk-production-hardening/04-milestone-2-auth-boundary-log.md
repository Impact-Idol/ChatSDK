# Milestone 2 Auth Boundary Log

Date: 2026-06-08
Status: completed

## Scope

Milestone 2 hardened the API authentication boundary:

- Normal user `/api/*` routes no longer require `X-API-Key`.
- Valid user Bearer access tokens are sufficient for protected chat routes.
- `X-API-Key` alone no longer satisfies `requireUser`.
- If a request includes both Bearer and `X-API-Key`, the Bearer user context wins.
- Workspace member-management routes no longer contain hidden API-key role bypasses.
- `/api/auth/connect` and `/tokens` remain server/token-broker API-key routes.
- Refresh tokens are rejected on normal user routes.
- Legacy no-`type` JWTs remain accepted during migration.

## Changes

- Reworked `packages/api/src/middleware/auth.ts` into explicit auth modes:
  - `authType: 'user'` for verified Bearer user tokens.
  - `authType: 'app'` for verified server API keys.
  - Bearer auth is evaluated first when both headers are present.
- Updated `requireUser` to require `authType === 'user'`.
- Added `requireApp` for future explicit server routes, though no normal user route uses it yet.
- Changed user-token validation to fetch the app by token `app_id` and require the token user to exist.
- Rejected `type: 'refresh'` JWTs on normal user routes.
- Removed workspace API-key bypass branches from user workspace routes instead of making them callable through hidden behavior.
- Added `requireUser` to `GET /api/users/:userId` and `GET /api/users`.
- Updated auth-related 401 hints in `packages/api/src/index.ts`.
- Updated route tests to use bearer-only auth by default.
- Added `packages/api/tests/auth-modes.test.ts`.
- Replaced the old workspace API-key bypass test with regression coverage proving mixed headers do not bypass role checks.

## Verification

Local gates:

- `npm test --workspace=@chatsdk/api -- --run`: pass, 29 tests.
- `npm run typecheck --workspace=@chatsdk/api`: pass.
- `npm run build --workspace=@chatsdk/api`: pass.

Deployment gates on `chatsdk-hardening` LXC:

- Rebuilt and restarted `chatsdk-hardening-api:local`.
- API container healthy.
- Live seeded auth smoke passed against the deployed API and real Postgres database:
  - `POST /api/auth/connect` creates two users through server API-key auth.
  - `GET /api/channels/unread-count` succeeds with Bearer only.
  - `GET /api/users/:id` succeeds with Bearer only.
  - `GET /api/users` succeeds with Bearer only.
  - `GET /api/channels/unread-count` rejects `X-API-Key` only.
  - `GET /api/users/:id` rejects `X-API-Key` only.
  - `GET /api/users` rejects `X-API-Key` only.
  - A refresh token is rejected on a normal user route.
  - `POST /api/auth/connect` rejects Bearer-only token-broker calls.
  - Workspace creation and owner add-member succeed with Bearer only.
  - Mixed Bearer plus `X-API-Key` cannot let a member add workspace members.

## Review Disposition

Sub-agent reviews:

- Explorer review mapped the existing API-key-first middleware and identified workspace header-based bypass as the main P0 auth risk.
- SDK exposure explorer mapped browser-facing API-key usage in core, React, and examples for the next client-auth milestone.

Adversarial reviews:

- Antigravity confirmed the core split behavior and flagged dead workspace app-auth branches plus a potential app-level invite `invited_by` constraint issue. Resolved by removing hidden app-auth workspace branches from user routes; explicit server routes can be introduced later.
- GPT-5.5 high confirmed the core split and flagged `GET /api/users/:userId` plus `GET /api/users` as still API-key reachable because they lacked `requireUser`. Resolved by adding `requireUser` and regression tests.
- GPT-5.5 high flagged that a mixed-header role-update test name did not match its request headers. Resolved by passing `TEST_API_KEY` in that regression test.
- GPT-5.5 high flagged a stale refresh hint path. Resolved by pointing to `/api/auth/refresh` and `/tokens/refresh`.

## Remaining Issues

- Browser/client SDKs still expose API-key based connection flows and need token-provider/server-broker cleanup.
- No explicit `/api/server/*` app-key workspace admin API exists yet; normal workspace routes are user routes only.
- Broader tenant and membership authorization checks still need a dedicated hardening pass.
- Realtime, Inngest, Meilisearch, vulnerability audit, and live Playwright/seeded E2E remain open later milestones.
