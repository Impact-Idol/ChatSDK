# ChatSDK Multi-Tenant Architecture Spec

Status: Draft for implementation
Date: 2026-06-08
Owner: Vouch/VNet platform
Related docs:

- `docs/features/chatsdk-production-hardening/SPEC.md`
- `docs/features/chatsdk-production-hardening/PRODUCTION_STURDINESS_SPEC.md`
- `docs/features/chatsdk-production-hardening/PRODUCTION_STURDINESS_TEST_PLAN.md`

## Executive Summary

ChatSDK can support multiple independent Vouch clients on one shared chat server by using the existing ChatSDK `app_id` as the tenant isolation boundary.

Recommended first production model:

```text
One ChatSDK deployment
One shared Postgres database
One shared Redis
One shared Centrifugo
One shared Meilisearch
One shared private object store

Client A -> ChatSDK app_id A
Client B -> ChatSDK app_id B
Client C -> ChatSDK app_id C
```

The Vouch-owned token broker is the control plane that maps a Vouch client/tenant to exactly one ChatSDK `app_id`, then mints user tokens scoped to that `app_id`.

This gives Vouch efficient shared infrastructure while preserving logical tenant isolation. For clients that require stronger contractual or regulatory isolation, Vouch can move them to a separate schema, database, bucket, or full ChatSDK deployment later.

## Terminology

- Vouch client: an external customer or independently managed Vouch deployment/customer account.
- Vouch tenant/org: Vouch's product-side tenant boundary.
- ChatSDK app: ChatSDK's top-level isolation boundary, stored as `app.id`.
- ChatSDK user: a user row scoped by `(app_id, id)`.
- Workspace/channel: chat spaces under one ChatSDK app.
- Broker: Vouch-owned backend endpoint that validates Vouch identity and mints ChatSDK user tokens.

## Supported Tenancy Models

### Model A: Shared Stack, Separate ChatSDK Apps

```text
ChatSDK app_id A -> Client A
ChatSDK app_id B -> Client B
ChatSDK app_id C -> Client C
```

Isolation:

- application-level `app_id` filtering
- app-scoped JWT claims
- app-scoped realtime channel names
- app-scoped search filtering
- app-scoped object keys/policies

Pros:

- simplest to operate
- efficient resource usage
- easiest for 2-3 early clients
- aligns with current ChatSDK schema

Cons:

- relies on strong query scoping and tests
- noisy-neighbor risk unless rate limits are app/tenant-aware
- shared DB blast radius

Recommendation: default model for Vouch beta and early production.

### Model B: Shared API, Separate Database Schema Or Database Per Client

Isolation:

- separate schema or database per client
- optional separate object bucket/prefix per client
- shared API fleet routes requests to the correct data plane

Pros:

- stronger data isolation
- easier client-specific backup/restore
- smaller impact from accidental cross-tenant query bugs

Cons:

- more operational complexity
- migration orchestration per tenant
- more complicated connection management

Recommendation: use only for clients with stricter isolation requirements.

### Model C: Separate ChatSDK Deployment Per Client

Isolation:

- separate API
- separate DB
- separate Redis/Centrifugo/Meilisearch/object store where needed

Pros:

- strongest blast-radius isolation
- client-specific upgrade windows
- simplest contractual story for strict isolation

Cons:

- most expensive
- more operational overhead
- harder global observability

Recommendation: reserve for enterprise/regulatory cases.

## Recommended Production Default

Use Model A first:

- one shared ChatSDK stack
- one ChatSDK `app` row per independent Vouch client/tenant isolation boundary
- one Vouch broker mapping row per Vouch client/tenant
- one Vouch tenant/org must not share a ChatSDK `app_id` with another Vouch tenant/org unless `vouch_tenant_id` is added as a first-class data partition on every tenant-owned row, query, RLS policy, search document, realtime channel, object key, backup/export/deletion job, and test
- strict cross-app tests
- app-scoped observability, rate limits, search, storage, and backup drills
- Postgres RLS, request-scoped tenant DB context, and direct-query guardrails before real shared-DB client data is stored

Escalate a client to Model B or C only when required by contract, scale, compliance, or operational risk.

## Vouch Broker Mapping

