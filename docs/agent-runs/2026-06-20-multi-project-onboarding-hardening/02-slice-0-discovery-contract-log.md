# Slice 0 Discovery and Contract Log

Date: 2026-06-20
Status: started

## Context

Vouch integration exposed a reusable platform need: provisioning a dedicated ChatSDK app, credentials, broker scope, origin allowlist, and smoke-test fixture should be a repeatable project onboarding workflow. The current manual path works, but it makes demo defaults such as `001` too easy to lean on.

## Current Evidence

- Vouch now uses dedicated app ID `546aff6b-d3be-4dec-819b-576b42362ea9`.
- Current Vouch APIs include user ensure, DM ensure, group/squad ensure, and scoped browser tokens without `channel:create`.
- Removed private/group members lose access to message history and future sends while messages remain stored for remaining members.
- Existing long-range architecture docs already define app IDs as the shared-stack tenant boundary and client-owned brokers as the production contract.
- `packages/api/src/routes/admin.ts` has existing app CRUD and primary-key regeneration, but it returns `apiKey`/`secretKey` directly. New provisioning work should avoid expanding this secret-returning pattern.
- `docker/migrations/V015__app_scoped_api_keys.sql` adds per-app API keys in `app_api_key`, which is a better target for project-specific server keys than rotating the primary app key.
- `docker/migrations/V014__client_owned_token_broker.sql` already provides `broker_client`, `broker_credential`, `broker_app_scope`, `broker_mint_audit`, replay, and membership freshness tables.
- `scripts/smoke/shared-server-smoke.mjs` proves the current shared-server flow and can be generalized into a project smoke script.
- `package.json` currently exposes `npm run smoke:shared-server`; no generic `smoke:client` exists yet.

## Proposed First Contract

Implement provisioning first as a CLI/scripted operator workflow, then expose admin APIs only where needed. The CLI should create or inspect:

- ChatSDK app
- app-scoped server key
- broker client
- broker credential metadata
- broker app scope
- origins and default browser scopes
- smoke-test fixture metadata

The initial CLI should prefer redacted output by default. One-time secrets may be printed only at creation/rotation time, and follow-up `show` commands should report key IDs, names, status, timestamps, and last-used metadata without plaintext secret values.

## Initial Implementation Direction

- Start with a Node operator script under `scripts/ops/` or `scripts/provision/`.
- Add a package script such as `provision:project` once the command shape stabilizes.
- Have the script use direct database access only for local/operator execution, with a later admin API pass if needed.
- Use `app_api_key` for project server keys instead of encouraging use of primary `app.api_key`.
- Keep the old admin route behavior in scope for hardening review, but do not depend on it for the new workflow.
- Generalize `scripts/smoke/shared-server-smoke.mjs` rather than replacing it immediately.

## Open Discovery Tasks

- Map current app/app-key schema and route helpers.
- Map broker tables and provisioning gaps.
- Map existing smoke script shape.
- Decide whether CLI writes directly to the DB or calls local/admin API routes.
- Identify required production guardrails around demo app IDs and secrets.

## Slice 0 Exit Checklist

- [x] Existing schema/routes/scripts mapped.
- [x] CLI versus admin-route decision recorded.
- [ ] Slice 1 edit plan written.
- [x] No source behavior changed.

## Slice 1 Draft Edit Plan

1. Add a narrow provisioning script that can create/show a ChatSDK app by slug/name and create an `app_api_key` row with redacted output.
2. Add duplicate handling so reruns are safe and do not create accidental parallel apps for the same project/environment.
3. Add guardrails that reject known demo app IDs/slugs for production-like environments.
4. Add focused tests around redaction, duplicate project handling, and key lifecycle if the script can be structured for testability.
5. Record any old admin route secret-returning behavior as a follow-up hardening item if not fixed in Slice 1.
