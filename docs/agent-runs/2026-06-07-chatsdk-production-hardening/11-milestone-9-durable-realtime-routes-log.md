# Milestone 9: Durable Realtime Coverage For Non-Message State

Date: 2026-06-08
Status: completed

## Scope

Convert the remaining durable DB-backed realtime routes to the realtime outbox and keep ephemeral typing/presence best-effort.

This milestone covers channel lifecycle, channel membership, channel read/unread state, read receipts, workspace lifecycle, workspace membership joins, poll create/vote/remove state, and link-preview message updates.

## Changes

- Added `packages/api/src/services/realtime-events.ts` as the shared domain-event wrapper around `enqueueRealtimeEvent`.
  - Centralizes `chat:*`, `user:*`, `workspace:*`, and event payload wrapping.
  - Provides guarded outbox drain triggering for post-commit use.
- Converted durable channel events in `packages/api/src/routes/channels.ts`.
  - Channel create, update, delete, member join, member leave, and read/unread updates now enqueue inside DB transactions.
  - Public/team workspace channel creation fans out to all workspace members who can see the channel.
  - Channel delete and member leave snapshot affected `user:*` recipients before subscription authorization can disappear.
  - Duplicate `ON CONFLICT DO NOTHING` member adds do not enqueue phantom join events.
- Converted durable workspace events in `packages/api/src/routes/workspaces.ts`.
  - Workspace create/update/delete and member joins now enqueue inside DB transactions.
  - Workspace create is scoped to the creator's user channel, not the app-wide channel.
  - Workspace update/delete/member-joined fan out to committed workspace member user channels.
  - Admin-add and invite-accept paths both publish `workspace.member_joined` to the committed member snapshot.
- Converted polls in `packages/api/src/routes/polls.ts`.
  - Poll create, vote, and vote removal now enqueue inside DB transactions.
  - Vote and vote removal lock the poll row with `FOR UPDATE` before modifying votes and totals.
  - Anonymous poll vote events no longer include selected `optionIds`; they emit aggregate state only.
- Converted `packages/api/src/routes/receipts.ts`.
  - Read receipt writes and outbox enqueue now occur inside one transaction.
  - Read-state updates are monotonic and cannot move `last_read_seq` backwards.
- Converted `packages/api/src/inngest/functions/link-preview.ts`.
  - Message link-preview update is scoped by `app_id`.
  - Message update and `message.updated` outbox enqueue occur in one transaction.
  - Link-preview outbox idempotency uses a preview content hash.
- Made typing and presence publishes best-effort.
  - These remain intentionally ephemeral and direct, but publish failures now warn instead of failing the route.
- Updated SDK event dispatch.
  - `packages/core/src/client/ChatClient.ts` now emits `channel.member_joined`, `channel.member_left`, `workspace.*`, `read_receipt`, and `poll.*`.
  - `packages/core/src/types.ts` now includes event types for these server-published events.

## Tests And Builds

- `npm run typecheck --workspace=@chatsdk/api`: passed.
- `npm test --workspace=@chatsdk/api`: 102 passed.
- `npm run build --workspace=@chatsdk/api`: passed.
- `npx vitest run src/__tests__/ChatClient.realtime-auth.test.ts` in `packages/core`: 4 passed.
- `npm run build --workspace=@chatsdk/core`: passed.
- `git diff --check`: passed.

New and expanded focused coverage:

- `packages/api/tests/durable-realtime-routes.test.ts`
  - workspace create events go only to committed member user channels, not `app:*`
  - public workspace channel creation includes all workspace members who can see it
  - duplicate channel member inserts do not enqueue join events
  - anonymous poll vote payloads omit `optionIds` and use poll row locking
  - admin-added workspace members enqueue `workspace.member_joined` to all committed members
- `packages/api/tests/production-contract.test.ts`
  - durable non-message route files use outbox helpers and do not directly publish to Centrifugo
  - typing/presence remain explicitly scoped as ephemeral direct publish paths
