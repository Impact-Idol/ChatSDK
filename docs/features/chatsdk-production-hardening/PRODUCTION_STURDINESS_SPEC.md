# ChatSDK Production Sturdiness Spec

Status: Draft for implementation
Date: 2026-06-08
Owner: Vouch/VNet platform
Related docs:

- `docs/features/chatsdk-production-hardening/SPEC.md`
- `docs/features/chatsdk-production-hardening/TEST_PLAN.md`
- `docs/features/chatsdk-production-hardening/PRODUCTION_STURDINESS_TEST_PLAN.md`

## Executive Summary

The independent ChatSDK hardening spike has made the system viable for deeper productization, but the current deployment is still a hardening lab, not a Vouch production chat service.

The next production step is to replace demo conveniences with durable product boundaries:

- Vouch must own user identity, tenant mapping, session validation, and token minting.
- Chat attachments must not depend on a public-read demo bucket for private conversations.
- Abuse controls must protect sends, uploads, reactions, typing, search, and token minting.
- Retention, deletion, and export policies must exist before message history becomes user data of record.
- Observability must make realtime, search, uploads, outbox lag, and auth failures visible.
- Backup and restore must be tested, not merely configured.
- Restart and dependency-failure behavior must be proven with seeded end-to-end tests.

This spec defines the production requirements for an exceptional, sturdy, safe chat system that remains independent from Vouch internals but is embedded through a Vouch-owned integration boundary.

## System Principles

- Vouch identity is the source of truth for who a user is.
- Vouch membership and permission state are the source of truth for which chat spaces a user may access.
- ChatSDK stores and serves chat data, but does not decide Vouch business entitlement by itself.
- Browser and mobile clients never receive ChatSDK server secrets or app API keys.
- Every private read/write path must enforce app, tenant, user, and channel membership.
- Private media is private by default.
- Realtime is a delivery optimization over durable state, not the source of truth.
- Search is derived from Postgres and can be rebuilt.
- Meilisearch and Centrifugo may be unavailable without corrupting core chat state.
- Operations workflows must be rehearsed before production launch.
- All security and reliability controls must be observable.

## Release Gates

### P0: Required Before Vouch Embed Beta

- Replace demo token broker with a Vouch-owned backend token broker.
- Disable or remove demo/legacy token minting paths in production, including unauthenticated demo brokers and long-lived legacy token routes.
- Remove any Vouch client dependency on ChatSDK app API keys.
- For shared-database multi-tenancy, add Postgres RLS, request-scoped tenant DB context, and direct-query guardrails before real client data is stored. If RLS is not P0, beta must use separate schema/database/deployment or synthetic short-retention data only.
- Choose and implement private attachment access: authenticated proxy or short-lived signed URLs.
- Add Redis-backed rate limits and app/tenant global budgets for token minting, message send, message history/backfill reads, uploads, downloads, signed URL issuance, reactions, typing, search, realtime auth, exports, and admin actions.
- Add a minimal retention/deletion/export baseline for any real-user beta data, including tombstones, export authorization, and purge-safe attachment behavior.
- Add production observability baseline with request logs, metrics, traces, dashboards, actionable alerts, and an escalation/runbook owner.
- Add at least one successful Postgres restore drill and one object restore drill.
- Add chaos/restart tests for API, Centrifugo, Meilisearch, Postgres, and object storage.
- Verify seeded multi-user Playwright flows across send, receive, upload, search, auth denial, membership removal while connected, and reconnect.

### P1: Required Before General Production

- Expand the P0 retention/deletion/export baseline into a full policy engine for messages and attachments.
- Expand P0 export jobs into tenant/workspace/channel/user export workflows with encrypted artifacts and cleanup.
- Add full deletion/anonymization workflows with audit trails.
- Add abuse moderation workflows: block, mute, report, slow mode, duplicate suppression, upload file rules.
- Add scheduled backup/restore drills with runbooks and sign-off reports.
- Add adversarial security/code review gates after each milestone.

### P2: Scale And Maturity

- Add CDN-based private media distribution if proxy/signed URL costs or latency require it.
- Add image/video processing pipeline for uploads. Malware scanning moves to P0 if beta allows arbitrary files; otherwise beta uploads must be restricted to a narrow validated image-only policy until scanning exists.
- Add regional disaster recovery planning.
- Add load tests for expected Vouch concurrency and burst patterns.
- Add automated policy compliance checks for retention, export, and deletion.

## 1. Vouch-Owned Backend Token Broker

### Problem

