# Milestone 5: Private Data Authorization Hardening

Date: 2026-06-08
Status: completed

## Scope

Harden API read/write paths so private channel, workspace, upload, receipt, search, presence, thread, poll, mention, moderation, supervision, enrollment, and emoji data is only visible or mutable by authorized users in the correct app and workspace context.

This milestone focused on authorization correctness and seeded route-level verification. Full browser Playwright flows remain a later milestone once the frontend scenario surface is ready.

## Changes

- Added shared authorization helpers in `packages/api/src/services/authorization.ts` for channel access, channel membership, app admin, workspace role, workspace membership, and privileged workspace roles.
- Tightened channel discovery and channel detail access:
  - Private channel metadata and members now require channel membership.
  - Workspace-scoped public/team channels are only exposed to workspace members.
  - `GET /api/channels?workspaceId=...` now requires workspace membership.
  - Channel creation with `workspaceId` requires workspace membership.
  - Workspace channel creation/member-add paths reject target users who are not workspace members.
- Tightened message access:
  - Message list/detail require valid channel access.
  - Public/team auto-join is blocked for workspace-scoped channels unless the caller is a workspace member.
  - Message idempotency, cursors, parent reply counts, edits, deletes, reactions, saves, and pins are app/channel scoped.
- Tightened attachment and read-state paths:
  - Upload list/download/confirm/delete paths require channel membership and app scoping.
  - Receipts, read markers, unread counts, and read-status lookups require channel membership and app/channel scoping.
- Tightened secondary data surfaces:
  - Search, presence, threads, polls, mentions, and moderation reports now validate channel membership and app-scoped joins before returning data or accepting writes.
  - Bulk presence now only returns users sharing at least one channel with the caller.
- Tightened workspace and enrollment controls:
  - Workspace channel listing filters to public/team channels or channels the caller belongs to.
  - Enrollment rule CRUD/list/get/history/execute require app admin status.
  - Enrollment channel actions cannot add users to workspace-scoped channels unless the user is already in that workspace.
- Tightened emoji and supervision controls:
  - Workspace emoji reads/search/get require workspace membership.
  - Workspace emoji upload requires workspace owner/admin; delete and analytics require creator or workspace owner/admin.
  - Emoji usage on a message requires both workspace membership and target channel membership.
  - Supervision create/update/delete/activity paths require app admin status; normal users cannot self-grant supervision access.
- Fixed related app-scoping issues in counts, deletes, realtime channel naming, and member leave behavior.

## Tests And Builds

- `npm test --workspace=@chatsdk/api`: 56 passed.
- `npm run typecheck --workspace=@chatsdk/api`: passed.
- `npm run build --workspace=@chatsdk/api`: passed.
- `git diff --check`: passed.

New focused coverage was added in `packages/api/tests/private-data-auth.test.ts`, including:

- Private channel message and metadata denial for nonmembers.
- Workspace-scoped public channel read and auto-join denial for non-workspace members.
- Upload download denial for channel nonmembers.
- Bulk presence shared-channel filtering.
- Moderation report denial for channel nonmembers.
- Supervision create denial for normal users.
- Workspace channel list filtering.
- Global workspace channel discovery denial.
- Workspace channel create/member-add target membership checks.
- Self-leave denial without membership and no publish side effect.
- Enrollment non-admin denial and workspace boundary enforcement.
- Emoji workspace nonmember denial.

## Live Verification

Deployment target:

- LXC: `chatsdk-hardening`
- API: `http://192.168.68.113:5500`
- Centrifugo: `http://192.168.68.113:8001`
- Database: external DB host configured in container environment.

Final seeded live smoke against the deployed API:

```text
LIVE_PRIVATE_DATA_AUTH_SMOKE memberRead=200 nonmemberRead=403 nonmemberDetail=403 workspacePublicNonmemberRead=403 workspaceFilteredList=403 workspacePublicAutoJoin=403 addWorkspaceChannelOutsider=403 workspaceEmojiOutsider=403 enrollmentCreateOutsider=403 supervisionCreateOutsider=403
```

This verifies private data denial and workspace boundary behavior against the live LXC deployment using seeded app, user, workspace, channel, message, emoji, enrollment, and supervision cases.

## Reviews

- GPT-5.5 high review found private-data blockers across messages, uploads, receipts, search, presence, threads, polls, mentions, moderation, and workspace listing. The shared authorization helper and per-route membership/app-scope checks were added in response.
- GPT-5.5 high follow-up found supervision self-grant, workspace channel list leakage, moderation report membership gaps, workspace channel creation gaps, workspace count app-scope issues, and self-leave publish side effects. These were fixed and covered by focused tests.
- GPT-5.5 high follow-up found workspace-scoped public channel exposure through global discovery, `workspaceId` channel list leakage, enrollment rule abuse, emoji workspace leakage, and remaining app-scoping gaps. These were fixed and covered by focused tests.
- GPT-5.5 high final review found direct channel member insertion and enrollment channel action paths could bypass workspace membership boundaries. These were fixed and covered by focused tests.
- Antigravity adversarial review was launched via the `agy` CLI after review/fix passes, but the CLI exited cleanly without returning reviewer text. This was recorded as inconclusive rather than used as a passing signal.

## Residuals

- Browser-level Playwright coverage with full seeded UI journeys is still pending; this milestone used API unit/integration tests and live seeded HTTP smoke.
- Template routes remain a separate subsystem and should be reviewed in a later pass if they are part of the production deployment surface.
- Realtime, Inngest, Meilisearch, and production audit vulnerabilities remain separate hardening tracks from the original backlog.
- The current deployment has verified private-data authorization behavior, but broader production readiness still depends on completing the remaining reliability, realtime, search, queue, audit, and end-to-end browser milestones.
