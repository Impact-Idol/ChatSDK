# Client-Owned Token Broker Implementation Run Plan

Date: 2026-06-09
Status: active

## Operating Rules

- Work slice by slice.
- Use parallel agents for bounded exploration, adversarial review, and disjoint implementation work.
- Do not move to the next slice while critical/high review findings remain unresolved.
- Write focused tests before or alongside implementation.
- Use seeded two-client/two-app data for isolation tests.
- Use Playwright for the real browser path once the token broker can serve the UI.
- Record commands, failures, reviewer findings, fixes, and residual risks in this run directory.

## Slice Order

1. Discovery and implementation map.
2. Schema, config, readiness, production kill switches, and seeds.
3. Broker credential verification, replay denial, membership sync, and audit.
4. Server mint endpoint with broker-mediated renewal and revocable user/realtime tokens.
5. Reference/demo broker migration, UI flow, seeded Playwright, and browser direct-mint denial.
6. Deployed validation against the LAN/LXC stack with real Postgres, Redis, Inngest, Meilisearch, Centrifugo, and object storage.
7. Final comprehensive security/code review sweep and hardening fixes.

## Review Cadence

Each slice ends with:

- automated test run appropriate to the slice
- GPT-5.5 high adversarial review
- Antigravity adversarial review via `/Users/pushkar/.local/bin/agy`
- fix pass for critical/high issues
- log update with residual risks

## Initial Parallel Agent Lanes

- Token/auth explorer: existing token, session, revocation, and legacy route behavior.
- Schema/RLS explorer: migrations, RLS/system-context patterns, and broker table design.
- Test/UI explorer: seeded API tests, live E2E, Playwright, and demo UI token flow.

## Slice 0 Exit Criteria

- Current implementation state is mapped.
- Slice 1 design is concrete enough to edit without broad rewrites.
- Review cadence artifacts are prepared.
- No code behavior changed yet beyond docs/run planning.
