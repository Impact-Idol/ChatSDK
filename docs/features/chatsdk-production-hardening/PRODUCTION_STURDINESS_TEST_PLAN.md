# ChatSDK Production Sturdiness Test Plan

Status: Draft for implementation
Date: 2026-06-08
Owner: Vouch/VNet platform
Related spec: `docs/features/chatsdk-production-hardening/PRODUCTION_STURDINESS_SPEC.md`

## Purpose

This plan verifies that ChatSDK is not merely smoke-tested, but proven through seeded, repeatable tests that exercise real user behavior, private data boundaries, failure recovery, and operations workflows.

The plan assumes ChatSDK remains an independent service and Vouch embeds it through a separate Vouch-owned backend token broker.

## Test Environments

### Local Developer

Required services:

- ChatSDK API
- Postgres
- Redis
- Centrifugo
- Meilisearch
- S3-compatible object storage, such as MinIO
- React chat UI
- demo or test-only token broker

Purpose:

- fast implementation feedback
- unit and integration tests
- Playwright seeded browser flows
- local chaos scripts

### LXC/VM Staging

Required services:

- production-like API container
- Postgres on `192.168.68.110` or staging equivalent
- Redis on Proxmox-hosted infrastructure or staging equivalent
- Centrifugo
- Meilisearch
- private object storage
- LAN-reachable UI
- Vouch token broker stub or real Vouch integration backend

Purpose:

- multi-service validation
- backup/restore drills
- restart and dependency failure tests
- observability dashboards

### Vouch Integration Staging

Required services:

- real Vouch backend token broker
- ChatSDK staging deployment
- Vouch staging client embedding ChatSDK
- seeded Vouch tenants/users/squads

Purpose:

- final integration behavior
- Vouch session and membership mapping
- production auth contract validation

## Seed Data

Every non-unit suite should use deterministic seed data:

- Tenant A: `tenant-alpha`
- Tenant B: `tenant-beta`
- Users:
  - `alice-alpha`, member of Alpha DM and Alpha Squad
  - `bob-alpha`, member of Alpha DM and Alpha Squad
  - `carol-alpha`, member of Alpha Squad only
  - `mallory-alpha`, not a member of private Alpha channels
  - `eve-beta`, member of Beta only
- Channels:
  - Alpha DM: Alice and Bob
  - Alpha Squad: Alice, Bob, Carol
  - Alpha Private: Alice only
  - Beta DM: Eve only
- Attachments:
  - small PNG
  - text file
  - oversized file fixture
  - disallowed MIME fixture
- Messages:
  - baseline searchable text
  - message with attachment
  - deleted/tombstoned message
  - thread/reply message

Seed IDs should be stable where useful, but message IDs should still exercise production ID generation and idempotency.

## Gate 1: Vouch-Owned Token Broker

### Unit Tests

- Broker maps Vouch user ID to the correct ChatSDK user ID.
- Broker maps Vouch tenant/org to the correct ChatSDK app/tenant.
- Broker rejects suspended users.
- Broker rejects deleted users.
- Broker rejects users removed from the tenant.
- Broker rejects requests for another user's identity.
- Broker rejects unknown tenant/workspace/squad IDs.
- Broker caps requested scopes to server-approved scopes.
- Broker records token mint audit events.
- Broker never logs token values.

### Integration Tests

- Vouch-authenticated session receives ChatSDK token bundle.
- Expired Vouch session cannot receive ChatSDK token bundle.
- Token bundle contains expected issuer, audience, subject, app, tenant, scopes, `jti`, and expiry.
- ChatSDK server mint endpoint accepts only server credentials.
- ChatSDK server mint endpoint rejects browser/user tokens.
- Broker credential scoped to App A cannot mint for App B.
- Production mode fails startup/readiness if demo broker or legacy long-lived token routes are enabled.
- Minted tokens include `nbf`, `jti`, `kid`, issuer, audience, app, tenant, and scoped capabilities.
- Token refresh works only through Vouch broker.
- Revoked/removed user cannot refresh.
- Revoked `jti`, session, or user token is denied before natural expiry.

### Playwright Tests

- Alice signs into Vouch staging and opens chat.
- Alice sends message to Bob without any client app API key.
- Bob receives message in another browser context.
- Mallory cannot open Alpha DM.
- User removed from Alpha Squad loses access after refresh/reconnect.
- User removed from Alpha Squad while connected is disconnected or unsubscribed and stops receiving realtime messages.

