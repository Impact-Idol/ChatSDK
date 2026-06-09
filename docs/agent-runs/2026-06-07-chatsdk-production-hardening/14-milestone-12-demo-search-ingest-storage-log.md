# Milestone 12: Demo UI, Search, Inngest Gate, And Storage Follow-Up

Date: 2026-06-08

## Scope

This follow-up pass addressed the post-demo issues found after the Milestone 11 deployment:

- React chat demo could not be reached from another machine via `localhost`.
- Demo UI only supported one hardcoded user.
- `examples/react-chat npm run build:check` failed from type drift.
- Inngest side effects attempted sends even when Inngest was unconfigured.
- Meilisearch readiness was skipped and message search was not operational.
- MinIO object URLs worked for the demo, but object keys were too low-entropy for a public-read test bucket.

## Changes

- Deployed a LAN-reachable demo UI at `http://192.168.68.113:5173`.
- Added a LAN token broker container at `http://192.168.68.113:5511/api/chatsdk-token`.
- Added demo user selection via URL params:
  - `?user=alice`
  - `?user=bob`
  - `?user=carol`
  - custom `?userId=<id>&name=<name>`
- Seeded Alice, Bob, and Carol into `general` and `design-room`.
- Fixed React demo type drift:
  - Vite env typing
  - channel description/unread/last-message type compatibility
  - attachment `url`/`name`/`size`/`mimeType` compatibility
  - thread timestamp fallback
  - push notification key typing
  - example no-unused policy aligned with package builds
- Added browser-safe UUID fallbacks for non-HTTPS LAN contexts.
- Added Inngest send gating so unconfigured deployments skip background events instead of logging event-key failures.
- Added Meilisearch to the deployed compose stack with a real master/API key.
- Wired message create/update/delete to Meilisearch indexing lifecycle.
- Backfilled 15 existing messages into Meilisearch.
- Hardened object storage key generation from an 8-character timestamp-derived hash to a 128-bit random nonce.

## Verification

- `npm --workspace @chatsdk/api run typecheck`: pass
- `npm --workspace @chatsdk/core run build`: pass
- `npm --workspace @chatsdk/react run build`: pass
- `examples/react-chat npm run build:check`: pass
- Focused API tests:
  - `search-health.test.ts`: pass
  - `readiness.test.ts`: pass
  - `config-validation.test.ts`: pass
- Live readiness:
  - storage: `ok`
  - search: `ok`
  - Inngest: `skipped` with explicit `Inngest not configured`
- Live Meilisearch backfill:
  - 15 messages indexed
  - backfill task succeeded
- Live API search:
  - authenticated `/api/search?q=LAN` returned highlighted results
  - newly sent realtime marker messages became searchable
- Live Playwright:
  - Alice and Bob connect as distinct users
  - Bob sends in `#general`
  - Alice receives the message live
  - image upload to MinIO renders
  - new upload keys use 32 hex characters of random entropy
  - no browser errors in the verified pass
- Recent API logs no longer show missing `INNGEST_EVENT_KEY` send failures after the gate.

## Remaining Production Decision

The current MinIO bucket remains public-read so the browser demo can render image attachments directly. This is acceptable for the isolated hardening/demo deployment only.

For Vouch production embedding, choose one:

- private bucket plus authenticated media proxy
- private bucket plus short-lived signed GET URLs refreshed by the chat API
- CDN-backed public media only for assets intentionally safe to expose by URL

Private user/channel attachments should not rely on a public-read bucket as the final Vouch production model.
