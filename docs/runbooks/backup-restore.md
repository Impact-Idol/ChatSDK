# ChatSDK Backup And Restore Drill Runbook

Status: initial P0 drill runbook
Updated: 2026-06-08

## Targets

- Postgres RPO: 15 minutes or better.
- Postgres RTO: 2 hours for beta.
- Object storage RPO: aligned with attachment/message RPO.
- Object storage RTO: 4 hours for beta.
- Meilisearch: rebuilt from restored Postgres.
- Centrifugo: stateless; recovery comes from Postgres, realtime outbox, and client backfill.

## Local Drill Commands

Create a Postgres backup:

```bash
DATABASE_URL=postgres://... npm run ops:backup:postgres
```

Create an object manifest, optionally scoped to one ChatSDK app:

```bash
S3_ENDPOINT=http://localhost:9007 \
S3_BUCKET=chatsdk \
S3_ACCESS_KEY_ID=chatsdk \
S3_SECRET_ACCESS_KEY=chatsdk_minio_test_123 \
APP_ID=00000000-0000-0000-0000-000000000001 \
npm run ops:backup:objects
```

Restore Postgres into an isolated database:

```bash
SOURCE_DUMP=backups/postgres/<run>/postgres.dump \
RESTORE_DATABASE_URL=postgres://...isolated... \
npm run ops:restore:drill
```

Dry-run restored upload reconciliation:

```bash
RESTORE_DATABASE_URL=postgres://...isolated... \
OBJECT_MANIFEST_PATH=backups/objects/<run>.jsonl \
APP_ID=00000000-0000-0000-0000-000000000001 \
npm run ops:restore:reconcile
```

Apply reconciliation only after reviewing the report:

```bash
APPLY_RESTORE_RECONCILIATION=true \
RESTORE_DATABASE_URL=postgres://...isolated... \
OBJECT_MANIFEST_PATH=backups/objects/<run>.jsonl \
APP_ID=00000000-0000-0000-0000-000000000001 \
npm run ops:restore:reconcile
```

## Required Verification

- Restored message rows exist for the seeded Alpha/Beta data set.
- Restored uploads with present objects remain downloadable through authenticated API paths.
- Missing primary objects are tombstoned with `status = 'restore_tombstoned'`.
- Missing thumbnails have thumbnail URL/key cleared without making the primary upload unavailable.
- Objects present in the manifest but listed as purged are deleted again and reported.
- App-scoped restore manifests contain only keys under `apps/{appId}/`.
- Meilisearch is rebuilt from restored Postgres before search verification.
- Private media authorization still denies nonmembers after restore.

## Drill Report

The drill report must include:

- run ID and operator/agent run ID
- source environment and isolated restore target
- backup timestamp
- Postgres dump path and checksum path
- object manifest path and manifest checksum
- migration version
- measured RPO/RTO
- reconciliation counts and gaps
- verification commands
- Playwright/API result
- failures and follow-up tasks

Commit or link the report from `docs/agent-runs/`.
