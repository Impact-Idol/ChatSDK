# Multi-Project Onboarding Hardening Spec

Status: Draft for implementation
Date: 2026-06-20
Owner: ChatSDK platform
Related:

- `docs/features/chatsdk-production-hardening/SPEC.md`
- `docs/features/chatsdk-production-hardening/CLIENT_OWNED_TOKEN_BROKER_PLAN.md`
- `docs/features/chatsdk-production-hardening/MULTI_TENANT_ARCHITECTURE_SPEC.md`
- `docs/features/vouch-integration/INTEGRATION_PACKET.md`

## Summary

Vouch proved that ChatSDK can support a real embedding project, but it also exposed an operator gap: creating a dedicated app ID, server key, broker scope, origins, and smoke-test fixtures still feels manual and demo-shaped. The next platform milestone is to make onboarding a new project boring, repeatable, and testable.

The goal is not more Vouch-specific branching. The goal is a generic ChatSDK project onboarding and hardening layer where Vouch is one seeded client.

## Problem

Current integration work relies on project-specific memory and hand operations:

- A caller can accidentally depend on the demo/default `001` app.
- App creation, app-scoped API keys, broker scope, allowed origins, and token broker settings are not provisioned through one durable workflow.
- It is too easy to confuse demo/LAN token broker behavior with the production client-owned broker contract.
- There is no one-command verification that a new project is correctly isolated and usable.
- Operator visibility is scattered across SQL rows, env files, docs, and smoke scripts.

This is acceptable for a narrow internal demo. It is not enough for onboarding Vouch staging/prod or future projects.

## Product Goal

For any embedding project, an operator should be able to provision, verify, rotate, and inspect a ChatSDK integration without relying on magic defaults or tribal memory.

The platform should support:

- one ChatSDK app per project/environment isolation boundary
- server-only app credentials
- broker credential and app-scope provisioning
- exact browser origin allowlists
- default browser token scopes
- deterministic smoke-test users/channels
- membership removal semantics where messages remain but removed users lose access
- clear audit and troubleshooting output

## Non-Goals

- Building a full hosted billing/admin portal.
- Replacing client-owned identity or product policy.
- Letting browsers choose app IDs, user IDs, scopes, or membership.
- Supporting multiple isolated customer tenants inside one ChatSDK `app_id` without a deeper tenant-partition redesign.
- Implementing former-member read-only history access in this milestone.

## Core Decisions

- `app_id` remains the hard tenant boundary for the shared-stack model.
- Dev, staging, and production environments use separate ChatSDK apps, broker clients, broker credentials, and origin allowlists.
- The demo/default app ID, including `001`, must be treated as non-production only.
- New project onboarding must be reproducible through a CLI or server-admin API, not manual SQL plus chat notes.
- Vouch remains a seeded/reference client, not a special case in core code.

## Target Operator Flow

```bash
chatsdk apps create \
  --slug vouch-dev \
  --name "Vouch Dev" \
  --environment development \
  --origins http://localhost:3000,http://localhost:4500 \
  --browser-scopes chat:read,chat:write,typing:write

chatsdk apps smoke --slug vouch-dev

chatsdk apps show --slug vouch-dev

chatsdk apps rotate-key --slug vouch-dev --kind server
```

The exact command names can change during implementation, but the product contract should not: one explicit workflow creates the app, credentials, broker scope, origin policy, and verification fixture.

## Required Capabilities

### 1. Project/App Provisioning

Create a first-class provisioning path that can:

- create a ChatSDK app with a non-demo ID
- create or rotate app-scoped server API keys
- create a broker client and broker credential metadata where the client-owned broker model is enabled
- bind allowed app IDs, allowed origins, allowed user ID prefixes, allowed channel ID prefixes, allowed scopes, token TTL, and membership fanout
- emit a redacted integration packet with only safe public values plus clear server-only secret handling

### 2. Demo Default Kill Switches

Production and production-like validation should fail when:

- default/demo app IDs are used as customer apps
- known dev secrets are present
- browser routes can use server app credentials
- token broker settings allow wildcard origins without explicit risk acceptance
- `channel:create` is present in browser-default scopes for policy-gated clients

### 3. Generic Membership Sync

