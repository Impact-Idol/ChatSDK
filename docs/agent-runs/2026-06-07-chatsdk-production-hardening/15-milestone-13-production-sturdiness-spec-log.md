# Milestone 13: Production Sturdiness Specs

Date: 2026-06-08
Status: completed

## Scope

Created follow-on production sturdiness specifications for the next phase after the independent ChatSDK hardening spike.

The specs cover:

- Vouch-owned backend token broker replacing the demo broker.
- Private attachment/media access replacing public-read demo MinIO.
- Rate limits and abuse controls for token minting, sends, uploads, reactions, typing, and search.
- Retention, deletion, and export policy.
- Production observability for traces, realtime delivery, outbox lag, search lag, upload failures, auth, and rate limits.
- Backup and restore drills for Postgres and object storage.
- Chaos/restart tests for API, Centrifugo, Meilisearch, Postgres, Redis, and object storage.

## Artifacts

- `docs/features/chatsdk-production-hardening/PRODUCTION_STURDINESS_SPEC.md`
- `docs/features/chatsdk-production-hardening/PRODUCTION_STURDINESS_TEST_PLAN.md`

## Notes

These docs intentionally separate production productization requirements from the already-completed independent hardening spike. They should drive the next implementation agents and review gates before ChatSDK is embedded into Vouch.
