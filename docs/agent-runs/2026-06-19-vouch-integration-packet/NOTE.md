# Vouch Integration Packet Run

Date: 2026-06-19
Repo: `/Users/pushkar/chatsdk`

## Request

Create a ChatSDK-side handoff artifact to help VNet/Vouch integrate the shared ChatSDK server properly, without modifying `/Users/pushkar/vnet`.

## Final State

Added `docs/features/vouch-integration/INTEGRATION_PACKET.md`.

Added ChatSDK-side integration readiness artifacts:

- `docs/features/vouch-integration/starter/README.md`
- `docs/features/vouch-integration/starter/.env.example`
- `docs/features/vouch-integration/starter/app-api-chatsdk-token-route.ts`
- `docs/features/vouch-integration/starter/VouchChatSDKProvider.tsx`
- `docs/features/vouch-integration/starter/messages-page.tsx`
- `scripts/smoke/shared-server-smoke.mjs`
- `npm run smoke:shared-server`

The packet translates `docs/SHARED_SERVER_INTEGRATION.md` into Vouch-specific guidance:

- Feasibility verdict for development and production.
- Recommended Vouch provider, route, navigation, and policy integration points.
- Backend token proxy contract.
- Frontend provider shape.
- Messaging policy checklist for minors, blocking, privacy, squad membership, and moderation.
- Narrow first implementation slice.
- Development and production validation checks.
- Claims that should be reverified against exact ChatSDK and Vouch implementation commits.

Updated product memory:

- `docs/product-memory/CURRENT_MISSION.md`
- `docs/product-memory/RESUME.md`

## Evidence

Read:

- `docs/product-memory/RESUME.md`
- `docs/SHARED_SERVER_INTEGRATION.md`
- `packages/react/src/hooks/ChatProvider.tsx`
- `packages/core/src/client/ChatClient.ts`
- Vouch feasibility prompt at `/Users/pushkar/vnet/docs/agent-runs/2026-06-19-chatsdk-feasibility/artifacts/claude/prompts/feasibility-review.md`
- Read-only Vouch context for provider/auth/nav placement.

No Vouch files were modified.

## Verification

Verified by reading back the new packet and starter.

Checks run:

- `node --check scripts/smoke/shared-server-smoke.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json ok')"`
- `npm run smoke:shared-server`

Live smoke result on 2026-06-19:

- API health passed.
- Token broker health passed.
- Primary user token mint passed.
- WebSocket connect passed.
- Peer user token mint passed.
- Authenticated channel query passed.
- Deterministic DM create/open passed.
- Message send passed.
- Message query passed.

Smoke endpoint evidence:

- API: `http://192.168.68.244:5500`
- Token broker: `http://192.168.68.244:5511/api/chatsdk-token`
- WebSocket: `ws://192.168.68.244:8001/connection/websocket`
- Result: 9 passed, 0 failed.

## 2026-06-19 Client Confirmation Checklist

Confirmed shared server env values:

- API: `http://192.168.68.244:5500`
- WS: `ws://192.168.68.244:8001/connection/websocket`
- Token: `http://192.168.68.244:5511/api/chatsdk-token`

Origin probe results:

- `http://localhost:3000`: API and token broker preflights allowed.
- `http://192.168.68.244:5173`: API and token broker preflights allowed.
- `http://localhost:4500`: API preflight returned 204 but without `Access-Control-Allow-Origin`; token broker returned 403 `origin_not_allowed`.
- `http://localhost:3001`: API preflight returned 204 but without `Access-Control-Allow-Origin`; token broker returned 403 `origin_not_allowed`.
- `https://vouch.vedalogy.com`: API preflight returned 204 but without `Access-Control-Allow-Origin`; token broker returned 403 `origin_not_allowed`.
- Server-side token broker calls without an `Origin` header succeeded.

WebSocket origin probe results:

- `http://localhost:3000`: WebSocket upgrade returned 101.
- `http://192.168.68.244:5173`: WebSocket upgrade returned 101.
- `http://localhost:4500`: WebSocket upgrade returned 403.
- `http://localhost:3001`: WebSocket upgrade returned 403.
- `https://vouch.vedalogy.com`: WebSocket upgrade returned 403.

