# Final Hardening Review Resolution

Status: blockers addressed and narrow re-review clean

## Findings Addressed

### Scoped Broker Tokens Were Not Deny-by-Default

Final GPT review found that scoped broker tokens could still reach unscoped or broader authenticated routes.

Resolved:

- Added `brokerScopedRouteGuard` after `authMiddleware`.
- Broker-scoped user tokens are now denied by default unless the method/path is in the broker chat runtime allowlist.
- Non-broker legacy user tokens without `scopes` keep backward-compatible behavior.
- Added explicit `requireScope()` calls to thread and poll routes:
  - thread read/participants: `chat:read`
  - thread reply: `chat:write`
  - poll create/vote/delete vote: `chat:write`
  - poll results: `chat:read`
- Added regressions proving:
  - scoped broker tokens are denied on app-management routes such as `/api/webhooks`
  - read-only scoped broker tokens are denied on thread writes
  - allowlisted chat read routes can still pass with `chat:read`

### External Tenant Reassignment During Membership Sync

Final Antigravity review found that an existing broker-managed user could be reassigned across external tenants.

Resolved:

- Membership sync now denies updates when existing `broker_membership_state.external_tenant_id` differs from the incoming `externalTenantId`.
- The denial happens before `app_user` metadata updates and channel membership reconciliation.
- Added a regression for `BROKER_TENANT_REASSIGN_DENIED`.

### Origin Mismatch Regression

Resolved:

- Added a broker auth regression proving configured origin mismatches reject with `BROKER_ORIGIN_DENIED` and write denied audit rows.

## Verification

- `npm test --workspace=@chatsdk/api -- --run tests/auth-modes.test.ts tests/broker-auth.test.ts tests/broker-membership-sync.test.ts tests/database-context.test.ts tests/broker-token-mint.test.ts tests/message-outbox.test.ts tests/realtime-outbox.test.ts tests/readiness.test.ts tests/config-validation.test.ts`
  - 9 files passed
  - 98 tests passed
- `npm run typecheck --workspace=@chatsdk/api`
  - passed
- `npx playwright test tests/playwright/react-chat-ui.spec.ts --reporter=list`
  - 1 skipped without live env
- Live LAN Playwright UI validation against `http://192.168.68.113:5173`
  - 1 passed

## Re-Review

- GPT-5.5 high narrow re-review: no critical/high/medium findings.
- Antigravity defensive narrow re-review: prior blockers fully resolved; no critical/high/medium regressions.

## Remaining Non-Blocking Follow-Ups

- Add broker/RLS integration tests against a real Postgres role `chatsdk_broker_system`.
- Sync live LAN deployment through V014 and rerun broker-native validation.
- Add deployment guidance for broker runtime role credentials/IAM mapping.
- Add a later validation migration or runbook for `NOT VALID` constraints.
- Revisit `channel.member_count` update strategy under high concurrency.
