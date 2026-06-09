# Slice 1 GPT-5.5 High Adversarial Review

## Findings

### Critical: system-only broker RLS is spoofable by SQL-capable runtime compromise

The first V014 draft gated broker control-plane tables on `chatsdk.is_system_context()`. If arbitrary SQL executes under the normal app DB role, an attacker could set the custom GUC and read/write broker credentials, scope, replay state, and audit.

Recommended fix:

- Make broker system context non-spoofable through a separate broker/system DB role or pool.
- Require a role check in broker-only RLS policies.
- Ensure normal tenant/runtime roles cannot satisfy broker system policies.

Resolution:

- Added `chatsdk.is_broker_system_context()`, requiring both `chatsdk.is_system_context()` and `current_user = 'chatsdk_broker_system'`.
- Broker control-plane RLS policies now use `chatsdk.is_broker_system_context()`.
- Future broker write paths must use a dedicated broker system DB connection/role.

### High: `/ready` can green-light unsafe broker RLS

The first readiness draft checked only table existence plus `relrowsecurity` and `relforcerowsecurity`. It could miss permissive policies, wrong policy bodies, or shadow relations outside `public`.

Resolution:

- Broker readiness now checks public regular tables through `pg_class`/`pg_namespace`.
- Broker readiness checks exact successful V014.
- Broker readiness inspects `pg_policy` for expected broker policies and fails on extra or unsafe policies.
- Added a regression test for an extra permissive broker policy.

### High: DB does not enforce credential-to-app authority

`broker_app_scope` defined credential app authority, but `auth_session` and `broker_membership_state` could independently reference credentials and apps.

Resolution:

- Added composite FKs tying `(broker_credential_id, app_id)` on `auth_session` to `broker_app_scope`.
- Added composite FK tying `(synced_by_credential_id, app_id)` on `broker_membership_state` to `broker_app_scope`.
- Added FK tying `(broker_credential_id, broker_client_id)` to `broker_credential(id, client_id)`.

### High: broker audit is not tamper-resistant

The first audit draft used `ON DELETE SET NULL` and allowed update/delete through system policy.

Resolution:

- Changed broker audit FKs to `ON DELETE RESTRICT`.
- Added immutable denormalized `client_slug` and `credential_kid`.
- Added append-only trigger blocking `UPDATE` and `DELETE` on `broker_mint_audit`.

### Medium: broker scope rows can encode unsafe authority

The first draft did not constrain scopes or wildcard origins.

Resolution:

- Added `allowed_scopes` known-scope check.
- Added `default_scopes <@ allowed_scopes`.
- Added wildcard-origin rejection.

### Medium: migration/readiness can miss drift or partial manual state

The first readiness draft used max integer Flyway version and did not inspect policies.

Resolution:

- Broker readiness now requires exact successful V014.
- Lifecycle readiness now requires exact successful V013 instead of integer casting.
- Broker readiness checks RLS policy names, commands, and expressions.

### Medium: production config permits risky transport/parse misconfiguration

Resolution:

- Production validation rejects `DATABASE_SSL=false` unless explicitly waived with `ALLOW_INSECURE_DATABASE_TRANSPORT=true`.
- Server mint lifetime parsing is strict numeric parsing, so malformed values such as `60junk` fail.
