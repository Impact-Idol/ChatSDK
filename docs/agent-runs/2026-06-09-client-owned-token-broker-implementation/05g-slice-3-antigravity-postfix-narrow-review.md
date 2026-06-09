I will start by checking the directory structure and locating the files specified for our review. Let's read these files.
I will now view `packages/api/src/services/database.ts` to inspect the cached broker runtime role verification.
I will view `packages/api/tests/auth-modes.test.ts` next to review the broker bypass regression test.
I will now view `packages/api/tests/database-context.test.ts` to examine the broker role cache regression test.
I will search for route paths matching `/api/server` to understand what handlers are mounted on those paths and what authorization they perform.
I will view `/Users/pushkar/chatsdk/packages/api/src/index.ts` around line 109 to see how the `/api/server` routes are configured.
I will search for the definition of `serverRoutes` to inspect the authorization mechanism used for the server-to-server broker endpoints.
I will view the contents of `packages/api/src/routes/server.ts` to see what authentication is applied to `/api/server` routes.
I will view `/Users/pushkar/chatsdk/packages/api/src/services/broker-auth.ts` to examine broker request authentication.
I will search for `withTenantContext` within `/Users/pushkar/chatsdk/packages/api/src/routes/server.ts` to understand how tenant contexts are handled on broker routes.
I will search for `db.` calls in `packages/api/src/routes/server.ts` to see how database contexts are established during broker operations.
I will view lines 315 to 460 of `/Users/pushkar/chatsdk/packages/api/src/routes/server.ts` to examine the scope of database operations and contexts.
I will search for all route registrations (e.g. `serverRoutes.post`, `serverRoutes.get`, `serverRoutes.put`, etc.) in `packages/api/src/routes/server.ts` to verify that all of them enforce authentication.
I will search for any occurrences of `serverRoutes` in `/Users/pushkar/chatsdk/packages/api/src/routes/server.ts` to locate the endpoint mappings.
I will view the second route registration in `packages/api/src/routes/server.ts` starting at line 240.
I will search for `brokerSystem` in the codebase to see if it is used anywhere.
I will view lines 415 to 455 of `packages/api/src/routes/metrics.ts` to see what is being checked with `brokerSystem`.
I will search for `is_broker_system_context` to understand how the database RLS policies determine if a query is executing within the broker system context.
I will run a search across the entire project for `is_broker_system_context` to find its definition or usage in migrations/setup.
I will view the SQL migration file where `chatsdk.is_broker_system_context()` is defined to see the exact checks.
I will view the rest of the `V014__client_owned_token_broker.sql` migration file to see if `is_broker_system_context` function was redefined or if any overrides exist.
I will view the end of `V014__client_owned_token_broker.sql` to check for any overrides of `is_broker_system_context()`.
I will search the tests folder for database configurations to see if a real database is spun up and if `brokerUrl` is defined.
I will view `packages/api/src/config/defaults.ts` around line 234 to see the defaults configuration for the database.
I will check how database and broker authentication are mocked/configured in the broker-token-mint tests.
I will search for `DEV_DEFAULTS` in `packages/api/src/config/defaults.ts` to see what configuration is used for local development database URLs.
I will view lines 20 to 50 of `packages/api/src/config/defaults.ts` to examine the default database values.
I will search for `BROKER_DATABASE_URL` to see if there is any docker-compose or environment file where it is set for developers.
I will search for `ROW LEVEL SECURITY` or `FORCE` in the migration SQL file to check if RLS is enabled or forced.
I will search for `chatsdk_broker_system` in the codebase to see how it is referenced and if there are configuration files setting passwords or environment variables for it.
I will list files in the implementation docs folder to see previous reviews and plans.
I will view the previous narrow review file to see what was discussed or noted.
I will view the file `05f-slice-3-antigravity-final-defensive-review.md` to check its contents and findings.
I will view `/Users/pushkar/chatsdk/packages/api/src/index.ts` from lines 130 to 180 to inspect the middleware stack on `/api/*` routes.
I will view `/Users/pushkar/chatsdk/packages/api/src/middleware/tenant-context.ts` to see what `tenantContextMiddleware` does and if it is bypassed or affects `/api/server` routes.
I have completed the defensive, narrow production-readiness code review for the client-owned token broker changes and tests.

