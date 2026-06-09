I will begin by listing the contents of the workspace directory to locate the files in scope for our defensive production-readiness code review.
I will search for the in-scope files within the `packages` directory to get their exact paths.
I will list the remaining files in the `services` directory to make sure we find all service-related files.
I will search for related test files to include in our review.
I will read `docker/migrations/V014__client_owned_token_broker.sql` to understand the database changes and schemas introduced for the client-owned token broker.
I will read the broker auth service to understand how credentials and JWT tokens are verified.
I will search for the definition of `withBrokerSystemContext` to see how it manages connection context and handles database operations.
I will search for `withBrokerSystemContext` across the entire `packages/api/src` codebase.
I will read the `database.ts` file around line 174 to understand how `withBrokerSystemContext` is implemented.
I will read lines 210 to 250 of `packages/api/src/services/database.ts` to see the details of `assertBrokerRuntimeRole` and other related database helpers.
I will read the server routes in `packages/api/src/routes/server.ts` to see how requests are handled and how the token broker endpoint interacts with authorization.
I will read the next 200 lines of `packages/api/src/routes/server.ts` to inspect the membership sync / ingestion endpoint.
I will read lines 401 to 600 of `packages/api/src/routes/server.ts` to see how the synced membership channels are reconciled and how the response is formulated.
I will read the remaining lines of `packages/api/src/routes/server.ts` to examine the rest of the membership synchronization logic.
I will search for references to `revoke_epoch` to see if setting it back to null on reactivation causes any token verification/revocation issues.
I will search for any references to `revoke_epoch` across the entire workspace to check if it's used elsewhere (e.g. in other packages or queries).
I will read `packages/api/src/middleware/auth.ts` to examine how client-owned token authentication and authorization are performed on API requests.
I will read `packages/api/src/services/tokens.ts` to examine how client-owned token minting, verification, and revocation are implemented.
I will read the top part of `packages/api/src/services/database.ts` to see how `db.query` is implemented and whether it correctly propagates transaction contexts.
I will view the rest of `packages/api/src/services/database.ts` to examine how `setTenantContext` and other RLS context helpers are defined.
I will search for the definition of `is_system_context` to understand how the system context is checked and validated.
I will check `packages/api/src/config/defaults.ts` to see how the broker URL and credentials are configured.
I will search for `brokerUrl` or `broker` in `packages/api/src/config/defaults.ts` to see how the connection string is populated in production or development.
I will read `packages/api/tests/broker-auth.test.ts` to see how the tests configure and execute database operations for broker authentication.
I will view `packages/api/tests/broker-token-mint.test.ts` to see how the token mint endpoint is tested.
I will read `packages/api/tests/broker-membership-sync.test.ts` to examine test cases and behaviors verified for the membership synchronization endpoint.
I will read the top section of `packages/api/src/routes/messages.ts` to see how requests are authenticated and authorized for the messaging route.
I will search for index registration files to see how the middleware is applied across all routes.
I will read lines 101 to 200 of `packages/api/src/index.ts` to see the middleware stack and router mount points.
I will read `packages/api/tests/setup.ts` to see if there are global mocks or configurations that affect the JWT token verification.
I will read `packages/api/vitest.config.ts` to see configuration details for running tests.
I will run the broker token mint tests using the vitest CLI to see if they pass or if we encounter any middleware execution issues.
I will read `packages/api/src/middleware/tenant-context.ts` to see what context setup we might be missing on `/api/server` or if it is handled manually.
I will view the first 100 lines of `packages/api/src/routes/channels.ts` to examine how it handles user scopes (e.g. `chat:read`, `chat:write`) and tenant isolation.
I will view the first 100 lines of `packages/api/src/routes/search.ts` to see what scopes are checked for search requests.
I will read lines 101 to 200 of `packages/api/src/routes/search.ts` to check the actual endpoint handler and its scope checks.
I will read the top section of `packages/api/src/routes/realtime.ts` to examine how realtime subscription authentication is done and how token scopes or tenant isolation are applied.
I will read the remaining lines of `packages/api/src/routes/realtime.ts` to see other realtime channel types and their auth.
I will read the top section of `packages/api/src/routes/uploads.ts` to check upload routes and token/scope verification.
I will read the next 100 lines of `packages/api/src/routes/uploads.ts` to examine the upload endpoints, checking scope and tenant validation.
I will view the first 100 lines of `packages/api/src/routes/presence.ts` to check how it handles user authentication and scopes.
I will read the next 100 lines of `packages/api/src/routes/presence.ts` to see what scope is required for getting presence information.
I will view the first 100 lines of `packages/api/src/routes/receipts.ts` to check how it handles authorization and scopes.
I will view `packages/api/src/services/rate-limit.ts` to examine the rate-limiting mechanism and verify if it has any gaps or configuration vulnerabilities.
I will read the next 150 lines of `packages/api/src/services/rate-limit.ts` to examine how the rate limit decisions are stored and processed.
I will view the rest of `packages/api/src/services/rate-limit.ts` to locate `getDirectRemoteAddress` and understand how connection IPs are resolved.
I will run the membership sync tests to confirm they are passing.
I will run the rest of the broker test suites to ensure they are all green.
I will run the token revocation tests to see if they pass.
I will create a markdown artifact summarizing our defensive production-readiness code review findings. This document categorizes findings by severity and includes file/line references and concrete recommendations.
I have completed the defensive production-readiness code review for the **ChatSDK Client-Owned Token Broker (Slice 3)**.