### Security Tests

- Tampering with `userId` in broker request does not mint another user's token.
- Tampering with `tenantId` does not cross tenant boundary.
- Reusing old token after expiry fails.
- Reusing revoked token before expiry fails.
- Token replay from a different tenant context fails.
- Cross-origin token mint attempt fails under cookie-auth broker mode.

## Gate 1B: Shared-Database Tenant Isolation And RLS

### Unit/Static Tests

- Tenant-owned table inventory verifies required `app_id` columns.
- Direct-query guardrail fails route/service code that queries tenant-owned tables outside approved tenant context.
- `withTenantContext` uses `SET LOCAL` inside the same transaction as protected queries.
- Missing tenant context fails closed.

### Database Tests

- Under App A context, direct SQL cannot select App B messages.
- Under App A context, direct SQL cannot insert/update/delete App B rows.
- Connection pool reuse does not leak App A context into App B request.
- Background jobs require explicit app context or audited system context.

### Integration Tests

- App A user cannot read App B users, channels, messages, uploads, receipts, search, or realtime state.
- If multiple Vouch tenants ever share one ChatSDK app, same-app cross-tenant isolation tests must fail until `vouch_tenant_id` is first-class everywhere.

## Gate 2: Private Attachments And Media

### Unit Tests

- Upload key generation uses sufficient randomness and safe extension handling.
- Shared-bucket upload key generation includes `app_id` namespace.
- Upload policy rejects disallowed MIME types.
- Upload policy rejects files over configured size.
- Confirm requires pending upload owned by caller/app/channel.
- Confirm verifies object existence.
- Confirm verifies object size and content type.
- Download authorization requires current channel membership.
- Deleted/quarantined upload cannot be downloaded.

### Integration Tests

- Private bucket rejects unauthenticated direct GET.
- Public-read private bucket configuration fails production readiness.
- Presign requires channel membership.
- Upload confirm fails when object is missing.
- Upload confirm fails when object metadata mismatches.
- Upload confirm fails when content type or checksum mismatches policy.
- Message send can attach only completed uploads from the same channel.
- Signed URL expires within configured TTL.
- Signed URL/proxy responses include required cache/referrer controls.
- Authenticated proxy streams correct bytes and headers.
- Removed member cannot refresh attachment URL.

### Playwright Tests

- Alice uploads an image in Alpha DM.
- Bob sees and opens the image.
- Mallory cannot fetch the image URL.
- Alice reloads page and image still renders through refreshed authorization.
- After deletion, image no longer renders and shows a controlled deleted state.

### Negative Tests

- Reuse Alpha upload ID in Beta message fails.
- Confirm another user's upload fails.
- Attach pending upload fails.
- Attach expired upload fails.
- Direct public object URL fails for private bucket.
- Existing object key overwrite attempt fails.
- Abandoned multipart upload is cleaned up by lifecycle.

## Gate 3: Rate Limits And Abuse Controls

### Unit Tests

- Token bucket allows configured burst.
- Token bucket denies after configured rate.
- Limit keys include app/tenant/user/channel where required.
- `Retry-After` is computed.
- Admin override requires explicit policy.
- Redis unavailable path follows documented fallback.

### API Integration Tests

- Message flood returns `429` after threshold.
- Typing flood is coalesced or denied without creating unbounded events.
- Reaction flood returns `429`.
- Upload presign flood returns `429`.
- Upload byte quota denies oversized daily usage.
- Token mint flood returns `429`.
- Search flood returns `429`.
- History/backfill read flood returns `429`.
- Attachment download/proxy flood returns `429`.
- Signed URL issuance flood returns `429`.
- Realtime connect/subscription auth flood returns `429`.
- Export create/download flood follows policy limits.
- Tenant/app global budget prevents one app from consuming shared service capacity.

### Playwright Tests

- Rapid send loop shows controlled send errors and UI remains usable.
- Typing indicator remains stable during rapid keypresses.
- Upload limit failure is visible without breaking existing chat.
- Download and signed URL limit failure is visible without breaking existing chat.

### Observability Tests

- Each rate-limit denial emits metric with action and scope.
- Logs include stable error code and request ID.
- Alerts can detect sustained denial spike.
- Redis outage behavior is verified per action, including fail-closed behavior for token mint, private downloads, signed URL issuance, export, and admin actions.

