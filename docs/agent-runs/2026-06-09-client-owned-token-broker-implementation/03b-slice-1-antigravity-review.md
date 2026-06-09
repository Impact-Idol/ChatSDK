# Adversarial Security Review: Client-Owned Token Broker (Slice 1)

This report details security findings from an adversarial review of the Slice 1 implementation (schema, config, readiness) for the client-owned token broker hardening goal in ChatSDK.

---

## Executive Summary

Several **Critical** and **High** blockers remain in the schema and readiness configurations. Production readiness is blocked until these issues are addressed.

### Blocker Status
> [!WARNING]
> **Critical and High blockers remain.** Specifically, the RLS policy on the membership state table allows tenant-level write access, the audit log table is vulnerable to unauthenticated storage exhaustion, and deleted credentials leave orphaned active sessions.

---

## Detailed Findings

### CRITICAL FINDINGS

#### 1. Tenant-Level Write Access Allowed on `broker_membership_state` via Loose RLS Policy
*   **Vulnerability Type:** Row Level Security (RLS) Bypass / Privilege Escalation
*   **Target:** `docker/migrations/V014__client_owned_token_broker.sql` (Lines 188-195, 206-210)
*   **Description:**
    The `broker_membership_state` table uses the general `enable_app_rls_if_needed` helper, which sets the policy:
    ```sql
    USING (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context())
    WITH CHECK (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context())
    ```
    Since the API server connects to the database using a single shared database user role (e.g., `chatsdk_app`) and isolates tenant requests using session variables (`app.current_app_id`), any client request running in a valid app context can perform INSERT, UPDATE, and DELETE operations on this table.
*   **Impact:**
    A malicious app client (or an attacker exploiting a SQL injection vulnerability in a client-facing endpoint) can bypass the token broker membership sync logic entirely. They can directly modify, delete, or inject membership states (e.g., marking suspended users as `active`, altering `fresh_until` timestamps, or hijacking other user profiles in the same app).
*   **Recommended Fix:**
    Restrict write operations (INSERT, UPDATE, DELETE) on `broker_membership_state` strictly to the system context. Normal app contexts should only be allowed SELECT operations (if any).
    ```sql
    ALTER TABLE broker_membership_state ENABLE ROW LEVEL SECURITY;
    ALTER TABLE broker_membership_state FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS broker_membership_state_app_isolation ON broker_membership_state;

    CREATE POLICY broker_membership_state_select ON broker_membership_state
      FOR SELECT
      USING (app_id = chatsdk.current_app_id() OR chatsdk.is_system_context());

    CREATE POLICY broker_membership_state_modify ON broker_membership_state
      FOR ALL
      USING (chatsdk.is_system_context())
      WITH CHECK (chatsdk.is_system_context());
    ```

---

### HIGH FINDINGS

#### 2. Unauthenticated Storage Exhaustion (DoS) in `broker_mint_audit`
*   **Vulnerability Type:** Denial of Service (DoS) via Database Bloating
*   **Target:** `docker/migrations/V014__client_owned_token_broker.sql` (Lines 78-97)
*   **Description:**
    The `broker_mint_audit` table records all token minting attempts (including failures and denials). Several columns (`user_id`, `denial_reason`, `request_id`, `external_request_id`, `trace_id`, `user_agent`) are defined as unlimited `TEXT` or lack length check constraints. When an authentication attempt fails or is denied, the application writes an audit row containing parameters supplied directly by the client (such as `user_id`, `external_request_id`, `user_agent`).
*   **Impact:**
    An unauthenticated external attacker can flood the token broker endpoint with thousands of invalid requests containing extremely large payloads (e.g., megabytes of garbage text in the `user_agent` or `user_id` fields). The database will write these entries to `broker_mint_audit`, quickly exhausting disk space and causing a Denial of Service.
*   **Recommended Fix:**
    Add CHECK constraints to limit the size of all client-provided fields in the `broker_mint_audit` schema:
    ```sql
    ALTER TABLE broker_mint_audit
      ADD CONSTRAINT chk_broker_mint_audit_lengths CHECK (
        length(user_id) <= 255 AND
        length(external_tenant_id) <= 255 AND
        length(denial_reason) <= 1024 AND
        length(request_id) <= 255 AND
        length(external_request_id) <= 255 AND
        length(trace_id) <= 255 AND
        length(user_agent) <= 512 AND
        cardinality(requested_scopes) <= 50 AND
        cardinality(granted_scopes) <= 50
      );
    ```

#### 3. Orphaned Active Sessions Remain Valid After Credential Deletion
*   **Vulnerability Type:** Improper Credential Revocation / Grace Period Bypass
*   **Target:** `docker/migrations/V014__client_owned_token_broker.sql` (Lines 150)
*   **Description:**
    In `V014`, the `broker_credential_id` column added to `auth_session` is configured with `ON DELETE SET NULL`:
    ```sql
    ADD COLUMN IF NOT EXISTS broker_credential_id UUID REFERENCES broker_credential(id) ON DELETE SET NULL
    ```
*   **Impact:**
    If a broker credential is compromised and deleted by an administrator, the `broker_credential_id` on all active sessions issued by that credential will be set to `NULL`, but the sessions themselves remain active and valid. The attacker's active sessions will survive key deletion, and the audit trail link to the deleted credential is lost, preventing post-compromise cleanup.
