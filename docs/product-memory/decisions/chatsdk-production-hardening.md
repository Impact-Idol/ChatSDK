# Decision: ChatSDK As Vouch Chat Foundation

Date: 2026-06-07

## Decision

ChatSDK remains a viable strategic foundation for Vouch-native embedded DMs and squad chat, but only after a security-first production hardening program. It should not be embedded in Vouch clients in its current form.

## Rationale

Compared with Zulip, Rocket.Chat, Raven, Matrix, and Stoat, ChatSDK is closest to the product shape Vouch needs: an embeddable chat SDK/backend rather than a standalone workspace or federated protocol. It avoids Stream/Sendbird concurrency pricing and lets Vouch own UX, data model, and membership semantics.

The current implementation has production blockers:

- App API key is exposed to clients.
- Token minting trusts arbitrary client-provided user IDs.
- Several private channel/message/upload/receipt paths lack complete membership or tenant checks.
- Realtime subscription security is not production-safe.
- API typecheck/tests/audit fail.
- SDK install/package surface is not reliable.

## Next Step

Run a P0/P1 spike:

- Remove client-side app API key flow.
- Add Vouch backend token broker.
- Split user/server/admin auth.
- Add centralized channel/workspace membership guards.
- Lock down Centrifugo.
- Make API typecheck/tests/audit pass.

If this spike succeeds, proceed with full ChatSDK hardening. If not, reevaluate OpenIM or a hosted vendor.

## Update: 2026-06-08

The hardening spike succeeded through Milestone 11 in an independent ChatSDK deployment:

- root `npm ci`, API typecheck, API tests, core tests, API build, and core build pass
- live seeded Chromium/WebSocket/Postgres realtime test passes against the LXC deployment
- production audit is reduced to moderate-only findings: 0 critical, 0 high
- production config now fails fast for missing core secrets, storage, unsafe origins, and invalid runtime mode
- normal user routes no longer require client API keys; server token broker routes retain API-key auth
- Centrifugo subscription tokens are authorization-checked
- message and non-message realtime events use the durable outbox
- readiness covers database, schema, storage, Centrifugo, realtime outbox, search, and Inngest wiring
- adversarial Antigravity and GPT-5.5 high reviews found no remaining blockers or high findings after fixes

Decision remains: keep ChatSDK independent from Vouch. Embed it into Vouch only through a separate integration project with Vouch-owned token brokering, tenant mapping, observability, and deployment boundaries.

## Update: 2026-06-08 Follow-Up

The independent hardening deployment now has a LAN-reachable full chat demo at `http://192.168.68.113:5173` with Alice/Bob/Carol demo identities, multi-user realtime verification, MinIO upload rendering, and Meilisearch-backed authenticated message search.

Additional fixes:

- `examples/react-chat npm run build:check` passes.
- Inngest sends are gated when Inngest is not configured, removing missing-event-key log noise.
- Meilisearch is deployed in the LXC compose stack, readiness reports `search=ok`, existing messages were backfilled, and new messages are indexed.
- Storage object keys now use 128-bit random nonces.

Remaining production decision: the demo bucket is public-read for browser image rendering. Vouch production should use private media access through an authenticated proxy, refreshed signed URLs, or a CDN policy limited to intentionally public assets.

## Update: 2026-06-08 Production Sturdiness Specs

Added follow-on production specs for the next implementation phase:

- Vouch-owned backend token broker replacing the demo broker.
- Private attachment/media access replacing public-read demo MinIO.
- Rate limits and abuse controls for high-volume chat actions.
- Retention, deletion, and export policy.
- Production observability for request traces, realtime delivery, outbox lag, search lag, upload failures, and rate limits.
- Backup/restore drills for Postgres and object storage.
- Chaos/restart testing for API, Centrifugo, Meilisearch, Postgres, Redis, and storage.

The docs are intended to drive the next autonomous implementation agents before ChatSDK becomes the embedded chat layer for Vouch.

## Update: 2026-06-08 Multi-Tenant Direction

The recommended beta multi-tenant model is a shared ChatSDK stack with one ChatSDK `app_id` per independent Vouch client/tenant isolation boundary. The Vouch-owned token broker maps Vouch client/tenant identity to the correct ChatSDK `app_id` and mints only user-scoped tokens for that app.

Postgres RLS is now treated as P0 for any shared-database beta with real client data. The current API uses many pooled direct `db.query()` calls, so safe RLS requires a transaction/context wrapper that sets trusted `app.current_app_id` with `SET LOCAL`, plus guardrails that prevent tenant-owned raw queries outside that context. If RLS and request-scoped DB context are not ready, use a separate schema/database/deployment or restrict beta to synthetic/non-record data with short purge and explicit waiver.

## Update: 2026-06-08 Adversarial Review Corrections

GPT-5.5 xhigh and Antigravity adversarial reviews found that several items needed to move earlier for a real-user beta:

- shared-DB RLS, tenant context, and direct-query guardrails are P0
- one ChatSDK `app_id` maps to one independent Vouch tenant/client isolation boundary unless `vouch_tenant_id` becomes first-class everywhere
- demo/legacy token minting must be disabled in production
- token revocation and connected realtime unsubscribe/disconnect on membership removal are P0
- private read/download/signed URL/realtime/export/admin rate limits are P0, not just write limits
- minimal retention/deletion/export and actionable alerting are P0 for real-user beta
- object storage backups need manifests/checksums and purge-ledger replay to avoid missing or resurrected attachments
