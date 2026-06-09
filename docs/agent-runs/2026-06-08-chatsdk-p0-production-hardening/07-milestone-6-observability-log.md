# Milestone 6: Production Observability and Alert-Ready Readiness

Date: 2026-06-08
Status: completed after adversarial review and fixes

## Scope

Implemented the P0 observability and readiness slice:

- Request correlation with generated/propagated `X-Request-ID`, propagated `traceparent`, CORS support for both headers, error responses that echo request IDs, and request-scoped structured log context.
- Bounded HTTP route labels for Prometheus and request logs, including explicit templates for dynamic ChatSDK routes plus a privacy-safe fallback that redacts unknown path segments.
- Upload operation metrics for presign, direct upload, confirmation, authenticated media content, download, and delete, including explicit validation/authorization/storage-missing outcomes and unexpected exception counters.
- Upload accepted metrics that bucket raw content types into bounded `image`, `video`, `audio`, and `other` labels.
- Search indexing/query metrics, authenticated Meilisearch readiness, skipped/failure/success counters, index lag metrics, and Meilisearch async task completion checks for index/update/delete operations.
- Realtime outbox depth, oldest backlog age, publish attempt, and publish duration metrics.
- Alert-ready realtime outbox readiness that fails on failed rows or stale pending/processing/failed backlog.
- Lifecycle purge depth, oldest pending age, purge attempt, and purge duration metrics.
- Alert-ready lifecycle purge readiness that fails on failed/rejected rows or stale pending purge backlog.
- Invalid threshold environment variable hardening so mistyped numeric readiness thresholds fall back to strict defaults instead of weakening alerting.
- `/ready` coverage for database, schema, Flyway/lifecycle RLS when required, storage, Centrifugo, realtime outbox, lifecycle purge, search, and Inngest configuration.

## Changed Files

- `packages/api/src/middleware/metrics.ts`
- `packages/api/src/services/log-context.ts`
- `packages/api/src/services/logger.ts`
- `packages/api/src/services/metrics.ts`
- `packages/api/src/services/search.ts`
- `packages/api/src/services/realtime-outbox.ts`
- `packages/api/src/services/data-lifecycle.ts`
- `packages/api/src/routes/metrics.ts`
- `packages/api/src/routes/uploads.ts`
- `packages/api/src/routes/messages.ts`
- `packages/api/src/routes/moderation.ts`
- `packages/api/src/index.ts`
- `packages/api/src/middleware/auth.ts`
- `packages/api/tests/observability-metrics.test.ts`
- `packages/api/tests/request-trace-id.test.ts`
- `packages/api/tests/readiness.test.ts`
- `packages/api/tests/realtime-outbox.test.ts`
- `packages/api/tests/data-lifecycle.test.ts`
- `packages/api/tests/search-health.test.ts`

## Verification

Commands run:

```bash
npm --workspace @chatsdk/api run typecheck
npm --workspace @chatsdk/api test -- --run tests/observability-metrics.test.ts tests/request-trace-id.test.ts tests/readiness.test.ts tests/realtime-outbox.test.ts tests/data-lifecycle.test.ts tests/search-health.test.ts
npm --workspace @chatsdk/api test -- --run tests/channel-idempotency.test.ts tests/workspace-members-apikey.test.ts tests/realtime-auth.test.ts tests/private-data-auth.test.ts
npm --workspace @chatsdk/api test -- --run tests/private-data-auth.test.ts tests/observability-metrics.test.ts
npm --workspace @chatsdk/api test -- --run tests/search-lifecycle.test.ts tests/search-health.test.ts tests/observability-metrics.test.ts tests/private-data-auth.test.ts
npm --workspace @chatsdk/api test -- --run tests/search-health.test.ts tests/observability-metrics.test.ts
npm --workspace @chatsdk/api test -- --run tests/observability-metrics.test.ts tests/realtime-outbox.test.ts tests/data-lifecycle.test.ts tests/readiness.test.ts
npm --workspace @chatsdk/api test -- --run tests/realtime-outbox.test.ts tests/data-lifecycle.test.ts tests/readiness.test.ts tests/observability-metrics.test.ts
npm --workspace @chatsdk/api test -- --run tests/observability-metrics.test.ts
npm --workspace @chatsdk/api test -- --run
npm --workspace @chatsdk/api run build
git diff --check
```

Results:

- Focused observability/request/readiness tests passed before review: 38 tests.
- Route-auth regression focused tests passed after separating log context from logger mocks: 49 tests.
- Upload/search focused observability tests passed after exception/task metric hardening.
- Final focused readiness/outbox/lifecycle/metrics tests passed: 35 tests.
- API typecheck passed.
- Final full API test suite passed: 26 files passed, 2 skipped; 187 tests passed, 7 skipped.
- API build passed.
- `git diff --check` passed.

Expected test logs:

- `search-health.test.ts` intentionally logs mocked invalid Meilisearch API key failures to verify authenticated search readiness fails closed.
- Rate-limit tests intentionally log mocked `rate_limit_exceeded` security events.

## Adversarial Review

GPT-5.5 xhigh first-pass findings fixed:

- HTTP route normalization could still leak dynamic IDs/tokens into Prometheus labels and request logs for paths such as `/api/devices/:token`, `/api/users/:userId/block`, `/api/workspaces/:id/channels`, and invite tokens. Fixed with explicit route templates plus a conservative fallback that redacts unknown path segments. Added tests for device tokens, custom user IDs, workspace channels, invite tokens, and unknown short secret segments.
- Realtime outbox readiness could go green when all wedged rows were `processing`, because processing rows were counted but not aged. Fixed the aggregate so oldest backlog age includes `pending`, `processing`, and `failed` rows. Added a test proving processing rows are included and stale processing backlog fails readiness.
- Lifecycle purge readiness treated `missing_or_failed` and `rejected` purge rows as healthy. Fixed readiness to fail on failed/rejected rows above strict default thresholds, plus stale pending age. Updated tests so failed/rejected purge rows are alerting conditions.

GPT-5.5 xhigh narrow re-review:

- Confirmed no critical/high blockers remain.
- Residual medium/low risks noted:
  - The route normalizer is hand-maintained, so new routes may fall back to coarse labels until templates are added. The fallback is privacy-safe.
  - Invalid numeric readiness env vars could parse to `NaN` and weaken comparisons.

Additional fix after narrow re-review:

- Added strict non-negative numeric env parsing for realtime outbox and lifecycle purge readiness thresholds. Invalid or negative values fall back to safe defaults. Added tests for invalid env values on both readiness paths.

Antigravity review:

- Antigravity CLI review was launched for M6 first pass and again after the fixes. In both cases the CLI exited successfully but returned no textual verdict. The lack of output was recorded rather than treated as approval.

## Residual Risks

- `normalizeHttpRoute` is intentionally privacy-safe but hand-maintained. New dynamic routes should add explicit templates during route implementation; otherwise they will be grouped under coarse `:id` fallback labels.
- Request correlation currently propagates `traceparent` and request IDs through logs and responses, but does not yet create full OpenTelemetry spans.
- Search index metrics now wait for Meilisearch async tasks for index/update/delete calls. Very slow Meili tasks will be counted as failures after `SEARCH_TASK_TIMEOUT_MS` and should be tuned against production indexing latency.
- `/metrics` protection remains deployment-level in this run; production ingress should continue to restrict direct metrics access.

## Next Required Step

Start Milestone 7: backup/restore reconciliation and chaos/restart coverage for Postgres, object storage, Centrifugo/realtime outbox, Meilisearch, API, and lifecycle workers.
