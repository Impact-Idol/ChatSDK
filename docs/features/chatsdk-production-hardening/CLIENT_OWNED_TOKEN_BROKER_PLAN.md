# Client-Owned Token Broker Plan

Status: Draft after first architecture/security review
Owner: ChatSDK platform
Created: 2026-06-09
Related:
- `PRODUCTION_STURDINESS_SPEC.md`
- `PRODUCTION_STURDINESS_TEST_PLAN.md`
- `MULTI_TENANT_ARCHITECTURE_SPEC.md`

## Summary

ChatSDK must support many independent embedding clients. Vouch is one client, not the universal identity authority.

The production pattern is therefore:

- each embedding client owns its own backend token broker
- the client backend authenticates its own users
- the client backend maps its own tenant/user/membership model to ChatSDK
- ChatSDK exposes a narrow server-to-server token mint contract
- ChatSDK enforces that each broker credential can mint only for its allowed ChatSDK `app_id` set
- browser refresh is broker-mediated; the browser never receives a ChatSDK refresh token

The browser must never receive ChatSDK app API keys, admin keys, broker signing keys, refresh tokens, or arbitrary-user mint capability.

## Problem

The current live LAN broker is a hardened demo/testing broker. It proves that ChatSDK can mint user-scoped REST/realtime tokens without exposing app API keys to the browser. It is not the final production contract because:

- it is deployment-local
- it does not represent each client's identity system
- it does not enforce client-specific broker credentials
- it is not a general contract for multiple independent clients
- it does not model client-side tenant, membership, suspension, device, or entitlement checks

Prior docs used "Vouch-owned token broker" because Vouch was the first expected embedder. The platform requirement is a client-owned token broker contract. Vouch gets one implementation of that contract.

## Goals

- Let each client backend mint ChatSDK tokens for its own authenticated users.
- Let one shared ChatSDK stack safely serve multiple clients.
- Ensure a broker credential scoped to Client A cannot mint tokens for Client B.
- Preserve ChatSDK `app_id` as the hard tenant boundary for shared-stack deployments.
- Remove browser dependence on ChatSDK app API keys and refresh tokens.
- Make token minting auditable, rate limited, traceable, revocable, and testable.
- Provide reference brokers for common backend stacks.
- Provide a Vouch-specific adapter as one reference client, not the global model.

## Non-Goals

- ChatSDK will not authenticate end-user browser sessions for each client.
- ChatSDK will not read Vouch or client browser cookies directly.
- ChatSDK will not become a broad admin proxy for client backends.
- ChatSDK will not trust client-provided `app_id`, `tenant_id`, `user_id`, or scopes without broker credential authorization.
- ChatSDK will not make one `app_id` serve multiple isolated client tenants unless the database/search/realtime/storage partition model is redesigned.

## Terms

- Client: an external product embedding ChatSDK, for example Vouch or another independent customer.
- Client backend: the client's trusted server application.
- Client token broker: a client-owned endpoint that validates the user's client session and obtains ChatSDK tokens.
- ChatSDK server mint endpoint: ChatSDK endpoint called only by trusted client backends.
- Broker credential: ChatSDK-issued server credential or service identity that authorizes a client backend to mint tokens for specific ChatSDK apps.
- ChatSDK app: the `app` row and `app_id` that forms the hard tenant boundary in shared deployments.
- App scope: the set of ChatSDK `app_id` values a specific broker credential may operate on.
- ChatSDK session: a revocable server-side session record referenced by short-lived browser API and realtime tokens.

## Core Decisions

These are not open for the first production implementation.

- ChatSDK core owns the broker credential control-plane tables for the first implementation.
- Broker app scope is credential-scoped, not merely client-scoped.
- Environments are hard boundaries. Production and staging use separate `broker_client`, `broker_credential`, `app`, and object/search namespaces.
- Browser renewal is broker-mediated. ChatSDK does not return refresh tokens to browsers.
- Production broker authentication uses asymmetric service JWTs or mTLS. HS256 is non-production/internal-only unless backed by encrypted secret storage and explicit risk acceptance.
- Service JWT replay denial is fail-closed and mandatory in production, and `jti` is treated as bounded text rather than UUID-only.
- Realtime channel names and Centrifugo claims are always constrained by `app_id`.
- Revocation events automatically disconnect or unsubscribe affected Centrifugo sessions.
- One external tenant isolation boundary maps to one ChatSDK `app_id` unless ChatSDK adds first-class tenant isolation across DB/search/object/realtime/RLS.
- Membership sync uses monotonic revisions, tombstones, and freshness windows; lower revisions cannot resurrect removed access.

