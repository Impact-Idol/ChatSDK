# Slice 3 Generic Membership Sync Log

Date: 2026-06-20
Status: in progress

## Scope

Package and verify the generic broker membership snapshot flow for project integrations. The key product behavior is that messages remain stored, but removed users lose current and future access through membership deletion, session revocation, and realtime disconnect/unsubscribe events.

## Current Implementation

Existing broker membership sync route:

- `PUT /api/server/apps/:appId/memberships/:userId`
- Authenticated by broker service JWT, not app API key.
- Validates broker tenant, user prefix, channel prefix, fanout, and app scope.
- Applies monotonic membership revisions.
- Rejects rollback and conflicting same-revision snapshots.
- Rejects external tenant reassignment for an existing broker user.
- Upserts active channel memberships by CID and role.
- Removes omitted channels from active snapshots.
- Removes all channel memberships for `disabled`, `suspended`, or `removed` statuses.
- Revokes user sessions and enqueues realtime disconnect when status changes away from active.
- Enqueues durable realtime unsubscribe commands for removed channel memberships.

## Tests Added

- `packages/api/tests/broker-token-mint.test.ts`
  - removed broker membership state cannot mint a token or create an auth session
- `packages/api/tests/broker-membership-sync.test.ts`
  - removed status deletes channel memberships, enqueues unsubscribes, and does not delete messages
  - stale active snapshot cannot resurrect a newer removed membership state

## Verification

Passed:

```bash
npm --workspace @chatsdk/api test -- --run tests/broker-membership-sync.test.ts tests/broker-token-mint.test.ts
```

Result: 2 test files passed, 17 tests passed.

Passed:

```bash
npm --workspace @chatsdk/api run typecheck
```

Passed:

```bash
npm --workspace @chatsdk/api test -- --run
```

Result: 32 test files passed, 2 skipped; 285 tests passed, 7 skipped.

## Remaining Slice 3 Work

- Package this as an operator-friendly reusable project operation or smoke workflow rather than only raw API behavior.
- Add seeded two-project evidence for Project A/B membership isolation.
- Run a live/local smoke when services and seeded credentials are available.
- Add adversarial review after the smoke workflow is wired.
