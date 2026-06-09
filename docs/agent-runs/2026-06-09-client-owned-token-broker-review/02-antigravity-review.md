# Architectural & Security Review: Client-Owned Token Broker Plan

**Document Reviewed:** [CLIENT_OWNED_TOKEN_BROKER_PLAN.md](file:///Users/pushkar/chatsdk/docs/features/chatsdk-production-hardening/CLIENT_OWNED_TOKEN_BROKER_PLAN.md)
**Reviewer:** Senior Security & Platform Architect
**Date:** June 8, 2026

---

## Executive Summary

The **Client-Owned Token Broker Plan** provides a solid foundation for decoupling identity providers (such as Vouch) from ChatSDK core. It correctly shifts the responsibility of user authentication and tenant mapping to the client's backend while maintaining ChatSDK's position as the enforcement authority for token validity and resource access.

However, several critical gaps regarding **revocation mechanics, mTLS configuration, high-throughput DB bottlenecks, and token refresh boundaries** must be addressed before the plan transitions to implementation.

---

## Findings & Recommendations

### 1. Token Refresh & Browser Session Boundaries
* **Severity:** 🔴 **Critical**
* **Area:** Security & Architecture Boundary
* **Issue:**
  Line 444 presents an open decision: *"Should refresh tokens be returned to the browser, or should refresh always be broker-mediated..."*
  If refresh tokens are returned to the browser, the browser can request new access tokens directly from ChatSDK without client-backend intervention. If a user is suspended, disabled, or removed from a tenant on the client backend, they will continue to have access to ChatSDK until their refresh token expires (or until an explicit revocation is pushed).
* **Impact:** High latency in enforcing user suspension or tenant membership changes.
* **Recommendation:**
  **Enforce broker-mediated session renewal.** The browser should never receive a ChatSDK refresh token. When the ChatSDK access token (e.g., 15-minute TTL) expires, the browser must call the client backend's session endpoint (e.g., `/api/chat/session`), allowing the client backend to re-verify authentication/membership before minting a new ChatSDK token bundle.

---

### 2. Immediate Token & Session Revocation Mechanism
* **Severity:** 🔴 **Critical**
* **Area:** Security & Correctness
* **Issue:**
  The plan mentions session revocation (Line 91, 345, 368), but does not specify the architectural mechanism. If ChatSDK uses stateless JWTs, verifying whether a token or session has been revoked on every API request requires either:
  1. A database query on every request (which negates the performance benefit of stateless JWTs).
  2. A fast, distributed blocklist/cache (e.g., Redis) to track revoked `jti` or `session_id` entries.
* **Impact:** Without a clear revocation mechanism, immediate user disconnection/revocation is infeasible or will severely degrade database performance.
* **Recommendation:**
  Explicitly define the revocation architecture:
  * Store active sessions in an `auth_session` table.
  * Use a fast in-memory store (e.g., Redis) to cache revoked tokens/sessions, or configure the API gateways/middleware to check a local cache with a short time-to-live (TTL).
  * Require Centrifugo to verify channel subscriptions or connect events against a session status endpoint if real-time eviction is required.

---

### 3. Database Write Bottlenecks (`broker_mint_audit` & `app_user` Upsert)
* **Severity:** 🟡 **High**
* **Area:** Performance & Feasibility
* **Issue:**
  * **Audit Logging (Line 193):** Writing a row to `broker_mint_audit` synchronously in the request-response cycle of `/api/server/tokens/mint` will create a database write bottleneck during login spikes or token renewals.
  * **User Upsert (Line 273):** Upserting `app_user` on every single token mint/refresh will cause lock contention on the `app_user` table.
* **Impact:** Degradation of API responsiveness, DB connection pool exhaustion, and increased latency.
* **Recommendation:**
  * **Audit Logs:** Emit structured JSON audit logs to `stdout` and let a log collector (e.g., Vector, FluentBit) ingest them into an observability backend (Grafana Loki, Elasticsearch, Datadog) instead of writing them to Postgres. If database storage is required, perform writes asynchronously using a queue or background worker.
  * **User Upsert:** Only perform the database upsert of `app_user` if the incoming payload contains fields (e.g., `displayName`, `avatarUrl`) that differ from the cached or stored version.

---

### 4. mTLS Credential Schema Mapping
* **Severity:** 🟡 **High**
* **Area:** Completeness & Correctness
* **Issue:**
  The `broker_credential` schema (Line 143) supports `mtls` as an `auth_type` but lacks any columns to map incoming TLS certificate attributes (such as Subject Alternative Name (SAN), Common Name (CN), or Subject DN) to the credential record.
* **Impact:** Inability to authenticate client backends using mTLS without hardcoding configuration or relying on out-of-band reverse proxy mappings.
* **Recommendation:**
  Add certificate identifier fields to the `broker_credential` schema:
  ```sql
  ALTER TABLE broker_credential
  ADD COLUMN client_certificate_subject_dn TEXT,
  ADD COLUMN client_certificate_san TEXT;
  ```
  Specify in the plan how the reverse proxy (e.g., Nginx, Envoy, AWS ALB) terminates mTLS and forwards these headers (e.g., `X-SSL-Client-SHA1`, `X-SSL-Client-DN`) to the ChatSDK application server.

---

### 5. Multi-Tenant WebSocket Isolation (Centrifugo)
* **Severity:** 🟡 **High**
* **Area:** Architecture Boundaries & Security
* **Issue:**
  The plan mentions generating a `wsToken` (Line 256) for Centrifugo. In Model A (Shared ChatSDK Stack, One App Per Client), multiple clients share the same Centrifugo deployment. If they share the same Centrifugo token signing key, a compromised client backend or a leaked signing key could allow minting websocket tokens for arbitrary channels in other apps.
* **Impact:** Potential cross-tenant data leakage if Centrifugo channel subscriptions are not strongly constrained.
* **Recommendation:**
  * Enforce that all Centrifugo channel names are strictly prefixed with the `app_id` (e.g., `app:${app_id}:channel:${channel_id}`).
  * Ensure the Centrifugo JWT generation library strictly populates the `channels` claim or utilizes namespace-based wildcard permissions to restrict access exclusively to the target `app_id` namespace.

---

### 6. Environment Separation within `broker_app_scope`
* **Severity:** 🟢 **Low**
* **Area:** Architecture & Database Design
* **Issue:**
  The `broker_app_scope` table (Line 161) includes an `environment` column (`production`, `staging`, etc.), but scope rules are bound to `client_id` and `app_id`. Typically, staging credentials should not have access to production app IDs.
* **Impact:** Risk of staging client backends accidentally accessing production ChatSDK applications if not segregated.
* **Recommendation:**
  Treat environments as hard boundaries. A client in staging should have a completely separate `broker_client` record (e.g., slug `vouch-staging`) and separate `broker_credential` records from the production client (e.g., slug `vouch-production`). The `environment` column in `broker_app_scope` can be removed or made metadata, since app segregation will naturally happen via distinct `app_id` configurations per environment.

---

## Recommended Action Plan / Next Steps

1. **Resolve Open Decisions:**
   * Finalize that **refresh tokens will not be sent to the browser** (broker-mediated sessions only).
   * Confirm that **Centrifugo channel naming conventions** enforce `app_id` prefixes.
2. **Update Specifications:**
   * Modify the `broker_credential` DB schema to accommodate certificate identity mapping for mTLS.
   * Clarify the replay attack prevention strategy for JWT `jti` checks (e.g. state whether Redis is required).
3. **Refine Sequencing:**
   * In Phase 1, ensure seed data matches the environment separation strategy (i.e. separate clients for staging vs prod).
