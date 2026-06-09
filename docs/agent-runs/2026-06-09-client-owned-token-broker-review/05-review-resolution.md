# Review Resolution

Plan reviewed:

- `docs/features/chatsdk-production-hardening/CLIENT_OWNED_TOKEN_BROKER_PLAN.md`

Review artifacts:

- `01-gpt55-high-review.md`
- `02-antigravity-review.md`
- `03-gpt55-high-adversarial-review.md`
- `04-antigravity-adversarial-review.md`

## Resolution Summary

The plan was updated after both normal reviews and both adversarial reviews. The revised plan now makes the high-risk production decisions explicit instead of leaving them as open questions.

## Normal Review Resolutions

### Control-plane ownership

Resolved by making ChatSDK core the first implementation owner for broker credential tables, readiness checks, system-only access, and provisioning. Future operator control planes must reconcile with this authoritative state.

### Credential app scope

Resolved by changing app scope from `(client_id, app_id)` to `(credential_id, app_id)`, so staging, rotating, and production credentials do not inherit all client-wide app access.

### Browser refresh token boundary

Resolved by removing ChatSDK refresh tokens from browser responses. Renewal is broker-mediated through the client backend.

### Membership sync

Resolved by defining an app-scoped membership sync contract, idempotency scope, inline atomic membership on mint, fail-closed freshness checks, and complete-snapshot semantics.

### Token claims

Resolved by specifying stable claims for broker client, broker credential, external tenant/user/session, device, auth source, membership version, and origin policy.

### mTLS mapping

Resolved by adding certificate subject/SAN/fingerprint fields and a trusted ingress/header model.

### Replay detection

Resolved by making replay denial mandatory and fail-closed in production, using Redis atomic `SET NX EX` or equivalent storage plus a durable backstop.

### Compatibility cleanup

Resolved by moving legacy arbitrary-user mint route disablement and readiness checks into Phase 0.

## Antigravity Adversarial Resolutions

### HS256 secret storage

Resolved by replacing `secret_hash` with `encrypted_secret` and making asymmetric JWT or mTLS the production default. HS256 is non-production/internal-only unless encrypted secret storage and risk acceptance are explicit.

### Non-UUID `jti`

Resolved by changing replay and audit token IDs to bounded text, with a 60-second production service JWT lifetime and small clock-skew tolerance.

### Automated realtime disconnect

Resolved by requiring revocation events and a worker that calls the Centrifugo HTTP API to disconnect or unsubscribe affected sessions/users/channels.

### Membership sync race

Resolved by adding inline membership payload support on `POST /api/server/tokens/mint`, applied in the same primary-database transaction as minting.

### Origin binding

Resolved by binding allowed origins or an origin policy ID into browser tokens and requiring API/Centrifugo origin validation.

### Pre-auth crypto DoS

Resolved by adding ingress/IP and cheap malformed-token rate limits before expensive asymmetric verification.

### Trace/request ID trust boundary

Resolved by generating internal request IDs server-side or at trusted ingress, accepting trace context only from trusted proxy config, and storing client IDs separately as external correlation IDs.

### Idempotency collisions

Resolved by scoping idempotency keys by authenticated client, credential, app, method, endpoint, and caller key.

## GPT-5.5 High Adversarial Resolutions

### Broker compromise blast radius

Resolved by explicitly treating broker credential compromise as full compromise of scoped apps unless per-credential constraints are configured. The scope table now includes allowed external tenant IDs, user ID prefixes, channel ID prefixes, and max membership fanout.

### Membership anti-rollback

Resolved by requiring monotonic membership revisions, `fresh_until`, complete snapshots, tombstones/revocation epochs, and rejection of lower/equal revisions that would resurrect access.

### Membership endpoint enforcement

Resolved by applying the same broker authentication, app-scope, replay, rate-limit, audit, and fail-closed storage rules to membership sync as to token minting.

### Multi-tenant-in-one-app ambiguity

Resolved by making one external tenant isolation boundary equals one ChatSDK `app_id` a production invariant unless ChatSDK later adds first-class tenant isolation across database, search, object storage, realtime, and RLS.

### Realtime parser safety

Resolved by requiring a single channel builder/parser, canonical ASCII IDs, exact structural parsing, strict length limits, and fuzz tests for delimiter/wildcard/encoding/parser mismatch cases.

### Durable revocation recovery

Resolved by making durable session status and revocation epochs the source of truth, with Redis as hot cache that can be rebuilt. Middleware checks durable state or fails closed when Redis freshness is not provable.

### Mandatory security audit

Resolved by making durable append-only security audit or transactional outbox mandatory for all mint allow/deny/error outcomes. Token minting fails closed if the mandatory audit path is unavailable.

### Object and search isolation

Resolved by adding protocol requirements for server-generated app-prefixed object keys, authenticated signed URL/proxy reads, membership-checked uploads, server-injected search filters, and per-app indexes/aliases.

### Production/staging cryptographic separation

Resolved by requiring distinct issuer, audience, signing keys, broker credentials, key IDs, and object/search prefixes per environment, plus readiness checks rejecting fixture/development keys in production.

## Remaining Open Decisions

- Whether HS256 is permitted at all outside local/internal test deployments.
- First non-Vouch client fixture for multi-client tests.
- Token mint denial alert thresholds.
- Exact revocation latency SLO for API and realtime.
- Long-retention audit backend.
- Default membership fanout and freshness windows by client profile.
