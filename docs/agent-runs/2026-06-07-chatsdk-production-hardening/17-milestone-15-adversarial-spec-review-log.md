# Milestone 15: Adversarial Spec Review

Date: 2026-06-08
Status: completed

## Scope

Ran adversarial reviews against the production sturdiness and multi-tenant specs:

- `docs/features/chatsdk-production-hardening/PRODUCTION_STURDINESS_SPEC.md`
- `docs/features/chatsdk-production-hardening/PRODUCTION_STURDINESS_TEST_PLAN.md`
- `docs/features/chatsdk-production-hardening/MULTI_TENANT_ARCHITECTURE_SPEC.md`
- `docs/product-memory/decisions/chatsdk-production-hardening.md`

## Reviewers

- GPT-5.5 xhigh sub-agent `019ea7c1-8c9f-77d1-8930-d710038a9b21`
- Antigravity via `agy --model "Claude Opus 4.6 (Thinking)"`

## GPT-5.5 xhigh Findings

Critical/high findings:

- Shared-stack beta used one shared DB with manual `app_id` scoping while RLS/direct-query guardrails were P1. Reviewer recommended making RLS plus `withTenantContext`, table inventory, and direct-query guardrails P0 for shared DB beta, or using Model B/C.
- Docs were ambiguous about whether one ChatSDK `app_id` maps to one Vouch client or one Vouch tenant/org. Reviewer recommended one `app_id` per Vouch tenant/org isolation boundary unless `vouch_tenant_id` is first-class everywhere.
- Retention/deletion/export were P1 despite real beta data becoming regulated user data. Reviewer recommended a minimal P0 baseline or synthetic/non-record beta data with waiver.
- Membership removal focused on refresh/reconnect and did not require active token/realtime/media revocation. Reviewer recommended revocation, disconnect/unsubscribe, and immediate denial for backfill/search/download.
- Rate limits omitted private reads, downloads, signed URL issuance, realtime auth, export, admin actions, tenant/global budgets, and precise Redis outage behavior.
- Backup targets allowed Postgres RPO and object-storage RPO mismatch without reconciliation. Reviewer recommended object manifests/checksums, tombstoning unrecoverable attachments, and purge-ledger replay.
- Server token mint used a broad `X-Server-Key` concept without mTLS/service JWT, app-scoped broker credentials, replay controls, or broker-to-app enforcement.
- Alerting was P1, leaving beta production traffic vulnerable to silent failures.

Medium findings:

- Signed URL cache/referrer/stale-access rules were under-specified.
- Upload constraints needed storage-enforced size/type, object tags, overwrite prevention, encryption policy, and multipart cleanup.
- Malware scanning needed to be P0 for arbitrary files or beta uploads restricted to validated images.
- Search tests needed same-tenant non-member denial, removed-member denial, filter injection, and deletion/purge indexing races.
- Chaos tests needed latency, packet loss, partial failures, DB failover, rolling deploys, and migration compatibility.
- Export artifacts needed encryption, short TTL, access logs, cleanup, approval, and PII minimization.
- Metrics/logs needed cardinality rules.
- Broker cookie mode needed CSRF/SameSite/CORS/origin requirements.

## Antigravity Findings

Antigravity returned a shorter summary after reading docs and code. It reported:

- C1: no token revocation mechanism; removed-user tokens can remain valid until expiry and Centrifugo is not force-disconnected.
- C2: demo broker remains in codebase and needs an explicit production kill switch.
- C3: shared-stack multi-tenancy has no RLS and no systematic `app_id` enforcement guardrail.
- C4: object storage key namespace must include `app_id` for shared-bucket multi-tenancy; existing implementation should be verified/migrated before real data.
- Additional gaps: legacy long-lived token endpoint, public-read demo bucket, API-key comparison hardening, missing `nbf`, upload confirm metadata/checksum gaps, and lack of current rate limit implementation coverage for all required actions.

## Remediation Applied To Specs

Updated docs to require:

- RLS, request-scoped tenant DB context, tenant-owned table inventory, and direct-query guardrails as P0 for shared-DB real-client beta.
- Model B/C or synthetic/non-record short-purge beta data if RLS/context guardrails are not ready.
- one ChatSDK `app_id` per independent Vouch tenant/client isolation boundary unless `vouch_tenant_id` becomes first-class across data, search, realtime, storage, policies, and tests.
- production kill switches for demo broker and legacy long-lived token mint routes.
- app-scoped broker credentials with mTLS/service JWT expectations, `kid`, replay auditing, broker-to-app enforcement, and revocation support.
- connected-user membership removal to revoke/deny API, backfill, search, media, and realtime access immediately where feasible.
- P0 rate limits for private reads, downloads, signed URLs, realtime auth, exports, admin actions, and tenant/global budgets.
- P0 minimal retention/deletion/export baseline for real-user beta.
- P0 actionable alerts and runbook ownership.
- private media cache/referrer controls, app-scoped object keys, content-type/checksum verification, overwrite prevention, multipart cleanup, and beta upload restrictions if malware scanning is absent.
- backup object manifests/checksums, purge ledger replay, and tombstoning of unrecoverable attachment rows.
- chaos tests for degradation, rolling deploys, and migration compatibility.

## Residual Risk

These are documentation/spec remediations only. The implementation still needs to be updated and tested against the stricter P0 gates before real multi-tenant Vouch beta data is stored.
