# Final Adversarial Review Resolution

Date: 2026-06-21
Status: post-blocker fixes verified locally and externally reviewed
Recommendation: GO

## Prior NO-GO Findings

Claude's final all-slices review returned NO-GO on two high-severity blockers:

1. `app_api_key` stored and authenticated plaintext server API keys.
2. `requireScope` allowed legacy/unscoped user tokens through scoped routes.

Antigravity's earlier GO artifact also noted two medium findings that overlapped the same area:

- plaintext app-scoped API key storage
- optional `displayName` omission overwriting an existing app-user display name with `userId`

## Resolution Applied

- Added SHA-256 API key hashing via `hashApiKey`.
- Changed `app_api_key` migration shape to use `api_key_hash` for new app-scoped keys.
- Changed admin app creation and project provisioning to insert `api_key_hash`, not plaintext keys.
- Changed API-key authentication to hash incoming `X-API-Key` values before lookup.
- Kept legacy primary `app.api_key` auth disabled by default and gated behind `CHATSDK_ENABLE_PRIMARY_APP_KEY_AUTH=true`.
- Changed `requireScope` to fail closed for user auth contexts that lack the requested scope.
- Narrowed `brokerScopedRouteGuard` to actual broker tokens, so first-party scoped user tokens are not accidentally treated as broker-restricted.
- Added `chat:read` to signed media-token auth contexts so stricter scope enforcement does not break media-token reads.
- Fixed membership sync so omitted `displayName` preserves `app_user.name`.
- Updated stale tests that minted legacy unscoped browser tokens for scoped write routes.

## Verification

Passed:

```bash
npm --workspace @chatsdk/api test -- --run tests/auth-modes.test.ts tests/project-provisioning.test.ts tests/broker-membership-sync.test.ts tests/broker-token-mint.test.ts tests/private-data-auth.test.ts tests/message-outbox.test.ts tests/realtime-auth.test.ts tests/search-lifecycle.test.ts tests/thread-outbox.test.ts tests/project-smoke-cli.test.ts
```

Result: 10 test files passed, 107 tests passed.

Passed after the operator-key fingerprint fix:

```bash
npm --workspace @chatsdk/api test -- --run tests/project-provisioning.test.ts tests/auth-modes.test.ts tests/broker-membership-sync.test.ts tests/broker-token-mint.test.ts tests/private-data-auth.test.ts tests/project-smoke-cli.test.ts
```

Result: 6 test files passed, 88 tests passed.

Passed:

```bash
npm --workspace @chatsdk/api run typecheck
```

Passed:

```bash
npm --workspace @chatsdk/api test
```

Result: 33 test files passed, 2 skipped; 289 tests passed, 7 skipped.

Passed after final source/doc updates:

```bash
./scripts/graphify update . --wiki
```

Result: graph complete with 8702 nodes, 11395 edges, 558 communities, and 568 wiki articles.

## External Review Evidence

- Claude post-blocker adversarial review: GO, no critical/high findings.
- Antigravity post-blocker adversarial review: GO, no critical/high findings.

Both reviewers confirmed the prior NO-GO blockers are resolved:

- app-scoped API keys hash at rest and authenticate by hash lookup
- primary app-key fallback is disabled by default
- scoped user-token enforcement fails closed for missing scopes
- broker route restrictions apply only to broker-token claims
- membership removal revokes future access without deleting messages
- membership sync preserves existing display names when `displayName` is omitted
- project provisioning and smoke tooling are app-scoped and do not depend on app ID `001`

## Medium Findings Resolved After Rereview

- Removed the dead nullable `api_key` column from the new `V015__app_scoped_api_keys.sql` migration.
- Changed project provisioning `show` output to use a non-secret `sha256:` API-key fingerprint from `api_key_hash`, rather than attempting to redact unavailable plaintext.
- Updated provisioning tests so the `show` fixture matches production hashed-key state.

## Residual Review Items

- Preserve the origin-header caveat as a documented medium follow-up: broker origin allowlists only evaluate requests that include `Origin`; this is browser/request-context defense, not a replacement for broker credential possession and membership checks.
- Add a future tiny test rename/companion test for broker-scope allowlisted read routes so the test name and broker-token fixture are perfectly aligned.
