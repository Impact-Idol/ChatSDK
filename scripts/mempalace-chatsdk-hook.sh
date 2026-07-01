#!/usr/bin/env bash
set -euo pipefail

hook_name="${1:?hook name required}"
harness="${2:-codex}"

mempalace_bin="${MEMPALACE_BIN:-/Users/pushkar/.local/bin/mempalace}"
project_wing="${MEMPALACE_PROJECT_WING:-chatsdk_sessions}"
memory_reminder="MemPalace reminder: for prior decisions, previous attempts, handoffs, resumed threads, or questions like 'last time' / 'why did we say X?', run /Users/pushkar/.local/bin/mempalace search \"<question>\" --wing chatsdk_sessions. Use --wing chatsdk_hours_sessions for older backfilled history if available. If Graphify is low-signal, try MemPalace before broad raw search."

payload_file="$(mktemp "${TMPDIR:-/tmp}/mempalace-hook-payload.XXXXXX")"
output_file="$(mktemp "${TMPDIR:-/tmp}/mempalace-hook-output.XXXXXX")"
cleanup() {
  rm -f "$payload_file" "$output_file"
}
trap cleanup EXIT

cat > "$payload_file"

transcript_path="$(
  /usr/bin/python3 - "$payload_file" <<'PY'
import json
import sys

try:
    with open(sys.argv[1], "r", encoding="utf-8") as fh:
        payload = json.load(fh)
except Exception:
    payload = {}

print(payload.get("transcript_path", ""))
PY
)"

if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
  transcript_dir="$(dirname "$transcript_path")"

  case "$hook_name" in
    precompact)
      "$mempalace_bin" mine "$transcript_dir" --mode convos --wing "$project_wing" >/dev/null 2>&1 || true
      ;;
    stop)
      ( "$mempalace_bin" mine "$transcript_dir" --mode convos --wing "$project_wing" >/dev/null 2>&1 || true ) &
      ;;
    *)
      ;;
  esac
fi

set +e
"$mempalace_bin" hook run --hook "$hook_name" --harness "$harness" < "$payload_file" > "$output_file"
hook_status=$?
set -e

cat "$output_file"

if [[ "$hook_name" == "session-start" ]]; then
  printf '%s\n' "$memory_reminder"
fi

if [[ "$hook_status" -ne 0 ]]; then
  exit "$hook_status"
fi

exit 0
