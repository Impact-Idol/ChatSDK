# Changelog: Integration Fixes Round 2

**Completed**: 2026-01-30

## Summary

Three fixes from client integration feedback: ensured core dist barrel is fresh, added graceful "already subscribed" handling in useChannelSubscription, and created a new useWorkspaceSubscription hook for workspace-level real-time events.

## What Was Built

### New Files Created

| File | Purpose |
|------|---------|
| packages/react/src/hooks/useWorkspaceSubscription.ts | Workspace-level event subscription hook |
| packages/react/src/hooks/__tests__/useChannelSubscription.test.ts | Tests for items 2 and 3 |

### Files Modified

| File | Changes |
|------|---------|
| packages/react/src/hooks/useChannelSubscription.ts | Added isAlreadySubscribedError helper, integrated into subscribe paths |
| packages/react/src/hooks/index.ts | Export useWorkspaceSubscription + isAlreadySubscribedError |
| packages/react/src/index.ts | Re-export new hook, helper, and types from package root |

## Key Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Substring matching for "already subscribed" | Centrifuge doesn't expose typed error codes for this | Custom error class wrapper |
| Reuse existing EventMap events | channel.created/updated/deleted already exist | Adding workspace.* event types |
| Always return isListening: true | Listeners are active as long as hook is mounted | Track mount/unmount state |

## Test Coverage

- Unit tests: 3 (isAlreadySubscribedError helper)
- Integration tests: 3 (barrel exports, type verification)
- Total: 6 tests, all passing
