# Milestone 7: Backup/Restore Reconciliation and Chaos/Restart Coverage

Date: 2026-06-08
Status: completed after adversarial review and fixes

## Scope

Implemented the P0 backup/restore and restart-hardening slice:

- Postgres backup and isolated restore drill scripts with migration metadata, checksums, destructive target confirmation, production-host guards, and local PostgreSQL client preflights.
- Object manifest generation for app-scoped S3/MinIO objects with canonical manifest checksum metadata.
- Restore reconciliation service for upload rows, object manifests, and purge ledger rows.
- Restore reconciliation apply mode that tombstones missing primary uploads, clears missing thumbnails, deletes resurrected purged objects, refuses cross-app scoped manifests, requires manifest checksum metadata, writes planned/final local reports, and persists audit rows.
- V011 backup drill audit schema for `backup_drill`, `backup_object_manifest`, and `backup_restore_gap` with forced RLS and system-only policies.
- V012 `search_index_outbox` schema with tenant-or-system RLS, stale processing recovery index, and active-operation uniqueness.
- Transactional search outbox enqueue for message create/edit/delete, thread replies, and hard purge so committed message mutations are crash-durable for Meilisearch catch-up.
- Search outbox worker that rehydrates current Postgres state, deletes missing/deleted documents, retries failed rows with backoff, and reclaims stale `processing` rows after API restart.
- Production startup behavior that allows API to start during a Meilisearch outage while `/ready` reports search unhealthy.
- Search readiness that verifies/reapplies required Meilisearch filterable/sortable settings instead of only checking index stats.
- Test compose upgrades for Meilisearch, private/versioned MinIO bucket init, restart policies, and production-like object/search env.
- Opt-in Playwright chaos test for Centrifugo outage/recovery plus chaos script guards that refuse to no-op when the expected compose service is absent.
- Backup/restore runbook documenting backup, object manifest, isolated restore, reconciliation, and chaos commands.

## Changed Files

- `docker/migrations/V011__backup_restore_drills.sql`
- `docker/migrations/V012__search_index_outbox.sql`
- `docker/init-db.sql`
- `docker-compose.yml`
- `docker-compose.test.yml`
- `docker/docker-compose.prod.yml`
- `.env.production.example`
- `.env.production.minimal`
- `docker/.env.example`
- `package.json`
- `packages/api/src/services/backup-restore.ts`
- `packages/api/src/services/search.ts`
- `packages/api/src/services/data-lifecycle.ts`
- `packages/api/src/routes/messages.ts`
- `packages/api/src/routes/threads.ts`
- `packages/api/src/routes/metrics.ts`
- `packages/api/src/index.ts`
- `packages/api/tests/backup-restore.test.ts`
- `packages/api/tests/search-outbox.test.ts`
- `packages/api/tests/search-health.test.ts`
- `packages/api/tests/readiness.test.ts`
- `packages/api/tests/production-contract.test.ts`
- `scripts/ops/backup-postgres.sh`
- `scripts/ops/object-manifest.ts`
- `scripts/ops/restore-drill-local.sh`
- `scripts/ops/reconcile-restored-uploads.ts`
- `scripts/ops/chaos-compose.sh`
- `scripts/ops/health-sweep.sh`
- `docs/runbooks/backup-restore.md`
- `tests/playwright/chat-chaos.spec.ts`

## Verification

Commands run:

```bash
npm --workspace @chatsdk/api test -- --run tests/backup-restore.test.ts tests/production-contract.test.ts
npm --workspace @chatsdk/api test -- --run tests/search-outbox.test.ts tests/search-health.test.ts tests/production-contract.test.ts tests/backup-restore.test.ts
npm --workspace @chatsdk/api test -- --run tests/readiness.test.ts tests/search-outbox.test.ts tests/production-contract.test.ts tests/backup-restore.test.ts
npm --workspace @chatsdk/api test -- --run tests/backup-restore.test.ts tests/search-health.test.ts tests/search-outbox.test.ts tests/production-contract.test.ts tests/readiness.test.ts
npm --workspace @chatsdk/api test -- --run tests/production-contract.test.ts tests/backup-restore.test.ts tests/search-health.test.ts tests/search-outbox.test.ts
npm --workspace @chatsdk/api run typecheck
npm --workspace @chatsdk/api test -- --run
npm --workspace @chatsdk/api run build
npx playwright test tests/playwright/chat-chaos.spec.ts
git diff --check
docker run --name chatsdk-m7-pg ... postgres:16-alpine
docker run --rm --network host -v "$PWD/docker/migrations:/flyway/sql:ro" flyway/flyway:10 ... migrate
docker exec chatsdk-m7-pg psql ... "SELECT MAX(version::int) ...; SELECT relname ...; SELECT policyname ..."
DATABASE_URL=postgresql://backup@127.0.0.1/chatsdk bash scripts/ops/backup-postgres.sh
SOURCE_DUMP=/tmp/nonexistent.dump RESTORE_DATABASE_URL=postgresql://restore@127.0.0.1:55432/chatsdk bash scripts/ops/restore-drill-local.sh
APPLY_RESTORE_RECONCILIATION=true RESTORE_DATABASE_URL=postgresql://restore@127.0.0.1:55432/chatsdk OBJECT_MANIFEST_PATH=/tmp/nope.jsonl APP_ID=00000000-0000-4000-8000-000000000001 npx tsx scripts/ops/reconcile-restored-uploads.ts
scripts/ops/chaos-compose.sh api restart
```

