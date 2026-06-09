I will start by viewing the files specified for our review, beginning with the auth middleware.
I will now view `packages/api/src/index.ts` to inspect how the auth middleware and the broker scoped route guard are wired.
I will view the thread routes in `packages/api/src/routes/threads.ts` to examine the scope gates.
I will view `packages/api/src/routes/polls.ts` to examine the scope gates on the polls endpoints.
I will view `packages/api/src/routes/server.ts` to examine the tenant reassignment prevention mechanisms.
I will view the files in the `tests` directory to examine the test coverage for authentication modes, broker authorization, and membership synchronization.
I will list the contents of the `tests` directory to see the relevant test files.
I will search the repository to locate the exact paths for `auth-modes.test.ts`, `broker-auth.test.ts`, and `broker-membership-sync.test.ts`.
I will view `packages/api/tests/auth-modes.test.ts`.
I will view `packages/api/tests/broker-auth.test.ts` to inspect the tests covering token broker authentication, including scopes, TTL limits, and error scenarios.
I will view `packages/api/tests/broker-membership-sync.test.ts` to examine the test cases around membership updates, revisions, rollback prevention, and tenant reassignments.
I will view the final review resolution document to examine what prior findings and blockers were identified and how they were resolved.
I will run the test suite to verify that all authentication, token broker, and membership synchronization tests pass correctly and no regressions are present.
I will view `packages/api/src/routes/users.ts` to verify the user-related API routes and ensure no broker-scoped leakage or unexpected blocker resides there.
I will list files in the `docs` directory to see if there are other files related to the token broker implementation that might explain the scoping design.
I will list `docs/agent-runs` to see the history of agent runs and design decisions for client-owned token broker.
I will list the contents of the `2026-06-09-client-owned-token-broker-implementation` directory to view all review/implementation notes.
I will view `docs/agent-runs/2026-06-09-client-owned-token-broker-implementation/07a-final-antigravity-hardening-review.md` to see the context of the issues that were raised.
I will view `packages/api/src/services/database.ts` to examine the tenant context and system context helpers, which are critical for verifying the security of queries under broker sync.
I will search for the migration file defining the client-owned token broker schema and policies.
I will view `docker/migrations/V014__client_owned_token_broker.sql` to understand the database schema design, Row Level Security policies, and SQL constraints implemented for the token broker.
I will view `packages/api/src/services/broker-auth.ts` to verify how the origin check and scoping assertions are implemented in the code.
I will view `packages/api/src/services/tokens.ts` to review how tokens are minted, signed, and validated on the service level.
I will view `packages/api/src/routes/devices.ts` to see what functionality it offers and whether it should be available to broker-scoped tokens.
I have completed the defensive narrow blocker re-review for the **ChatSDK client-owned token broker** implementation. Here is the detailed assessment of the recent fixes and the resolution status of the prior blocking issues.

---

### 1. Prior Blockers Resolution Status

All prior blockers identified in the hardening reviews have been successfully addressed:

