# Slice 5 Docs, Runbooks, and Guardrails Log

Date: 2026-06-20
Status: complete

## Scope

Update durable docs so future projects can onboard without replaying the Vouch discovery.

## Files Changed

- `docs/features/multi-project-onboarding-hardening/PROJECT_ONBOARDING_RUNBOOK.md`
- `docs/index.md`
- `docs/product-memory/decisions/multi-project-broker-scope-hardening.md`
- `docs/product-memory/decisions/vouch-channel-membership-lifecycle.md`

## Implementation Summary

- Added generic multi-project onboarding runbook.
- Documented app/server-key provisioning.
- Documented broker scope provisioning with exact origins and nonempty constraints.
- Documented `npm run smoke:project` dry-run and live usage.
- Documented membership sync behavior for active, disabled, suspended, and removed users.
- Recorded guardrails against `001`, demo apps, browser `channel:create`, secret leakage, and wildcard origins.
- Linked the runbook from `docs/index.md`.
- Preserved Vouch as a reference project, not a core-code special case.

## Verification

Docs are backed by the same commands verified in earlier slices:

- `npm run ops:provision:project`
- `npm run smoke:project -- --dry-run --json`
- live `npm run smoke:project`
- `npm --workspace @chatsdk/api run typecheck`
- `npm --workspace @chatsdk/api test -- --run`

## Residual Risks and Follow-Ups

- Production secret storage is still local/operator-managed until a managed secret-store workflow exists.
- Broker credential retirement/rotation runbook should be expanded when an explicit old-credential retirement command exists.