Results:

- Focused M7 backup/restore/search/readiness/contract tests passed repeatedly after each fix.
- Final focused contract/backup/search tests passed: 4 files, 35 tests.
- API typecheck passed.
- Final full API suite passed: 28 files passed, 2 skipped; 204 tests passed, 7 skipped.
- API build passed.
- Playwright chaos spec passed in default mode with 1 skipped because `CHATSDK_CHAOS=1` was not set.
- `git diff --check` passed.
- Fresh Flyway replay on disposable Postgres applied V001-V012 successfully.
- Fresh schema check showed:
  - latest migration version `12`
  - `backup_drill`, `backup_object_manifest`, `backup_restore_gap`, and `search_index_outbox` all have RLS enabled and forced
  - `search_index_outbox_app_or_system` policy is present.
- Backup/restore scripts correctly fail fast on this host because `pg_dump`, `pg_restore`, and `psql` are not installed.
- Destructive restore/reconciliation scripts correctly refuse unsafe apply without explicit isolated-target confirmation.
- Chaos script correctly exits nonzero when the requested compose service/project is absent, preventing no-op chaos runs.

Expected test logs:

- `search-health.test.ts` intentionally logs mocked invalid Meilisearch API key and settings failures to verify readiness fails closed while API startup can continue.
- `search-outbox.test.ts` intentionally logs a mocked indexing failure to verify durable outbox enqueue.

## Adversarial Review

Parallel/subagent lanes:

- Popper reviewed backup/restore and found missing real drill/reconciliation surfaces.
- Sagan reviewed ops/compose and found missing Meilisearch, MinIO init, restart policies, and scripts.
- Herschel reviewed chaos/restart coverage and found missing restart tests and search catch-up.
- GPT-5.5 xhigh reviews found and re-reviewed critical/high blockers.
- Antigravity was launched after M7 passes via `agy`; it repeatedly exited 0 with blank output. Recorded as launched/no usable findings, not as approval.

Critical/high findings fixed:

- Purged object replay was report-only. Fixed apply-mode S3 deletion plus audit/report output.
- Restore drill could target the wrong DB. Fixed explicit destructive confirmation, target equality guard, production-host guard, remote isolated opt-in, and command preflights.
- Search outbox `processing` rows could strand after worker crash. Fixed stale processing reclamation and index.
- Backup drill audit tables were schema-only. Fixed audit writers for drill, object manifest, and reconciliation gaps.
- Reconciliation apply could run against production via `DATABASE_URL`. Fixed apply-mode `RESTORE_DATABASE_URL` requirement and restore-drill-style guards.
- Search outbox was not crash-durable for committed message mutations. Fixed transactional enqueue for message create/edit/delete, thread replies, and hard purge.
- Meilisearch outage prevented production API startup. Fixed startup to degrade and readiness to fail.
- Production readiness did not require M7 schema. Fixed readiness to require V012 and forced RLS on backup/search tables.
- Audit/report persistence happened after destructive work only. Fixed planned report/audit before apply and final report before final audit update.
- Object manifest checksum proof diverged and was optional in apply. Fixed canonical checksum generation, metadata comparison, and apply-time metadata requirement.
- `rejected` purge ledger rows were treated as purged deletes. Fixed rejected keys to become failed/report-only gaps, not object deletion candidates.
- Reconciliation apply could exit 0 with failed report. Fixed final failed report to throw nonzero.
- Meilisearch readiness could pass with settings drift. Fixed readiness to verify/reapply required settings.
- Postgres backup/restore scripts were not runnable without pg tools. Fixed command preflights.
- Chaos script/test could no-op against a missing compose project. Fixed compose `ps -q` guard and contract coverage.

Final GPT-5.5 xhigh review found no remaining critical/high blockers except the chaos no-op issue, which was fixed and re-verified.

## Residual Risk

- Live chaos execution is opt-in and was not run because `CHATSDK_CHAOS=1` and a running `COMPOSE_PROJECT_NAME=chatsdk-chaos docker compose -f docker-compose.test.yml up -d` stack were not present.
- This host lacks local PostgreSQL client tools, so backup/restore script execution was verified through fail-fast preflights and fresh Flyway replay via Docker, not a full local `pg_dump`/`pg_restore` drill.
- Object manifest entries rely on S3/MinIO object metadata (`size`, `etag`, `lastModified`) plus canonical manifest checksum. Full content hashing is not implemented in the manifest generator.

## Next

Proceed to the final comprehensive security/code review sweep and end-to-end deployed validation once the intended local/Proxmox stack is running with seeded data and `CHATSDK_CHAOS=1`.
