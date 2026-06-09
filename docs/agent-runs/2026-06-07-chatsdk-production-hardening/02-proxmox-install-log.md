# Proxmox ChatSDK Hardening Install Log

Date: 2026-06-08
Status: baseline deployment installed; hardening gates red

## Deployment

- Proxmox host: `192.168.68.108:8006`
- Node: `localpve`
- New LXC: `220`
- Hostname: `chatsdk-hardening`
- IP: `192.168.68.113/24`
- Runtime path: `/opt/chatsdk`
- Source path on LXC: `/opt/chatsdk/source`
- Deploy path on LXC: `/opt/chatsdk/deploy`
- Compose file: `/opt/chatsdk/deploy/compose.yml`
- Secret env file: `/opt/chatsdk/deploy/.env` with root-only permissions

## External Services

- Postgres/Redis/MinIO host: `192.168.68.110`
- Dedicated database: `chatsdk_hardening`
- Dedicated database role: `chatsdk_hardening`
- Redis: `192.168.68.110:6379`, DB index `1`
- MinIO endpoint: `http://192.168.68.110:9000`
- MinIO bucket created by API startup: `chatsdk-hardening`

## Running Services

- API: `http://192.168.68.113:5500`
- Centrifugo: `http://192.168.68.113:8001`
- Docker containers:
  - `chatsdk-hardening-api`
  - `chatsdk-hardening-centrifugo`

## Verification

- Docker inside the LXC works with `overlayfs`.
- Database migrations `V001` through `V004` applied to `chatsdk_hardening`.
- API `/health` returns `200`.
- API `/ready` returns `200`.
- API `/health/detailed` returns `200`.
- API metrics are exposed at `/`, not `/metrics`.
- Centrifugo `/health` returns `200`.
- Smoke flow passed with current baseline auth requirements:
  - `POST /api/auth/connect` created/upserted `smoke-alice` and `smoke-bob`.
  - `POST /api/channels` created DM channel `019ea509-cc76-7755-b41f-32d5c251e555`.
  - `POST /api/channels/:id/messages` persisted message `00000000-0000-7000-8000-000000000001` at `seq=1`.

## Baseline Findings

- Protected routes still require `X-API-Key` alongside `Authorization: Bearer ...`; this confirms the P0 client/API-key boundary problem.
- Centrifugo publish during message/channel creation logs `unknown channel`; DB persistence succeeds, but realtime publish is not healthy.
- Inngest event sends fail because no event key is configured; message persistence succeeds, but background/event workflow is not healthy.
- Meilisearch initialization logs connection refused to `localhost:7700`; startup continues, but search is not backed by a live service in this deployment.
- Root `npm ci` fails on React Native peer dependency conflict.
- Root `npm ci --legacy-peer-deps` fails because `package-lock.json` is out of sync with workspace manifests.
- API Docker build succeeds because the Dockerfile copies only root/core/api manifests.
- API typecheck fails with 17 TypeScript errors.
- API tests are excluded from the Docker build context by `.dockerignore`; when mounted into the builder image, the API suite reports 56 tests discovered, 44 passing, 12 failing, and 3 unhandled errors.
- Production audit reports 33 vulnerabilities: 24 moderate, 7 high, 2 critical.

## Notes

No live secrets are recorded in this file. Use the root-only files on `chatsdk-hardening` for runtime credentials.
