# Multi-Project Broker Scope Hardening

Date: 2026-06-20

## Decision

Multi-project broker integrations must be provisioned with explicit app-scoped broker rows and fail-closed tenant/user/channel constraints. Empty tenant ID, user prefix, or channel prefix arrays are invalid at provisioning time and invalid at runtime.

Broker-scoped browser tokens are allowed only on broker-managed routes and must carry the route's required scope. First-party legacy user tokens without broker claims continue through existing route and business authorization, except `POST /api/channels` still requires explicit `channel:create`.

Server API keys should authenticate through `app_api_key` rows by default. Legacy primary `app.api_key` authentication is an explicit compatibility escape hatch controlled by `CHATSDK_ENABLE_PRIMARY_APP_KEY_AUTH=true`.

## Rationale

This prevents one embedded project or environment from accidentally minting tokens or memberships for another, avoids silent browser escalation to channel creation, and keeps removed/suspended broker configuration from being resurrected by operator reruns.

## Follow-Ups

- Add DB-level cardinality checks for broker scope constraint arrays.
- Add stronger DB-level wildcard-origin rejection if raw SQL writes become part of normal operations.
- Done in the final hardening pass: app-scoped server keys now store/authenticate through `app_api_key.api_key_hash`; project `show` reports a non-secret `sha256:` fingerprint.
