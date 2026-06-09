#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.test.yml}"
PROJECT="${COMPOSE_PROJECT_NAME:-chatsdk-chaos}"
SERVICE="${1:-}"
ACTION="${2:-restart}"

if [[ -z "${SERVICE}" ]]; then
  echo "Usage: $0 <api|postgres|redis|minio|centrifugo|meilisearch> [stop|start|restart]" >&2
  exit 2
fi

case "${ACTION}" in
  stop|start|restart) ;;
  *)
    echo "Unsupported action: ${ACTION}" >&2
    exit 2
    ;;
esac

CONTAINER_ID="$(docker compose -p "${PROJECT}" -f "${COMPOSE_FILE}" ps -q "${SERVICE}")"
if [[ -z "${CONTAINER_ID}" ]]; then
  echo "No running compose container found for service ${SERVICE} in project ${PROJECT} using ${COMPOSE_FILE}." >&2
  echo "Start the chaos stack with: COMPOSE_PROJECT_NAME=${PROJECT} docker compose -f ${COMPOSE_FILE} up -d" >&2
  exit 3
fi

echo "Running docker compose ${ACTION} for ${SERVICE} using ${COMPOSE_FILE}"
docker compose -p "${PROJECT}" -f "${COMPOSE_FILE}" "${ACTION}" "${SERVICE}"