An operator-side control plane can be added later, but it must write to or reconcile with these ChatSDK-owned tables instead of bypassing them.

## Architecture

### Browser Flow

```text
Client browser
  -> Client backend /api/chat/session
  -> Client backend validates client session, tenant, membership, user status
  -> Client backend resolves ChatSDK app_id and ChatSDK user_id
  -> Client backend syncs required ChatSDK user/member state
  -> Client backend calls ChatSDK server mint endpoint
  -> ChatSDK validates broker credential and credential app scope
  -> ChatSDK verifies membership sync freshness
  -> ChatSDK creates or renews a revocable ChatSDK session
  -> ChatSDK returns short-lived user-scoped API and realtime tokens
  -> Client backend returns token bundle to browser
  -> Browser connects to ChatSDK API and Centrifugo as that user
```

When the token nears expiry, the browser calls the client backend again. The client backend revalidates the user and requests a new short-lived ChatSDK token bundle. The browser does not call ChatSDK refresh endpoints directly.

### Trust Boundary

The client backend is trusted to authenticate its users. ChatSDK is trusted to:

- validate broker credentials
- enforce credential app scope
- verify membership sync freshness
- mint only short-lived access and realtime tokens
- enforce route membership and RLS
- revoke tokens and sessions
- audit all minting decisions

The browser is not trusted to choose identity, app, tenant, membership, channels, object keys, or scopes.

## Deployment Models

### Model A: Shared ChatSDK Stack, One App Per Client Isolation Boundary

Default production model.

- one ChatSDK deployment
- one Postgres database
- one object storage deployment or bucket namespace
- one Meilisearch deployment
- one Centrifugo deployment
- one ChatSDK `app_id` per independent client isolation boundary
- RLS, search filters, object keys, realtime channel names, rate limits, audit logs, backups, and exports scoped by `app_id`

This is appropriate when clients accept logical isolation with strong controls and tests.

### Model B: Dedicated Schema Or Database Per Client

Use when a client needs stronger isolation, noisy-neighbor control, or contractual separation.

### Model C: Dedicated ChatSDK Deployment Per Client

Use for regulated clients, strict data residency, custom retention, or high scale.

## Control Plane Ownership

ChatSDK core owns the initial broker control plane:

- migrations create broker tables in the ChatSDK database
- only system/admin roles may read or write broker tables directly
- app-scoped RLS applies to app data, while broker credential tables are system-only
- provisioning happens through CLI/admin APIs that require operator authentication
- `/ready` fails when server minting is enabled but broker tables, revocation storage, replay storage, or rate-limit storage are unavailable
- broker audit retention and export policies are documented before production enablement

Future operator control planes may manage these records, but `/api/server/tokens/mint` must validate credentials and app scope against the same authoritative state.

## ChatSDK Data Model Additions

### `broker_client`

Stores independent client identities. Separate production and staging clients are separate rows, for example `vouch-production` and `vouch-staging`.

