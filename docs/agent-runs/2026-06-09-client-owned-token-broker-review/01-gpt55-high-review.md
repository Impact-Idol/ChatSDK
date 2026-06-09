# GPT-5.5 High Review

## Findings

### High: Control-plane ownership is unresolved but implementation starts with schema

`CLIENT_OWNED_TOKEN_BROKER_PLAN.md` leaves core-vs-operator ownership open, while Phase 1 immediately adds ChatSDK-owned broker tables. Decide this in Phase 0 before migrations. If ChatSDK owns it, define system-only/RLS policies, provisioning APIs, readiness gates, and audit retention. If an operator service owns it, define how `/api/server/tokens/mint` validates credentials and app scope without duplicating control-plane state.

### High: Credential scoping is underspecified and currently too broad

The text says credentials are app-scoped, but `broker_app_scope` is keyed by `client_id, app_id`, not `credential_id, app_id`. That means every active credential for a client can mint for every scoped app, including staging/rotation credentials. Either scope per credential, or explicitly require separate `broker_client` records per environment/app boundary and make that invariant testable.

### High: Refresh-token boundary contradicts the hardening direction

The response returns `refreshToken` to the browser, while an open decision asks whether refresh should be broker-mediated. Existing sturdiness direction says refresh goes through the client/Vouch backend. Before implementation, choose broker-mediated refresh as the default production contract, or explicitly document revocation latency and client-side refresh-token storage requirements.

### High: Membership sync is named but not architecturally pinned down

The flow says the client backend syncs ChatSDK user/member state before mint, but the server mint contract only accepts user/session/scope data. Add a concrete, app-scoped membership sync contract, idempotency model, failure mode, and ordering guarantee. Token minting should fail closed if required membership sync is stale, unavailable, or not yet applied.

### Medium: Token claims are too generic for multi-tenant observability and revocation

Server rules require `app_id`, `user_id`, scope, and session ID, but the existing multi-tenant spec expects client/tenant/user provenance claims. Add stable claim names for `broker_client_id`, external tenant/user IDs, device/session hash, and auth source, while keeping ChatSDK authorization derived from `app_id` and membership.

### Medium: mTLS is listed but not implementable from the schema

`auth_type = mtls` exists, but there is no certificate fingerprint/SAN/subject mapping or trusted proxy header model. Add certificate identity fields and specify the ingress contract, including which headers are trusted and how spoofing is prevented.

### Medium: Replay detection policy must be stricter before rollout

The plan says reject replayed service JWTs, but acceptance allows "denied or auditable." For server mint credentials, make replay denial mandatory in production, backed by Redis or a DB uniqueness table with TTL cleanup.

### Medium: Sequencing puts reference brokers before complete compatibility cleanup

Phase 4 includes LAN broker migration, while Phase 6 disables legacy API-key minting. Move production kill-switch validation and docs cleanup earlier, before or alongside the new endpoint, so there is never a production mode with both old and new arbitrary-user mint paths enabled.

### Low: Endpoint and field naming should align with existing docs/code

Existing docs mention `/api/tokens/mint`, `/api/auth/connect`, and `/tokens`; this plan introduces `/api/server/tokens/mint`. That may be fine, but call out the intentional rename and migration path. Also standardize response names: `token/wsToken` vs `apiToken/realtimeToken`.

## Overall

The plan is directionally correct and improves the Vouch-specific framing. It should not be implemented until control-plane ownership, credential scoping, refresh boundary, and membership sync contract are resolved.
