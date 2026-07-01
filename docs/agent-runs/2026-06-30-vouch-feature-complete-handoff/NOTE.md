# Vouch Feature-Complete Handoff

Date: 2026-06-30
Source request: `/Users/pushkar/vnet/docs/features/chatsdk-vouch-dm/CHATSDK_HANDOFF_REQUEST.md`

## Final State

- Updated `@chatsdk/core` and `@chatsdk/react` package manifests so external consumers resolve `dist` JavaScript and declarations instead of `src` TypeScript.
- Made `@chatsdk/react` depend on `@chatsdk/core@2.0.8` instead of `*`.
- Added CSS theme copying to the React package build so `@chatsdk/react/themes/*` can resolve from packed output.
- Added a post-build ESM specifier fix so packed `dist` output imports local files with `.js` extensions under NodeNext/Node ESM.
- Added `zod` as a direct `@chatsdk/core` dependency because the public package entrypoint exports schema code that imports it at runtime.
- Added channel member `custom` metadata to list/get member responses so Vouch can display `username`, `displayName`, `avatarUrl`, and other Vouch profile fields from ChatSDK channel payloads.
- Expanded private-data authorization coverage for nonmember access to single-message reads, read receipts/status, thread reads, thread participants, pinned messages, saved messages, poll results, and poll voting.
- Added `npm run smoke:private-isolation` for live shared-server checks that a third user cannot list, read, send to, or inspect read status for another pair's DM.
- Added the durable response at `docs/features/vouch-integration/HANDOFF_RESPONSE_2026-06-30.md`.

## Evidence

- `npm install --package-lock-only --ignore-scripts`
- `npm run build --workspace=@chatsdk/react` passes and runs the core prebuild first.
- `npm pack --workspace=@chatsdk/core --dry-run` shows only `dist/**` plus package metadata.
- `npm pack --workspace=@chatsdk/react --dry-run` shows clean `dist/**` React output, `dist/themes/default.css`, and no bundled `dist/core/src` output.
- Fresh tarball consumer check passed:
  - Packed `@chatsdk/core@2.0.8` and `@chatsdk/react@2.0.8` into `/tmp/chatsdk-e2e-pack`.
  - Installed both tarballs into a blank `/tmp/chatsdk-consumer-test` project with React 18, React DOM, TanStack Query, TypeScript, and React types.
  - `npx tsc --noEmit` passed for imports from `@chatsdk/core` and `@chatsdk/react`.
  - Runtime ESM import passed: `typeof createChatClient`, `typeof ChatProvider`, and `typeof useMessages` all resolved to `function`.
- `npm --workspace @chatsdk/api test -- --run tests/private-data-auth.test.ts` passed 37/37.
- `npm --workspace @chatsdk/api test` passed 33 files, skipped 2 files, passed 298 tests, skipped 7 tests.
- `npm --workspace @chatsdk/core test -- --run` passed 18 files and 351 tests.
- `npm run build --workspace=@chatsdk/react` passed.
- `npm --workspace @chatsdk/react test -- --run` passed 4 files and 43 tests.
- Live shared-server private isolation passed:
  - `npm run smoke:private-isolation` passed 16/16 against `http://192.168.68.244:5500` and `http://192.168.68.244:5511/api/chatsdk-token`.
  - The two DM members could read the private message.
  - A third minted user was excluded from channel list and denied DM message list, single-message read, send, and read-status access.
- Live shared-server project smoke passed:
  - `npm run smoke:project -- --origin https://vouch.vedalogy.com` passed 12/12, including WebSocket connect, deterministic DM ensure, browser `channel:create` denial, message send, and message query.
- GitHub Actions runner update:
  - Added local OrbStack/Docker runner `chatsdk-ci-linux` for repo `Impact-Idol/ChatSDK` with labels `self-hosted,Linux,ARM64,chatsdk`.
  - Updated `Build and Push Docker Images` to target that runner and added QEMU setup for multi-platform Docker builds.
  - Fixed `docker/Dockerfile.api` to copy `scripts/fix-esm-extensions.mjs` before package builds; local Docker build `docker build -f docker/Dockerfile.api -t chatsdk-api:local-runner-check .` passed.
- `./scripts/graphify update . --wiki` completed with 8708 nodes, 11378 edges, 579 communities, and 589 wiki articles.

## Security Notes

- The local API suite now specifically proves nonmembers are denied before private message bodies, read receipts, read state, thread replies, thread participants, saved-message writes, and poll vote data are queried or mutated.
- `GET /api/channels/:channelId/messages/pins` currently returns `403` or `404` depending on route matching, but the private-data test asserts it does not query `pinned_message` for a nonmember. This is a product/API route-shape cleanup, not evidence of a private-data leak.
- No live authenticated Vouch browser Playwright flow was run in this pass. The evidence is package-consumer installation/runtime verification, local API/core/react tests, and live shared-server smoke probes using ChatSDK's token broker/app key.

## Follow-Ups

- Publish `@chatsdk/core@2.0.8` and `@chatsdk/react@2.0.8` to the chosen npm registry, or generate and hand off stable `npm pack` tarballs.
- Vouch should keep people search in Vouch for the first adult-only DM launch and pass selected Vouch user IDs to its server-side DM ensure route.