```sql
CREATE TABLE broker_client (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled', 'suspended')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `broker_credential`

Stores credential metadata, not plaintext secrets.

```sql
CREATE TABLE broker_credential (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES broker_client(id) ON DELETE CASCADE,
  kid TEXT NOT NULL UNIQUE,
  public_key_jwk JSONB,
  encrypted_secret TEXT,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('service_jwt_hs256', 'service_jwt_rs256', 'mtls')),
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled', 'rotating')),
  not_before TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  mtls_subject_dn TEXT,
  mtls_san TEXT,
  mtls_certificate_sha256 TEXT,
  trusted_proxy_id TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    auth_type <> 'mtls'
    OR mtls_certificate_sha256 IS NOT NULL
    OR mtls_subject_dn IS NOT NULL
    OR mtls_san IS NOT NULL
  )
);
```

Production mode is asymmetric service JWT or mTLS. HS256 exists only for internal/legacy non-production compatibility. If HS256 is enabled, ChatSDK must store an encrypted HMAC secret using envelope encryption or KMS; a password-style `secret_hash` is not usable for HMAC verification and must not be used. Plaintext symmetric secrets are never stored in the database.

For mTLS, ChatSDK trusts certificate identity headers only from a private ingress or service mesh hop that strips user-supplied `X-SSL-*` headers before adding verified values. The trusted proxy identity must be pinned in deployment config.

### `broker_app_scope`

Maps broker credentials to allowed ChatSDK apps.

```sql
CREATE TABLE broker_app_scope (
  credential_id UUID NOT NULL REFERENCES broker_credential(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  allowed_external_tenant_ids TEXT[] NOT NULL DEFAULT '{}',
  allowed_user_id_prefixes TEXT[] NOT NULL DEFAULT '{}',
  allowed_channel_id_prefixes TEXT[] NOT NULL DEFAULT '{}',
  max_membership_fanout INTEGER NOT NULL DEFAULT 1000,
  allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  max_token_ttl_seconds INTEGER NOT NULL DEFAULT 900,
  default_scopes TEXT[] NOT NULL DEFAULT ARRAY['chat:read', 'chat:write'],
  allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY[
    'chat:read',
    'chat:write',
    'reaction:write',
    'typing:write',
    'upload:write',
    'search:read'
  ],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (credential_id, app_id)
);
```

The credential-scoped key prevents one active credential for a client from inheriting every app scope assigned to that client.

For production, `allowed_external_tenant_ids` is mandatory unless the client has a dedicated app with no external tenant subdivision. ChatSDK rejects a mint or membership sync request when `externalTenantId` is present but is not pre-bound to the requested `app_id` through broker scope or a stricter tenant mapping table.

### `broker_mint_audit`

Records mint decisions without storing token values or plaintext secrets.

```sql
CREATE TABLE broker_mint_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  credential_id UUID,
  app_id UUID,
  user_id TEXT,
  requested_scopes TEXT[],
  granted_scopes TEXT[],
  token_jti TEXT CHECK (token_jti IS NULL OR length(token_jti) BETWEEN 16 AND 255),
  session_id UUID,
  status TEXT NOT NULL CHECK (status IN ('success', 'denied', 'error')),
  denial_reason TEXT,
  request_id TEXT,
  trace_id TEXT,
  caller_ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Security audit is mandatory. Analytics export can be asynchronous, but the security audit path must not silently degrade:

- write every allow/deny/error outcome to a durable append-only security audit table or transactional outbox
- fail closed for token minting when the mandatory security audit path is unavailable
- export structured JSON audit events to observability asynchronously from the durable source
- alert when the durable audit sink is unavailable, lagging, or close to retention limits

### `broker_jwt_replay`

Stores service JWT replay markers when Redis is unavailable or as a durable backstop.

```sql
CREATE TABLE broker_jwt_replay (
  credential_id UUID NOT NULL REFERENCES broker_credential(id) ON DELETE CASCADE,
  jti TEXT NOT NULL CHECK (length(jti) BETWEEN 16 AND 255),
  expires_at TIMESTAMPTZ NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (credential_id, jti)
);
```

Production deployments should use Redis `SET key value NX EX <ttl>` for the hot path and clean expired durable rows with a scheduled job if the database backstop is enabled. Service JWT lifetime must be short, with a production maximum of 60 seconds from `iat`/`nbf` to `exp`, to bound replay cache growth and reduce stolen-token usefulness. Clock skew tolerance is small and explicit, with a default maximum of 30 seconds. If the replay store cannot complete the atomic replay check/write, server mint and membership sync fail closed.

Replay keys include environment, audience, credential ID, and `jti`.

## Membership Sync Contract

Token minting is allowed only after ChatSDK has current app-scoped membership state for the requested user. Membership sync is a privileged write path; a compromised broker credential is treated as compromise of every app scope attached to that credential unless stricter scope constraints are configured.

Membership payloads are complete snapshots for the user/app scope, not deltas. Each snapshot carries a monotonic `revision` generated by the client backend for that external tenant/user stream. ChatSDK stores the highest accepted revision, a `fresh_until` timestamp, and tombstone/revocation epochs. Lower or equal revisions cannot overwrite a newer active state or resurrect a removed/suspended user.

### Endpoint

```http
PUT /api/server/apps/{appId}/memberships/{userId}
Authorization: Bearer <client-service-jwt>
Idempotency-Key: <stable-client-generated-key>
Content-Type: application/json
```

### Request

```json
{
  "version": "tenant_abc:user_123:membership_v42",
  "revision": 42,
  "freshUntil": "2026-06-09T18:10:00.000Z",
  "stateHash": "sha256:...",
  "externalTenantId": "tenant_abc",
  "displayName": "Alice Example",
  "avatarUrl": "https://example.com/avatar.png",
  "memberships": [
    {
      "type": "channel",
      "id": "support-123",
      "role": "member"
    }
  ],
  "status": "active"
}
```

### Response

```json
{
  "appId": "00000000-0000-0000-0000-000000000001",
  "userId": "client_user_123",
  "membershipVersion": "tenant_abc:user_123:membership_v42",
  "membershipRevision": 42,
  "stateHash": "sha256:...",
  "freshUntil": "2026-06-09T18:10:00.000Z",
  "appliedAt": "2026-06-09T18:00:00.000Z"
}
```

The client backend includes `membershipVersion` and `stateHash` in the subsequent token mint request. ChatSDK fails closed if the version/hash is missing, stale, disabled, or not yet applied. Repeated sync calls with the same idempotency key and payload are safe.

The membership endpoint applies the same security rules as token minting:

- authenticate broker credential before trusting request body fields
- resolve `client_id` and `credential_id` from authentication
- require active broker client, credential, and credential app scope
- enforce allowed external tenant IDs, user ID prefixes, channel ID prefixes/types, fanout limits, and origin policy
- deny replayed service JWTs
- rate limit per client, app, user, credential, and IP
- write mandatory durable security audit records for allow/deny/error
- fail closed if replay storage, revocation storage, or mandatory audit storage is unavailable

Idempotency keys are scoped by authenticated `client_id`, `credential_id`, `app_id`, HTTP method, endpoint, and the caller-provided key. A key from one client or app can never collide with another client's request.

To avoid read-after-write races, the mint endpoint also supports an atomic inline membership payload. The recommended browser session path is one call from the client backend to `POST /api/server/tokens/mint` with `membership.inline` included. ChatSDK then applies membership state and mints the token in the same primary-database transaction. The standalone membership endpoint remains available for bulk/pre-sync and admin repair workflows.

Upsert `app_user` only when the user profile hash changes or when the user is first seen for the app. Do not lock/update `app_user` on every token renewal.

## ChatSDK Server Mint Contract

### Endpoint

```http
POST /api/server/tokens/mint
Authorization: Bearer <client-service-jwt>
X-Request-ID: <request-id>
Content-Type: application/json
```

This endpoint intentionally replaces legacy/demo paths such as `/api/auth/connect`, `/api/tokens/mint`, and local `/api/chatsdk-token` brokers for production. Legacy arbitrary-user mint paths must be disabled before production rollout.

### Request

```json
{
  "appId": "00000000-0000-0000-0000-000000000001",
  "user": {
    "id": "client_user_123",
    "displayName": "Alice Example",
    "avatarUrl": "https://example.com/avatar.png",
    "email": "alice@example.com",
    "metadata": {
      "externalTenantId": "tenant_abc",
      "externalUserId": "user_123"
    }
  },
  "membership": {
    "version": "tenant_abc:user_123:membership_v42",
    "stateHash": "sha256:...",
    "inline": {
      "displayName": "Alice Example",
      "avatarUrl": "https://example.com/avatar.png",
      "revision": 42,
      "freshUntil": "2026-06-09T18:10:00.000Z",
      "externalTenantId": "tenant_abc",
      "memberships": [
        {
          "type": "channel",
          "id": "support-123",
          "role": "member"
        }
      ],
      "status": "active"
    }
  },
  "requestedScopes": ["chat:read", "chat:write", "upload:write"],
  "session": {
    "externalSessionHash": "sha256:opaque-session-id",
    "deviceId": "device_123",
    "authSource": "client-cookie"
  },
  "ttlSeconds": 900
}
```

### Response

```json
{
  "apiToken": "eyJ...",
  "realtimeToken": "eyJ...",
  "expiresIn": 900,
  "expiresAt": "2026-06-09T18:00:00.000Z",
  "renewAfter": "2026-06-09T17:55:00.000Z",
  "sessionId": "019eaa00-0000-7000-9000-000000000000",
  "scopes": ["chat:read", "chat:write", "upload:write"]
}
```

There is no ChatSDK refresh token in the browser response. Renewal means the browser calls the client backend again.

### Token Claims

API and realtime tokens include stable claims for observability, revocation, and authorization:

- `iss`: ChatSDK token issuer
- `aud`: ChatSDK API or Centrifugo audience
- `kid`: ChatSDK signing key ID
- `jti`: token ID
- `sid`: ChatSDK session ID
- `app_id`: ChatSDK app boundary
- `user_id`: ChatSDK user ID
- `scope`: granted scopes
- `broker_client_id`: authenticated broker client
- `broker_credential_id`: authenticated broker credential
- `external_tenant_id`: client tenant/workspace/org ID when supplied
- `external_user_id`: client user ID when supplied
- `external_session_hash`: hash of client session identifier
- `device_id`: client device/session device identifier when supplied
- `auth_source`: client-side auth source label
- `membership_version`: membership state used for minting
- `orig` or `origin_policy_id`: browser origin policy for API and realtime connection checks

Authorization remains based on ChatSDK `app_id`, `user_id`, scopes, and membership. External IDs are provenance, debugging, and revocation inputs, not tenant enforcement by themselves.

### Server-Side Rules

- Authenticate the broker credential before reading request body identity claims.
- Resolve `client_id` and `credential_id` from the credential, not from request body.
- Confirm `broker_client.status = active`.
- Confirm credential status and validity window.
- Confirm requested `appId` is active in `broker_app_scope` for that credential.
- Confirm `externalTenantId`, user ID, channel IDs, and requested membership fanout are allowed by the credential app scope.
- Cap `ttlSeconds` to the app scope's `max_token_ttl_seconds`.
- Intersect requested scopes with `allowed_scopes`.
- Confirm the provided membership version/hash is active and current for `appId` and `userId`.
- If inline membership is provided, apply membership and mint inside one primary-database transaction.
- Reject membership revisions lower than the stored revision and reject minting after `fresh_until`.
- Upsert `app_user` only on first sighting or profile hash change.
- Create or renew a revocable ChatSDK session.
- Mint API and realtime tokens with `kid`, `jti`, `sid`, `app_id`, `user_id`, scope, broker provenance, and membership version claims.
- Write a mandatory durable broker mint audit event.
- Emit metrics and traces.
- Return no ChatSDK app API key, refresh token, server secret, or broker credential.

## Revocation Model

ChatSDK tokens are short-lived, but production also needs immediate revocation.

- `auth_session` is the source of truth for active ChatSDK browser sessions.
- Durable session status and revocation epochs are the source of truth for revoked users, sessions, credentials, apps, and membership tombstones.
- Redis stores hot revocation keys for token `jti`, session `sid`, user, credential, and app-wide revocation epochs.
- API middleware checks token expiry, signature, `app_id`, `scope`, and revocation status before private route handling.
- If Redis cannot prove freshness, middleware checks durable session/epoch state or fails closed according to the route's production policy.
- Redis revocation state can be rebuilt from durable session and epoch records after restart or failover.
- Middleware may use a short in-process cache, but revocation latency SLO must be explicit and tested.
- Disabling a credential revokes sessions minted through that credential.
- Removing a user or membership revokes the user's affected app sessions and publishes a revocation event.
- A revocation worker consumes events and calls the Centrifugo HTTP API to disconnect affected sessions or unsubscribe affected users/channels immediately.
- Centrifugo connection and subscription authorization verify `sid`, `app_id`, channel membership, and revocation state.
- A deployment without Redis or equivalent revocation storage must fail production readiness when server minting is enabled.

## Realtime Isolation

All realtime channels are namespaced by app:

```text
app:{app_id}:channel:{channel_id}
app:{app_id}:conversation:{conversation_id}
app:{app_id}:user:{user_id}
```

The browser cannot request arbitrary Centrifugo channels from the token broker. ChatSDK generates realtime claims from stored membership, and subscription handlers reject any channel whose app prefix does not match the token `app_id`. Realtime token signing keys are ChatSDK-owned, not client-owned.

Allowed browser origins are not trusted from the server-to-server broker call alone. ChatSDK binds either the allowed origin set or an origin policy ID into browser API and realtime tokens. API middleware and Centrifugo connect handlers validate the browser `Origin` header against that token-bound policy.

Channel names are built and parsed only through one shared library. IDs are canonical ASCII identifiers with strict length limits. Channel parsing is structural, not prefix-only string matching, and rejects delimiters, wildcards, encoded separators, control characters, mixed-normalization Unicode, and malformed app prefixes.

## Object And Search Isolation

Attachments and search must be app-isolated by protocol, not only by tests.

- Object keys are opaque, server-generated, and app-prefixed.
- Browsers never provide final object storage paths.
- Upload grants and signed URLs require user token scope, app membership, size/type limits, and object ownership checks.
- Private attachment reads use authenticated proxying or short-lived signed URLs generated after membership checks.
- Search requests inject mandatory server-side app filters that user input cannot override, or use per-app indexes/aliases.
- Search documents include `app_id`, channel/conversation membership metadata, and content visibility state.
- Search indexing workers reject documents without app scope and trace indexing lag per app.

## Client Backend Broker Contract

Each client owns an endpoint equivalent to:

```http
POST /api/chat/session
Authorization: client session cookie or client bearer token
Content-Type: application/json
```

The client endpoint must:

- validate the logged-in user
- validate tenant/org/workspace/squad membership
- reject suspended, deleted, disabled, or tenant-removed users
- map the client tenant to one ChatSDK `app_id`
- ensure one external tenant isolation boundary maps to one ChatSDK `app_id`, unless the deployment uses a future first-class ChatSDK tenant model
- map the client user to one ChatSDK user ID
- sync required user/channel/workspace membership state
- request a ChatSDK token bundle with approved scopes and the latest membership version/hash
- return only user-scoped short-lived tokens to the browser

For Vouch, this endpoint can be `POST /api/chat/session`, but that is a Vouch adapter detail.

## Reference Implementations

### Generic Next.js Route

- validates a local session callback
- resolves `appId`
- syncs membership
- calls ChatSDK server mint endpoint
- returns token bundle

### Generic Express/Fastify Middleware

- accepts pluggable `authenticateUser`, `resolveTenant`, and `resolveMembership` callbacks
- exposes `/chat/session`
- handles renewal through the client backend

### Vouch Adapter

- validates Vouch session
- resolves Vouch client/tenant/org/squad
- maps to ChatSDK `app_id`
- syncs Vouch membership into ChatSDK
- requests token bundle

The Vouch adapter must live outside core ChatSDK or in an examples/integrations package so core ChatSDK remains client-agnostic.

## Security Requirements

- Browser cannot call `/api/server/tokens/mint` successfully.
- Normal user bearer tokens cannot call server mint.
- App API keys cannot call server mint.
- Admin keys should not be used by client brokers.
- Broker credentials are app-scoped at credential granularity.
- Broker credential rotation supports overlapping old/new keys with explicit app scopes for each credential.
- Every service JWT must include `iss`, `aud`, `sub`, `kid`, `iat`, `nbf`, `exp`, and `jti`.
- Reject expired, future, unknown-issuer, unknown-kid, wrong-audience, revoked, or replayed service JWTs.
- Reject service JWTs whose lifetime exceeds the configured maximum, 60 seconds in production.
- Use Redis `SET NX EX` or an equivalent atomic store to deny service JWT replay in production.
- Fail closed when replay or mandatory security audit storage is unavailable.
- Apply ingress/IP and cheap malformed-token rate limits before expensive asymmetric signature verification.
- Fail fast on token size, malformed header, unknown `kid`, wrong `aud`, and wrong `iss` before full crypto verification where safely possible.
- Use mTLS where deployment environment supports it.
- Trust mTLS identity headers only from pinned private ingress or service mesh hops.
- Deny wildcard credentialed CORS on broker and mint endpoints.
- Rate limit token minting per client, app, user, session, credential, and IP.
- Audit all allow/deny/error outcomes.
- Tokens and secrets must be redacted in logs.
- Membership is still enforced on every private ChatSDK route.
- Realtime subscription authorization must verify channel membership and app prefix.
- Removed users must lose session authorization and be disconnected from realtime channels.
- Browser API and realtime connection origins must match token-bound origin policy.
- Fixture/development credentials, audiences, issuers, and key IDs are rejected by production readiness.

## Operational Requirements

- `/ready` checks broker schema, replay store, revocation store, rate-limit store, and audit sink health.
- Internal request IDs are generated by ChatSDK or trusted ingress, not copied from user payloads.
- W3C trace context is accepted only from trusted ingress/proxy configuration.
- Client-supplied request IDs are stored separately as external correlation IDs.
- Production and staging use distinct issuer, audience, signing keys, broker credentials, key IDs, and object/search prefixes.
- Metrics:
  - token mint attempts by client/app/status
  - mint latency
  - credential auth failures
  - denied scope requests
  - revoked credential use
  - service JWT replay denial
  - audit sink lag
  - revocation cache failures
- Alerts:
  - spike in denied token minting
  - unknown broker credential attempts
  - broker mint 5xx
  - token mint latency SLO breach
  - credential nearing expiry
  - client app scope disabled but mint attempts continue
  - audit sink unavailable or lagging
  - Redis/revocation store unavailable
- Runbooks:
  - rotate broker credential
  - disable compromised credential
  - disable client app scope
  - revoke all tokens for client/app/user/session
  - disconnect active realtime users for app/user/session
  - investigate cross-app access alert

## Implementation Plan

### Phase 0: Spec, Naming, And Compatibility Cleanup

- Replace generic "Vouch-owned token broker" language with "client-owned token broker" where appropriate.
- Keep Vouch-specific text only in Vouch adapter sections.
- Add architecture diagram and sequence diagrams.
- Disable legacy arbitrary-user mint paths in production mode.
- Document the migration from `/api/auth/connect`, `/api/tokens/mint`, and demo `/api/chatsdk-token` to `/api/server/tokens/mint`.
- Confirm readiness fails if production server minting is enabled without broker schema, replay store, revocation store, rate limits, and audit sink.

### Phase 1: Database And Config

- Add migrations for `broker_client`, `broker_credential`, `broker_app_scope`, `broker_mint_audit`, and replay storage.
- Add system-only policies for broker tables and forced RLS for app-scoped data.
- Add config validation for server mint enablement.
- Add seed data for two independent clients, two credentials, and two app scopes.
- Add separate staging and production seed fixtures to prove environment boundaries are separate clients and apps.
- Add readiness checks rejecting duplicate staging/production audiences, fixture keys, and known development `kid` values in production.

### Phase 2: Credential Verification

- Implement service JWT verifier with `kid`.
- Support asymmetric service JWT first; keep HS256 behind non-production/internal explicit opt-in only.
- Add Redis-backed replay denial for `jti`.
- Add service JWT lifetime enforcement and pre-crypto ingress/header rate limits.
- Add credential status, expiry, not-before, and credential app-scope checks.
- Add mTLS identity mapping behind trusted ingress when enabled.

### Phase 3: Membership Sync

- Add the app-scoped membership sync endpoint.
- Add idempotency keys, state hashes, profile hashes, and version checks.
- Ensure token minting fails closed when membership sync is missing or stale.
- Add inline membership support on token mint for atomic apply-and-mint.
- Add monotonic revisions, `fresh_until`, tombstones, complete-snapshot semantics, and anti-rollback checks.
- Add per-credential external tenant/user/channel/fanout constraints.
- Add removed-user/member revocation and realtime disconnect hooks.

### Phase 4: Server Mint Endpoint

- Add `POST /api/server/tokens/mint`.
- Create or renew ChatSDK sessions.
- Mint API and realtime token bundle through the existing centralized token service.
- Add audit events, metrics, trace fields, rate limits, and redaction.
- Ensure no refresh token is returned to the browser.
- Ensure mandatory security audit failure fails closed.

### Phase 5: Client Reference Brokers

- Add Next.js reference broker.
- Add Express/Fastify reference broker.
- Add Vouch adapter example with pluggable Vouch session/membership resolver.
- Make the current LAN broker explicitly demo-only or migrate it to use the server mint endpoint.

### Phase 6: Tests

- Unit tests for credential verification, app scoping, scope capping, TTL capping, replay denial, revocation checks, audit redaction, and membership freshness.
- Unit tests for membership anti-rollback, tombstones, fanout limits, tenant binding, ID canonicalization, and channel parser fuzz cases.
- Integration tests with two clients and two ChatSDK apps.
- Real Postgres RLS tests for cross-app denial.
- Playwright test with browser calling client backend, not ChatSDK mint endpoint.
- Negative tests for browser direct mint, wrong app, wrong audience, wrong kid, expired service JWT, disabled credential, disabled client, replayed JWT, stale membership, and removed user.
- Realtime tests proving a token for one app cannot subscribe to another app's channels.
- Revocation tests proving membership removal disconnects active Centrifugo sessions without waiting for token expiry.
- Origin-binding tests proving stolen browser tokens cannot connect from disallowed origins.
- Object/search tests proving app-scoped media and search isolation.
- Redis restart/failover tests proving durable revocation state is recovered or requests fail closed.

### Phase 7: Deployment

- Deploy broker schema and server mint endpoint behind private ingress.
- Keep demo broker disabled in production.
- Add dashboards and alerts.
- Run staged rollout with one test client, then Vouch, then additional clients.
- Run rollback and credential compromise drills before production acceptance.

## Acceptance Criteria

- Client A broker can mint only for Client A app.
- Client B broker can mint only for Client B app.
- Vouch broker can mint only for the Vouch app scope assigned to its credential.
- Browser cannot mint tokens directly from ChatSDK.
- Browser never sees ChatSDK app API keys, broker credentials, or ChatSDK refresh tokens.
- Removed/suspended client user cannot get a token.
- Removed connected user is disconnected or loses subscription authorization within the revocation SLO.
- Replayed service JWT is denied in production.
- Token mint audit records or structured audit events exist for success and failure.
- Metrics and traces include client/app/status without token values.
- Production readiness fails if server mint is enabled without broker schema, replay store, revocation store, rate limits, and audit sink.
- End-to-end Playwright proves two independent clients cannot cross-read messages, search results, realtime channels, or media.

## Open Decisions

- Do we permit HS256 at all outside local/internal test deployments, or make asymmetric/mTLS mandatory everywhere?
- What is the first non-Vouch client we will model in tests?
- What are the minimum alert thresholds for token mint denial spikes?
- What exact revocation latency SLO do we require for API requests and realtime disconnects?
- Which observability backend stores long-retention audit records?
- What are the default maximum membership fanout and freshness windows for common client profiles?

## Recommended First Implementation Slice

Implement the ChatSDK broker credential schema, membership sync, and server mint endpoint first, then migrate the LAN token broker to call that endpoint. This gives us a production-like path before writing the Vouch adapter.

Order:

1. Production compatibility kill switches and readiness gates.
2. Migrations and config.
3. Credential verification and credential app-scope enforcement.
4. Membership sync and stale-membership denial.
5. Server mint endpoint with no browser refresh token.
6. Audit/metrics/rate limits/revocation/replay denial.
7. LAN broker migration to server mint.
8. Two-client integration and Playwright tests.
9. Vouch adapter reference implementation.
