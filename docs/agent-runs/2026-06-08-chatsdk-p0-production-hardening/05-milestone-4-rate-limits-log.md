# Milestone 4: Rate Limits and Abuse Controls

Date: 2026-06-08
Status: completed after adversarial review and fixes

## Scope

Implemented the P0 rate-limit and abuse-control slice:

- Redis-backed token-bucket limiter using `ioredis`
- process-local fallback only when Redis is not required
- production defaults that enable rate limiting and require Redis unless explicitly waived
- 503 fail-closed behavior when Redis is required but unavailable
- app/user/channel/IP/key-scoped limiter dimensions
- SHA-256 key fingerprints for sensitive key dimensions
- proxy-header IP trust disabled by default to prevent spoofed `X-Forwarded-For` bypasses
- high-cardinality in-memory fallback cap
- Prometheus rate-limit decision counter
- public pre-parse limits for token minting, token refresh, and legacy token endpoints
- protected `/api/*` pre-auth API-key attempt limiter before DB API-key lookup
- app-wide write budgets plus scoped route budgets for messages, threads, reactions, typing, channel mutations, uploads, media reads/downloads, search, realtime subscription tokens, and token validation
- Node engine metadata aligned with Node 20 runtime requirements
- tenant DB context changed from request-long transaction to short tenant-scoped query/transaction context

## Changed Files

- `packages/api/src/services/rate-limit.ts`
- `packages/api/src/services/database.ts`
- `packages/api/src/config/defaults.ts`
- `packages/api/src/services/metrics.ts`
- `packages/api/src/index.ts`
- `packages/api/src/routes/auth.ts`
- `packages/api/src/routes/tokens.ts`
- `packages/api/src/routes/messages.ts`
- `packages/api/src/routes/threads.ts`
- `packages/api/src/routes/channels.ts`
- `packages/api/src/routes/uploads.ts`
- `packages/api/src/routes/search.ts`
- `packages/api/src/routes/realtime.ts`
- `packages/api/tests/rate-limit.test.ts`
- `packages/api/tests/database-context.test.ts`
- `packages/api/tests/config-validation.test.ts`
- `package.json`
- `package-lock.json`
- `packages/api/package.json`

## Verification

Commands run:

```bash
npm install --workspace @chatsdk/api ioredis@^5.4.1
npm --workspace @chatsdk/api run typecheck
npm --workspace @chatsdk/api test -- --run tests/rate-limit.test.ts
npm --workspace @chatsdk/api test -- --run tests/database-context.test.ts tests/tenant-context-middleware.test.ts tests/rate-limit.test.ts tests/config-validation.test.ts
npm --workspace @chatsdk/api test -- --run tests/config-validation.test.ts tests/rate-limit.test.ts
npm --workspace @chatsdk/api test -- --run tests/production-contract.test.ts
npm --workspace @chatsdk/api test -- --run
npm --workspace @chatsdk/api run build
git diff --check
```

Results:

- API typecheck passed.
- Focused limiter tests passed: 7 tests.
- Focused DB tenant-context/config/rate-limit tests passed: 26 tests.
- Runtime production config regression tests passed.
- Production contract tests passed: 13 tests.
- Full API test suite passed: 22 files passed, 2 skipped; 158 tests passed, 7 skipped.
- API build passed.
- `git diff --check` passed.

## Adversarial Review

Route-map explorer first pass:

- Identified P0 limiter insertion points for token mint/refresh, realtime subscription auth, message send/edit/delete/history, reactions, typing, uploads, media content/download, search, thread history, and channel upload listing.

GPT-5.5 high first-pass findings fixed:

- Public token limits were bypassable by randomizing API keys or refresh tokens because attacker-controlled values were part of the only public bucket. Fixed with IP-only public pre-auth buckets and separate app/user budgets after API-key resolution.
- `X-Forwarded-For` and related headers were trusted by default. Fixed by disabling proxy-header trust by default.
- Redis-required mode was validation-only and failed open to process memory. Fixed by failing closed with 503 when Redis is required and unavailable.
- Several state-changing P0 surfaces were uncovered. Fixed channel, member, read, star/mute, message pin/save, thread participants, upload delete, and channel upload list coverage.
- JSON parsing/validation ran before public token-broker rate limits. Fixed by moving public limit middleware before `zValidator`.
- Dependency update introduced Node-20-only packages while root engine advertised Node 18. Fixed by aligning root engine to Node 20.

Antigravity first-pass findings fixed:

- Spoofable forwarded IP header bypass. Fixed by defaulting `RATE_LIMIT_TRUST_PROXY_HEADERS` to false.
- Weak 32-bit FNV key hashes. Fixed with SHA-256 fingerprints truncated to 128 bits.
- Public token routes parsed body before limiting. Fixed.
- Missing resource-intensive route coverage for token validation, channels, and thread participants. Fixed.
- Redis write amplification on denied requests. Fixed by writing token-bucket state only for allowed Redis requests.
- Request-scoped tenant context held a DB transaction open for the whole handler. Fixed by storing tenant identity in AsyncLocalStorage and opening short tenant-scoped transactions only for each query or explicit route transaction.

GPT-5.5 high second-pass findings fixed:

- Production runtime default for `RATE_LIMIT_ENABLED` was false when unset because `getBooleanConfig` ignored the supplied default outside local envs. Fixed by returning the caller-provided default when unset and adding runtime config coverage.
- Production runtime default for `RATE_LIMIT_REDIS_REQUIRED` was false when unset. Fixed by the same boolean default correction and coverage.
- `GET /api/channels/:channelId/uploads` still lacked a limiter. Fixed with `mediaRead` scoped by channel.

Antigravity second-pass findings:

- Reported no critical/high production blockers.
- Medium note about invalid `X-API-Key` sprays on protected `/api/*` causing DB auth lookup pressure was fixed with a cheap pre-auth `apiKeyAuth` limiter.
- Low documentation note remains: one deployment guide sample still references Node 18 and should be updated in documentation polish.

Final narrow GPT-5.5 high check:

- Verified no critical/high remains for the second-pass findings: production runtime defaults, channel upload list coverage, and pre-auth API-key attempt limiter.

## Residual Risks

- `RATE_LIMIT_TRUST_PROXY_HEADERS=true` still trusts forwarded headers without a configured trusted-proxy allowlist. Safe by default; production deployments should only enable it behind controlled ingress.
- Per-query tenant context avoids request-long DB transactions but adds extra transaction overhead for routes with many queries. A future optimization can use a request-scoped connection with session variables and no open transaction, if PostgreSQL/RLS semantics are updated accordingly.
- The deployment guide still has at least one Node 18 sample while runtime/package metadata now require Node 20.
- Redis integration is covered through fail-closed/fallback unit behavior, but a live Redis integration test should be added to the chaos/deployment validation lane.

## Next Required Step

Start Milestone 5: retention, deletion, export, and data lifecycle policy for messages and attachments.