Detailed results and mitigations are saved in the artifact: [defensive_review_results.md](file:///Users/pushkar/.gemini/antigravity-cli/brain/fb1c0096-5e11-4dc3-b806-aacba90da5d7/defensive_review_results.md).

### Summary of Findings

* **High (1)**:
  * **Database Lock Contention / Serialization Bottleneck** on active channels during user membership sync ([server.ts:L628-643](file:///Users/pushkar/chatsdk/packages/api/src/routes/server.ts#L628-L643)). Updating `member_count` via a synchronous subquery locks the shared channel rows, causing requests to serialize under load and leading to connection pool starvation.
* **Medium (2)**:
  * **Fragile Hono Route Registration Order** ([index.ts:L108-110](file:///Users/pushkar/chatsdk/packages/api/src/index.ts#L108-L110)). Security bypass for server broker routes relies entirely on registration order relative to `app.use('/api/*', authMiddleware)`. Reordering route setups will cause all token broker requests to fail.
  * **Serial DB Connections & Redundant pg_roles Queries** ([database.ts:L174-201](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L174-L201)). Running credentials verify, replay insert, scope checks, and membership updates in separate `withBrokerSystemContext` calls triggers 4 connection checkouts, 4 transactions, and 4 `pg_roles` queries per token request.
* **Low / Operational (4)**:
  * **Inline Asynchronous Replay DB Cleanup** in request thread path ([broker-auth.ts:L394-409](file:///Users/pushkar/chatsdk/packages/api/src/services/broker-auth.ts#L394-L409)).
  * **Missing Password/IAM Config** for the newly created `chatsdk_broker_system` database role ([V014__client_owned_token_broker.sql:L5-11](file:///Users/pushkar/chatsdk/docker/migrations/V014__client_owned_token_broker.sql#L5-L11)).
  * **Unvalidated Foreign Key Constraints** left permanently `NOT VALID` ([V014__client_owned_token_broker.sql:L194-213](file:///Users/pushkar/chatsdk/docker/migrations/V014__client_owned_token_broker.sql#L194-L213)).
  * **Loose Fallback Token User ID Extraction** via string replacement on the token subject claim ([tokens.ts:L354-358](file:///Users/pushkar/chatsdk/packages/api/src/services/tokens.ts#L354-L358)).
