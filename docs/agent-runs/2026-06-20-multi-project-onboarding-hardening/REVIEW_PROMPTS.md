# Review Prompts

Date: 2026-06-20
Run: `2026-06-20-multi-project-onboarding-hardening`

Use these prompts for Claude, Antigravity, or another adversarial reviewer. Reviewers should not edit files unless explicitly asked.

## Slice 2 Broker Scope Provisioning

```text
Adversarially review Slice 2 broker scope provisioning in /Users/pushkar/chatsdk.

Focus on:
- scripts/ops/provision-project.mjs
- packages/api/tests/project-provisioning.test.ts
- docs/agent-runs/2026-06-20-multi-project-onboarding-hardening/04-slice-2-broker-scope-provisioning-log.md

Do not edit files.

Return findings ordered by severity with concrete file/line references.

Pay special attention to:
- RS256 key handling
- private JWK leakage
- idempotency
- cross-app broker scope isolation
- origin validation
- scope validation
- transaction safety
- whether generated rows match broker-auth/server mint expectations
- whether reruns can reactivate suspended/disabled broker clients or credentials
- whether omitted CLI arguments wipe existing broker scope configuration
- whether empty tenant/user/channel prefix arrays fail open
```

## Slice 2 Narrow Rereview

Use after fixes are applied.

```text
Narrow post-fix adversarial rereview for Slice 2 in /Users/pushkar/chatsdk.

Review current:
- scripts/ops/provision-project.mjs
- packages/api/tests/project-provisioning.test.ts
- packages/api/src/services/broker-auth.ts
- docker/migrations/V014__client_owned_token_broker.sql
- docker/migrations/V015__app_scoped_api_keys.sql

Do not edit files.

Check whether these prior findings are resolved:
- provisioning reruns must not reactivate suspended broker clients
- provisioning reruns must not reactivate disabled broker credentials
- omitted CLI flags must not wipe existing broker scope origins, tenant IDs, user prefixes, channel prefixes, or scopes
- broker scopes must fail closed when tenant/user/channel prefix constraints are empty for a newly provisioned scope
- allowed origins must be exact URL origins, with no wildcard patterns and no trailing slash/path
- private JWK must be suppressed by default and emitted only with explicit --emit-secret
- broker_app_scope rows must match authenticateBrokerRequest and server mint expectations

Return only unresolved critical/high findings. If none, say none and list medium follow-ups briefly.
```

## Final All-Slices Review

Use after Slice 5 is complete and before marking Slice 6 complete.

```text
Final adversarial review for the multi-project onboarding hardening run in /Users/pushkar/chatsdk.

Review:
- docs/features/multi-project-onboarding-hardening/SPEC.md
- docs/features/multi-project-onboarding-hardening/TEST_PLAN.md
- docs/agent-runs/2026-06-20-multi-project-onboarding-hardening/
- scripts/ops/provision-project.mjs
- scripts/smoke/
- packages/api/src/routes/admin.ts
- packages/api/src/middleware/auth.ts
- packages/api/src/routes/server.ts
- packages/api/src/services/broker-auth.ts
- packages/api/tests/project-provisioning.test.ts
- relevant new tests added by later slices

Do not edit files.

Return findings ordered by severity with concrete file/line references.

Assess whether the implementation is safe to use for onboarding multiple embedding projects, including Vouch, with:
- one app per project/environment
- app-scoped server keys
- broker client and broker credential scope
- exact origins
- default/allowed browser scopes
- seeded two-project isolation
- membership removal semantics
- reusable smoke CLI
- redacted outputs and no secret leakage
- no dependency on demo app ID 001

Pay special attention to:
- cross-app data access
- cross-app token minting
- browser escalation to channel:create
- stale membership resurrection
- suspended/disabled credential reactivation
- plaintext secret storage or logging
- origin bypass
- replay protection
- DB transaction safety
- seeded test quality
- gaps between docs and behavior

Return:
1. Critical/high findings that must block completion.
2. Medium findings that can be scheduled after completion.
3. Test gaps.
4. A final go/no-go recommendation.
```

## Claude Post-Blocker Fix Review

Use this after the API key hashing, scoped-token enforcement, membership display-name preservation, and stale test-token updates are complete. This is intentionally narrower than the full final review so Claude can focus on whether the previous NO-GO blockers were actually resolved and whether any new regressions were introduced.

