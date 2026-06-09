
## Adversarial Review Resolution

### GPT-5.5 High Review

Initial Slice 2 review found high blockers in broker RLS/context trust, JWT lifetime handling, audit FK resilience, idempotency, body limits, and durable realtime commands.

Resolved:

- Removed the normal `chatsdk` runtime role from broker RLS; broker-only tables now require `current_user = 'chatsdk_broker_system'` plus system context.
- Made the broker DB context marker internal (`brokerClient`) instead of caller-settable `TenantDbContext.brokerSystem`.
- Added broker runtime role verification: exact role, non-superuser, no BYPASSRLS.
- Added service JWT future-`iat` and absolute expiry checks.
- Added `requested_app_id` audit storage and only writes FK-backed `app_id` after verifying the app exists.
- Replaced `Content-Length`-only body guarding with Hono `bodyLimit`.
- Tightened equal-revision idempotency to include stored `fresh_until`.
- Added durable `realtime.unsubscribe_user` outbox commands for channel removals.
- Capped membership revision to JS safe integer and added matching DB check.
- Resolved membership channel IDs through `channel.cid` to internal `channel.id` before writing `channel_member`.
- Batched channel snapshot DB operations and sorted channel IDs for deterministic lock order.
- Added explicit broker runtime role grants and readiness validation for required privileges.
- Fixed replay cleanup to retain rows through the JWT clock-tolerance window and added required DELETE grant.

### Antigravity Review

Antigravity identified high/medium issues around sequential per-channel DB loops, event outbox pruning, replay cleanup frequency, and published outbox cleanup frequency.

Resolved:

- Replaced per-channel membership upsert loop with one `unnest` batch insert/upsert.
- Replaced per-channel member-count loop with one batch `UPDATE` over affected channel IDs.
- Replaced per-channel unsubscribe outbox insert loop with one batch insert.
- Added deterministic sorting for batch channel IDs to reduce concurrent lock-order deadlocks.
- Added published outbox pruning with a once-per-minute process throttle and configurable retention.
- Added expired broker JWT replay pruning with a once-per-minute process throttle.

### Verification

- `npm test --workspace=@chatsdk/api -- --run tests/broker-auth.test.ts tests/broker-membership-sync.test.ts tests/database-context.test.ts tests/realtime-outbox.test.ts tests/readiness.test.ts tests/config-validation.test.ts`
  - 6 files passed
  - 65 tests passed
- `npm run typecheck --workspace=@chatsdk/api`
  - passed

### Remaining Notes

- Slice 2 is ready to proceed from the focused broker-auth/membership-sync hardening perspective.
- Full live DB migration validation and later seeded browser/Playwright coverage remain scheduled for later slices because token mint and the reference broker UI flow are not implemented in Slice 2.