The broker must own a durable mapping table outside browser control:

```text
vouch_client_id
vouch_tenant_id
chatsdk_app_id
allowed_origins
enabled
plan
retention_policy_id
storage_policy_id
rate_limit_policy_id
created_at
updated_at
```

Example:

```text
client_acme    tenant_acme_prod    chatsdk_app_111
client_zenith  tenant_zenith_prod  chatsdk_app_222
client_nova    tenant_nova_prod    chatsdk_app_333
```

When a user opens chat:

1. Vouch validates the user's Vouch session.
2. Vouch resolves the user's client/tenant.
3. Broker looks up the mapped ChatSDK `app_id`.
4. Broker verifies the user is active in that tenant.
5. Broker syncs the ChatSDK `app_user` and membership state for that app.
6. Broker mints a ChatSDK token with that `app_id`.

The client never chooses `app_id` directly.

### Mapping Invariant

P0 invariant: ChatSDK `app_id` is the hard tenant boundary for the shared-stack beta. Therefore, the broker must map each independent Vouch tenant/org that requires isolation to its own ChatSDK `app_id`.

If Vouch wants multiple Vouch tenants/orgs under one ChatSDK `app_id`, the architecture must change before launch:

- add `vouch_tenant_id` to all tenant-owned tables
- include `vouch_tenant_id` in RLS policies
- include `vouch_tenant_id` in search documents and filters
- include `vouch_tenant_id` in realtime channel naming or subscription authorization context
- include `vouch_tenant_id` in object keys/metadata
- include `vouch_tenant_id` in retention, export, deletion, backup, and rate-limit scope
- add same-app cross-tenant isolation tests

## Token Claims For Multi-Tenancy

Each ChatSDK REST token must include:

- `sub` or `user_id`: ChatSDK user ID.
- `app_id`: ChatSDK app ID.
- `vouch_client_id`: Vouch client/customer ID.
- `vouch_tenant_id`: Vouch tenant/org ID.
- `vouch_user_id`: Vouch user ID.
- `scope`: allowed chat capabilities.
- `jti`: token ID for audit/revocation.
- `iss`: trusted Vouch issuer.
- `aud`: ChatSDK API.
- `iat`, `nbf`, `exp`.

Each realtime token must include:

- `sub`: ChatSDK user ID.
- `app_id`: ChatSDK app ID.
- `vouch_tenant_id`.
- expiration.

Realtime subscription authorization must continue to verify channel membership server-side. The token's `app_id` alone is not enough to join a private channel.

## Data Isolation Requirements

For Model A, every tenant-owned table must be scoped by `app_id`.

Required app-scoped data:

- users
- channels
- channel members
- messages
- reactions
- receipts
- uploads
- devices
- presence
- workspaces
- workspace members
- search documents
- realtime outbox events
- audit logs
- webhooks
- moderation/reports
- retention/export/deletion jobs

Rules:

- Queries for tenant data must include `app_id`.
- Joins must join on `app_id` as well as entity IDs.
- Unique constraints should include `app_id` for tenant-owned natural keys.
- Foreign keys should preserve app consistency wherever practical.
- Search documents must store `appId` and every search must filter by `appId`.
- Realtime channel names must include `appId`.
- Object storage keys or metadata must include `appId` or a tenant-safe equivalent.

## Object Storage Tenancy

Recommended key pattern:

```text
private/{app_id}/{channel_id}/{upload_id}/{random_nonce}.{ext}
```

Rules:

- private buckets are not public-read
- object keys are generated by the server
- shared-bucket object keys must include `app_id` before real multi-tenant data is stored
- any existing key pattern that omits `app_id` must be migrated or limited to demo data
- upload rows store `app_id`
- download authorization verifies token `app_id`
- signed URLs or proxy downloads are generated only after membership checks
- lifecycle rules may be app-specific
- backup/restore drills must verify app-specific objects

For stricter tenants, use separate buckets:

```text
chatsdk-client-acme-private
chatsdk-client-zenith-private
```

## Search Tenancy

Meilisearch can be shared if every document includes `appId` and every query filters by `appId`.

Requirements:

