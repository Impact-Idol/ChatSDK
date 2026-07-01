# Vouch Channel Membership Lifecycle

Date: 2026-06-20

## Decision

Vouch should treat squad/org eligibility as the source of truth and remove users from ChatSDK private/group channel membership when they leave a squad or lose the required org role.

## Current ChatSDK behavior

- `POST /api/channels/:channelId/members` can add members to non-DM channels.
- `PATCH /api/channels/:channelId/members/:userId` can change non-DM channel roles among `owner`, `admin`, `moderator`, and `member`.
- `DELETE /api/channels/:channelId/members/:userId` removes a channel member, updates `member_count`, emits membership realtime events, and unsubscribes the removed user.
- Private/group message history and message send routes are membership-gated. A removed private/group member cannot continue reading history or sending messages through normal APIs.
- Broker membership sync can apply full membership snapshots and remove omitted channels; removed/suspended/disabled statuses remove memberships and enqueue realtime disconnect/unsubscribe work.

## Product implication

The first production contract should be: if the user is no longer eligible for a squad/org channel, remove them from that ChatSDK channel. This prevents future messages and also removes normal API access to prior channel history.

Keeping history visible while blocking future messages would require a new first-class state, such as a `read_only`/`former_member` membership role plus route-level send restrictions and UI treatment. That state is not currently implemented and should be treated as a separate product/security design.