The current LAN demo uses a standalone token broker for testing Alice/Bob/Carol. That is correct for a demo, but production must not let clients mint ChatSDK tokens directly or choose their own ChatSDK identity.

### Goals

- Vouch backend validates the logged-in Vouch session before minting ChatSDK tokens.
- Vouch backend maps Vouch users, tenants, squads, and roles into ChatSDK users/channels.
- ChatSDK tokens are short-lived and scoped to the correct app, tenant, user, and capabilities.
- Token minting is rate limited, audited, traced, and revocable.
- Vouch clients receive only user-scoped ChatSDK REST and realtime tokens.

### Non-Goals

- ChatSDK should not replace Vouch authentication.
- ChatSDK should not read Vouch browser cookies directly.
- Vouch clients should not call ChatSDK server/admin token routes.
- The token broker should not become a broad admin proxy for arbitrary ChatSDK operations.

### Architecture

Production flow:

1. Vouch client calls Vouch backend `POST /api/chat/session` using the normal Vouch authenticated session.
2. Vouch backend validates session, tenant, user status, device posture, and requested chat context.
3. Vouch backend resolves ChatSDK `app_id`, `user_id`, and permitted channel/workspace memberships.
4. Vouch backend synchronizes required ChatSDK user/member state using server-only credentials.
5. Vouch backend calls ChatSDK server token mint endpoint over private network.
6. ChatSDK returns a short-lived REST token and Centrifugo connection/subscription token material.
7. Vouch backend returns the token bundle to the client.
8. Client refreshes by calling Vouch backend again before expiry.

### Client API Contract

Endpoint owned by Vouch:

```http
POST /api/chat/session
Authorization: Vouch session cookie or Vouch bearer token
Content-Type: application/json
```

Request:

```json
{
  "tenantId": "vouch_tenant_123",
  "workspaceId": "optional_vouch_workspace_id",
  "deviceId": "optional_device_id",
  "capabilities": ["chat:read", "chat:write", "upload:write"]
}
```

Response:

```json
{
  "apiUrl": "https://chat-api.vouch.internal",
  "realtimeUrl": "wss://chat-rt.vouch.com/connection/websocket",
  "appId": "chatsdk_app_123",
  "user": {
    "id": "chatsdk_user_456",
    "vouchUserId": "vouch_user_456",
    "tenantId": "vouch_tenant_123",
    "displayName": "Alice Example",
    "avatarUrl": "https://..."
  },
  "tokens": {
    "apiToken": "eyJ...",
    "realtimeToken": "eyJ...",
    "expiresAt": "2026-06-08T18:30:00.000Z",
    "refreshAfter": "2026-06-08T18:25:00.000Z"
  }
}
```

### ChatSDK Server Token Contract

Endpoint owned by ChatSDK, called only by Vouch backend:

```http
POST /api/tokens/mint
Authorization: Bearer <vouch-service-jwt>
X-Request-Id: <request-id>
Content-Type: application/json
```

P0 authentication requirement: a bare shared `X-Server-Key` is not sufficient for production multi-tenant minting. The mint endpoint must require mTLS, signed service JWTs, or both. Service credentials must be issuer-scoped and app-scoped so one broker credential cannot mint tokens for unrelated ChatSDK apps.

Request:

```json
{
  "appId": "chatsdk_app_123",
  "subject": "chatsdk_user_456",
  "tenantId": "vouch_tenant_123",
  "issuer": "vouch-backend",
  "audience": "chatsdk-api",
  "ttlSeconds": 900,
  "scopes": ["chat:read", "chat:write", "upload:write", "reaction:write", "typing:write"],
  "claims": {
    "vouchUserId": "vouch_user_456",
    "vouchOrgId": "vouch_org_789",
    "deviceId": "device_abc",
    "sessionId": "session_def"
  }
}
```

Response:

```json
{
  "apiToken": "eyJ...",
  "realtimeToken": "eyJ...",
  "expiresAt": "2026-06-08T18:30:00.000Z"
}
```

### Token Claims

Required claims:

- `kid`: signing key ID for rotation.
- `iss`: trusted issuer, normally `vouch-backend`.
- `aud`: `chatsdk-api` or `chatsdk-realtime`.
- `sub`: ChatSDK user ID.
- `app_id`: ChatSDK app ID.
- `tenant_id`: Vouch tenant/org boundary.
- `vouch_user_id`: Vouch user ID.
- `scope`: allowed capabilities.
- `iat`, `nbf`, `exp`: short-lived token timing.
- `jti`: unique token ID for audit/revocation.
- `session_id`: Vouch session ID or opaque session hash.
- `device_id`: optional, but required for mobile push/device-specific controls once available.

