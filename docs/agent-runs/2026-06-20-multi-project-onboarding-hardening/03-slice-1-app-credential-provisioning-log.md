# Slice 1 App and Credential Provisioning Log

Date: 2026-06-20
Status: complete

## Scope

Implement the first operator workflow for project/app provisioning without relying on the demo/default `001` app or the legacy admin secret-returning route shape.

## Files Changed

- `scripts/ops/provision-project.mjs`
- `package.json`
- `packages/api/tests/project-provisioning.test.ts`
- `packages/api/src/routes/admin.ts`

## Implementation Summary

- Added `npm run ops:provision:project`.
- Added `scripts/ops/provision-project.mjs` with `create`, `show`, and `rotate-key` commands.
- Provisioning records project metadata under `app.settings.provisioning`:
  - slug
  - environment
  - origins
  - browser scopes
  - managed-by marker
- Server credentials are created in `app_api_key`, not by encouraging use of the primary `app.api_key`.
- `show` output is redacted and does not include plaintext keys.
- Plaintext key output is opt-in with `--emit-secret`; default command output suppresses plaintext and prints a warning when a new key was created.
- Create and rotate operations run inside transactions.
- Create and rotate take a project-scoped PostgreSQL advisory transaction lock to reduce duplicate app/key races when an operator runs the same command concurrently.
- Fixed the legacy admin route schema mismatch from `secret_key` to `api_secret`.
- Redacted `GET /admin/apps/:id` primary key/secret output instead of returning plaintext values on read.
- Changed `POST /admin/apps` to create an `app_api_key` row and return that key once, instead of only creating a primary `app.api_key`.
- Changed `PATCH /admin/apps/:id` settings updates to JSONB-merge incoming settings so project provisioning metadata is not wiped.
- Deprecated `POST /admin/apps/:id/regenerate-key` with `410 Gone` because it rotated the primary `app.api_key`, not the new app-scoped server key store.
- Preserved existing project `origins` and `browserScopes` on idempotent CLI `create` reruns when those flags are omitted.
- Added constant-time admin key comparison with `crypto.timingSafeEqual`.
- Made CLI `rotate-key` fail when the named active key does not exist instead of silently creating a new unrelated key.

## Verification

Passed:

```bash
npm --workspace @chatsdk/api test -- --run tests/project-provisioning.test.ts
```

Result: 8 tests passed.

Passed:

```bash
node scripts/ops/provision-project.mjs help
```

Passed:

```bash
npm run ops:provision:project -- help
```

Blocked by pre-existing unrelated type error:

```bash
npm --workspace @chatsdk/api run typecheck
```

Failure:

```text
src/routes/users.ts(550,25): error TS2345: Argument of type 'QueryResultRow' is not assignable ...
```

This slice did not modify `packages/api/src/routes/users.ts`.

## Review Evidence

Explorer review completed via sub-agent `019ee75c-fb2c-72e3-828b-a97ae660d63d`.

Key findings incorporated:

- `app` schema uses `api_secret`, while old admin routes referenced `secret_key`.
- `app_api_key` is the right target for project-scoped server keys.
- Existing auth middleware already accepts active `app_api_key` rows.
- Broker provisioning belongs in later slices targeting `broker_client`, `broker_credential`, and `broker_app_scope`.

Antigravity adversarial review completed. Artifact:

```text
/Users/pushkar/.gemini/antigravity-cli/brain/8b31569c-71b1-4b80-bca6-0193eecad037/adversarial_review_slice1.md
```

Findings addressed in this slice:

- Wrapped create/rotation in transactions.
- Added advisory transaction lock for project provisioning/rotation.
- Made plaintext output opt-in via `--emit-secret`.
- Fixed broken `secret_key` admin route references.
- Added parser and rotation tests.
- Aligned old admin app creation with `app_api_key`.
- Deprecated old primary app key regeneration route.
- Preserved provisioning metadata during admin settings updates.
- Preserved existing project origins/scopes during idempotent CLI reruns.
- Added timing-safe admin key comparison.
- Added rotation typo protection.

Post-fix Claude and Antigravity narrow rereviews were run after the initial fixes. They found additional old-admin-route drift, idempotent rerun metadata wipeout, timing-safe admin auth, and rotation typo risks, which were addressed as above.

Final blocker-only Claude rereview result:

```text
None. All checked blocker areas are clean:
- idempotent create preserves origins/scopes
- admin auth uses timingSafeEqual
- rotate-key fails on bad key names
- transactions and advisory locks serialize project operations
- plaintext key output is suppressed by default
```

## Residual Risks and Follow-Ups

- Resolved in the final hardening pass: app-scoped keys now store/authenticate through `app_api_key.api_key_hash`; project `show` reports a non-secret hash fingerprint instead of plaintext.
- Resolved in the final hardening pass: primary `app.api_key` auth fallback is disabled by default and gated behind `CHATSDK_ENABLE_PRIMARY_APP_KEY_AUTH=true`.
- `app.settings.provisioning.origins` and `browserScopes` are metadata only in Slice 1. Slice 2/4 must bind these to broker scope provisioning and smoke validation.
- The legacy admin route remains broad and should get dedicated admin-route tests or deeper deprecation in a later hardening pass.
- Admin list pagination and UUID parameter validation remain medium follow-ups.