Added the Vouch dev/demo origin set to the ChatSDK handoff docs and starter:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:4500,http://192.168.68.245:4500,http://192.168.68.244:5173,https://vouch.vedalogy.com
CENTRIFUGO_ALLOWED_ORIGINS=http://localhost:3000 http://localhost:3001 http://localhost:4500 http://192.168.68.245:4500 http://192.168.68.244:5173 https://vouch.vedalogy.com
TOKEN_BROKER_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:4500,http://192.168.68.245:4500,http://192.168.68.244:5173,https://vouch.vedalogy.com
```

The live deployment environment for `192.168.68.244` was not found in this workspace, so applying these to the running services still requires access to the LAN deployment env or host.

## 2026-06-19 LAN Deployment Update

Applied the Vouch origin allowlist to the running Proxmox-hosted shared ChatSDK deployment at `192.168.68.244`.

Deployment path:

- `/opt/chatsdk/deploy`

Files updated:

- `/opt/chatsdk/deploy/.env`
- `/opt/chatsdk/deploy/token-broker.override.yml`
- `/opt/chatsdk/deploy/centrifugo.json`

Backups were created on the host with stamp `20260619151022` before edits.

Services recreated:

- `chatsdk-hardening-api`
- `chatsdk-hardening-centrifugo`
- `chatsdk-demo-token-broker`

Post-restart status:

- API container healthy.
- Centrifugo container healthy.
- Token broker container healthy.
- `http://192.168.68.244:5500/health` returned OK.
- `http://192.168.68.244:5511/health` returned OK.

Post-restart origin verification:

- API CORS preflight returned 204 with matching `Access-Control-Allow-Origin` for all Vouch origins.
- Token broker CORS preflight returned 204 with matching `Access-Control-Allow-Origin` for all Vouch origins.
- Browser-style token mint returned 200 with matching `Access-Control-Allow-Origin` for all Vouch origins.
- WebSocket upgrade returned 101 for all Vouch origins.

Verified origins:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:4500`
- `http://192.168.68.245:4500`
- `http://192.168.68.244:5173`
- `https://vouch.vedalogy.com`

Post-restart smoke:

- `npm run smoke:shared-server`
- Result: 9 passed, 0 failed.

Confirmed token response shape from live broker:

- Top-level keys: `user`, `token`, `refreshToken`, `wsToken`, `expiresIn`, `_internal`.
- Vouch-sent `userId` is persisted as `user.id`.
- JWT access token and WebSocket token both carry the same `user_id`.

Confirmed DM behavior from live API:

- `messaging` channels with zero peer IDs return 400.
- `messaging` channels with one peer ID create successfully.
- Repeating the same two users returns the same channel ID and same deterministic CID.

Confirmed membership enforcement from live API:

- Nonmember message read: 403 `Not a member of this channel`.
- Nonmember message write: 403 `Not a member of this channel`.
- Nonmember realtime subscription token: 403 `Not a member of this channel`.

Confirmed member removal behavior from live API:

- Member could read before removal.
- Owner removal returned 200 `{ "success": true }`.
- Removed member message read: 403 `Not a member of this channel`.
- Removed member message write: 403 `Not a member of this channel`.
- Removed member realtime subscription token: 403 `Not a member of this channel`.
- Source also calls Centrifugo unsubscribe after deletion in `packages/api/src/routes/channels.ts`.

## Follow-Ups

- If VNet provides the exact Vouch branch/commit for implementation, reverify session helper, block/privacy APIs, and final route placement.
- If the shared ChatSDK deployment is moved out of LAN demo mode, update the packet with public HTTPS/WSS URLs and production operations details.

## 2026-06-19 User Bootstrap Update

Implemented server-side user bootstrap APIs for Vouch reliability:

- `POST /api/users/ensure`
- `POST /api/users/bulk-ensure`

Both routes require ChatSDK app/server auth via `X-API-Key`; browser bearer tokens are rejected. They are intentionally separate from browser token minting.

Single ensure behavior:

- Creates the user if missing.
- Returns existing user if already present and unchanged.
- Updates safe supplied profile fields.
- Returns `action` as `created`, `updated`, or `existing`.
- Uses Vouch `userId` as the stable ChatSDK user ID.

Bulk ensure behavior:

- Accepts up to 1000 users per request.
- Returns per-user results and counts.
- Returns per-user errors for backfill troubleshooting.

Local verification:

- `npm --workspace @chatsdk/api test -- --run tests/auth-modes.test.ts`
- `npm --workspace @chatsdk/api run build`

Deployment:

- Copied updated API source and tests to `/opt/chatsdk/source` on `192.168.68.244`.
- Rebuilt and recreated the API service from `/opt/chatsdk/deploy`.

Live verification on `192.168.68.244`:

- `POST /api/users/ensure` create returned `201` with `action: "created"`.
- Repeating `POST /api/users/ensure` returned `200` with `action: "existing"`.
- Supplying changed profile fields returned `200` with `action: "updated"`.
- `POST /api/users/bulk-ensure` returned `200` with two created users, one existing user, and zero errors.
- Browser-style bearer auth against `POST /api/users/ensure` returned `401`.

Updated Vouch handoff docs with the bootstrap contract:

- `docs/SHARED_SERVER_INTEGRATION.md`
- `docs/features/vouch-integration/INTEGRATION_PACKET.md`
- `docs/features/vouch-integration/starter/README.md`

## 2026-06-19 Server-Side DM Authorization Update

Implemented the long-term Vouch channel-creation contract:

- Added `POST /api/channels/dm/ensure`.
- Added `channel:create` as the scoped permission for browser/user `POST /api/channels`.
- Updated the LAN token broker to mint scoped browser tokens without `channel:create`.
- Updated token refresh handling so scoped legacy refresh tokens preserve scopes.
- Updated Vouch starter guidance so the browser calls a Vouch route, and the Vouch backend calls ChatSDK after policy approval.

Vouch policy boundary:

- Vouch enforces blocks, minor status, account status, privacy, and eligibility.
- Vouch calls ChatSDK `POST /api/channels/dm/ensure` with `X-API-Key`.
- Vouch browser tokens receive messaging scopes such as `chat:read` and `chat:write`, but not `channel:create`.

Local verification:

- `node --check scripts/deploy/chatsdk-lan-token-broker.mjs`
- `node --check scripts/smoke/shared-server-smoke.mjs`
- `npm --workspace @chatsdk/api test -- --run tests/auth-modes.test.ts tests/channel-idempotency.test.ts tests/broker-token-mint.test.ts`
- `npm --workspace @chatsdk/api run build`

Deployment:

- Copied changed API source and LAN token broker script to `/opt/chatsdk/source` on `192.168.68.244`.
- Rebuilt `chatsdk-hardening-api:local`.
- Recreated `chatsdk-hardening-api` and `chatsdk-demo-token-broker`.

Live verification on `192.168.68.244`:

- `POST /api/channels/dm/ensure` created a deterministic DM with `201` and `action: "created"`.
- Repeating `POST /api/channels/dm/ensure` returned the same DM with `200` and `action: "existing"`.
- Token broker access, refresh, and WebSocket tokens included scopes: `chat:read`, `chat:write`, `typing:write`, `reaction:write`, `search:read`.
- Browser/user `POST /api/channels` returned `403` with `Token scope required: channel:create`.
- Sending a message inside the server-created DM still returned `201`.
- Updated shared-server smoke passed 10/10, including browser channel creation denial.

## 2026-06-19 Security Review and Hardening

Ran independent security review with:

- GPT-5.5 High sub-agent.
- Claude Code `claude -p`.

Findings fixed:

- Unscoped user/browser tokens could still create channels because `requireScope` allowed missing scopes. `channel:create` now fails closed when scopes are missing.
- Raw hyphen-joined DM CIDs could collide for user IDs containing hyphens and could exceed the DB `cid` length. DM CIDs now use a bounded SHA-256 hash of the sorted requester/peer IDs.
- Concurrent first-time `dm/ensure` calls could hit the `(app_id, cid)` unique constraint and return 500. The insert now resolves atomically with `ON CONFLICT (app_id, cid) DO NOTHING` and re-selects by CID.
- `idempotencyKey` could return a different channel on key reuse. DM ensure now treats the requester/peer pair as the idempotency key and resolves by deterministic CID.
- `dm/ensure` lacked request size and route mutation limits. It now has a body limit, bounded `custom`, app write budget, and channel mutation rate limit.
- Server-created DMs gave requester `owner`, allowing member-add/role-change policy bypasses. Server-created DMs now give both participants `member`, and member-add/role-change routes reject `messaging` channels.
- `custom` was stored in member-visible channel `config`. DM ensure now stores an empty config and treats `custom` as a compatibility/no-op field.
- Vouch handoff docs now state that backend calls must strip browser `Authorization` and send only server-side `X-API-Key`.

Local verification:

- `npm --workspace @chatsdk/api test -- --run tests/auth-modes.test.ts tests/channel-idempotency.test.ts tests/broker-token-mint.test.ts`
- Result: 3 files passed, 36 tests passed.
- `npm --workspace @chatsdk/api run build`

Live verification on `192.168.68.244` after hardening:

- `POST /api/channels/dm/ensure` returned `201`, `action: "created"`.
- Repeating the same requester/peer returned `200`, `action: "existing"`, same channel.
- DM CID is bounded hashed format `messaging:dm:<sha256>`.
- DM `config` returned `{}` even when `custom` was supplied.
- Both server-created DM participants have role `member`.
- Scoped browser/user `POST /api/channels` returned `403 Token scope required: channel:create`.
- Synthetic unscoped browser/user `POST /api/channels` returned `403 Token scope required: channel:create`.
- Member add as normal DM member returned `403 Permission denied`.
- Member add as simulated old DM owner returned `403 Direct message membership is fixed`.
- Role change as simulated old DM owner returned `403 Direct message roles are fixed`.
- Message send in server-created DM returned `201`.
- Final shared-server smoke passed 10/10.

## 2026-06-20 Vouch Dedicated App Provisioning

Provisioned a dedicated ChatSDK app for Vouch instead of sharing the demo app API key.

- App name: `Vouch`
- App ID: `546aff6b-d3be-4dec-819b-576b42362ea9`
- Server-only API key: stored locally at `.secrets/vouch-chatsdk-app-api-key.env`; intentionally not recorded in docs or chat.
- LAN API URL: `http://192.168.68.244:5500`
- LAN token URL: `http://192.168.68.244:5511/api/chatsdk-token`

Deployment changes:

- Created the Vouch app row in the live database on `192.168.68.244`.
- Updated `/opt/chatsdk/deploy/token-broker.override.yml` so `CHATSDK_BROKER_APP_ID` points at the Vouch app.
- Recreated `chatsdk-demo-token-broker`; health returned `healthy`.
- Added `.secrets/` to `.gitignore` so local handoff keys cannot be accidentally committed.

Live verification:

- `POST /api/users/ensure` with the Vouch app API key returned `201`.
- `POST /api/channels/dm/ensure` with the Vouch app API key returned `201` for first create.
- Repeating `POST /api/channels/dm/ensure` for the same requester/peer returned `200` and the same channel ID/CID.
- Token broker mint from `https://vouch.vedalogy.com` returned a browser token with `app_id: 546aff6b-d3be-4dec-819b-576b42362ea9`.
- Browser/user direct `POST /api/channels` with the Vouch broker token returned `403 Token scope required: channel:create`.

## 2026-06-20 Server-Side Group/Squad Ensure

Implemented and deployed server/app-auth endpoints for Vouch non-DM conversations:

- `POST /api/channels/group/ensure`
- `POST /api/channels/squad/ensure`

Contract:

- Requires `X-API-Key`; browser bearer tokens are rejected.
- Accepts `externalId` or `idempotencyKey`; the selected value is the deterministic channel CID.
- Accepts explicit `memberIds`.
- Requires all member users to already exist in ChatSDK.
- Creates a channel if missing, returns `201` and `action: "created"`.
- Returns the existing channel if present, returns `200` and `action: "existing"`.
- Stores `custom` metadata in channel `config`.
- `/api/channels/squad/ensure` returns a normal ChatSDK `group` channel with squad semantics in config.
- Vouch remains responsible for blocks, minors, account status, squad/org eligibility, and exact member approval.

Local verification:

- `npm --workspace @chatsdk/api test -- --run tests/channel-idempotency.test.ts tests/auth-modes.test.ts`
- Result: 2 files passed, 36 tests passed.
- `npm --workspace @chatsdk/api run build`

Deployment:

- Copied `packages/api/src/routes/channels.ts` and `packages/api/src/middleware/auth.ts` to `/opt/chatsdk/source` on `192.168.68.244`.
- Rebuilt `chatsdk-hardening-api:local`.
- Recreated `chatsdk-hardening-api`.
- Applied additive live DB compatibility table `app_api_key` because the deployed auth middleware now supports app-scoped API keys.

Live verification on `192.168.68.244`:

- Created three Vouch smoke users with `POST /api/users/ensure`.
- `POST /api/channels/squad/ensure` returned `201`, `action: "created"`, type `group`, CID `vouch:squad:<id>`.
- Repeating the same squad ensure returned `200`, `action: "existing"`, same channel ID/CID.
- `POST /api/channels/group/ensure` returned `201`, `action: "created"`, type `group`, CID `vouch:group:<id>`.
- Group ensure with a missing member returned `404` and `missingUserIds`.
- Browser bearer token call to `/api/channels/group/ensure` returned `403`.
- Browser direct `POST /api/channels` returned `403 Token scope required: channel:create`.
- `CHATSDK_APP_API_KEY`-backed `npm run smoke:shared-server` passed 10/10.