### Security Requirements

- Token TTL must default to 10-15 minutes.
- Refresh must happen through Vouch backend only.
- Token mint service authentication must use app-scoped service credentials, mTLS, signed service JWTs, or an equivalent zero-trust service identity pattern.
- ChatSDK must enforce that the broker credential/issuer is allowed to mint only for the requested `app_id`.
- Token signing must support `kid`-based rotation with overlapping active keys.
- Mint requests must include a request ID or mint `jti` and be replay-detected or replay-audited.
- API and realtime tokens must support revocation by `jti`, session, user, app, and channel-membership removal event where feasible.
- Production startup must disable unauthenticated demo token brokers and legacy long-lived token routes.
- Server token mint routes must reject browser origins and normal user tokens.
- Broker endpoints using cookie auth must enforce SameSite, CSRF protection or bearer-only mode, strict origin allowlists, and no wildcard credentialed CORS.
- Vouch backend must deny token minting for disabled, suspended, deleted, or tenant-removed users.
- Vouch backend must synchronize membership before minting tokens for newly eligible users.
- ChatSDK must enforce membership on every private route even if the token was minted correctly.
- Token minting must be rate limited per user, tenant, IP, and session.
- Token minting must be audited with `jti`, Vouch user, tenant, app, scopes, caller service, outcome, and denial reason.
- Token secrets must support rotation with overlapping signing keys.
- Tokens must never be logged.
- The token broker must fail closed if Vouch membership resolution is unavailable.

### Acceptance Criteria

- A Vouch client can initialize chat without any ChatSDK app API key.
- A suspended Vouch user cannot receive a ChatSDK token.
- A user cannot request tokens for another Vouch user.
- A user removed from a Vouch tenant loses token refresh on the next broker call.
- A stale ChatSDK token cannot access private API routes, search, backfill, or media after membership removal.
- A connected removed user is disconnected or unsubscribed from affected Centrifugo channels without waiting for natural token expiry.
- A broker credential scoped to App A cannot mint tokens for App B.
- Production mode fails closed if demo broker or legacy long-lived token minting routes are enabled.
- Token mint attempts are visible in metrics, traces, and audit logs.

## 2. Private Attachments And Media Access

### Problem

The demo deployment uses public-read MinIO so browser images render easily. That is acceptable for local demo media, but not for private Vouch messages, documents, screenshots, or images.

### Goals

- Private chat attachments are not publicly readable.
- Every upload and download is scoped to app, tenant, user, channel, and message.
- Attachment URLs expire or are mediated by authenticated API checks.
- Storage keys are unguessable and never grant authorization by themselves.
- Object storage can be backed up, restored, audited, and lifecycle-managed.

### Non-Goals

- Public marketing assets or intentionally public CDN assets are outside this private attachment policy.
- End-to-end encrypted attachments are not required for the first production release.
- Full malware scanning is P1/P2 unless required by Vouch policy before beta.

### Recommended Approach

Use private object storage and start with one of these two P0 modes:

- Authenticated media proxy: ChatSDK API verifies the bearer token and channel membership, then streams the object from storage.
- Refreshed signed URLs: ChatSDK API verifies the bearer token and channel membership, then returns a short-lived signed URL.

Preferred P0 default: signed URLs for normal images/files with a 60-300 second TTL, plus an authenticated proxy fallback for clients or asset classes where signed URL leakage risk is too high.

P1 scale path: CDN signed URLs or signed cookies with cache keys scoped by tenant/object and short TTL.

P0 production gate: private buckets must be private before real user data is stored. Any public-read bucket is demo-only and must fail production startup or readiness.

### Upload Flow

1. Client requests upload permission from ChatSDK API:

```http
POST /api/uploads/presign
Authorization: Bearer <api-token>
Content-Type: application/json
```

Request:

```json
{
  "channelId": "channel_123",
  "fileName": "image.png",
  "contentType": "image/png",
  "sizeBytes": 582103,
  "sha256": "optional_client_checksum",
  "purpose": "message_attachment"
}
```

2. API validates:

- token app/user/tenant
- channel membership
- upload rate limit and daily byte quota
- file type allowlist
- max file size
- tenant storage policy
- storage-enforced content length and content type constraints where the provider supports them
- object metadata/tags for app, channel, upload, and uploader

3. API creates an upload row:

- `id`
- `app_id`
- `tenant_id`
- `channel_id`
- `uploader_user_id`
- `object_key`
- `original_file_name`
- `content_type`
- `size_bytes_expected`
- `sha256_expected`
- `status = pending`
- `expires_at`
- `scan_status = not_required | pending`

