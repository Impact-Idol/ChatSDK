#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:5501}"

echo "Checking ${API_URL}/live"
curl -fsS "${API_URL}/live" >/dev/null

echo "Checking ${API_URL}/ready"
curl -fsS "${API_URL}/ready"

echo
echo "Checking ${API_URL}/metrics"
curl -fsS "${API_URL}/metrics" | grep -E 'chatsdk_(http_requests_total|realtime_outbox_depth|lifecycle_purge_depth)' >/dev/null

echo "Health sweep passed"
