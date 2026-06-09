#!/usr/bin/env bash
set -euo pipefail

SOURCE_DUMP="${SOURCE_DUMP:?Set SOURCE_DUMP to a pg_dump custom-format file}"
RESTORE_DATABASE_URL="${RESTORE_DATABASE_URL:?Set RESTORE_DATABASE_URL for isolated restore target}"
RESTORE_DRILL_CONFIRM="${RESTORE_DRILL_CONFIRM:-}"
RESTORE_ALLOW_REMOTE_ISOLATED_TARGET="${RESTORE_ALLOW_REMOTE_ISOLATED_TARGET:-false}"
RUN_ID="${RUN_ID:-restore-$(date -u +%Y%m%dT%H%M%SZ)}"
REPORT_DIR="${REPORT_DIR:-docs/agent-runs/restore-drills}"
REPORT_PATH="${REPORT_DIR}/${RUN_ID}.md"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p "${REPORT_DIR}"

for required_command in pg_restore psql node; do
  if ! command -v "${required_command}" >/dev/null 2>&1; then
    echo "Missing required command: ${required_command}. Install PostgreSQL client tools before running restore drills." >&2
    exit 127
  fi
done

if [[ "${RESTORE_DRILL_CONFIRM}" != "I_UNDERSTAND_THIS_WILL_CLEAN_THE_TARGET" ]]; then
  echo "Refusing destructive restore: set RESTORE_DRILL_CONFIRM=I_UNDERSTAND_THIS_WILL_CLEAN_THE_TARGET for an isolated drill target." >&2
  exit 2
fi

if [[ -n "${DATABASE_URL:-}" && "${RESTORE_DATABASE_URL}" == "${DATABASE_URL}" ]]; then
  echo "Refusing destructive restore: RESTORE_DATABASE_URL matches DATABASE_URL." >&2
  exit 2
fi

TARGET_HOST="$(node -e "const u = new URL(process.env.RESTORE_DATABASE_URL); console.log(u.hostname)")"
if [[ ",${PRODUCTION_DATABASE_HOSTS:-}," == *",${TARGET_HOST},"* ]]; then
  echo "Refusing destructive restore: target host ${TARGET_HOST} is listed in PRODUCTION_DATABASE_HOSTS." >&2
  exit 2
fi

case "${TARGET_HOST}" in
  localhost|127.0.0.1|::1)
    ;;
  *)
    if [[ "${RESTORE_ALLOW_REMOTE_ISOLATED_TARGET}" != "true" ]]; then
      echo "Refusing destructive restore to remote host ${TARGET_HOST}: set RESTORE_ALLOW_REMOTE_ISOLATED_TARGET=true only for an isolated drill database." >&2
      exit 2
    fi
    ;;
esac

echo "Restoring ${SOURCE_DUMP} into isolated target"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="${RESTORE_DATABASE_URL}" "${SOURCE_DUMP}"

MIGRATION_VERSION="$(psql "${RESTORE_DATABASE_URL}" -Atc "SELECT COALESCE(MAX(version::int)::text, '0') FROM flyway_schema_history WHERE success = true" 2>/dev/null || echo "unknown")"
ROW_COUNTS="$(psql "${RESTORE_DATABASE_URL}" -Atc "SELECT 'app=' || COUNT(*) FROM app UNION ALL SELECT 'message=' || COUNT(*) FROM message UNION ALL SELECT 'upload=' || COUNT(*) FROM upload" 2>/dev/null || true)"
FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "${REPORT_PATH}" <<MD
# ChatSDK Restore Drill ${RUN_ID}

- Started: ${STARTED_AT}
- Finished: ${FINISHED_AT}
- Source dump: ${SOURCE_DUMP}
- Restore target: isolated database from RESTORE_DATABASE_URL
- Migration version: ${MIGRATION_VERSION}

## Row Counts

\`\`\`
${ROW_COUNTS}
\`\`\`

## Required Follow-Up

- Run object manifest restore/reconciliation for the same backup timestamp.
- Rebuild Meilisearch from restored Postgres.
- Run restored-data API/Playwright verification.
MD

echo "Restore drill complete"
echo "Report: ${REPORT_PATH}"