### Summary of Findings
* **Critical**: No findings.
* **High**: No findings.
* **Medium**: 2 findings (detailed below).

---

### Medium Findings

#### 1. Correctness: Dead Path in Context Switching Guard
* **File/Line**: [database.ts:L139](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L139) inside [withTenantContext](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L126)
* **Details**:
  In [withTenantContext](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L126), the code performs a safety check against active broker DB contexts:
  ```typescript
  if ((existing.tenant as TenantDbContext & { brokerSystem?: boolean }).brokerSystem !== undefined) {
    throw new Error('Invalid broker DB context marker in tenant context');
  }
  ```
  However, in [withBrokerSystemContext](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L176), the broker context is initialized and stored as:
  ```typescript
  const result = await dbContext.run(
    {
      client,
      tenant: { system: true },
      brokerClient: true, // Marker is at root-level of DbAsyncContext
    },
    fn
  );
  ```
  Because `brokerClient: true` is set at the root level of `DbAsyncContext` and the `tenant` object is set to `{ system: true }` (which does not contain the `brokerSystem` property), `existing.tenant.brokerSystem` will always evaluate to `undefined`. This makes the check a dead path that fails to detect and block nested tenant context switches when running under an active broker DB context.
* **Recommendation**: Update the verification check to verify `existing.brokerClient === true` instead of checking `existing.tenant.brokerSystem`.

#### 2. Environment Incompatibility: Missing Development/Test Bypass for Broker Runtime Role Check
* **File/Line**: [database.ts:L213-L233](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L213-L233) inside [assertBrokerRuntimeRole](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L213)
* **Details**:
  The function [assertBrokerRuntimeRole](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L213) enforces that the database runtime user must be strictly `chatsdk_broker_system` and cannot be a superuser or have `BYPASSRLS`. Unlike the tenant role check [assertRlsRuntimeRole](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L287), there is no early exit or bypass in [assertBrokerRuntimeRole](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L213) for non-production environments.
  Because the default database configuration in local development (`usesLocalDefaults = true`) connects as the standard `chatsdk` database owner, executing any broker-level routes locally (e.g. `/api/server/...` handlers that call [withBrokerSystemContext](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L176)) will fail with a role verification error by default unless the developer manually overrides and configures `BROKER_DATABASE_URL` with separate credentials.
* **Recommendation**: Introduce a development/test bypass to [assertBrokerRuntimeRole](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L213) matching the one in [assertRlsRuntimeRole](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L287):
  ```typescript
  if (!appConfig.isProduction && process.env.REQUIRE_RLS_ROLE_CHECK !== 'true') {
    return;
  }
  ```

---

### Test Coverage & Route-Order Verification
* **Bypass Middleware Logic**: The explicit bypass in [auth.ts:L61](file:///Users/pushkar/chatsdk/packages/api/src/middleware/auth.ts#L61) using [isServerBrokerPath](file:///Users/pushkar/chatsdk/packages/api/src/middleware/auth.ts#L96) is correct and robust. The regression test in [auth-modes.test.ts:L238](file:///Users/pushkar/chatsdk/packages/api/tests/auth-modes.test.ts#L238) verifies this behavior by testing a route mounted downstream from the auth middleware, confirming no authentication context is populated on bypassed routes.
* **Caching Verification**: The caching of the role check results within the pool lifetime via module-scoped variables (`brokerRuntimeRoleVerified` and `brokerRuntimeRoleVerification`) in [database.ts](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts) is implemented correctly. The regression test in [database-context.test.ts:L202](file:///Users/pushkar/chatsdk/packages/api/tests/database-context.test.ts#L202) correctly asserts that the verification query executes exactly once across multiple invocations.
