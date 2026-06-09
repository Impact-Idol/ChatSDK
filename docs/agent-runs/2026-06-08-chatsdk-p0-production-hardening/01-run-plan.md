# ChatSDK P0 Production Hardening Run Plan

Date: 2026-06-08
Status: active

## Operating Rules

- Work milestone by milestone.
- Use parallel agents for bounded sidecar analysis or disjoint implementation lanes.
- Write focused unit/integration tests and seeded Playwright tests where user-facing behavior or cross-service behavior matters.
- After each milestone, run GPT-5.5 high and Antigravity adversarial reviews.
- Fix all critical/high findings before moving to the next milestone.
- Record commands, results, review findings, fixes, and residual risks in this run directory.

## Milestone Order

1. Shared-DB tenant isolation: RLS, request-scoped DB tenant context, direct-query guardrails, cross-app tests.
2. Token broker hardening: production demo/legacy kill switches, app-scoped service minting, token claims, revocation, connected membership removal behavior.
3. Private media: private bucket readiness, app-scoped object keys, signed/proxy download authorization, upload metadata validation.
4. Rate limits and abuse controls: Redis-backed limits for writes, reads, downloads, signed URLs, realtime auth, exports, admin actions, tenant/global budgets.
5. Minimal retention/deletion/export baseline for real-user beta.
6. Observability and alerts: traces, metrics, dashboards/readiness hooks, cardinality rules, actionable alerts/runbooks.
7. Backup/restore drills: Postgres, object manifests/checksums, purge ledger, restore reconciliation, Playwright restored-data verification.
8. Chaos/restart/degradation tests: API, Centrifugo, Meilisearch, Postgres, Redis, storage, network degradation, rolling deploy compatibility.
9. Comprehensive final security/code review and hardening sweep.

## Initial Agent Lanes

- Ampere: RLS/tenant isolation implementation plan.
- Russell: token broker/revocation/demo kill implementation plan.
- Parfit: seeded API/Playwright/chaos test strategy.

## First Critical Path

Milestone 1 is the first implementation target because every later feature depends on reliable tenant isolation for shared-database multi-client deployment.