## Gate 4: Retention, Deletion, And Export

### Unit Tests

- Policy resolver applies legal hold before tenant/channel defaults.
- Soft delete removes body from normal response.
- Hard purge removes body from fetch/search/backfill.
- Retention sweeper is idempotent.
- Attachment purge job tolerates missing objects.
- Export scope cannot cross tenant.
- Export manifest counts records and checksums.

### Integration Tests

- Deleted message becomes tombstone in message list.
- Deleted message is removed from search.
- Hard-purged message cannot be fetched by ID.
- Attachment for purged message cannot be downloaded.
- Legal hold blocks purge.
- User deletion anonymizes profile fields according to policy.
- Export job includes messages, edits, deletions, attachment metadata, and manifest.
- Export artifacts are encrypted, short-lived, access-logged, and cleaned up.

### Playwright Tests

- Alice deletes own message and Bob sees tombstone.
- Admin deletes a message and users see policy-safe tombstone.
- Export request appears in admin/test harness and produces downloadable artifact.

### Data Safety Tests

- Retention sweeper can be interrupted and rerun.
- Export job can be retried without duplicate/missing output.
- Purge job cannot delete another tenant's objects.

## Gate 5: Production Observability

### Unit Tests

- Logger redacts bearer tokens, server keys, signed URLs, and message bodies.
- Request ID middleware creates IDs when absent.
- Trace context is propagated to outbound ChatSDK/Vouch calls.
- Metrics labels do not expose raw PII.

### Integration Tests

- Message send emits request, DB, outbox, and publish spans.
- Search indexing emits lag metric.
- Upload confirm failure emits storage failure metric.
- Token mint denial emits auth metric.
- Rate-limit denial emits abuse metric.
- High-cardinality identifiers are absent from metrics labels and present only in logs/traces where allowed.
- Readiness reports degraded search when Meilisearch is down.
- Readiness reports degraded realtime when Centrifugo is down.

### Dashboard Checks

- API dashboard shows seeded traffic.
- Realtime dashboard shows connection/subscription count.
- Outbox dashboard shows depth and oldest age.
- Search dashboard shows query/indexing lag.
- Upload dashboard shows presign/confirm/download metrics.
- Token broker dashboard shows mint rate, denials, and latency.

### Alert Tests

- Force outbox lag above threshold and verify alert condition.
- Force Meilisearch down and verify degraded alert condition.
- Force upload failures and verify alert condition.
- Age latest backup marker and verify backup alert condition.
- Force Redis limiter degradation and verify alert condition.
- Force token broker mint failure spike and verify alert condition.

## Gate 6: Backup And Restore Drills

### Backup Validation

- Postgres full backup completes.
- WAL/PITR metadata is present.
- Backup files are encrypted or stored in encrypted storage.
- Object storage backup/versioning is enabled.
- Object manifest/checksum is tied to DB backup timestamp.
- Purge ledger exists for deleted/purged objects.
- Backup job emits success/failure metric.

### Restore Drill

Required monthly drill:

1. Seed messages and attachments.
2. Capture backup timestamp.
3. Restore Postgres into isolated staging DB.
4. Restore object storage into isolated staging bucket.
5. Reconcile DB upload rows against object manifest/checksums.
6. Reapply purge ledger and tombstone unrecoverable attachments.
7. Rebuild Meilisearch from restored Postgres.
8. Start API and Centrifugo against restored dependencies.
9. Run Playwright restored-data suite.
10. Record RPO, RTO, row counts, object counts, reconciliation gaps, and failures.

### Restore Verification

- Alice/Bob DM messages exist.
- Alpha Squad messages exist.
- Beta tenant data remains isolated.
- Private attachment bytes match checksum.
- Missing restored attachment objects become tombstones, not broken or public URLs.
- Deleted/tombstoned message state is preserved.
- Search finds restored searchable messages after rebuild.
- Search does not find purged messages.
- Download authorization still enforces membership.

### Drill Report

Each drill report must include:

- date
- operator or agent run ID
- source environment
- restore target
- backup timestamp
- measured RPO
- measured RTO
- verification commands
- Playwright result
- failures
- follow-up tasks

## Gate 7: Chaos And Restart Tests

### API Restart

Test:

- Start Alice/Bob browser contexts.
- Begin message send with idempotency key.
- Restart API container.
- Retry send.

Expected:

- exactly one message is persisted
- Bob eventually sees the message
- no duplicate realtime event remains after backfill
- API readiness returns healthy after restart

### Centrifugo Restart

Test:

- Stop Centrifugo.
- Send messages.
- Restart Centrifugo.
- Reconnect clients.

Expected:

- sends commit to Postgres
- outbox depth increases while down
- outbox drains after recovery
- clients backfill missed messages
- search still indexes committed messages

### Meilisearch Restart

Test:

- Stop Meilisearch.
- Send messages with unique markers.
- Restart Meilisearch.
- Run index catch-up.

Expected:

- sends continue
- readiness reports search degraded while down
- indexing lag increases then returns to normal
- search finds unique markers after recovery

### Postgres Restart

Test:

- Restart DB during active chat traffic.
- Continue client reconnect attempts.

Expected:

- API readiness fails while DB unavailable
- write requests fail with controlled errors while DB is down
- API recovers connection pool
- no invalid partial rows remain

### Object Storage Restart

Test:

- Stop MinIO/S3-compatible storage.
- Attempt upload presign, confirm, and download.
- Restart storage.

Expected:

- storage-dependent routes fail with controlled errors
- message send without attachments continues
- valid pending uploads can confirm after recovery if not expired
- expired pending uploads are rejected and cleaned up

### Redis Restart

Test:

- Stop Redis during rate-limited actions.
- Send message/search/upload requests.
- Restart Redis.

Expected:

- documented fallback behavior occurs
- important limits do not silently disappear
- limiter degradation appears in metrics/logs
- normal limiting resumes after Redis recovery

### Network Degradation

Test:

- Inject latency, packet loss, and intermittent 5xx/timeouts between API and DB, Redis, Centrifugo, Meilisearch, and storage.

Expected:

- degraded dependencies produce bounded latency and controlled errors
- no cross-tenant data exposure occurs during partial failures
- stale DB connections are discarded after failover/restart

### Rolling Deploy And Migration Compatibility

Test:

- Run old and new API versions briefly against the deployment strategy's shared database path.
- Execute token mint, message send, media download, search, and realtime flows during rolling restart.

Expected:

- compatible version overlap is documented
- forward migration and rollback plan are verified
- clients do not see durable data loss or cross-tenant leakage

## End-To-End Playwright Suites

### `chat-happy-path.spec.ts`

- Alice opens chat.
- Bob opens chat.
- Alice sends text.
- Bob receives text by realtime.
- Bob replies.
- Alice receives reply.
- Alice uploads image.
- Bob sees image.
- Alice searches marker text.
- Bob searches marker text.

### `chat-auth-boundary.spec.ts`

- Mallory cannot open Alpha DM.
- Eve in Beta cannot read Alpha messages.
- Removed member loses channel after refresh.
- Removed member loses active realtime subscription while connected.
- Removed member cannot search, backfill, or download private media immediately after removal.
- Expired token causes refresh through broker.
- Failed refresh logs user out or shows controlled reconnect/auth state.

### `chat-private-media.spec.ts`

- Private image renders for member.
- Private direct object URL fails unauthenticated.
- Removed member cannot refresh image URL.
- Already-issued signed URL expires or is denied within documented stale-access window.
- Deleted image stops rendering.

### `chat-abuse.spec.ts`

- Rapid sends hit rate limit.
- Rapid reactions hit rate limit.
- Typing flood is coalesced.
- Upload flood hits limit.
- Download and signed URL flood hits limit.
- UI remains usable after denials.

### `chat-chaos.spec.ts`

- Centrifugo outage and recovery.
- Meilisearch outage and catch-up.
- API restart and idempotent retry.
- Storage outage with controlled upload failure.
- Network degradation and rolling deploy compatibility.

## Review Gates

Each production milestone should end with:

- automated unit/integration tests
- seeded Playwright run
- dependency/security audit where relevant
- GPT-5.5 high adversarial review
- Antigravity adversarial review through `agy`
- implementation fixes for all critical/high findings
- run log with commands, results, failures, and residual risks

## Exit Criteria

The production sturdiness test plan passes when:

- all P0 gates pass in local and LXC/VM staging
- Vouch integration staging passes token broker and membership tests
- private attachments work without public-read storage
- rate limits are enforced and observable
- backup/restore drill report is complete
- chaos/restart tests prove no durable message loss
- open critical/high security findings are zero
