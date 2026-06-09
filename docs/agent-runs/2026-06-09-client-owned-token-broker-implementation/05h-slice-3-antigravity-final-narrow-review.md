I will check the directory layout and locate the specific files mentioned in the prompt.
I will read the contents of [database.ts](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts) to examine the database services, context implementation, and tenant checks.
I will now read the contents of [database-context.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/database-context.test.ts) to examine the test coverage for the database tenant context and broker context.
I will run a search for `brokerUrl` to understand how the broker connection and username are configured across the codebase.
I will view the configuration defaults in [defaults.ts](file:///Users/pushkar/chatsdk/packages/api/src/config/defaults.ts) around line 234.
I will search for `.on('error'` across the codebase to see if there is any pool error handling implementation elsewhere.
I will run a search for `isProduction` in `defaults.ts` to see how production environments are identified.
Based on a defensive final code review of the database context and runtime role assertion logic in [database.ts](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts) and its accompanying tests in [database-context.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/database-context.test.ts), here are the identified production correctness, security, and test gaps.

---

### High Severity Findings

#### 1. Security / Context Bypass: `withIsolatedTenantContext` Escapes Broker Context
* **Location:** [database.ts:L168-L173](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L168-L173)
* **Description:** The [withIsolatedTenantContext](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L168-L173) function uses `dbContext.exit(() => this.withTenantContext(tenant, fn))` to escape the active context. This design allows it to clear the store completely. However, if it is called nested within [withBrokerSystemContext](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L179-L207), the store is cleared before entering `withTenantContext`. Consequently, the guard check that blocks tenant contexts inside an active broker context (`existing.brokerClient === true`) is completely bypassed. This lets broker-layer code escape to run queries using connections from the regular database pool (`pool`) under a tenant or system identity, which could bypass broker-specific RLS restrictions or privilege limits.
* **Recommendation:** Assert that the active context is not a broker context prior to calling `dbContext.exit(...)`:
  ```typescript
  const existing = dbContext.getStore();
  if (existing?.brokerClient === true) {
    throw new Error('Cannot switch tenant DB context inside an active broker DB context');
  }
  return dbContext.exit(() => this.withTenantContext(tenant, fn));
  ```

---

### Medium Severity Findings

#### 2. Security / Context Bypass: Privilege Escalation via Explicit `undefined` Values
* **Location:** [database.ts:L145-L161](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L145-L161)
* **Description:** When evaluating if tenant properties have changed, the check for `userChanged` only triggers if the requested property is not `undefined`:
  ```typescript
  const userChanged =
    tenant.userId !== undefined &&
    tenant.userId !== existing.tenant.userId;
  ```
  If a caller explicitly passes `userId: undefined` (e.g. `{ appId: 'app-1', userId: undefined }`), `userChanged` evaluates to `false`, bypassing the check. However, the subsequent merge `const merged = { ...existing.tenant, ...tenant }` overwrites the active user ID with `undefined`. This allows a restricted user context to elevate to a tenant-scoped system context, which could bypass user-specific RLS policies.
* **Recommendation:** Instead of checking if incoming properties are not `undefined`, perform a comparison between the `merged` object and `existing.tenant` for all keys:
  ```typescript
  const merged = { ...existing.tenant, ...tenant };
  if (
    merged.appId !== existing.tenant.appId ||
    merged.userId !== existing.tenant.userId ||
    (tenant.system !== undefined && merged.system !== existing.tenant.system)
  ) {
    throw new Error('Cannot switch tenant DB context inside an active request context');
  }
  ```

#### 3. Production Correctness: Hardcoded Broker Username (`chatsdk_broker_system`)
* **Location:** [database.ts:L234-L236](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L234-L236)
* **Description:** In [assertBrokerRuntimeRole](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L216-L240), the database runtime role username is hardcoded:
  ```typescript
  if (role.current_user !== 'chatsdk_broker_system') {
    throw new Error('Broker database runtime role must be chatsdk_broker_system');
  }
  ```
  In cloud/managed database environments (e.g. AWS RDS, GCP Cloud SQL, Supabase, Heroku), runtime usernames are typically predetermined, randomized, or prefix/suffix-bound. This check will cause startup or query execution to crash on deployments using custom broker usernames.
* **Recommendation:** Align the broker role assertion with [assertRlsRuntimeRole](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L294-L318), verifying only structural role privileges (e.g., that it is not a superuser and does not bypass RLS), or parse and compare the expected username dynamically from the configured `brokerUrl` / `database.url`.

#### 4. Production Stability: Unhandled Idle Database Client Errors
* **Location:** [database.ts:L51](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L51) & [database.ts:L211](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L211)
* **Description:** Neither the main DB pool (`pool`) nor the broker pool (`brokerPool`) registers an `'error'` listener. In pg pools, if an idle connection experiences a network dropout or database restart, pg emits an `'error'` event on the Pool instance. Lacking a registered listener, Node.js treats this as an unhandled error and terminates the process, causing sudden container/service restarts.
* **Recommendation:** Register error handlers immediately after initializing each pool:
  ```typescript
  pool.on('error', (err) => {
    // Log error cleanly, preventing unhandled exception crash
  });
  ```

---

### Low Severity Findings

#### 5. Code Correctness: Redundant ROLLBACK on Verification Failure
* **Location:** [database.ts:L187](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L187) & [database.ts:L201](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L201)
* **Description:** In [withBrokerSystemContext](file:///Users/pushkar/chatsdk/packages/api/src/services/database.ts#L179-L207), `ensureBrokerRuntimeRoleVerified(client)` is invoked before `client.query('BEGIN')`. If the role verification fails, it throws an error and hits the `catch` block which runs `await client.query('ROLLBACK')`. This generates a warning or secondary database error because no transaction block had started.
* **Recommendation:** Move role verification out of the transaction block or track transaction state to only issue `ROLLBACK` if `BEGIN` succeeded.

---

### Test Coverage Gaps

#### 6. Missing Test Coverage for Context Escapes and Parameter Overwrites
* **Location:** [database-context.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/database-context.test.ts)
* **Description:**
  * No test verifies that using `withIsolatedTenantContext` inside `withBrokerSystemContext` is blocked.
  * No test verifies that explicitly passing `{ userId: undefined }` to bypass the `userChanged` check throws an error.
  * No test asserts the failure path for `assertRlsRuntimeRole` or role checking logic when `REQUIRE_RLS_ROLE_CHECK` is enabled in non-production.

#### 7. Fragile Pool Cleanup in Tests
* **Location:** [database-context.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/database-context.test.ts)
* **Description:** The test file imports the service and runs `await closeDB()` manually inside each individual `it` block. If any assertion throws earlier, `closeDB()` is skipped, leaving the connection pool open and module state dirty for subsequent tests.
* **Recommendation:** Move cleanup logic into a central `afterEach` or `afterAll` hook using Vitest's hooks.
