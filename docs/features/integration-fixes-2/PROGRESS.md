# Progress: Integration Fixes Round 2

### 2026-01-30 - Session 1

**Completed:**
- Item 1: Verified core dist barrel is up to date; rebuilt with `tsc`
- Item 2: Added `isAlreadySubscribedError()` helper and integrated into both `subscribe()` callback and `useEffect` init in useChannelSubscription
- Item 3: Created `useWorkspaceSubscription` hook with `onChannelCreated`, `onChannelUpdated`, `onChannelDeleted`, and `onEvent` callbacks
- All 6 tests passing, TypeScript clean, 333/333 core tests green

**Decisions Made:**
- Used substring matching (`already subscribed`, `subscription already exists`) for error detection since Centrifuge doesn't expose typed error codes for this case
- useWorkspaceSubscription uses existing EventMap events (channel.created/updated/deleted) — no new event types needed
- Hook returns `isListening: true` always since event listeners are active as long as the hook is mounted

**NEXT SESSION:**
- [ ] Code review
- [ ] Security audit