*   **Recommended Fix:**
    Change the foreign key constraint to `ON DELETE CASCADE` so that deleting a compromised credential immediately invalidates all active sessions associated with it:
    ```sql
    ALTER TABLE auth_session
      DROP CONSTRAINT IF EXISTS auth_session_broker_credential_id_fkey,
      ADD CONSTRAINT auth_session_broker_credential_id_fkey
        FOREIGN KEY (broker_credential_id) REFERENCES broker_credential(id) ON DELETE CASCADE;
    ```

---

### MEDIUM FINDINGS

#### 4. Replay Cache Bypass in `broker_jwt_replay` Primary Key
*   **Vulnerability Type:** Cryptographic Replay Protection Bypass
*   **Target:** `docker/migrations/V014__client_owned_token_broker.sql` (Lines 105-113)
*   **Description:**
    The plan specified a primary key of `(credential_id, jti)`. The implementation changed this to `PRIMARY KEY (credential_id, audience, environment, jti)`.
*   **Impact:**
    Because `audience` and `environment` are part of the primary key, the database allows the exact same JWT (`jti`) to be accepted multiple times if the target environment or audience changes. If a client credential is misconfigured or shared between staging and production, an attacker can intercept a token meant for staging and replay it against the production environment.
*   **Recommended Fix:**
    Restore the stricter primary key to enforce absolute JTI uniqueness per credential:
    ```sql
    ALTER TABLE broker_jwt_replay
      DROP CONSTRAINT IF EXISTS broker_jwt_replay_pkey,
      ADD PRIMARY KEY (credential_id, jti);
    ```

#### 5. Fragile Migration Version Casting in Readiness Checks
*   **Vulnerability Type:** Deployment Block / Readiness False Positive
*   **Target:** `packages/api/src/routes/metrics.ts` (Lines 342-346, 372-376)
*   **Description:**
    In the readiness endpoints, the database checks `MAX(version::int)` against `flyway_schema_history` to verify if V014 and V013 migrations are applied.
*   **Impact:**
    Flyway supports arbitrary string version schemes (e.g., `'14.1'`, `'14.0.1'`, or custom hotfix identifiers). If any migration is applied with a dot or non-numeric character in its version, the database will throw an `invalid input syntax for type integer` exception. This will crash the `/ready` check, causing Kubernetes to report the service as unhealthy and block rolling deployments.
*   **Recommended Fix:**
    Sort using the native `installed_rank` column and parse the version string safely in the application:
    ```typescript
    const result = await db.query<{ version: string }>(
      `SELECT version
       FROM flyway_schema_history
       WHERE success = true
       ORDER BY installed_rank DESC
       LIMIT 1`
    );
    const latestVersion = parseFloat(result.rows[0]?.version ?? '0');
    ```

---

### LOW FINDINGS

#### 6. Missing Consistency Constraints on `broker_membership_state`
*   **Vulnerability Type:** Database Integrity Inconsistency
*   **Target:** `docker/migrations/V014__client_owned_token_broker.sql` (Lines 136-139)
*   **Description:**
    The CHECK constraint:
    ```sql
    CHECK (
      (status IN ('removed', 'disabled', 'suspended') AND tombstoned_at IS NOT NULL)
      OR status = 'active'
    )
    ```
    allows a user to have `status = 'active'` while still having a non-null `tombstoned_at` timestamp.
*   **Impact:**
    Allows inconsistent records where a user is marked active but has residual tombstone timestamps, potentially causing logic bugs in downstream sync layers.
*   **Recommended Fix:**
    Tighten the check constraint:
    ```sql
    CHECK (
      (status IN ('removed', 'disabled', 'suspended') AND tombstoned_at IS NOT NULL)
      OR (status = 'active' AND tombstoned_at IS NULL)
    )
    ```

#### 7. Lack of Scope Restriction Constraints in `broker_app_scope`
*   **Vulnerability Type:** Privilege Escalation / Data Integrity
*   **Target:** `docker/migrations/V014__client_owned_token_broker.sql` (Lines 51-73)
*   **Description:**
    There are no database-level constraints checking that `allowed_scopes` or `default_scopes` contain only valid system scopes, nor is there a check ensuring `default_scopes` is a subset of `allowed_scopes`.
*   **Impact:**
    A compromised or misconfigured credential management handler could insert arbitrary high-privilege scopes (e.g., `'*'`, `'admin'`), which could lead to privilege escalation if trusted by the application.
*   **Recommended Fix:**
    Add check constraints:
    ```sql
    CHECK (allowed_scopes <@ ARRAY['chat:read', 'chat:write', 'reaction:write', 'typing:write', 'upload:write', 'search:read']::text[]),
    CHECK (default_scopes <@ allowed_scopes)
    ```

#### 8. Missing Length Constraints on Configuration Tables
*   **Vulnerability Type:** Input Validation / Database Bloating
*   **Target:** `docker/migrations/V014__client_owned_token_broker.sql` (Lines 5-46)
*   **Description:**
    Columns such as `broker_client.slug`, `broker_client.name`, `broker_credential.kid`, and `mtls_certificate_sha256` lack length limits or format checks.
*   **Impact:**
    Allows excessively large strings to be stored in configuration fields, which could be abused to bloat indexes or break UI layout.
*   **Recommended Fix:**
    Add length constraints:
    ```sql
    CHECK (length(slug) <= 64),
    CHECK (length(name) <= 255),
    CHECK (length(kid) <= 255),
    CHECK (mtls_certificate_sha256 ~ '^[0-9a-fA-F]{64}$')
    ```
