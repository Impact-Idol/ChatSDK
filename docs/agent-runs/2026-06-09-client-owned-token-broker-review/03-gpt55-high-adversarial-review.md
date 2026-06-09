# GPT-5.5 High Adversarial Review

## Findings

### Critical: Membership sync is an arbitrary write capability for any scoped app user/channel

A stolen broker credential can sync fake active membership, then mint tokens for arbitrary users inside the scoped app. The plan scopes credentials to `app_id`, but does not constrain user/channel namespaces or membership authority.

Recommended fix:

- Treat broker credential compromise as full app compromise unless stronger containment is added.
- Add per-credential constraints: allowed external tenant IDs, user ID prefixes, channel ID prefixes/types, max membership fanout, and separate credentials for membership write vs token mint where useful.
- Require emergency disable to revoke all sessions minted or modified by that credential.

### Critical: Current membership is unverifiable because version/hash are client-supplied

ChatSDK cannot know whether a client-provided membership version is latest, rolled back, or fabricated. A stale broker cache, malicious broker, or replayed sync can resurrect removed membership.

Recommended fix:

- Define a monotonic per-`app_id,user_id` membership revision or epoch.
- Enforce anti-rollback.
- Store `fresh_until`.
- Reject minting after freshness expiry.
- Removal/suspension must write a tombstone/revocation epoch that lower or equal revisions cannot overwrite.
- Define whether sync payloads are complete snapshots or deltas.

### Critical: Membership sync endpoint lacks explicit broker app-scope enforcement rules

The mint endpoint has detailed rules, but the membership endpoint does not explicitly require the same credential validation, replay denial, app-scope check, rate limits, and audit.

Recommended fix:

- Duplicate server-side rules for `PUT /api/server/apps/{appId}/memberships/{userId}`.
- Authenticate credential first.
- Resolve client/credential from auth.
- Require active `broker_app_scope`.
- Deny replayed service JWTs.
- Audit allow/deny/error.
- Rate limit per client/app/user/credential.

### Critical: Multi-tenant-in-one-app remains dangerously ambiguous

The plan says one `app_id` must not serve multiple isolated client tenants without redesign, but the contract still accepts freeform `externalTenantId` metadata. A client can accidentally put many customer tenants inside one app and rely on unenforced metadata.

Recommended fix:

- Make this a hard production invariant: one external tenant isolation boundary equals one ChatSDK `app_id`, enforced by broker control-plane mapping.
- Or add first-class `tenant_id` to DB/search/object/realtime/RLS.
- Reject mint requests whose `externalTenantId` is not pre-bound to the requested `app_id`.

### High: Realtime channel isolation relies on string prefixing without canonical ID rules

`app:{app_id}:channel:{channel_id}` can be vulnerable to delimiter tricks, wildcard semantics, Unicode/control characters, parser mismatch, and prefix-only checks if IDs are not canonicalized.

Recommended fix:

- Define a single channel builder/parser.
- Reject unsafe characters and overlong IDs.
- Use exact structured parsing rather than prefix checks.
- Add fuzz tests for delimiters, wildcards, encoded separators, mixed case, Unicode normalization, and malformed app prefixes.

### High: Revocation depends on Redis hot keys but does not specify durable recovery semantics

If Redis restarts, flushes, partitions, or loses revocation keys, revoked JWTs may become valid until expiry unless every request also checks durable session/epoch state.

Recommended fix:

- Store revocation epochs and disabled session state durably.
- Rebuild Redis from durable state.
- Define fail-closed behavior when revocation cache is unavailable or stale.
- Middleware should check durable `auth_session` or a verifiable revocation epoch when Redis cannot prove freshness.

### High: Audit is security-critical but described as partly non-blocking

A compromised credential plus degraded audit sink creates untraceable minting.

Recommended fix:

- Use a transactional outbox or durable append-only security audit for all successful mints and denials.
- If the security audit path is unavailable, fail closed for minting.
- Keep analytics export async, but do not let security audit silently degrade.

### High: Service JWT replay denial lacks fail-closed and lifetime bounds

Replay denial is required, but the plan must state max service JWT lifetime, clock skew, Redis outage behavior after readiness, and whether mint fails closed when `SET NX EX` cannot complete.

Recommended fix:

- Require `exp - iat <= 60s` or similarly tight bound.
- Use small clock skew.
- Require unique `jti`.
- Fail closed on replay-store write/read failure.
- Include environment/audience/credential in replay keys.

### Medium: Object and search isolation are only acceptance criteria, not protocol requirements

The plan says tests must prove object/search isolation, but does not define how uploads, signed URLs, object keys, or search filters are made unbypassable.

Recommended fix:

- Specify app-prefixed opaque object keys generated only server-side.
- Signed URL minting must verify membership/scope/content limits.
- No client-supplied object paths.
- Search uses mandatory server-injected filters or per-app indexes/aliases that client filters cannot override.

### Medium: Production/staging separation depends on provisioning discipline, not cryptographic separation

Separate rows/namespaces help, but copied credentials, fixture keys, or shared `aud`/`iss` can let staging tokens work against production during deployment mistakes.

Recommended fix:

- Require environment-specific issuer, audience, signing keys, broker credentials, key IDs, and object/search prefixes.
- Add readiness checks that reject fixture credentials, duplicate staging/prod audiences, and known development key IDs in production.
