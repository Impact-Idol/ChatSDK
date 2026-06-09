# Antigravity Adversarial Review

## Findings

### Critical: HS256 cannot be verified with only `secret_hash`

The `broker_credential` schema includes `secret_hash` for `service_jwt_hs256`. Standard password-style hashes are one-way and cannot verify HMAC signatures. If implementers use the hash as the HMAC key, verification fails. If they store the raw key in that field, database compromise leaks signing keys.

Recommended fix:

- Deprecate HS256 for production.
- Prefer asymmetric service JWTs or mTLS.
- If symmetric credentials are ever allowed for internal/legacy clients, store an encrypted secret with envelope encryption/KMS and label it as `encrypted_secret`, not `secret_hash`.

### High: Replay storage assumes UUID `jti`

JWT `jti` is a case-sensitive string, not necessarily a UUID. A UUID database type can turn valid non-UUID JWTs into request 500s or motivate teams to weaken replay checks.

Recommended fix:

- Store `jti` as bounded text, such as `TEXT` with a length check.
- Enforce a short service JWT lifetime so replay cache growth is bounded.

### High: Revocation needs an automated Centrifugo disconnect hook

The plan says membership removal triggers disconnect, but the runbook language could still leave this as manual. Existing WebSocket connections may continue receiving messages until token expiry unless Centrifugo is explicitly told to disconnect or unsubscribe.

Recommended fix:

- Publish revocation events to Redis or another event bus.
- Have a worker call Centrifugo HTTP API `disconnect`/`unsubscribe` for affected user/session/channel immediately.

### High: Separate membership sync and mint can race

The plan uses `PUT /memberships/{userId}` followed by `POST /tokens/mint`. Under replication lag or read/write split, the mint endpoint may not see the just-applied membership version and fail closed for valid users.

Recommended fix:

- Let `POST /api/server/tokens/mint` optionally include the membership payload and apply membership plus mint in one write transaction.
- Keep the separate sync endpoint for bulk/pre-sync, but avoid making the happy-path session mint require two externally ordered writes.

### Medium: `allowed_origins` is weak unless bound to browser tokens

`allowed_origins` on a server-to-server scope is not meaningful by itself because the broker call is not a browser CORS request. A stolen browser token could be used from another origin if token validation does not bind origin.

Recommended fix:

- Include allowed origins or an origin policy ID in minted browser tokens.
- Validate browser `Origin` at API and Centrifugo connect time.

### Medium: Pre-auth cryptographic DoS remains possible

Asymmetric JWT verification is CPU-expensive. A flood of bad bearer tokens can burn CPU before authenticated rate limits apply.

Recommended fix:

- Add ingress/IP and cheap header-shape rate limits before signature verification.
- Fail fast on malformed `kid`, `aud`, `iss`, and token size before expensive crypto.

### Medium: Trace and request IDs need trust boundaries

Audit fields can be polluted if trace IDs and request IDs are treated as trusted client input.

Recommended fix:

- Generate internal request IDs server-side.
- Parse W3C trace context only from trusted ingress.
- Store client-supplied IDs separately as external correlation IDs.

### Low: Idempotency keys must be tenant-scoped

Global idempotency keys can collide across clients.

Recommended fix:

- Scope idempotency keys by authenticated `client_id`, `credential_id`, `app_id`, endpoint, and method.
