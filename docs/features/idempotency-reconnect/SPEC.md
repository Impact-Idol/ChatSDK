# Specification: Idempotency Key + reconnectIn

## Overview

Two features from client integration feedback:
1. **Part 2.4**: Idempotency key for `createChannel` to prevent duplicate group channels on retry/race
2. **Part 2.5**: `reconnectIn` on connection state for "Reconnecting in Xs..." UI

## User Stories

- As a developer, I want to pass an idempotency key when creating group channels so that retries don't create duplicates
- As a developer, I want to know when the SDK will attempt to reconnect so I can show users a countdown

## Acceptance Criteria

### Part 2.4: Idempotency Key
- [x] AC1: POST /api/channels accepts optional `idempotencyKey` field
- [x] AC2: Reusing same `idempotencyKey` returns existing channel (200)
- [x] AC3: Different `idempotencyKey` values create different channels
- [x] AC4: Omitting `idempotencyKey` allows duplicate group channels (existing behavior)
- [x] AC5: `idempotencyKey` is scoped to `app_id` (different apps can reuse keys)

### Part 2.5: reconnectIn
- [x] AC6: `connection.reconnecting` event includes `reconnectIn: number | null`
- [x] AC7: `reconnectIn` uses last interval when attempts exceed array length
- [x] AC8: Reconnect attempt counter resets on successful connection
- [x] AC9: `useConnectionState()` returns `reconnectIn: number | null`

## Technical Design

### Part 2.4
- DB migration: `idempotency_key VARCHAR(255)` column with partial unique index `(app_id, idempotency_key) WHERE idempotency_key IS NOT NULL`
- API: Check for existing channel by key before creating; return 200 if found
- Core: `CreateChannelSchema` gains optional `idempotencyKey` field
- React: `useChannels()` gains `createChannel(data)` helper

### Part 2.5
- Centrifuge's `connecting` event fires for both initial connect and reconnect
- Detect reconnects via `ctx.code === 1` or prior state being `connected`/`reconnecting`
- Track `reconnectAttempt` counter, calculate delay from `reconnectIntervals` config
- Reset counter to 0 on successful `connected`
- Expose `reconnectIn` in ChatProvider context and `useConnectionState()` hook

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Partial unique index | NULL keys don't conflict — existing channels without keys are unaffected |
| Return 200 for idempotent match | Distinguishes from 201 (new) — clients can detect dedup |
| ctx.code === 1 for reconnect detection | Centrifuge convention for reconnect-after-disconnect |
| reconnectIn from config intervals | Matches Centrifuge's actual backoff; avoids internal timer coupling |