- `appId` is a required searchable/filterable attribute.
- message index writes include `appId`.
- search routes derive `appId` from auth context, not from request body.
- search filters include the user's visible channel IDs and `appId`.
- cross-app search tests are required.

For stricter tenants, use per-client indexes:

```text
messages_app_111
messages_app_222
messages_app_333
```

## Realtime Tenancy

Realtime channels must be app-scoped:

```text
chat:{appId}:{channelId}
user:{appId}:{userId}
workspace:{appId}:{workspaceId}
```

Requirements:

- client cannot subscribe directly without server authorization
- subscription token or server proxy verifies `app_id` and membership
- user personal channels include `app_id`
- outbox events include `app_id`
- metrics include `app_id`

## Rate Limits By Tenant

Rate limits must include `app_id` in the key:

```text
ratelimit:{app_id}:{action}:{user_id}
ratelimit:{app_id}:{action}:{channel_id}:{user_id}
ratelimit:{app_id}:{action}:ip:{ip_hash}
```

This prevents one client from consuming another client's budget and makes abuse visible per client.

## Observability By Tenant

Logs, metrics, traces, and audit events must include:

- `app_id`
- `vouch_client_id`
- `vouch_tenant_id`
- request ID
- route/action
- auth mode
- result

Do not include raw message body, tokens, signed URLs, or unnecessary PII.

## Do We Need Postgres RLS?

### Short Answer

For a shared-database multi-tenant beta with real client data, Postgres RLS is P0. Manual `app_id` scoping and tests are necessary but not sufficient as the only protection.

For the first 2-3 client deployment, use this stance:

- P0 for shared DB with real data: explicit `app_id` query scoping, aggressive cross-app tests, request-scoped DB context, direct-query guardrails, tenant-owned table inventory, and RLS for app-scoped tables.
- If RLS/context guardrails are not ready: use Model B/C, or restrict beta to synthetic/non-record data with short purge and a written waiver.
- Client contract requiring database-enforced tenant isolation: use RLS P0 at minimum, and consider separate schema/database/deployment.

### Why RLS Requires A Data-Access Refactor

The current API uses many direct pooled calls like:

```ts
db.query(...)
```

and a simple transaction helper:

```ts
db.transaction(async (client) => ...)
```

With a pooled Postgres connection, RLS policies need trusted per-request context. That means the API must set something like:

```sql
SET LOCAL app.current_app_id = '<app-id>';
SET LOCAL app.current_user_id = '<user-id>';
```

inside the same transaction that executes the protected queries.

Using normal `SET` on a pooled connection is dangerous because context can leak between requests. Using `SET LOCAL` without wrapping the request's DB work in a transaction will not reliably protect every query.

Therefore, RLS must come with a data-access refactor:

- introduce `withTenantContext(auth, fn)`
- open a transaction
- run `SET LOCAL app.current_app_id = ...`
- run all tenant-scoped queries through that transaction client
- commit/rollback
- forbid direct tenant data access outside a context
- add lint/static-analysis or test guardrails that fail new tenant-scoped route/service code using raw `db.query`
- add privileged system-job helpers that require an explicit app context or explicit audited cross-app mode

### Recommended RLS Design

Create helper functions:

```sql
CREATE FUNCTION current_app_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_app_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE FUNCTION current_user_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$ LANGUAGE sql STABLE;
```

Example table policy:

```sql
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE message FORCE ROW LEVEL SECURITY;

CREATE POLICY message_app_isolation
ON message
USING (app_id = current_app_id())
WITH CHECK (app_id = current_app_id());
```

Example member-aware policy for private message reads is possible, but should be used carefully:

```sql
CREATE POLICY message_member_read
ON message
FOR SELECT
USING (
  app_id = current_app_id()
  AND EXISTS (
    SELECT 1
    FROM channel_member cm
    WHERE cm.app_id = message.app_id
      AND cm.channel_id = message.channel_id
      AND cm.user_id = current_user_id()
  )
);
```

Recommended split:

- Use RLS for hard `app_id` isolation.
- Keep route/service-level authorization for business rules such as channel role, admin permissions, legal hold, export scope, block/mute, and moderation actions.

Reason: putting all business authorization in SQL policies can become hard to inspect and test. RLS should be the seatbelt, not the entire driving system.

