# Slice 0: Discovery And Implementation Map

Status: in progress

## Goal

Map the current codebase against the client-owned token broker plan, then start Slice 1 with a concrete schema/readiness/test design.

## Agents

- Token/auth explorer: launched.
- Schema/RLS explorer: launched.
- Test/UI explorer: launched.

## Commands

- `rg -n "agent run|comprehensive agent|antigravity|agy|review|adversarial|process" docs -S`
- `sed -n '1,260p' docs/features/chatsdk-production-hardening/CLIENT_OWNED_TOKEN_BROKER_PLAN.md`
- `rg -n "tokens|auth|API key|ready|readiness|revoke|session|tenant|RLS|centrifugo|playwright|seed" packages/api packages/core examples/react-chat docker docs/features/chatsdk-production-hardening -S`

## Findings

- The previous P0 hardening run already established the milestone/review pattern we will reuse.
- The client-owned token broker spec now governs this implementation.
- Token/auth explorer found centralized token sessions/revocation already exist, but broker tables, broker credential verification, membership freshness, `/api/server/tokens/mint`, and broker readiness do not.
- Schema/RLS explorer confirmed the next migration should be `V014`, broker control-plane tables should be system-only, and a new app-scoped membership state table is needed for revision/freshness/tombstones.
- Test/UI explorer confirmed existing Playwright realtime tests are the right base, while the React demo already uses a token provider that can later point at a real reference broker.

## Next

- Define Slice 1 exact files and tests.
- Begin schema/readiness implementation.

## Slice 1 Scope

- Add `V014__client_owned_token_broker.sql`.
- Add broker control-plane tables, replay table, audit table, membership state table, auth session provenance columns, indexes, and RLS policies.
- Add API config for enabling production server minting.
- Add readiness checks for broker schema when enabled.
- Add focused tests for production config and readiness behavior.
