# Milestone 3 Tenant And Membership Log

Date: 2026-06-08
Status: completed

## Scope

Milestone 3 addressed authorization issues found during the post-fix Milestone 2 review:

- App-wide user management could be performed with any valid user Bearer token.
- Workspace invite acceptance was not scoped to the authenticated app.
- Workspace admins could grant or promote users to `owner`.
- Some token error hints referenced incorrect mounted paths.

## Changes

- Changed app-wide user-management routes to server API-key auth with `requireApp`:
  - `DELETE /api/users/:userId`
  - `POST /api/users/bulk-delete`
  - `POST /api/users/sync`
  - `PUT /api/users/:userId`
- Kept normal user read/update routes under `requireUser`.
- Scoped workspace invite acceptance by `app_id`:
  - Invite lookup now uses `token` plus authenticated `app_id`.
  - Invite status updates include `app_id`.
  - Workspace member-count update includes `app_id`.
  - Workspace detail lookup includes `app_id`.
  - A missing scoped workspace now returns `404`.
- Enforced owner hierarchy on workspace membership:
  - Admins cannot add members as `owner`.
  - Admins cannot promote members to `owner`.
  - Admins cannot modify existing owners.
  - Admins cannot invite new owners.
  - Admins cannot refresh existing pending owner invites.
  - Admins cannot remove existing owners.
  - Owners retain owner-management authority.
- Enforced owner hierarchy on channel membership:
  - Admins/moderators cannot demote equal-or-higher roles.
  - Admins/moderators cannot remove equal-or-higher roles.
- Corrected legacy `/tokens` route hints.
- Corrected the global `invalid token type` hint for refresh-token misuse on user routes.

## Verification

Local gates:

- `npm test --workspace=@chatsdk/api -- --run`: pass, 38 tests.
- `npm run typecheck --workspace=@chatsdk/api`: pass.
- `npm run build --workspace=@chatsdk/api`: pass.

Deployment gates on `chatsdk-hardening` LXC:

- Rebuilt and restarted `chatsdk-hardening-api:local`.
- API container healthy.
- Live seeded tenant/membership smoke passed against the deployed API and real Postgres database:
  - Bearer user token is rejected for `POST /api/users/sync`.
  - Server API key is accepted for `POST /api/users/sync`.
  - Bearer user token is rejected for arbitrary `DELETE /api/users/:userId`.
  - Server API key is accepted for `DELETE /api/users/:userId`.
  - Owner creates workspace.
  - Owner adds an admin.
  - Admin cannot add another user as owner.
  - Owner can add candidate as member.
  - Admin cannot promote candidate to owner.
  - Legacy invalid WebSocket token validation still returns `401`.
  - Admin cannot invite a user as owner.
  - Owner can create an owner invite, and admin cannot refresh that existing owner invite as a member invite.
  - Admin cannot remove an existing workspace owner.
  - Channel owner can promote an admin and second owner.
  - Channel admin cannot demote a channel owner.
  - Channel admin cannot remove a channel owner.

## Review Disposition

Adversarial reviews:

- GPT-5.5 high confirmed app-wide user management is now `requireApp`, invite acceptance is app-scoped, and token hints are aligned. It flagged two remaining owner bypasses: admins could invite owners and remove non-last owners. Resolved with guards and tests.
- Antigravity confirmed the same workspace owner-removal bypass and additionally flagged channel owner demote/remove gaps. Resolved with channel role target comparisons and tests.
- GPT-5.5 high post-fix review found a subtle pending-invite refresh bypass where an admin could refresh an existing owner invite by requesting a member invite to the same email. Resolved by loading existing invite `role`, rejecting preserved owner invites unless caller is owner, updating role explicitly on allowed refreshes, and adding a regression test.

## Remaining Issues

- Explicit `/api/server/*` routes may be cleaner than server-only behavior under `/api/users/*`; this is acceptable for this milestone because the dangerous user-token path is closed.
- Broader route inventory still needs a sweep for any handler under `/api/*` that should require user auth or app auth more explicitly.
- Invite tokens are still bearer secrets not bound to invited email/user. This may be acceptable for product behavior, but should be decided explicitly in a later invite-hardening pass.
- Client SDK API-key exposure, realtime publish health, service wiring, dependency audit, and seeded browser/Playwright tests remain later milestones.
