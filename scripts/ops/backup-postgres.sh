#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups/postgres}"
DATABASE_URL="${DATABASE_URL:?Set DATABASE_URL}"
RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
OUT_DIR="${BACKUP_DIR}/${RUN_ID}"
mkdir -p "${OUT_DIR}"

for required_command in pg_dump psql node; do
  if ! command -v "${required_command}" >/dev/null 2>&1; then
    echo "Missing required command: ${required_command}. Install PostgreSQL client tools before running backup drills." >&2
    exit 127
  fi
done

DUMP_PATH="${OUT_DIR}/postgres.dump"
METADATA_PATH="${OUT_DIR}/metadata.json"
SHA_PATH="${OUT_DIR}/postgres.dump.sha256"

echo "Creating Postgres backup at ${DUMP_PATH}"
pg_dump "${DATABASE_URL}" --format=custom --no-owner --no-acl --file="${DUMP_PATH}"

sha256sum "${DUMP_PATH}" > "${SHA_PATH}"

MIGRATION_VERSION="$(psql "${DATABASE_URL}" -Atc "SELECT COALESCE(MAX(version::int)::text, '0') FROM flyway_schema_history WHERE success = true" 2>/dev/null || echo "unknown")"
BACKUP_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "${METADATA_PATH}" <<JSON
{
  "runId": "${RUN_ID}",
  "backupTimestamp": "${BACKUP_TIMESTAMP}",
  "databaseUrlHost": "$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.host)")",
  "dumpPath": "${DUMP_PATH}",
  "sha256Path": "${SHA_PATH}",
  "migrationVersion": "${MIGRATION_VERSION}",
  "format": "pg_dump custom",
  "rpoTargetSeconds": 900
}
JSON

echo "Backup complete"
echo "Metadata: ${METADATA_PATH}"
