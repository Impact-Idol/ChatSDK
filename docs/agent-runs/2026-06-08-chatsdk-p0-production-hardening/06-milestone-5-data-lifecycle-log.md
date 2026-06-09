# Milestone 5: Data Lifecycle, Retention, Deletion, and Export

Date: 2026-06-08
Status: completed after adversarial review and fixes

## Scope

Implemented the P0 data lifecycle slice:

- V010 lifecycle schema for soft delete metadata, hard purge metadata, legal holds, purge scheduling, upload purge state, purge ledger, and export manifests.
- Mandatory RLS/forced-RLS policies for `data_purge_ledger` and `data_export`.
- Production/readiness guard that requires successful migration version 10 and forced RLS on lifecycle tables.
- Soft delete that tombstones messages, clears body/attachments/link previews/media URLs, blocks legal holds, records purge work, removes search index entries, and queues storage purge.
- Hard purge endpoint for channel owner/admin/moderator roles, with legal-hold protection and body/media scrub.
- Durable object purge ledger with pending work, app-scoped storage-key guard, retry worker on API startup, and retryable failure status.
- User anonymization that preserves message foreign keys while clearing profile fields and deleting `device_token` rows.
- User/channel export endpoints with encrypted artifacts, deletion manifests, app-export fail-closed behavior, and upload-key redaction unless keys are proven referenced by live non-deleted messages.
- Search lifecycle hardening so Meilisearch is only a candidate index: results and suggestions hydrate through Postgres, enforce allowed channel IDs, exclude soft/hard deleted rows, rebuild escaped highlights from current DB text, and use current/anonymized user names from `app_user`.
- Message history/thread history tombstone behavior for soft deletes and hard-purge exclusion.
- Edit protection for deleted/hard-purged messages.

## Changed Files

- `docker/migrations/V010__data_lifecycle_policy.sql`
- `docker/init-db.sql`
- `packages/api/src/services/data-lifecycle.ts`
- `packages/api/src/routes/messages.ts`
- `packages/api/src/routes/moderation.ts`
- `packages/api/src/routes/users.ts`
- `packages/api/src/routes/channels.ts`
- `packages/api/src/routes/threads.ts`
- `packages/api/src/routes/search.ts`
- `packages/api/src/services/search.ts`
- `packages/api/src/routes/metrics.ts`
- `packages/api/src/index.ts`
- `packages/api/src/services/rate-limit.ts`
- `packages/api/tests/data-lifecycle.test.ts`
- `packages/api/tests/search-lifecycle.test.ts`
- `packages/api/tests/message-outbox.test.ts`
- `packages/api/tests/search-health.test.ts`
- `packages/api/tests/readiness.test.ts`

## Verification

Commands run:

```bash
npm --workspace @chatsdk/api test -- --run tests/data-lifecycle.test.ts
npm --workspace @chatsdk/api test -- --run tests/search-lifecycle.test.ts tests/search-health.test.ts tests/data-lifecycle.test.ts tests/message-outbox.test.ts
npm --workspace @chatsdk/api test -- --run tests/search-lifecycle.test.ts tests/data-lifecycle.test.ts tests/readiness.test.ts tests/search-health.test.ts tests/message-outbox.test.ts
npm --workspace @chatsdk/api run typecheck
npm --workspace @chatsdk/api test -- --run
npm --workspace @chatsdk/api run build
git diff --check
docker run --rm -v /Users/pushkar/chatsdk/docker/migrations:/flyway/sql:ro flyway/flyway:10-alpine -url=jdbc:postgresql://host.docker.internal:55440/chatsdk -user=chatsdk -password=chatsdk -connectRetries=20 migrate
docker exec chatsdk-m5-pg psql -U chatsdk -d chatsdk -c "SELECT MAX(version::int)::text AS latest_version FROM flyway_schema_history WHERE success = true;"
docker exec chatsdk-m5-pg psql -U chatsdk -d chatsdk -c "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN ('data_purge_ledger','data_export') ORDER BY relname;"
docker exec chatsdk-m5-pg psql -U chatsdk -d chatsdk -c "SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('data_purge_ledger','data_export') ORDER BY tablename, policyname;"
```

Results:

- Focused lifecycle/search/message/readiness tests passed: 30 tests.
- Final focused search tests passed: 7 tests.
- API typecheck passed.
- Full API test suite passed: 24 files passed, 2 skipped; 172 tests passed, 7 skipped.
- API build passed.
- `git diff --check` passed.
- Fresh Flyway migration on disposable Postgres passed through V010.
- Migrated database reported latest successful migration version 10.
- Migrated database reported forced RLS enabled on `data_export` and `data_purge_ledger`.
- Migrated database reported lifecycle isolation policies present on both lifecycle tables.

## Adversarial Review

GPT-5.5 xhigh first-pass findings fixed:

- Search leaked all tenant messages when a user had zero memberships because empty channel filters fell through to app-wide search. Fixed route fail-closed behavior and service-level `channelIds: []` impossible filter.
- Search returned stale Meilisearch text after soft/hard delete. Fixed by hydrating candidates from Postgres, dropping hard-deleted and later soft-deleted rows, rebuilding highlights from current DB text, and removing direct Meili snippets from suggestions.
- Exports redacted only hard-deleted messages. Fixed by redacting soft and hard deleted message bodies/attachments and later redacting upload keys unless referenced by live non-deleted messages.
- Deleted/hard-purged messages could still be edited. Fixed with `deleted_at IS NULL` and `hard_deleted_at IS NULL` predicates in ownership checks and updates.
- Hard purge legal-hold checks could race. Fixed with `SELECT ... FOR UPDATE`, DB `NOW()` predicates, and `RETURNING` checks.
- Soft delete missed voice/video object keys. Fixed by extracting attachment, voice, video, and video thumbnail storage keys.
- Storage purge was not durable. Fixed with pending purge ledger rows, startup retry worker, app-owned storage-key guard, and retryable failure behavior.

Antigravity first-pass findings fixed:

- Legal holds did not block soft delete. Fixed with row lock plus DB-authoritative hold predicate.
- App-wide exports could OOM and bloat Postgres. Fixed by making app-scope export fail closed until a streaming object-store export path is implemented.
- User anonymization left `device_token` rows. Fixed inside the anonymization transaction.
- V010 RLS was conditional. Fixed by making lifecycle-table RLS mandatory in migration and adding production/runtime checks.

GPT-5.5 xhigh second-pass findings fixed:

- Stale Meili formatted text could still leak edited-out message content. Fixed by dropping hits whose current DB text no longer matches the query and rebuilding escaped highlights from DB text.
- Legal-hold checks still used app clock and soft delete lacked DB-side predicate. Fixed with SQL `NOW()` predicates and `RETURNING` checks before recording purge work.
- Retryable object delete failures were marked terminal. Fixed by keeping failures pending for the worker to retry.
- Independent upload export entries could expose deleted object keys. Fixed by exporting upload keys only when proven referenced by live, non-deleted messages.
- V010 was not mandatory at runtime. Fixed with production/readiness lifecycle schema and forced-RLS assertion.

Final GPT-5.5 high checks:

- Confirmed no critical/high findings remain for the M5 lifecycle fixes.
- Narrow search cleanup review confirmed no critical/high remains after dropping soft-deleted search rows, deriving search usernames from Postgres, rebuilding highlights from DB text, enforcing allowed channels, and defanging the unused `getSuggestions` helper.

Antigravity final re-review:

- Final Antigravity CLI review was launched twice after the last fixes. The CLI exited successfully but returned no textual verdict. The lack of output was recorded rather than treated as approval.

## Residual Risks

- Export artifacts are encrypted with a key derived from `JWT_SECRET`. This is acceptable for the demo gate but should move to a dedicated `DATA_EXPORT_ENCRYPTION_KEY` or KMS key with rotation metadata before regulated production use.
- Export artifacts are still stored inline in `data_export`. App-wide export is disabled, but high-volume user/channel exports should eventually stream encrypted output to object storage with a short-lived download URL.
- Export expiry is stored but no cleanup/download path enforces it yet.
- Object delete retry uses a simple pending retry loop without attempts/backoff columns. It is durable and safe, but operationally noisy failures should get attempt counters, next-attempt scheduling, and alert thresholds in the observability milestone.
- Hard-purged messages remain as scrubbed DB tombstone rows for referential integrity. A future physical-delete job can be added if product policy requires it.

## Next Required Step

Start Milestone 6: production observability, traces, lifecycle/outbox/search/upload metrics, and alert-ready readiness coverage.