Use or extend existing broker membership sync so every project can submit complete membership snapshots:

- active snapshot upserts current channel roles
- omitted channels are removed
- disabled/suspended/removed statuses revoke future minting and disconnect/unsubscribe realtime sessions
- monotonic revisions prevent stale access resurrection
- messages remain in the channel after membership removal

### 4. Project Smoke Tests

Add a reusable smoke command that proves:

- user ensure works for the app
- token mint works only through the intended server path
- WebSocket connection works for allowed origins
- DM ensure works after policy approval
- group/squad-style channel ensure works with existing users
- message send/read works for members
- removed members cannot read, write, list members, or stay subscribed
- browser tokens cannot create arbitrary channels unless explicitly granted

### 5. Operator Visibility

Add CLI/admin inspection for:

- app metadata
- active/redacted key metadata
- broker client and credential status
- allowed origins and scopes
- recent audit denials
- user/channel membership status
- “why can this user access or not access this channel?”

### 6. Documentation and Reference Artifacts

Update durable docs so a future project can onboard without replaying the Vouch discovery:

- generic project onboarding guide
- Vouch as a reference configuration
- local/LAN demo warning labels
- production readiness checklist
- rotation and rollback notes

## Slice Plan

### Slice 0: Discovery and Contract Freeze

Map existing app, app-key, broker, origin, and smoke-test code. Freeze the first CLI/API contract and identify whether provisioning starts as a CLI, admin route, or both.

Exit criteria:

- command/API contract written
- affected files mapped
- test strategy selected
- no behavior changes except docs

### Slice 1: App and Credential Provisioning

Implement app creation/inspection and server key generation or rotation using existing app/app-key schema.

Exit criteria:

- focused tests for app creation, duplicate slug/name handling, redaction, and key rotation
- no plaintext secrets logged
- `001` remains usable only as explicit dev/demo data

### Slice 2: Broker Scope Provisioning

Provision broker client, broker credential metadata, app scope, origins, scopes, TTLs, and user/channel prefixes for a project.

Exit criteria:

- tests for allowed and denied app scopes
- tests for origin mismatch and disabled credential
- generated integration packet is redacted

### Slice 3: Generic Membership Sync Smoke

Package membership snapshot sync as a reusable project operation and verify removed-member behavior.

Exit criteria:

- active snapshots add/update/remove channel memberships
- suspended/removed users cannot mint and are disconnected/unsubscribed
- messages remain visible to remaining members
- removed users cannot read old messages through normal APIs

### Slice 4: Project Smoke CLI

Create `smoke:client` or equivalent with seed fixtures and live/deployed configuration support.

Exit criteria:

- local/API tests pass
- smoke output is human-readable and redacts secrets
- Vouch-dev fixture can run without hand-editing scripts

### Slice 5: Docs, Runbooks, and Guardrails

Update onboarding, shared server, Vouch packet, and production readiness docs.

Exit criteria:

- new project onboarding guide is complete
- demo/default hazards are called out plainly
- rollback and key rotation procedures exist

### Slice 6: Adversarial Review and Hardening

Run the multi-thread review cadence against the full feature.

Exit criteria:

- GPT-5.5 High adversarial review completed
- Antigravity adversarial review completed
- all critical/high findings fixed or explicitly blocked
- final evidence and residual risk recorded

## Acceptance Tests

- A newly provisioned app can be used without `001` or any demo secret.
- Two provisioned apps cannot read, write, mint, subscribe, search, or inspect each other's data.
- Browser-scoped tokens cannot call server-only provisioning, app-key, or channel-create flows unless deliberately granted.
- Removed members lose access to history and future messages while stored messages remain for current members.
- App/broker credentials can be rotated without exposing old or new secrets in logs/docs.
- Smoke tests fail closed when required origins, scopes, credentials, or broker mappings are missing.

## Open Questions

- Should the first provisioning surface be a Node CLI script, an API route, or both?
- Do we want human-chosen slugs plus generated UUID app IDs, or should operators be able to provide app IDs?
- Which secret store should hold production server API keys before a full admin console exists?
- Should origin allowlists live only in DB, only env, or DB plus deployment-level env reconciliation for the LAN/demo broker?

