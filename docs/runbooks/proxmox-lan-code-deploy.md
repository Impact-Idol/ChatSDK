# ChatSDK LAN Code Deployment Runbook

Status: active LAN runbook
Updated: 2026-06-21

This runbook covers deploying this ChatSDK repo's code to the current LAN host at `192.168.68.244`.

It is intentionally code-focused. It does not cover Vouch application deployment, public HTTPS/WSS ingress, DNS, production backups, or client-side rollout.

## Current Host

- Host: `192.168.68.244`
- SSH user: `root`
- Source path: `/opt/chatsdk/source`
- Deploy path: `/opt/chatsdk/deploy`
- API URL: `http://192.168.68.244:5500`
- WebSocket URL: `ws://192.168.68.244:8001/connection/websocket`
- Token broker URL: `http://192.168.68.244:5511/api/chatsdk-token`

Compose files:

```bash
/opt/chatsdk/deploy/compose.yml
/opt/chatsdk/deploy/token-broker.override.yml
/opt/chatsdk/deploy/inngest.override.yml
```

Main containers:

```text
chatsdk-hardening-api
chatsdk-demo-token-broker
chatsdk-hardening-centrifugo
chatsdk-hardening-meilisearch
chatsdk-hardening-inngest
```

## Preflight

From the local repo:

```bash
cd /Users/pushkar/chatsdk
git status --short
```

Run the smallest meaningful checks for the changed surface.

For API route/auth changes:

```bash
npm --workspace @chatsdk/api test -- --run tests/channel-idempotency.test.ts tests/auth-modes.test.ts
npm --workspace @chatsdk/api run build
```

For token broker script changes:

```bash
node --check scripts/deploy/chatsdk-lan-token-broker.mjs
```

For smoke script changes:

```bash
node --check scripts/smoke/shared-server-smoke.mjs
```

Confirm the remote stack is reachable:

```bash
ssh root@192.168.68.244 '
  cd /opt/chatsdk/deploy &&
  docker compose -f compose.yml -f token-broker.override.yml -f inngest.override.yml ps
'
```

## Sync Code

Prefer targeted sync for small changes. This avoids moving local-only files and makes the deployment easier to audit.

API route or middleware example:

```bash
rsync -av packages/api/src/routes/channels.ts \
  root@192.168.68.244:/opt/chatsdk/source/packages/api/src/routes/channels.ts

rsync -av packages/api/src/middleware/auth.ts \
  root@192.168.68.244:/opt/chatsdk/source/packages/api/src/middleware/auth.ts
```

Token broker script example:

```bash
rsync -av scripts/deploy/chatsdk-lan-token-broker.mjs \
  root@192.168.68.244:/opt/chatsdk/source/scripts/deploy/chatsdk-lan-token-broker.mjs
```

Migration file example:

```bash
rsync -av docker/migrations/V015__app_scoped_api_keys.sql \
  root@192.168.68.244:/opt/chatsdk/source/docker/migrations/V015__app_scoped_api_keys.sql
```

For a broader code sync, use this only when you intend to refresh the remote source tree:

```bash
rsync -az --delete \
  --exclude '.git/' \
  --exclude '.secrets/' \
  --exclude 'node_modules/' \
  --exclude 'packages/*/dist/' \
  --exclude 'graphify-out/' \
  /Users/pushkar/chatsdk/ \
  root@192.168.68.244:/opt/chatsdk/source/
```

Do not sync local secret files. Runtime secrets live in `/opt/chatsdk/deploy/.env` and should remain root-only on the server.

## Apply Database Migrations

If the code requires a new migration, apply it before or during the compatible deploy window.

The current LAN stack does not rely on a first-class Flyway service during normal manual deploys. For additive migrations, run SQL through the API container using its existing `DATABASE_URL`.

Example for an additive migration:

```bash
ssh root@192.168.68.244 'docker exec -i chatsdk-hardening-api node -' <<'NODE'
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_api_key (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id UUID NOT NULL REFERENCES app(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      api_key VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      revoked_at TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_app_api_key_app_active
      ON app_api_key (app_id, created_at DESC)
      WHERE revoked_at IS NULL
  `);
})()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
NODE
```

Rules:

- Only apply reviewed migrations.
- Prefer additive, backward-compatible migrations.
- Do not print secrets or connection strings.
- Record any manually applied migration in the relevant agent-run note.
- For destructive migrations, stop and write a specific rollback plan first.

## Rebuild And Restart

API-only deploy:

```bash
ssh root@192.168.68.244 '
  cd /opt/chatsdk/deploy &&
  docker compose -f compose.yml -f token-broker.override.yml -f inngest.override.yml build api &&
  docker compose -f compose.yml -f token-broker.override.yml -f inngest.override.yml up -d --force-recreate api
