# Milestone 8: Durable Realtime Outbox For Message Events

Date: 2026-06-08
Status: completed

## Scope

Add a durable realtime outbox for persistent message-related events so committed message state is not lost or blocked when Centrifugo is unavailable.

This milestone covers top-level message sends, message edits, message deletes, reactions, pin/unpin updates, unread fanout emitted during message send, and thread replies. It intentionally does not claim full conversion of every DB-backed realtime event in the API.

## Changes

- Added `event_outbox` schema in `docker/migrations/V005__realtime_event_outbox.sql`.
  - Rows include app, aggregate, event type, target channels, JSON payload, status, attempt count, retry timing, lock timing, publish timing, error text, idempotency key, and timestamps.
  - Added indexes for due work, app/status lookup, and unique idempotency keys.
- Mirrored the outbox schema in `docker/init-db.sql` because the test compose setup mounts that file directly instead of running Flyway migrations.
- Added `packages/api/src/services/realtime-outbox.ts`.
  - `enqueueRealtimeEvent` writes an outbox row using the caller-provided transaction client.
  - `drainRealtimeOutbox` claims due rows with `FOR UPDATE SKIP LOCKED`, publishes through Centrifugo, marks success, or schedules exponential retry on failure.
  - Stale `processing` rows are reclaimable after `REALTIME_OUTBOX_LOCK_TIMEOUT_MS`.
  - `startRealtimeOutboxWorker` starts an unref'd interval worker with an immediate drain.
  - `checkRealtimeOutboxHealth` reports pending depth, failed depth, and oldest pending age.
- Added realtime outbox metrics.
  - `chatsdk_realtime_outbox_depth`
  - `chatsdk_realtime_outbox_oldest_pending_seconds`
  - `chatsdk_realtime_outbox_publish_attempts_total`
  - `chatsdk_realtime_outbox_publish_duration_seconds`
- Added the outbox health check to `/ready`.
- Started the outbox worker during API startup.
- Made Centrifugo initialization tolerate ping failure in production by warning and returning the client. Readiness reports the dependency failure instead of preventing the API process from serving.
- Changed API compose dependency on Centrifugo from `service_healthy` to `service_started` in production and test compose so the API can start in degraded realtime mode.
- Converted persistent message-related publish paths to enqueue transactionally.
  - `POST /messages` enqueues `message.new`, channel unread changes, and total unread changes inside the message transaction.
  - Message edit/delete, reaction add/remove, and pin/unpin enqueue outbox rows.
  - Thread replies enqueue `message.new` and `thread.reply` inside the reply transaction.
- Guarded post-commit message side effects so notification/mention follow-up failures do not turn an already-committed message into a 500 response.

## Tests And Builds

- `npm test --workspace=@chatsdk/api`: 96 passed.
- `npm run typecheck --workspace=@chatsdk/api`: passed.
- `npm run build --workspace=@chatsdk/api`: passed.
- `git diff --check`: passed.

Focused verification:

```text
npm test --workspace=@chatsdk/api -- production-contract realtime-outbox message-outbox thread-outbox centrifugo-startup readiness
```

Result: 26 tests passed.

New focused coverage:

- `packages/api/tests/realtime-outbox.test.ts`
  - enqueue uses the provided transaction client
  - single-channel events publish and mark `published`
  - multi-channel events broadcast and mark `published`
  - publish failure marks retry state without throwing
  - stale `processing` rows are reclaimed
  - health query reports pending, failed, and oldest pending values
- `packages/api/tests/message-outbox.test.ts`
  - message send enqueues message and unread events transactionally
  - message send no longer directly publishes through Centrifugo
  - committed messages still return when the drain trigger throws
  - committed messages still return when post-commit notification side effects fail
- `packages/api/tests/thread-outbox.test.ts`
  - thread reply enqueues `message.new` and `thread.reply` transactionally
- `packages/api/tests/centrifugo-startup.test.ts`
  - production Centrifugo init warns and returns when ping fails
- `packages/api/tests/production-contract.test.ts`
  - verifies the outbox schema exists in the Flyway migration and direct init SQL
  - verifies message and thread routes use the realtime outbox instead of direct publish
  - verifies test compose only requires Centrifugo `service_started` for API startup

## Live Verification

Deployment target:

- LXC: `chatsdk-hardening`
- API: `http://192.168.68.113:5500`
- Centrifugo: `http://192.168.68.113:8001`
- Database: external DB host configured at `192.168.68.110`.

Deploy actions:

- Synced local source to `/opt/chatsdk/source`.
- Applied V005 SQL manually through a transient `postgres:16-alpine` container against the configured production database.
- Patched live `/opt/chatsdk/deploy/compose.yml` so the API depends on Centrifugo `service_started`, not `service_healthy`.
- Rebuilt and recreated the API container.
- Confirmed API and Centrifugo containers recovered healthy.

Final readiness:

```text
/ready code=200
checks=database:ok,schema:ok,migrations:skipped,centrifugo:ok,realtimeOutbox:ok
realtimeOutbox="pending=0 failed=0 oldest_pending_seconds=0"
```

Controlled Centrifugo outage and recovery smoke:

```text
LIVE_OUTBOX_DEGRADED_START_SMOKE health=200 ready=503 send=201
LIVE_OUTBOX_RECOVERY_SMOKE ready=200 messageId=7a0e2006-ff27-4237-9f57-0252d875b7fa
OUTBOX_STATUS_CORRECTED message.new|published|3
```

The first status lookup embedded in the smoke script was quote-mangled by the remote shell, so its `outbox=ERROR` field was not used as evidence. A corrected aggregate-id query returned `message.new|published|3`, proving the message event queued during outage and published after recovery.

## Reviews

- Schema review recommended the durable outbox table, due-work indexes, direct init SQL parity, and careful Vitest mocking of publish paths. These were implemented with the spec-aligned `event_outbox` table name.
- Publish-path review found all realtime publish locations and recommended converting DB-backed events while leaving typing/presence ephemeral. This milestone converted persistent message-related paths; the broader conversion remains residual scope.
- GPT-5.5 adversarial review found three high issues:
  - API startup still hard-depended on Centrifugo.
  - Durable outbox coverage was too narrow if the milestone claimed all realtime events.
  - Top-level message send could return 500 after the DB transaction committed because of post-commit side effects.
- Fixes implemented:
  - Centrifugo init no longer hard-fails API startup.
  - Compose allows API startup with Centrifugo only `service_started`.
  - Persistent message-related routes and thread replies use the outbox.
  - Post-commit message side effects are guarded.
- GPT-5.5 follow-up review found no blockers or high-severity issues for the converted message milestone.
- Antigravity was launched through `agy` before and after fixes, but the CLI exited successfully without returning review text. This is recorded as inconclusive, not as an approval signal.

## Residuals

- Non-message DB-backed realtime routes still need durable conversion or explicit scoping:
  - channel lifecycle, channel membership, read/unread and receipt state
  - workspace lifecycle and membership
  - poll state
  - link-preview/Inngest message update events
- Typing and presence are intentionally ephemeral; they should get timeout/backpressure protection rather than durable retry.
- Browser-level Playwright coverage with seeded UI/WebSocket journeys remains pending.
- Live V005 was applied manually; the LXC deployment still needs first-class Flyway integration if migration history is to become a required readiness gate.
- Outbox delivery is at least once. Clients should continue to tolerate duplicate realtime events by using event ids, message ids, aggregate ids, and REST backfill.