4. API returns a storage presigned upload URL or proxy upload endpoint.
5. Client uploads bytes.
6. Client confirms upload:

```http
POST /api/uploads/{uploadId}/confirm
Authorization: Bearer <api-token>
```

7. API verifies object existence with `HEAD`, expected size, content type, checksum when available, owner app/channel, and pending status.
8. API marks upload `completed`.
9. Message send may attach only completed uploads owned by the same app/channel and current user, unless an admin/system override is explicitly used.

### Download Flow

Message payloads must not store permanent public URLs for private attachments. They should expose attachment metadata and an API URL:

```json
{
  "id": "upload_123",
  "fileName": "image.png",
  "contentType": "image/png",
  "sizeBytes": 582103,
  "url": "https://chat-api.vouch.com/api/uploads/upload_123/download"
}
```

Download endpoint:

```http
GET /api/uploads/{uploadId}/download
Authorization: Bearer <api-token>
```

API validates:

- upload exists and belongs to token app/tenant
- upload is attached to a visible message or otherwise policy-visible
- caller is a current channel member or has valid export/admin capability
- attachment is not deleted, quarantined, expired, or blocked by retention policy

Then API either:

- streams bytes through the authenticated proxy, or
- returns `302` to a short-lived signed storage/CDN URL.

### Data Model Requirements

Add or verify:

- `uploads.app_id`
- `uploads.tenant_id`
- `uploads.channel_id`
- `uploads.message_id`
- `uploads.uploader_user_id`
- `uploads.object_key`
- `uploads.status`
- `uploads.visibility`
- `uploads.size_bytes_expected`
- `uploads.size_bytes_actual`
- `uploads.content_type_expected`
- `uploads.content_type_actual`
- `uploads.sha256_expected`
- `uploads.sha256_actual`
- `uploads.scan_status`
- `uploads.deleted_at`
- `uploads.expires_at`
- `uploads.last_accessed_at`

### Security Requirements

- Buckets containing private chat attachments must not be public-read.
- Object keys for shared buckets must include `app_id` or an equivalent tenant namespace, for example `private/{app_id}/{channel_id}/{upload_id}/{nonce}.{ext}`.
- Storage keys must be generated server-side using at least 128 bits of randomness.
- Raw object keys must not be treated as bearer authorization.
- Upload confirmation must verify actual object existence and metadata.
- Upload confirmation must verify content type and checksum when the policy requires it.
- Failed or abandoned pending uploads must expire and be purged.
- Signed download URLs must be short-lived.
- Signed download responses must specify cache/referrer policy, maximum stale-access window, and which asset classes require proxy-only access.
- Download authorization must not be cached longer than membership state can safely tolerate.
- Bucket listing must be disabled for app credentials used by ChatSDK.
- Direct upload must not buffer large files fully in API memory.
- Storage must prevent overwrite of existing object keys.
- Multipart uploads must have abort/cleanup lifecycle rules.
- Arbitrary file uploads require malware scanning or quarantine before beta; otherwise beta uploads must be restricted to validated images.

### Acceptance Criteria

- Non-members cannot fetch attachment metadata or bytes.
- Removed members cannot refresh attachment URLs.
- Public unauthenticated GET requests to private object storage fail.
- An upload from Channel A cannot be attached to a message in Channel B.
- A missing or size-mismatched object cannot be confirmed.
- Private image attachments render in the UI through the chosen private access pattern.

## 3. Rate Limits And Abuse Controls

### Problem

A production chat system must withstand accidental loops, spam, upload abuse, token mint storms, typing-event floods, and search scraping.

### Goals

- Protect API, DB, Redis, Centrifugo, Meilisearch, object storage, and users.
- Keep normal chat usage smooth.
- Make abuse controls tenant-aware and observable.
- Return predictable `429` responses with `Retry-After`.
- Allow product/admin overrides where explicitly needed.

### Rate Limit Dimensions

All limits should support combinations of:

- app
- tenant
- user
- IP
- session
- device
- channel
- endpoint/action

### P0 Default Limits

Initial defaults should be conservative and configurable:

| Action | Suggested Default | Burst | Key |
| --- | ---: | ---: | --- |
| Token mint | 30/min | 5/sec | user + tenant + IP |
| Message send | 60/min | 10/sec | user + channel |
| Message edit/delete | 60/min | 10/sec | user + channel |
| Typing events | 5/sec | collapse latest | user + channel |
| Reactions | 120/min | 20/sec | user + channel |
| Upload presign | 30/min | 5/sec | user + tenant |
| Upload bytes | policy-defined/day | none | user + tenant |
| Upload confirm | 60/min | 10/sec | user + tenant |
| Attachment download/proxy | 300/min | 30/sec | user + tenant + channel |
| Signed URL issue | 120/min | 20/sec | user + tenant + channel |
| Search | 60/min | 10/sec | user + tenant |
| History/backfill read | 300/min | 30/sec | user + channel |
| Realtime connect/sub auth | 120/min | 20/sec | user + tenant + IP |
| Export create/download | policy-defined | none | actor + tenant |
| Channel create | 20/min | 5/sec | user + tenant |
| Member add/remove | 60/min | 10/sec | actor + channel |
| Admin actions | policy-defined | policy-defined | actor + tenant |

### Implementation Requirements

- Use Redis as the shared limiter store.
- Prefer token bucket or sliding-window algorithms with atomic Redis operations.
- Add local emergency fallback limits if Redis is down.
- Define fail-closed vs local fallback per action. Token mint, export, admin actions, private downloads, and signed URL issuance should fail closed unless an explicit incident override is active.
- Middleware must attach limit outcome to logs, metrics, and traces.
- `429` responses must include:
  - stable error code
  - human-safe message
  - `Retry-After`
  - optional limit metadata for trusted clients
- Limits must be configurable by action and environment.
- Admin/system service accounts must have explicit named policy overrides, not blanket bypasses.

### Abuse Controls

P0:

- duplicate message suppression using idempotency keys
- upload file type allowlist
- upload max file size
- upload daily byte quota
- attachment download and signed URL issuance quotas
- tenant/app global budgets for API requests, realtime connections, search, uploads, downloads, and egress
- typing event coalescing
- search query length and pagination limits
- block/mute enforcement for DMs and channels where supported

P1:

- slow mode per channel
- tenant-level kill switch for uploads
- user-level temporary send lock
- report queue hooks
- spam heuristics for repeated messages/URLs
- suspicious upload quarantine

### Acceptance Criteria

- A message-send flood receives deterministic `429` responses without DB degradation.
- Typing floods do not create unbounded realtime events.
- Upload presign floods do not create unbounded pending uploads.
- Attachment download and signed URL floods do not create unbounded storage egress.
- Search floods do not saturate Meilisearch.
- Redis outage behavior is tested for each protected action and fails closed for high-risk actions.
- Rate limit denials are visible in metrics and logs by action.
- Admin overrides are audited.

## 4. Retention, Deletion, And Export Policy

### Problem

Once chat stores real Vouch conversations and attachments, message history becomes regulated user data. The system needs explicit retention, deletion, legal hold, and export behavior.

### Goals

- Define how long messages and attachments are retained.
- Support user-visible deletion semantics and backend hard-purge workflows.
- Support tenant/workspace export with permission checks.
- Support legal hold or policy hold where required.
- Ensure deletion and export jobs are auditable, idempotent, and tenant-scoped.

### P0 Baseline For Real-User Beta

If beta uses real Vouch users or real client data, the following minimum policy controls are P0:

- default retention period and automatic purge policy
- user-visible soft delete/tombstone
- admin delete with reason and audit trail
- attachment access revocation on delete
- export authorization with tenant/workspace/channel/user scope checks
- encrypted export artifacts with short download TTL
- export access logs and cleanup jobs
- legal hold/manual purge-block flag

If these controls are not implemented, beta data must be synthetic or explicitly non-record data with short automatic purge and written launch waiver.

### Policy Model

Policies should be resolved in this order:

1. legal hold
2. tenant policy
3. workspace policy
4. channel policy
5. default platform policy

Policy fields:

- `message_retention_days`
- `attachment_retention_days`
- `deleted_message_tombstone_days`
- `allow_user_delete`
- `allow_admin_delete`
- `allow_export`
- `export_scope`
- `legal_hold_enabled`
- `purge_after_export`

### Message Deletion Semantics

Soft delete:

- removes body from normal clients
- retains tombstone metadata
- preserves thread/reply structure
- preserves audit event
- can keep minimal fields required for abuse, legal, and analytics policy

Hard purge:

- permanently removes body and non-required metadata
- removes or anonymizes associated reactions/receipts where policy requires
- queues attachment purge
- is performed by background job after retention/tombstone window

### Attachment Deletion Semantics

Attachment deletion must:

- remove client access immediately
- mark upload row deleted/quarantined before object deletion
- delete object storage bytes through an idempotent job
- record object deletion result
- tolerate missing objects
- update search index to remove attachment text/metadata where applicable

### User Deletion And Anonymization

For user deletion requests:

- resolve Vouch user and tenant scope
- revoke token refresh and deny future token minting
- remove device tokens
- anonymize profile fields in ChatSDK where required
- optionally retain messages under tenant policy with deleted-user attribution
- purge direct attachments under policy
- produce audit trail

### Export

Export jobs must be server-side only.

Supported initial scopes:

- tenant export
- workspace export
- channel export
- user data export

Export format:

- JSONL for machine-readable records
- optional HTML/CSV summaries for human review
- attachments packaged by reference or signed archive, depending on policy

Export must include:

- messages
- edits/deletions/tombstones
- attachments metadata
- reactions
- read/delivery receipts if policy allows
- audit metadata
- export manifest with counts/checksums

Export artifact security:

- export creation requires explicit role/capability checks
- export artifacts are encrypted at rest
- export downloads use short-lived signed URLs or authenticated proxy
- export artifacts have mandatory expiry and cleanup
- every export create/download/delete event is audited
- export manifests include data scope, counts, checksums, creator, and expiry
- exports apply PII minimization rules defined by tenant policy

### Data Model Requirements

Add or verify:

- `retention_policies`
- `legal_holds`
- `deletion_jobs`
- `export_jobs`
- `audit_events`
- `message_deleted_at`
- `message_deleted_by`
- `message_delete_reason`
- `message_purge_after`
- `upload_deleted_at`
- `upload_purge_after`

### Acceptance Criteria

- A deleted message is immediately hidden from normal clients.
- A hard-purged message cannot be fetched, searched, or delivered by backfill.
- Attachments for deleted/purged messages are no longer downloadable.
- A retention sweeper can run repeatedly without corrupting state.
- Export jobs cannot cross tenant boundaries.
- Export output includes a manifest with counts and checksums.

## 5. Production Observability

### Problem

Realtime chat failures often appear as "the chat feels flaky" unless the system exposes delivery health, indexing lag, upload failures, auth denials, and dependency behavior.

### Goals

- Make user-facing chat health visible before users report it.
- Trace requests across Vouch broker, ChatSDK API, DB, Redis, Centrifugo, Meilisearch, and object storage.
- Measure lag in durable async paths.
- Alert on actionable symptoms, not only container liveness.

### Structured Logs

Every API request log should include:

- `request_id`
- `trace_id`
- `span_id`
- `route`
- `method`
- `status`
- `latency_ms`
- `app_id`
- `tenant_id`
- `user_id_hash`
- `channel_id` when applicable
- `auth_mode`
- `rate_limit_action`
- `error_code`

Never log:

- bearer tokens
- server keys
- signed URLs
- raw message body by default
- attachment bytes
- full IP address unless approved by policy

### Metrics

Required P0 metrics:

- API request count, error rate, latency p50/p95/p99 by route.
- Auth successes/denials by reason.
- Token mint count, latency, denials, rate limits.
- Message sends by channel/app/tenant.
- Message send latency from request start to DB commit.
- Realtime publish success/failure count.
- Realtime outbox depth.
- Realtime outbox oldest event age.
- Realtime delivery attempts and retries.
- Centrifugo connection count.
- Centrifugo subscription count and auth denial count.
- Search query count, latency, error rate.
- Search indexing lag from message commit to searchable.
- Meilisearch task failures.
- Upload presign count, confirm count, failure count.
- Storage operation latency and error rate.
- Pending upload age and count.
- DB pool usage and query latency.
- Redis limiter latency and failures.
- Backup success/failure and restore drill status.

### Traces

Use OpenTelemetry-compatible tracing.

Required spans:

- Vouch `POST /api/chat/session`
- ChatSDK token mint
- ChatSDK auth middleware
- DB query/transaction
- message insert
- outbox enqueue
- Centrifugo publish
- Meilisearch index enqueue/task
- upload presign
- upload confirm HEAD
- upload download authorization
- storage get/put/head/delete

Trace propagation:

- Vouch broker must forward `traceparent` into ChatSDK server calls.
- ChatSDK must generate a request ID when none exists.
- Client-visible error reports should include a support-safe request ID.

### Dashboards

Minimum dashboards:

- Chat API overview
- Realtime health
- Search health
- Upload/storage health
- Auth/token broker health
- Rate limit/abuse overview
- DB/Redis dependency health
- Backup/restore status

### Alerts

Initial alert examples:

- API p95 latency above 750 ms for 10 minutes.
- API 5xx rate above 1 percent for 5 minutes.
- token mint denial spike above baseline.
- outbox oldest event age above 60 seconds.
- Centrifugo publish failure rate above 1 percent.
- search indexing lag above 2 minutes.
- upload confirm failure rate above 5 percent.
- pending uploads older than configured expiry.
- latest successful Postgres backup older than 24 hours.
- latest restore drill older than 30 days.
- Redis limiter degradation for high-risk actions.
- token broker mint failure or denial spike.
- private media download/signing failure spike.
- export creation/download anomaly.

P0 alerting must include an owner, delivery route, severity, and first-response runbook for token broker, API 5xx, outbox lag, search lag, upload failures, private media failures, Redis limiter degradation, backup staleness, and restore drill staleness.

### Cardinality Rules

- Metrics labels must avoid raw user IDs, request IDs, channel IDs, message IDs, tokens, URLs, and arbitrary error text.
- High-cardinality fields belong in structured logs or traces, not metric labels.
- Allowed metric dimensions must be reviewed before launch.
- User identifiers in logs should be hashed or policy-approved.
- Dashboards must include app/tenant rollups without making every channel/user a metric label.

### Acceptance Criteria

- A failed message send can be traced from client request through DB and outbox.
- A delayed realtime event is visible as outbox lag.
- A delayed search result is visible as indexing lag.
- A failed upload confirm shows storage metadata mismatch in logs without exposing secrets.
- Dashboards show seeded demo traffic during Playwright tests.

## 6. Backup And Restore Drills

### Problem

Backups are only useful if restore is proven. Chat includes relational data and object storage that must remain consistent enough to recover messages and attachments.

### Goals

- Define RPO/RTO targets.
- Back up Postgres and object storage.
- Restore into isolated staging.
- Verify message, attachment, search rebuild, and realtime recovery behavior.
- Produce drill reports.

### Targets

Initial targets:

- Postgres RPO: 15 minutes or better using WAL/PITR.
- Postgres RTO: 2 hours for beta, lower before general production if needed.
- Object storage RPO: must align with message attachment RPO for real-user data. If object RPO is weaker than Postgres RPO, restore must automatically tombstone unrecoverable attachment rows and report reconciliation gaps.
- Object storage RTO: 4 hours for beta.
- Meilisearch RPO: rebuild from Postgres source of truth.
- Centrifugo RPO/RTO: stateless, restore config/secrets and reconnect clients.

### Postgres Backup Requirements

- Daily full backup.
- Continuous WAL archiving or equivalent PITR.
- Encrypted backup storage.
- Backup integrity check.
- Migration version recorded with backup metadata.
- Restore runbook includes secret/config restoration steps.

### Object Storage Backup Requirements

- Versioning or replication where supported.
- Lifecycle for abandoned pending uploads.
- Inventory or manifest for objects by tenant/app.
- Object manifests/checksums tied to DB backup timestamps.
- Purge ledger for deleted objects that can be replayed after restore so versioning/PITR does not resurrect policy-purged attachments.
- Encrypted storage.
- Restore drill for at least:
  - one recent image
  - one older attachment
  - one deleted/quarantined attachment policy case

### Restore Drill

Monthly drill:

1. Select timestamp.
2. Restore Postgres to isolated staging database.
3. Restore object subset or full bucket to isolated staging storage.
4. Reconcile DB upload rows against object manifest/checksums.
5. Reapply purge ledger for deleted/purged objects.
6. Tombstone unrecoverable attachment rows according to policy.
7. Rebuild Meilisearch from restored Postgres.
8. Start ChatSDK API and Centrifugo against restored dependencies.
9. Run seeded Playwright verification.
10. Verify selected messages, attachments, deletions, and exports.
11. Record RPO, RTO, reconciliation gaps, failures, and follow-up actions.

### Acceptance Criteria

- A drill can restore seeded messages and attachments into isolated staging.
- Search can be rebuilt from restored Postgres.
- Private attachment authorization still works after restore.
- Deleted/purged objects remain deleted according to policy.
- Missing restored attachment objects are detected and tombstoned rather than returning broken/private-leaking URLs.
- Drill report is committed or linked from the agent run docs.

## 7. Chaos And Restart Testing

### Problem

Production chat must survive restarts and dependency failures without data loss, silent realtime breakage, or stuck indexing/upload state.

### Goals

- Prove core writes remain durable.
- Prove clients reconnect and backfill.
- Prove degraded dependencies fail predictably.
- Prove outbox/search/upload recovery paths catch up.