- `packages/core/src/__tests__/ChatClient.realtime-auth.test.ts`
  - SDK dispatches durable membership, workspace, read receipt, and poll events

## Live Verification

Deployment target:

- LXC: `chatsdk-hardening`
- API: `http://192.168.68.113:5500`
- Centrifugo: `http://192.168.68.113:8001`
- Database: external DB host configured at `192.168.68.110`.

Deploy actions:

- Synced local source to `/opt/chatsdk/source`.
- Rebuilt the API image in the LXC.
- Recreated the API container.
- Confirmed API and Centrifugo health.

Initial readiness:

```text
LIVE_M9_READY code=200
checks=database:ok,schema:ok,migrations:skipped,centrifugo:ok,realtimeOutbox:ok
realtimeOutbox="pending=0 failed=0 oldest_pending_seconds=0"
```

Controlled Centrifugo outage and workspace-member durable outbox smoke:

```text
LIVE_M9_CENTRIFUGO_STOPPED chatsdk-hardening-api Up About a minute (healthy)
workspace_member_add_http=200
event=workspace.member_joined status=processing attempts=1
channels=user:...hardening-member,user:...hardening-owner,user:...outsider
LIVE_M9_READY_AFTER_RECOVERY code=200 realtimeOutbox="pending=0 failed=1 oldest_pending_seconds=2"
latestWorkspaceMemberJoined=workspace.member_joined|published|2
outboxHealth=pending=0 failed=0
LIVE_M9_FINAL_READY code=200 realtimeOutbox="pending=0 failed=0 oldest_pending_seconds=0"
```

This proves a non-message durable event was accepted through the HTTP API while Centrifugo was down, persisted in `event_outbox`, retried after Centrifugo recovery, and published successfully.

Final container status:

```text
chatsdk-hardening-api: healthy
chatsdk-hardening-centrifugo: healthy
```

## Reviews

- Publish-path mapper identified remaining durable candidates in channels, workspaces, polls, receipts, and link-preview. These paths were converted.
- GPT-5.5 adversarial design review found:
  - app-wide durable `workspace.created` would leak membership-scoped workspace metadata
  - public workspace channel creation needed all visible workspace recipients
  - delete events should snapshot user recipients before resource subscription auth disappears
  - poll/read/receipt mutations needed transactional outbox boundaries
  - duplicate member adds should not enqueue no-op events
  - `read_receipt` was not dispatched by the SDK
  - link-preview update needed `app_id` scoping and transactional enqueue
- Fixes were implemented and covered by route, contract, and SDK tests.
- GPT-5.5 implementation review found:
  - SDK dropped durable `workspace.*`, `poll.*`, `read_receipt`, and membership events
  - anonymous poll votes leaked selected option ids
  - poll vote totals could be stale under concurrency without row locking
  - rollback-on-enqueue failure still needs real-Postgres integration coverage
- Fixes were implemented for SDK dispatch, anonymous poll privacy, and poll row locking.
- GPT-5.5 follow-up review found:
  - admin workspace member adds did not publish `workspace.member_joined`
  - invite acceptance only notified the joining user, not all existing members
- Fixes were implemented by fanning workspace member joins to the committed member snapshot.
- Antigravity was launched through `agy`, but the CLI returned only a model/session greeting and no review findings. This is recorded as inconclusive, not as an approval signal.

## Residuals

- Real-Postgres rollback tests for outbox enqueue failures are still pending. The production code uses `db.transaction`, but the current route tests mock transactions and cannot prove physical rollback.
- Browser-level Playwright coverage with seeded UI/WebSocket journeys remains pending.
- Legacy Centrifugo helper methods still exist in `services/centrifugo.ts`; durable route files no longer call them, but a later cleanup can remove or narrow the helper surface.
- Typing and presence remain best-effort direct publishes by design. They now warn on publish failure, but they are not durable.
- Live migration history remains skipped because the LXC database does not yet require Flyway history.
