# Multi-Project Onboarding Hardening Test Plan

Status: Draft
Date: 2026-06-20

## Test Strategy

Use layered tests:

- focused unit tests for provisioning helpers and validation
- API route tests for app, credential, broker, and membership behavior
- seeded two-app integration tests for isolation
- smoke tests against local/LAN deployments
- adversarial review for app-boundary and credential-boundary failures

## Required Test Fixtures

- `project-a-dev` ChatSDK app
- `project-b-dev` ChatSDK app
- one broker client/credential per project
- two users per project
- one DM and one group channel per project
- one removed member per project

## Core Cases

### Provisioning

- creates app with generated non-demo app ID
- rejects duplicate slug or conflicting app ID
- redacts server API keys after creation
- rotates server key and invalidates old key when requested
- rejects known dev/demo secrets in production mode

### Broker Scope

- broker credential can mint only for allowed app IDs
- staging credential cannot mint for production app
- origin mismatch is denied and audited
- disabled credential is denied and audited
- requested scopes must be subset of allowed scopes

### Membership

- active snapshot creates missing memberships
- active snapshot updates roles
- active snapshot removes omitted channels
- stale revision cannot resurrect removed access
- removed/suspended/disabled status revokes sessions and disconnects realtime user
- messages remain after member removal
- removed member cannot list messages, send messages, list members, or subscribe

### Cross-App Isolation

- Project A token cannot query Project B channels
- Project A server key cannot mutate Project B users/channels
- Project A broker credential cannot mint Project B token
- Project A realtime token cannot subscribe to Project B channel
- Project A search/media paths cannot retrieve Project B content

### Smoke CLI

- fails when app slug is missing
- fails when origin is not allowed
- fails when token broker mapping is missing
- passes end-to-end for a seeded project
- outputs redacted evidence suitable for agent-run notes

## Minimum Verification Per Slice

- Slice 1: app/key provisioning unit and API tests
- Slice 2: broker scope and origin negative tests
- Slice 3: membership sync and removed-member tests
- Slice 4: smoke CLI dry-run plus local live run when services are available
- Slice 5: docs link check or targeted grep for stale `001` guidance
- Slice 6: full targeted suite plus adversarial review artifacts

