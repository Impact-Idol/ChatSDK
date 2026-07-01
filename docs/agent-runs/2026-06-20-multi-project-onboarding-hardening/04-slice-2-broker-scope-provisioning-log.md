# Slice 2 Broker Scope Provisioning Log

Date: 2026-06-20
Status: complete

## Scope

Extend the project provisioning workflow so an operator can create or update the client-owned broker control-plane rows for a project app.

## Files Changed

- `scripts/ops/provision-project.mjs`
- `packages/api/src/middleware/auth.ts`
- `packages/api/src/services/broker-auth.ts`
- `packages/api/src/routes/users.ts`
- `packages/api/tests/project-provisioning.test.ts`
- `packages/api/tests/auth-modes.test.ts`
- `packages/api/tests/broker-auth.test.ts`
- `packages/api/tests/broker-token-mint.test.ts`
- `packages/api/tests/durable-realtime-routes.test.ts`
- `packages/api/tests/member-role-update.test.ts`
- `packages/api/tests/private-data-auth.test.ts`

## Implementation Summary

- Added `provision-broker` command to `scripts/ops/provision-project.mjs`.
- Added broker input normalization and validation for broker client slug/name, RS256 credential `kid`, tenant/user/channel constraints, exact origins, default/allowed scopes, max token TTL, and max membership fanout.
- Added RS256 key-pair generation for new broker credentials.
- Stores only the public JWK in `broker_credential.public_key_jwk`.
- Emits private JWK only when `--emit-secret` is passed; default output suppresses it.
- Upserts `broker_client`, `broker_credential`, and `broker_app_scope` inside the existing project transaction/advisory lock.
- Rejects wildcard broker origins, origins with path/trailing slash, unsupported scopes, and `channel:create` in broker scopes.
- Preserves existing broker scope arrays when CLI flags are omitted.
- Refuses to reactivate suspended broker clients, disabled broker credentials, and disabled broker app scopes.
- Runtime broker membership scope checks now fail closed when tenant/user/channel constraint arrays are empty.
- Broker-scoped user tokens are route-scoped; malformed broker tokens without scopes fail closed on broker-managed routes, while legacy first-party tokens remain governed by route/business authorization.
- App API key auth now hashes incoming keys and looks up `app_api_key.api_key_hash` rows by default; primary `app.api_key` fallback is available only with `CHATSDK_ENABLE_PRIMARY_APP_KEY_AUTH=true`.
- Fixed the prior `users.ts` CTE row typing issue so API typecheck passes.
- Keeps seeded project A/B broker scopes isolated by app ID, tenant ID, user prefixes, and channel prefixes in focused tests.

## Verification

Passed:

```bash
npm --workspace @chatsdk/api test -- --run tests/project-provisioning.test.ts tests/broker-auth.test.ts tests/broker-token-mint.test.ts tests/broker-membership-sync.test.ts
```

Result: 4 test files passed, 38 tests passed.

Passed:

```bash
npm --workspace @chatsdk/api run typecheck
```

Passed:

```bash
npm --workspace @chatsdk/api test -- --run
```

Result: 32 test files passed, 2 skipped; 282 tests passed, 7 skipped.

Passed:

```bash
node scripts/ops/provision-project.mjs help
```

## Seeded Test Data

Focused tests exercise deterministic seed names and boundaries:

- `seed-project-a-dev`
- `seed-project-b-dev`
- `seed-project-a-development`
- `seed-project-b-development`
- tenant IDs `tenant-a` and `tenant-b`
- user/channel prefixes `seed-a-` and `seed-b-`

The tests assert that Project B broker scope writes Project B's app ID and Project B-specific tenant/user/channel prefixes, rather than accidentally reusing Project A values.

## Review Evidence

Claude and Antigravity both completed narrow post-fix adversarial rereviews.

- Antigravity final verdict: no unresolved critical/high findings.
- Claude final verdict: all critical/high findings resolved.
- Both reviewers previously identified empty-array broker constraints as fail-open; this is fixed in runtime and provisioning tests.
- Claude noted `upsertBrokerAppScope` still hard-coded `status = 'active'` on conflict as a medium structural risk; this was tightened to preserve `broker_app_scope.status`.

## Residual Risks and Follow-Ups

- Live seeded DB validation is not run yet; Slice 4 must run the end-to-end smoke against local or LAN services when available.
- Broker origin allowlists are only enforced when an `Origin` header is present. This is acceptable for current server-to-server broker usage, but projects that treat origin as a mandatory security boundary need an explicit `require_origin` style policy.
- DB-level defense-in-depth constraints are still weaker than runtime/CLI checks. Future migration can add cardinality checks for broker constraint arrays and stronger wildcard-origin checks.
- Broker credential rotation is not implemented yet; provisioning a new `kid` creates a new credential, but old credential retirement should become a later operator command.