```text
You are performing a post-blocker adversarial review for the ChatSDK multi-project onboarding hardening run in /Users/pushkar/chatsdk.

Do not edit files. Do not format code. Do not run broad rewrites. Review only and return findings.

Context:
- This run hardens ChatSDK for multiple embedding projects such as Vouch.
- The desired model is one app per project/environment, app-scoped server API keys, broker credentials scoped to exact origins and allowed tenants/users/channels/scopes, and membership removal that revokes future access while preserving stored messages.
- Prior final review returned NO-GO because:
  1. app_api_key stored/authenticated plaintext API keys.
  2. requireScope allowed unscoped user tokens through most scoped routes.
- A medium issue also noted that membership sync could overwrite an existing display name when displayName was omitted.

Review these files:
- docker/migrations/V015__app_scoped_api_keys.sql
- packages/api/src/middleware/auth.ts
- packages/api/src/routes/admin.ts
- packages/api/src/routes/server.ts
- packages/api/src/utils/crypto.ts
- scripts/ops/provision-project.mjs
- scripts/smoke/project-smoke.mjs
- packages/api/tests/auth-modes.test.ts
- packages/api/tests/project-provisioning.test.ts
- packages/api/tests/broker-membership-sync.test.ts
- packages/api/tests/broker-token-mint.test.ts
- packages/api/tests/private-data-auth.test.ts
- packages/api/tests/message-outbox.test.ts
- packages/api/tests/realtime-auth.test.ts
- packages/api/tests/search-lifecycle.test.ts
- packages/api/tests/thread-outbox.test.ts
- docs/features/multi-project-onboarding-hardening/SPEC.md
- docs/features/multi-project-onboarding-hardening/TEST_PLAN.md
- docs/features/multi-project-onboarding-hardening/PROJECT_ONBOARDING_RUNBOOK.md
- docs/agent-runs/2026-06-20-multi-project-onboarding-hardening/

Verify whether these blockers are resolved:
1. App-scoped API keys are generated as plaintext only once, stored only as a SHA-256 hash in app_api_key.api_key_hash, authenticated by hashing the incoming key, and not logged or written to docs/run artifacts.
2. Primary app key fallback is not available by default and is gated behind CHATSDK_ENABLE_PRIMARY_APP_KEY_AUTH=true.
3. requireScope denies user auth contexts that lack the requested scope, including legacy/unscoped browser tokens.
4. Scoped first-party user tokens still work for their intended routes.
5. Broker-specific route guard behavior applies only to actual broker tokens, not all scoped first-party user tokens.
6. Browser channel creation requires channel:create and ordinary browser tokens cannot create arbitrary channels.
7. Membership removal semantics are correct: removed/disabled/inactive members cannot mint tokens or create sessions, channel_membership rows are removed, unsubscribe events are enqueued, and messages remain stored.
8. Membership sync with omitted displayName preserves the existing app_user.name.
9. Stale active membership snapshots cannot resurrect a newer removed membership.
10. Project provisioning and smoke tooling remain app-scoped and do not depend on demo app ID 001.

Pay special attention to possible regressions:
- Existing migrations on fresh installs versus upgraded installs.
- Whether api_key_hash uniqueness/nullability is correct.
- Any leftover SQL reads/writes of app_api_key.api_key as the authentication source.
- Test fixtures that pass only because mocked auth bypasses real scoped-token behavior.
- Media-token or upload routes accidentally broken by stricter requireScope behavior.
- App-management routes accidentally exposed to broker tokens.
- Scope checks that pass in tests but fail in production because auth context fields differ.
- Secret leakage in command output, smoke JSON, docs, or agent-run logs.

If you run commands, prefer targeted checks first:
- npm --workspace @chatsdk/api run typecheck
- npm --workspace @chatsdk/api test -- --run tests/auth-modes.test.ts tests/project-provisioning.test.ts tests/broker-membership-sync.test.ts tests/broker-token-mint.test.ts tests/private-data-auth.test.ts tests/message-outbox.test.ts tests/realtime-auth.test.ts tests/search-lifecycle.test.ts tests/thread-outbox.test.ts tests/project-smoke-cli.test.ts

Return:
1. Critical/high findings that must block completion, with file and line references.
2. Medium findings that can be scheduled after completion.
3. Test gaps or documentation gaps.
4. Final GO/NO-GO recommendation.

If there are no critical/high blockers, say that explicitly.
```