### Required Failure Scenarios

API restart during send:

- Send message while API container restarts.
- Client retries with idempotency key.
- Exactly one message persists.
- Receiver eventually sees message.

Rolling deploy and migration compatibility:

- Run old and new API versions briefly against the same database where deployment strategy requires it.
- Verify token mint, message send, media download, search, and realtime continue through rolling restart.
- Verify forward migration and rollback plan before production.

Centrifugo restart/down:

- Stop Centrifugo.
- Send messages.
- API commits messages and queues outbox events.
- Client sees degraded realtime state or reconnect attempts.
- Restart Centrifugo.
- Outbox drains.
- Clients reconnect/backfill missing messages.

Meilisearch restart/down:

- Stop Meilisearch.
- Send messages.
- Message send succeeds if search indexing is async.
- Search readiness reports degraded.
- Restart Meilisearch.
- Indexer catches up.
- Search finds missed messages.

Postgres restart:

- Restart DB during idle and active traffic.
- API readiness fails while DB is unavailable.
- Connection pool recovers.
- No partial message/attachment rows are left in invalid state.

Object storage restart/down:

- Stop MinIO/S3-compatible storage.
- Upload presign/confirm/download fail with controlled errors.
- Message send without attachments still works.
- Storage recovery allows pending valid uploads to confirm if not expired.

Redis restart/down:

- Rate limiter fails closed or uses documented local fallback by action.
- Abuse metrics record limiter degradation.
- No route silently disables important limits without an alert.

Network degradation:

- Inject latency, packet loss, and intermittent 5xx/timeouts between API and DB, Redis, Centrifugo, Meilisearch, and storage.
- Verify degraded dependencies produce bounded latency, controlled errors, and no cross-tenant data exposure.
- Verify stale DB connections are discarded after failover/restart.

Vouch token broker down:

- Existing short-lived tokens continue until expiry.
- Refresh fails clearly.
- Clients surface an auth/reconnect state.
- ChatSDK does not mint replacement tokens directly to clients.

### Tooling

Recommended:

- Docker Compose restart scripts for local/LXC deployment.
- Toxiproxy or equivalent for latency/drop simulations.
- Seed scripts for deterministic users/channels/messages/uploads.
- Playwright for multi-user browser behavior.
- API integration tests for dependency failure responses.
- Metrics assertions for outbox/search/upload lag.

### Acceptance Criteria

- Seeded multi-user Playwright tests pass after each dependency restart.
- Message delivery is eventually consistent after Centrifugo outage.
- Search is eventually consistent after Meilisearch outage.
- Attachments never become public during storage failure/recovery.
- Failure events are visible in logs, metrics, and readiness.

## Implementation Sequencing

Recommended order:

1. Vouch-owned token broker contract and ChatSDK server mint endpoint.
2. Shared-DB tenant isolation: RLS, `withTenantContext`, table inventory, direct-query guardrails, or choose separate schema/database/deployment.
3. Token revocation/session invalidation and connected-user membership removal handling.
4. Private attachment access decision and implementation.
5. Redis-backed rate limits for token, send, history/backfill, upload, download, signed URL, reaction, typing, search, realtime auth, export, and admin actions.
6. Minimal retention/deletion/export baseline for real-user beta.
7. Observability baseline, dashboards, alerts, and runbooks.
8. Backup/restore runbooks and first restore drill with object manifest/purge-ledger reconciliation.
9. Chaos/restart/degradation test harness and seeded Playwright suites.
10. Full retention/deletion/export policy engine.
11. Abuse moderation workflows.
12. CDN/private media optimization, malware scanning, and media processing.

Reasoning:

- Identity and media privacy define the main production trust boundary.
- Database-enforced tenant isolation and revocation prevent single-bug cross-tenant leaks in the shared-stack model.
- Rate limits and observability protect that boundary.
- Minimal retention/export/deletion must land before real beta data is treated as user data of record.
- Backup and chaos testing prove the system is sturdy enough for beta data.

## Definition Of Done

This production sturdiness program is complete when:

- Vouch clients use Vouch-owned chat session minting only.
- Private chats and attachments are inaccessible without current authorization.
- Abuse controls protect all high-volume write paths.
- Retention, deletion, and export policies are implemented and tested.
- Operators can see request health, realtime lag, search lag, upload failures, and auth/rate-limit denials.
- Postgres and object storage restore drills have passed.
- Dependency restart/chaos tests pass with seeded multi-user Playwright verification.
- GPT-5.5 high and Antigravity adversarial reviews find no unresolved critical/high issues.