### RLS Migration Plan

1. Inventory every tenant-owned table and confirm it has `app_id`.
2. Add missing composite foreign keys or constraints where app consistency is weak.
3. Introduce `withTenantContext(auth, fn)`.
4. Convert tenant-scoped routes/services from `db.query` to context-aware clients.
5. Add lint/test guardrails to prevent direct queries in route code where tenant context is required.
6. Enable RLS first in shadow/test environment.
7. Add RLS policies for `app_id` isolation.
8. Run full API, integration, Playwright, search, upload, and chaos tests.
9. Enable RLS in staging.
10. Enable RLS in production with rollback plan.

For a shared-DB beta with real data, steps 1-8 are P0. Steps 9-10 are required before launch.

### RLS Test Requirements

- If a route accidentally omits `app_id`, it still cannot return another app's rows.
- Direct DB query under `app_id A` context cannot read `app_id B` messages.
- Direct DB insert under `app_id A` context cannot write `app_id B` rows.
- Missing tenant context returns zero rows or fails closed.
- Admin/system jobs use explicit elevated role or explicit app context.
- Background jobs cannot process another tenant's rows unless intentionally using system context.
- Connection pool reuse does not leak tenant context between requests.
- Static/lint/test guardrail fails new route/service code that uses raw tenant-owned `db.query` outside an approved context.

## Config Requirements

Each ChatSDK app/client needs:

- ChatSDK `app_id`
- Vouch client/tenant mapping
- allowed origins
- storage policy
- retention policy
- rate limit policy
- search policy
- webhook policy
- feature flags
- audit/logging policy

Example:

```json
{
  "vouchClientId": "client_acme",
  "vouchTenantId": "tenant_acme_prod",
  "chatSdkAppId": "11111111-1111-1111-1111-111111111111",
  "allowedOrigins": ["https://app.acme.com"],
  "storagePolicy": "private-signed-url",
  "retentionPolicy": "standard-365-days",
  "rateLimitPolicy": "standard-beta",
  "searchPolicy": "shared-index-app-filter",
  "enabled": true
}
```

## Provisioning Flow

To add a new client:

1. Create ChatSDK app row.
2. Create or assign storage prefix/bucket.
3. Create search index/filter config.
4. Create Vouch broker mapping.
5. Configure allowed origins.
6. Configure rate limits and retention.
7. Seed test users/channels for validation.
8. Run cross-app isolation tests.
9. Run upload/search/realtime tests.
10. Enable client in Vouch broker.

## Required Cross-Tenant Tests

For clients A and B:

- A user cannot list B channels.
- A user cannot fetch B channel details.
- A user cannot fetch B messages by guessed ID.
- A user cannot search B messages.
- A user cannot subscribe to B realtime channels.
- A user cannot fetch B upload metadata.
- A user cannot download B attachment bytes.
- A user cannot mark B messages read.
- A user cannot react to B messages.
- A user cannot create workspace/channel membership in B.
- A token minted for A cannot be used with B's app ID in request payload.
- A broker request cannot override the mapped ChatSDK app ID.

## Acceptance Criteria

The shared-stack multi-tenant model is production-acceptable when:

- each independent client maps to a separate ChatSDK `app_id`
- Vouch broker is the only client-facing token mint path
- clients never receive ChatSDK app/server keys
- all tenant-owned API routes derive `app_id` from auth context
- search, realtime, object storage, logs, metrics, and rate limits are app-scoped
- cross-app isolation tests pass
- seeded Playwright tests pass for at least two clients simultaneously
- backup/restore drills can restore one client's data without exposing another client's data
- RLS decision is recorded for the deployment tier:
  - explicit app scoping only, with tests
  - RLS enabled
  - separate schema/database/deployment

## Recommendation

For the current Vouch plan, use:

- Model A for beta only if shared-DB RLS, request-scoped tenant context, and direct-query guardrails are P0.
- One ChatSDK app per independent Vouch client/tenant isolation boundary.
- Explicit `app_id` scoping, cross-app tests, and RLS as P0 for shared-DB real data.
- Separate deployment only for high-isolation enterprise cases.

This gives us speed now, a clean growth path, and a serious safety story without overcomplicating the first production embed.
