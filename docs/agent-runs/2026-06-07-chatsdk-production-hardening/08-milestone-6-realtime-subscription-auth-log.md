# Milestone 6: Realtime Subscription Authorization

Date: 2026-06-08
Status: completed

## Scope

Harden realtime subscription authorization so a valid websocket connection token is not enough to subscribe to arbitrary guessed `chat:*`, `user:*`, `workspace:*`, or `app:*` channels.

This milestone also fixed immediate realtime namespace and private metadata issues surfaced by adversarial review. Durable outbox delivery, reconnect/backfill, and broader production operations remain follow-on milestones.

## Changes

- Added protected `POST /api/realtime/subscription-token`.
  - Requires user bearer auth.
  - Mints Centrifugo subscription JWTs with `sub`, `channel`, and `app_id` claims.
  - Rejects cross-app channel names.
  - Allows `user:{appId}:{userId}` only for the caller.
  - Allows `chat:{appId}:{channelId}` only for channel members or public/team channels visible through workspace rules.
  - Allows `workspace:{appId}:{workspaceId}` only for workspace members.
  - Allows `app:{appId}` only for app admins.
  - Caps channel names at 255 characters to match Centrifugo defaults.
- Updated the core SDK so Centrifugo subscriptions request backend subscription tokens through each subscription `getToken` callback.
- Bypassed mutation request dedupe for subscription-token fetches so rapid Centrifugo token refresh/resubscribe callbacks do not throw duplicate-request errors.
- Updated SDK realtime event routing for:
  - `channel.created`
  - `channel.deleted`
  - `channel.unread_changed`
  - `channel.total_unread_changed`
- Changed `channel.created` publishing from app-wide broadcast to member personal channels.
- Removed the app-wide fallback from `publishChannelCreated`; an empty recipient list now means no publish.
- Hardened Centrifugo config flags in `docker/centrifugo.json`:
  - `client_insecure: false`
  - `debug: false`
  - no broad `allow_subscribe_for_client`
  - no `user_subscribe_to_personal`
  - added `app` and `workspace` namespaces so existing server publishes do not hit unknown namespaces.
- Patched the LXC deployment's mounted Centrifugo config in place while preserving generated secrets.

## Tests And Builds

- `npm test --workspace=@chatsdk/api`: 65 passed.
- `npm test --workspace=@chatsdk/core -- --run`: 350 passed.
- `npm run typecheck --workspace=@chatsdk/api`: passed.
- `npm run build --workspace=@chatsdk/api`: passed.
- `npm run build --workspace=@chatsdk/core`: passed.
- `git diff --check`: passed.

New focused coverage:

- `packages/api/tests/realtime-auth.test.ts`
  - own user channel token minting with JWT claim verification
  - other-user personal channel denial
  - cross-app channel denial
  - over-255-character channel denial
  - private chat channel nonmember denial
  - workspace-scoped public chat channel allow for workspace members
  - app channel denial for non-admin users
- `packages/api/tests/centrifugo-config.test.ts`
  - mounted config does not enable insecure client subscriptions
  - required server-published namespaces exist
- `packages/core/src/__tests__/ChatClient.realtime-auth.test.ts`
  - SDK passes a subscription-token callback to Centrifugo
  - rapid repeated subscription token callbacks are not blocked by dedupe
  - channel lifecycle and unread realtime events dispatch to public listeners

## Live Verification

Deployment target:

- LXC: `chatsdk-hardening`
- API: `http://192.168.68.113:5500`
- Centrifugo: `http://192.168.68.113:8001`
- Database: external DB host configured in container environment.

Deploy actions:

- Synced local source to `/opt/chatsdk/source`.
- Patched `/opt/chatsdk/deploy/centrifugo.json` to remove broad client subscription settings and add `app`/`workspace` namespaces.
- Rebuilt the API image.
- Force-recreated Centrifugo to reload the mounted config.
- Restarted API and confirmed both containers healthy.

Live seeded API smoke:

```text
LIVE_REALTIME_AUTH_SMOKE ownUser=200 otherUser=403 memberChat=200 outsiderChat=403 appNonAdmin=403 longChannel=400 appPublish=true workspacePublish=true
```

Live deployed config smoke:

```text
LIVE_CENTRIFUGO_CONFIG_SMOKE configOk=True namespaces=app,chat,presence,user,workspace noBroadSubscribe=True
```

These prove:

- Authorized user-channel and private chat subscriptions can get signed subscription tokens.
- Other-user, private-channel nonmember, app-wide non-admin, and too-long channel requests are rejected.
- `app:*` and `workspace:*` publishes no longer fail because of missing Centrifugo namespaces.
- The deployed Centrifugo config is no longer allowing broad client-side namespace subscriptions.

## Reviews

- Initial GPT-5.5 realtime review found:
  - insecure client subscription settings
  - websocket token claims not sufficient for channel authorization
  - private channel metadata leak via app-wide `channel.created`
  - missing durable realtime outbox
  - missing reconnect/backfill wiring
  - SDK event dispatch gaps
  - realtime test fail-open gaps
- Initial GPT-5.5 operations review found adjacent deployment blockers:
  - prod compose/env name mismatches
  - placeholder secret validation gaps
  - prod Centrifugo config concerns
  - readiness not covering realtime/schema
  - missing `app`/`workspace` namespaces
- GPT-5.5 adversarial review after implementation found:
  - SDK still dropped channel lifecycle/unread events
  - subscription token fetch went through mutation dedupe
  - `publishChannelCreated` still had an app-wide fallback
  - channel length validation exceeded Centrifugo default
- Fixes were implemented and covered by tests.
- GPT-5.5 follow-up review found no remaining blockers for this milestone.
- Antigravity was launched through `agy` before and after fixes, but the CLI exited successfully without returning review text. This is recorded as inconclusive, not as an approval signal.

## Residuals

- Realtime delivery is not durable yet. Message/channel writes still need a transactional outbox and retrying publisher.
- Reconnect/backfill remains incomplete. `MessageSyncer` is still not fully wired into runtime reconnect/gap recovery.
- Live browser/WebSocket subscription tests are still pending; this milestone used API-level live token authorization and Centrifugo API publish/config smokes.
- Production operations remains a separate hardening track:
  - prod compose/env names must match runtime config
  - production startup should fail on placeholder/default/low-entropy secrets
  - readiness should cover DB, migrations, and Centrifugo API health
  - Docker health checks should use readiness rather than process-only health
  - repo-level prod Centrifugo config should be split from dev config and remove hardcoded placeholders/admin defaults.
