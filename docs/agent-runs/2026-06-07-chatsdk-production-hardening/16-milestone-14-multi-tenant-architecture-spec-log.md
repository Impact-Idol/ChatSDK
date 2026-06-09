# Milestone 14: Multi-Tenant Architecture Spec

Date: 2026-06-08
Status: completed

## Scope

Documented how ChatSDK should support multiple independent Vouch clients on a shared chat server.

## Artifact

- `docs/features/chatsdk-production-hardening/MULTI_TENANT_ARCHITECTURE_SPEC.md`

## Key Decisions

- Use one ChatSDK `app_id` per independent Vouch client/tenant isolation boundary as the default beta model.
- Let the Vouch-owned broker map Vouch client/tenant identity to ChatSDK `app_id`.
- Keep browser/mobile clients away from ChatSDK app/server keys.
- Scope search, realtime, object storage, rate limits, metrics, and audit logs by `app_id`.
- Treat Postgres RLS, request-scoped tenant context, and direct-query guardrails as P0 for shared-database beta with real client data.

## RLS Note

RLS is useful and now required as P0 for shared-database beta with real client data. The current API performs many pooled `db.query()` calls, so safe RLS requires request-scoped DB context, ideally via `SET LOCAL` inside a transaction wrapper such as `withTenantContext(auth, fn)`. Without that refactor, use separate schema/database/deployment or synthetic/non-record short-purge beta data.
