# Milestone 1 Foundation Log

Date: 2026-06-08
Status: completed

## Scope

Milestone 1 repaired the enabling layer before security/auth hardening:

- Root install reproducibility.
- API TypeScript checking.
- Deterministic API unit tests.
- API build.
- Production startup sanity after deployment.

No auth behavior was intentionally changed in this milestone.

## Changes

- Added root dev pins for `react` and `react-native` so npm does not auto-resolve React Native to a React-19-only version during root workspace installs.
- Refreshed `package-lock.json` to include all root workspaces, including `packages/create-chatsdk-app`.
- Made API startup import-safe under `NODE_ENV=test`; importing `app` in tests no longer starts the HTTP server or calls `process.exit`.
- Suppressed static file serving setup when `examples/react-chat/dist` is absent.
- Converted baseline API TypeScript errors into runtime-neutral annotations/assertions.
- Moved live API E2E execution behind explicit `TEST_API_URL` by adding `packages/api/vitest.e2e.config.ts`.
- Excluded `tests/e2e.test.ts` from default API unit tests.
- Added root script `npm run test:api:live`.

## Verification

Local gates:

- `npm ci --ignore-scripts`: pass.
- `npm run typecheck --workspace=@chatsdk/api`: pass.
- `npm test --workspace=@chatsdk/api -- --run`: pass, 30 tests.
- `npm run build --workspace=@chatsdk/api`: pass.
- `npm run test:api:live -- --run` without `TEST_API_URL`: fails fast with a clear config error, as intended.

Deployment gates on `chatsdk-hardening` LXC:

- Rebuilt `chatsdk-hardening-api:local`.
- Restarted `chatsdk-hardening-api`.
- API container healthy.
- Centrifugo container healthy.
- `GET http://192.168.68.113:5500/health`: pass.
- `GET http://192.168.68.113:5500/ready`: pass.

## Review Disposition

Sub-agent reviews:

- Install-surface explorer found root peer resolution and stale lockfile causes.
- Typecheck explorer confirmed the 17 TypeScript errors and recommended runtime-neutral fixes.
- Test-harness explorer confirmed the unsafe `src/index.ts` import side effect and live E2E ambiguity.

Adversarial reviews:

- GPT-5.5 high flagged that capping the published `@chatsdk/react-native` peer range would be a compatibility regression. Resolved by keeping the broad peer range and pinning React Native only in the private root workspace.
- Antigravity flagged silent live-E2E no-op risk. Resolved by excluding live E2E from the default unit suite and adding a dedicated config that requires `TEST_API_URL`.
- Antigravity flagged root `--omit=dev` still includes React Native/Babel because all packages are root workspaces. Accepted for now because the production Docker path is API/core scoped and does not use root production install. This should be revisited during package/publish hardening.
- Antigravity flagged remaining non-null assertion debt. Accepted for now; central `requireUser` type narrowing belongs in auth hardening.

## Remaining Baseline Issues

- Protected routes still require `X-API-Key` plus bearer token.
- Root production install of all workspaces is not a production artifact and still includes React Native peer tooling.
- API/core Docker production audit still reports high/critical vulnerabilities.
- Live API E2E tests require seed data and header/auth updates before they can be a production gate.
- Meilisearch and Inngest/Novu remain non-fatal but noisy/unwired in the deployment.
- Realtime publish behavior still needs a dedicated hardening milestone.
