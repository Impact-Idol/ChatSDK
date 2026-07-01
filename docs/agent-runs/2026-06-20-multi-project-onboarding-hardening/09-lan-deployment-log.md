# LAN Deployment Log

Date: 2026-06-20
Target: `192.168.68.244`
Status: complete

## Scope

Deployed the completed multi-project onboarding hardening changes to the Proxmox/LXC LAN ChatSDK stack.

## Actions

- Synced current repo source to `/opt/chatsdk/source` on `192.168.68.244`.
- Rebuilt `chatsdk-hardening-api:local` from `/opt/chatsdk/deploy`.
- Applied live DB compatibility migration on DB host `192.168.68.242`:
  - created/reset `chatsdk_broker_system` role
  - applied V014 broker control-plane tables, policies, grants, and Flyway history marker
  - upgraded existing manual `app_api_key` table to hash-at-rest shape
  - seeded the Vouch app-scoped API key hash without storing plaintext
  - recorded V015 in Flyway history
- Added `BROKER_DATABASE_URL` to `/opt/chatsdk/deploy/.env` with a broker-system runtime role.
- Recreated:
  - `chatsdk-hardening-api`
  - `chatsdk-demo-token-broker`

## Verification

Container state:

- `chatsdk-hardening-api`: healthy
- `chatsdk-demo-token-broker`: healthy
- `chatsdk-hardening-centrifugo`: healthy
- `chatsdk-hardening-meilisearch`: healthy
- `chatsdk-hardening-inngest`: healthy

API startup log showed:

- database connected
- latest migration `V015 - app scoped api keys`
- Centrifugo connected
- storage initialized
- search initialized

Health checks passed:

```bash
curl http://192.168.68.244:5500/health
curl http://192.168.68.244:5500/ready
curl http://192.168.68.244:5511/health
```

`/ready` reported:

- `ready: true`
- `migrations: Latest migration 015: app scoped api keys`
- `schema: ok`
- `lifecycleRls: ok`
- `storage: ok`
- `centrifugo: ok`
- `search: ok`
- `inngest: ok`

Vouch project smoke passed:

```bash
npm run smoke:project -- \
  --slug vouch-dev \
  --origin https://vouch.vedalogy.com \
  --primary-user-id vouch-deploy-smoke-primary \
  --peer-user-id vouch-deploy-smoke-peer \
  --message "ChatSDK deploy smoke 2026-06-21T01:38:00Z" \
  --json
```

Result: 12 passed, 0 failed.

Smoke coverage:

- API health
- token broker health
- primary/peer user ensure
- primary/peer browser token mint
- WebSocket connect
- authenticated channel query
- deterministic DM ensure/open
- browser channel-create denial without `channel:create`
- message send
- message readback

## Notes

- The deployment uses the existing LAN compose layout in `/opt/chatsdk/deploy`.
- The Vouch API key remained secret; only its hash was written to `app_api_key.api_key_hash`.
- The `docs/runbooks/proxmox-lan-code-deploy.md` runbook is being maintained separately and was not edited during this deployment.