'
```

Token broker code/config deploy:

```bash
ssh root@192.168.68.244 '
  cd /opt/chatsdk/deploy &&
  docker compose -f compose.yml -f token-broker.override.yml -f inngest.override.yml up -d --force-recreate token-broker
'
```

Centrifugo config deploy:

```bash
ssh root@192.168.68.244 '
  cd /opt/chatsdk/deploy &&
  docker compose -f compose.yml -f token-broker.override.yml -f inngest.override.yml up -d --force-recreate centrifugo
'
```

Full stack recreate, only when needed:

```bash
ssh root@192.168.68.244 '
  cd /opt/chatsdk/deploy &&
  docker compose -f compose.yml -f token-broker.override.yml -f inngest.override.yml up -d --force-recreate
'
```

## Health Checks

Wait for container health:

```bash
ssh root@192.168.68.244 '
  for name in chatsdk-hardening-api chatsdk-demo-token-broker chatsdk-hardening-centrifugo; do
    printf "%s " "$name"
    docker inspect -f "{{.State.Health.Status}}" "$name"
  done
'
```

Endpoint checks:

```bash
curl -fsS http://192.168.68.244:5500/health
curl -fsS http://192.168.68.244:5511/health
```

If health fails, inspect logs:

```bash
ssh root@192.168.68.244 'docker logs --tail 120 chatsdk-hardening-api'
ssh root@192.168.68.244 'docker logs --tail 120 chatsdk-demo-token-broker'
ssh root@192.168.68.244 'docker logs --tail 120 chatsdk-hardening-centrifugo'
```

## Smoke Verification

For the current Vouch app-backed shared-server smoke:

```bash
cd /Users/pushkar/chatsdk
set -a
. .secrets/vouch-chatsdk-app-api-key.env
set +a
npm run smoke:shared-server
```

Expected result:

```text
Shared-server smoke summary: 10 passed, 0 failed
```

For a specific app/project, use the project smoke script after provisioning that project's app ID/key:

```bash
CHATSDK_API_URL=http://192.168.68.244:5500 \
CHATSDK_TOKEN_URL=http://192.168.68.244:5511/api/chatsdk-token \
CHATSDK_WS_URL=ws://192.168.68.244:8001/connection/websocket \
CHATSDK_APP_API_KEY=<server-only-key> \
npm run smoke:project
```

Do not paste real API keys into shared docs, tickets, or chat logs.

## Config Changes

For runtime config changes, back up the remote file before editing:

```bash
ssh root@192.168.68.244 '
  cd /opt/chatsdk/deploy &&
  stamp=$(date +%Y%m%d%H%M%S) &&
  cp .env ".env.bak-$stamp" &&
  cp token-broker.override.yml "token-broker.override.yml.bak-$stamp" &&
  cp centrifugo.json "centrifugo.json.bak-$stamp"
'
```

Then edit on the host:

```bash
ssh root@192.168.68.244
cd /opt/chatsdk/deploy
nano .env
nano token-broker.override.yml
nano centrifugo.json
```

Restart only affected services after config changes.

Common config ownership:

- `.env`: API runtime env, shared secrets, API CORS origins.
- `token-broker.override.yml`: token broker env and `CHATSDK_BROKER_APP_ID`.
- `centrifugo.json`: Centrifugo token settings and allowed origins.

## Rollback

Fast API rollback options:

1. Re-sync the previous source file from git or a known-good working tree.
2. Rebuild and recreate API.

```bash
ssh root@192.168.68.244 '
  cd /opt/chatsdk/deploy &&
  docker compose -f compose.yml -f token-broker.override.yml -f inngest.override.yml build api &&
  docker compose -f compose.yml -f token-broker.override.yml -f inngest.override.yml up -d --force-recreate api
'
```

For config rollback, restore the timestamped backup:

```bash
ssh root@192.168.68.244 '
  cd /opt/chatsdk/deploy &&
  cp token-broker.override.yml.bak-YYYYMMDDHHMMSS token-broker.override.yml &&
  docker compose -f compose.yml -f token-broker.override.yml -f inngest.override.yml up -d --force-recreate token-broker
'
```

Database rollback depends on the migration. Additive migrations usually do not need immediate rollback; leave unused columns/tables in place until a planned cleanup migration. Destructive migrations require a tested restore path before deployment.

## Post-Deploy Record

After meaningful changes, update:

- `docs/product-memory/RESUME.md`
- `docs/product-memory/CURRENT_MISSION.md`
- the relevant `docs/agent-runs/**/NOTE.md`

Include:

- files changed
- services rebuilt/restarted
- migrations applied
- verification commands and results
- known follow-ups or limitations

After source changes, refresh Graphify:

```bash
./scripts/graphify update . --wiki
```
