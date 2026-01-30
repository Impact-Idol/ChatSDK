# Code Review: Idempotency Key + reconnectIn

**Reviewer**: Claude (Self-review)
**Date**: 2026-01-30
**Status**: PASS

## Summary

Two integration features: idempotency key for createChannel dedup, and reconnectIn for reconnection countdown UI.

## Files Changed

| File | Lines Changed | Type | Notes |
|------|---------------|------|-------|
| docker/migrations/V004__channel_idempotency_key.sql | +7 (new) | Migration | New column + partial unique index |
| packages/api/src/routes/channels.ts | +12 | API route | idempotencyKey schema field + lookup before create |
| packages/core/src/schemas/index.ts | +1 | Schema | idempotencyKey in CreateChannelSchema |
| packages/core/src/index.ts | +3 | Barrel | Export CreateChannel type |
| packages/core/src/types.ts | +1 (modified) | Types | reconnectIn in EventMap |
| packages/core/src/client/ChatClient.ts | +20 | Client | reconnectAttempt tracking, reconnect detection |
| packages/react/src/hooks/ChatProvider.tsx | +8 | Provider | reconnectIn state + context |
| packages/react/src/hooks/useChannels.ts | +12 | Hook | createChannel helper function |
| packages/api/tests/channel-idempotency.test.ts | +220 (new) | Tests | 5 API tests |
| packages/core/src/__tests__/reconnect-in.test.ts | +70 (new) | Tests | 4 core tests |
| packages/react/src/hooks/__tests__/useConnectionState.test.ts | +30 (new) | Tests | 3 React tests |

## Approved

- [x] Code follows project conventions (Zod schemas, EventBus pattern, hooks)
- [x] Types properly updated (EventMap, ChatContextValue, UseChannelsResult)
- [x] SQL uses parameterized queries — no injection risk
- [x] Partial unique index handles NULL idempotency keys correctly
- [x] Reconnect detection covers both ctx.code and state-based detection
- [x] reconnectAttempt resets on connected — no stale state
- [x] Tests cover all acceptance criteria
- [x] Dist rebuilt and verified

## Final Verdict

**APPROVED**
