# Multi-Project Onboarding Runbook

Status: complete
Date: 2026-06-20

This runbook is the generic operator path for onboarding an embedding project such as Vouch. Vouch is a reference project, not a special branch in ChatSDK.

## Guardrails

- Use one ChatSDK app per project/environment.
- Do not use `001`, `demo`, or shared development app IDs for customer projects.
- Browser tokens should not receive `channel:create` unless the embedding product deliberately allows browser-created channels.
- Server API keys are server-only. Do not expose them to browsers, docs, screenshots, or smoke output.
- App-scoped server API keys are shown once and stored as hashes in `app_api_key.api_key_hash`; primary `app.api_key` auth is disabled unless `CHATSDK_ENABLE_PRIMARY_APP_KEY_AUTH=true`.
- Broker scopes must use exact origins and nonempty tenant, user-prefix, and channel-prefix constraints.
- When a user leaves a squad/org role, remove them from the ChatSDK channel. Messages stay stored; removed users lose normal read/write/member-list/realtime access.

## Provision App and Server Key

Create or inspect an app with an app-scoped server key:

```bash
npm run ops:provision:project -- create \
  --slug seed-project-a-dev \
  --environment development \
  --name "Seed Project A Dev" \
  --origins http://localhost:3000 \
  --browser-scopes chat:read,chat:write,typing:write \
  --server-key-name seed-project-a-dev-server \
  --json
```

Emit a newly generated secret only when storing it into a secret manager:

```bash
npm run ops:provision:project -- create \
  --slug seed-project-a-dev \
  --environment development \
  --name "Seed Project A Dev" \
  --server-key-name seed-project-a-dev-server \
  --emit-secret \
  --json
```

Rotate a server key:

```bash
npm run ops:provision:project -- rotate-key \
  --slug seed-project-a-dev \
  --environment development \
  --server-key-name seed-project-a-dev-server \
  --emit-secret \
  --json
```

## Provision Broker Scope

Create broker client, credential, and app scope rows:

```bash
npm run ops:provision:project -- provision-broker \
  --slug seed-project-a-dev \
  --environment development \
  --broker-client-slug seed-project-a-development \
  --broker-client-name "Seed Project A Development Broker" \
  --broker-credential-kid seed-project-a-development-rs256-1 \
  --external-tenant-ids tenant-a \
  --user-id-prefixes seed-a- \
  --channel-id-prefixes seed-a- \
  --origins http://localhost:3000 \
  --default-scopes chat:read,chat:write \
  --allowed-scopes chat:read,chat:write,typing:write,upload:write,search:read,reaction:write \
  --max-token-ttl-seconds 900 \
  --max-membership-fanout 1000 \
  --json
```

Use `--emit-secret` only when capturing the generated private JWK into the project-owned broker secret store. Default output suppresses the private JWK.

## Dry-Run Project Smoke

Validate smoke configuration without network calls or secret leakage:

```bash
npm run smoke:project -- \
  --slug seed-project-a-dev \
  --api-url http://192.168.68.244:5500 \
  --token-url http://192.168.68.244:5511/api/chatsdk-token \
  --ws-url ws://192.168.68.244:8001/connection/websocket \
  --api-key "$CHATSDK_API_KEY" \
  --origin http://localhost:3000 \
  --dry-run \
  --json
```

The dry-run output must redact the API key.

## Live Project Smoke

Run live smoke after the app, API key, origins, token broker, and users are ready:

```bash
CHATSDK_API_KEY="$CHATSDK_API_KEY" \
npm run smoke:project -- \
  --slug seed-project-a-dev \
  --api-url http://192.168.68.244:5500 \
  --token-url http://192.168.68.244:5511/api/chatsdk-token \
  --ws-url ws://192.168.68.244:8001/connection/websocket \
  --origin http://localhost:3000
```

The smoke command checks:

- API health
- token broker health
- optional app-key user ensure
- token mint
- WebSocket connect unless `--skip-ws` is used
- authenticated channel query
- deterministic DM ensure/open
- browser channel-create denial when scoped tokens omit `channel:create`
- message send and readback

## Membership Sync Checks

For broker-backed projects, the server membership snapshot route is:

```text
PUT /api/server/apps/:appId/memberships/:userId
```

Expected behavior:

- active snapshots upsert current channel roles
- omitted channels are removed
- `disabled`, `suspended`, and `removed` statuses remove channel memberships
- removed/suspended/disabled status revokes sessions and enqueues realtime disconnect
- removed channel memberships enqueue realtime unsubscribe
- messages are not deleted by membership removal
- stale revisions cannot resurrect removed access

## Seed Conventions

Use deterministic names in smoke and review artifacts:

- Project A: `seed-project-a-dev`, tenant `tenant-a`, prefixes `seed-a-`
- Project B: `seed-project-b-dev`, tenant `tenant-b`, prefixes `seed-b-`
- Project A users: `seed-a-owner`, `seed-a-member`, `seed-a-removed`
- Project B users: `seed-b-owner`, `seed-b-member`, `seed-b-removed`

## Troubleshooting

- `Token scope required: channel:create`: browser token is correctly blocked from arbitrary channel creation.
- `Broker scope constraints must be non-empty`: broker scope row is unsafe or incomplete; reprovision with tenant/user/channel constraints.
- `Broker membership is missing or stale`: submit a fresh active membership snapshot before token minting.
- Origin errors: use exact origins only, with no wildcard, trailing slash, path, or query.
- API key rejected: confirm the key matches an active `app_api_key.api_key_hash`; primary `app.api_key` auth is disabled unless `CHATSDK_ENABLE_PRIMARY_APP_KEY_AUTH=true`.
