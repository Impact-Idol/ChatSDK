# Multi-Project Onboarding Hardening Run Plan

Date: 2026-06-20
Status: complete

## Operating Rules

- Work slice by slice.
- Keep Vouch as a seeded example, not a hardcoded branch.
- Prefer CLI/API primitives that can serve every future embedding project.
- Record commands, findings, failures, and residual risk in this run directory.
- Do not advance after implementation slices while critical/high review findings remain unresolved.
- Keep secrets out of docs and logs; record paths or redacted metadata only.
- Every implementation slice must end with focused tests plus either seeded local validation or an explicit note explaining why seeded validation is deferred.

## Seeded Acceptance Matrix

Use deterministic seed names so failed runs are easy to clean up and compare:

- Project A slug: `seed-project-a-dev`
- Project B slug: `seed-project-b-dev`
- Environments: `development` for local smoke, `staging` for production-like guardrails where needed
- Users per project:
  - `seed-a-owner`, `seed-a-member`, `seed-a-removed`
  - `seed-b-owner`, `seed-b-member`, `seed-b-removed`
- Channels per project:
  - one deterministic DM
  - one deterministic group channel
  - one removed-member group case
- Broker clients:
  - `seed-project-a-development`
  - `seed-project-b-development`

Seeded checks must prove:

- Project A credentials cannot operate on Project B.
- Browser/default scopes do not include `channel:create` unless a test intentionally grants it.
- Removed members cannot read/send/list/subscribe, while messages remain for current members.
- Output artifacts redact secrets.
- Re-running seed provisioning is idempotent.

## Parallel Agent Lanes

- **Provisioning lane:** app creation, app-key lifecycle, demo/default guardrails, redacted output.
- **Broker lane:** broker client/credential/app-scope provisioning, origins, allowed scopes, TTLs, audit.
- **Membership lane:** full membership snapshots, removed-member access denial, realtime unsubscribe/disconnect.
- **Smoke lane:** reusable `smoke:client` fixture, local and LAN validation, readable evidence output.
- **Docs/runbook lane:** onboarding guide, Vouch reference config, production readiness, rollback/rotation.
- **Adversarial lane:** cross-app leakage, credential misuse, stale membership, browser escalation, secret exposure.

## Slice Order

1. **Slice 0: Discovery and Contract Freeze**
   - Map existing schema/routes/scripts.
   - Decide first provisioning surface.
   - Freeze command/API contract enough for implementation.

2. **Slice 1: App and Credential Provisioning**
   - Create/inspect app records.
   - Generate/rotate app-scoped server keys.
   - Add demo/default guardrails.

3. **Slice 2: Broker Scope Provisioning**
   - Create broker client/credential metadata.
   - Bind allowed apps, origins, prefixes, scopes, TTL, and fanout.
   - Emit redacted integration output.

4. **Slice 3: Generic Membership Sync Smoke**
   - Exercise complete membership snapshots.
   - Prove removed users lose access while messages remain.
   - Verify realtime unsubscribe/disconnect behavior where available.

5. **Slice 4: Project Smoke CLI**
   - Add reusable seeded smoke command.
   - Run against local or LAN config.
   - Capture redacted evidence.

6. **Slice 5: Docs, Runbooks, and Guardrails**
   - Write generic onboarding guide.
   - Update Vouch packet as reference.
   - Add rotation, rollback, and production checklist notes.

7. **Slice 6: Final Adversarial Review and Resolution**
   - Run GPT-5.5 High and Antigravity review.
   - Fix all critical/high findings.
   - Record final state and residual risks.

## Slice 0 Exit Criteria

- Current implementation state is mapped.
- First provisioning contract is selected.
- Test and review strategy is explicit.
- No behavior changes have been made beyond planning docs.

## Initial Implementation Bias

Start with a CLI/script backed by existing database/API primitives before building an admin UI. A CLI is easier to test, easier to run in deployment automation, and enough to remove the manual `001`/app-ID pain immediately.
