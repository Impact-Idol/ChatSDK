# Changelog: Idempotency Key + reconnectIn

**Completed**: 2026-01-30

## Summary

Two features from client integration feedback: idempotency key for `createChannel` to prevent duplicate group channels, and `reconnectIn` milliseconds-until-next-reconnect on connection state for countdown UI.

## What Was Built

### New Files Created

| File | Purpose |
|------|---------|
| docker/migrations/V004__channel_idempotency_key.sql | DB migration for idempotency_key column |
| packages/api/tests/channel-idempotency.test.ts | 5 API tests for idempotency key |
| packages/core/src/__tests__/reconnect-in.test.ts | 4 core tests for reconnectIn |
| packages/react/src/hooks/__tests__/useConnectionState.test.ts | 3 React tests for reconnectIn |

### Files Modified

| File | Changes |
|------|---------|
| packages/api/src/routes/channels.ts | Added idempotencyKey to schema + lookup before create |
| packages/core/src/schemas/index.ts | Added idempotencyKey to CreateChannelSchema |
| packages/core/src/index.ts | Export CreateChannel type from barrel |
| packages/core/src/types.ts | Added reconnectIn to connection.reconnecting event |
| packages/core/src/client/ChatClient.ts | Reconnect detection, attempt tracking, reconnectIn emission |
| packages/react/src/hooks/ChatProvider.tsx | reconnectIn state, context, useConnectionState |
| packages/react/src/hooks/useChannels.ts | createChannel helper on UseChannelsResult |

## Key Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Partial unique index on (app_id, idempotency_key) | NULL keys don't conflict; existing channels unaffected | Full unique index (would require backfill) |
| Return 200 for idempotent match vs 201 for new | Clients can distinguish dedup from create | Always return 201 |
| ctx.code === 1 + state-based reconnect detection | Covers both Centrifuge protocol codes and state transitions | Only code-based detection |
| reconnectIn from config intervals array | Matches Centrifuge's actual backoff schedule | Internal timer coupling |

## Test Coverage

- API tests: 5 (idempotency key CRUD)
- Core tests: 4 (reconnectIn event + interval calculation)
- React tests: 3 (useConnectionState reconnectIn)
- Total: 12 tests, all passing

## Related Documentation

- [Specification](./SPEC.md)
- [Tests](./TESTS.md)
- [Security Audit](./SECURITY.md)
- [Code Review](./CODE-REVIEW.md)