*   **Broker-scoped tokens deny-by-default on broader authenticated API routes (Resolved):**
    *   **Fix:** The [brokerScopedRouteGuard](file:///Users/pushkar/chatsdk/packages/api/src/middleware/auth.ts#L215) is registered globally in [index.ts](file:///Users/pushkar/chatsdk/packages/api/src/index.ts#L148) immediately after user authentication.
    *   **Logic:** Any token bearing scope claims is matched against the `BROKER_SCOPED_ROUTES` allowlist. If the path/method does not match, a `403 Forbidden` ("Broker-scoped token is not allowed for this route") is raised immediately.
    *   **Testing:** Verified via `it('denies broker-scoped tokens on app-management routes by default')` in [auth-modes.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/auth-modes.test.ts#L258), proving a request to `/api/webhooks` with a scoped token is rejected before hitting any route logic.
*   **Thread/poll routes scoped (Resolved):**
    *   **Fix:** Thread routes in [threads.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/threads.ts) and poll routes in [polls.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/polls.ts) are strictly gated with [requireScope()](file:///Users/pushkar/chatsdk/packages/api/src/middleware/auth.ts#L162) modifiers (`chat:read` and `chat:write` as appropriate). The corresponding endpoints are explicitly declared in `BROKER_SCOPED_ROUTES`.
    *   **Testing:** Covered by `it('denies broker-scoped read tokens on chat write routes before handlers run')` in [auth-modes.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/auth-modes.test.ts#L273).
*   **Tenant reassignment blocked before mutation (Resolved):**
    *   **Fix:** Inside the membership sync PUT route handler of [server.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/server.ts#L335-L344), the existing state is fetched using a `FOR UPDATE` lock. If the existing membership row has a different `external_tenant_id` than the one supplied in the payload, the route aborts and throws `BROKER_TENANT_REASSIGN_DENIED` (409 Conflict) prior to executing user updates or channel membership changes.
    *   **Testing:** Verified by `it('rejects external tenant reassignment for an existing broker user')` in [broker-membership-sync.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/broker-membership-sync.test.ts#L411), which asserts that the update transaction throws `BROKER_TENANT_REASSIGN_DENIED` and makes no mutations to `app_user`.
*   **Origin mismatch covered (Resolved):**
    *   **Fix:** The broker authentication logic in [authenticateBrokerRequest](file:///Users/pushkar/chatsdk/packages/api/src/services/broker-auth.ts#L256-L273) validates the incoming request's `Origin` header against the scope's `allowed_origins` list (with wildcard `*` explicitly forbidden by database schema check constraints). Origin mismatch causes a `BROKER_ORIGIN_DENIED` (403) and logs a denied audit row.
    *   **Testing:** Covered by `it('rejects configured origin mismatches and writes a denied audit')` in [broker-auth.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/broker-auth.test.ts#L252).

---

### 2. Detailed Review of Recent Fixes

#### A. Auth Middleware & Global Wiring
*   **Location:** [auth.ts](file:///Users/pushkar/chatsdk/packages/api/src/middleware/auth.ts) & [index.ts](file:///Users/pushkar/chatsdk/packages/api/src/index.ts)
*   **Findings:** The middleware sequencing is correct. The routing executes: `authMiddleware` (authenticates bearer token) $\rightarrow$ `brokerScopedRouteGuard` (enforces path allowlist on scoped tokens) $\rightarrow$ `tenantContextMiddleware` (activates tenant isolation).
*   **Security Assessment:** By placing `brokerScopedRouteGuard` prior to `tenantContextMiddleware` and individual route handlers, any attempt to access non-scoped routes (such as user lookups, workspace updates, or webhooks) is terminated at the gateway.

#### B. Scope Gates
*   **Location:** [threads.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/threads.ts) & [polls.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/polls.ts)
*   **Findings:** Appropriate scopes are enforced:
    *   **Threads:** `GET /` and `GET /participants` $\rightarrow$ `chat:read`; `POST /` (replies) $\rightarrow$ `chat:write`.
    *   **Polls:** `POST /` (create), `POST /:id/vote`, and `DELETE /:id/vote` $\rightarrow$ `chat:write`; `GET /:id/results` $\rightarrow$ `chat:read`.
*   **Security Assessment:** Both the path-level gate in the guard and the handler-level check are present, providing defense-in-depth scope validation.

#### C. Tenant Reassignment Denial
*   **Location:** [server.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/server.ts#L335)
*   **Findings:** The logic uses `FOR UPDATE` on the lookup query to secure the tenant mismatch check against concurrent races. The `BrokerAuthError` with status code 409 is thrown before any write statements.
*   **Security Assessment:** The database transaction will roll back completely on a 409 error, guaranteeing that no metadata modifications or membership reconciliations take place when a tenant reassignment is attempted.

#### D. Test Suite Coverage & Execution
*   **Location:** [auth-modes.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/auth-modes.test.ts), [broker-auth.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/broker-auth.test.ts), and [broker-membership-sync.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/broker-membership-sync.test.ts).
*   **Findings:** The test cases comprehensively cover scope checks, origin checks, token lifetimes, replay attacks, tenant mismatches, and membership rollbacks.
*   **Execution:** All test suites pass successfully (34 tests passed across 3 test files).

---

### 3. Potential Regressions & Security Observations

There are no **critical/high/medium regressions** introduced by these fixes. All security controls fail closed as expected. One minor operational behavior is noted for design completeness:

*   **Device Push Token Registration (Minor Detail):**
    *   The `/api/devices` routes (used for push notification registrations in [devices.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/devices.ts)) are **not** present in `BROKER_SCOPED_ROUTES`.
    *   **Behavior:** Users authenticated via broker-scoped tokens will receive a `403 Forbidden` if they invoke device registration endpoints directly.
    *   **Rationale:** This matches the strict, least-privilege layout. Push token management should either occur under a broader user token session, or be coordinated securely via backend-to-backend calls.

### Conclusion

The prior blockers are **fully resolved**. The token broker implementation maintains strict boundaries, prevents cross-tenant hijacking, prevents scope leaks, and is transactionally sound.
