# Spec: Integration Fixes Round 2

## Overview

Three fixes from client integration feedback: rebuild stale core dist, handle "already subscribed" errors internally in useChannelSubscription, and add a useWorkspaceSubscription hook for workspace-level real-time events.

## Items

### Item 1: Stale .js barrel export in @chatsdk/core
**Status**: RESOLVED — `dist/index.js` already contains all exports (ErrorCodes, CircuitBreaker, etc.). Rebuilt dist with `tsc` to confirm freshness.

### Item 2: Handle "already subscribed" in useChannelSubscription

**Problem**: When `client.subscribeToChannel()` is called for a channel that's already subscribed (e.g., via useMessages + useChannelSubscription on the same channel), it throws an error. The hook surfaces this as an error state, confusing consumers.

**Solution**: Catch "already subscribed" errors in both `subscribe()` callback and the `useEffect` init, treating them as success (set `isSubscribed: true`, clear error).

**Acceptance Criteria**:
- [ ] AC1: Hook catches "already subscribed" errors and treats them as successful subscription
- [ ] AC2: Hook still surfaces genuine subscription errors (network, auth, etc.)
- [ ] AC3: `isSubscribed` is `true` after an "already subscribed" error is caught

### Item 3: Add useWorkspaceSubscription hook

**Problem**: Workspace-level events (`channel.created`, `channel.deleted`, `channel.updated`) require manual `client.on()` listeners. There's no hook to abstract this with automatic cleanup.

**Solution**: Create a `useWorkspaceSubscription` hook that listens to workspace-level events from the EventMap and provides callbacks + automatic cleanup.

**Acceptance Criteria**:
- [ ] AC4: Hook subscribes to channel.created, channel.updated, channel.deleted events
- [ ] AC5: Hook provides typed callback options for each event
- [ ] AC6: Hook cleans up all listeners on unmount
- [ ] AC7: Hook is exported from @chatsdk/react barrel
- [ ] AC8: Hook provides an `onEvent` catch-all callback

## Scope

**In Scope**: Hook logic, types, barrel exports, tests
**Out of Scope**: UI components, API routes, new EventMap event types

## Decision Log
- "Already subscribed" detection: Match error message substring since there's no typed error code for this from Centrifugo
- useWorkspaceSubscription listens to existing EventMap events (channel.*) — no new event types needed
