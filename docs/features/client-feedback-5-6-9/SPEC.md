# Feature Spec: Client Feedback Parts 5, 6, 9

## Overview

Implements three client-requested improvements to the ChatSDK:
1. **Part 5 - Role Update API**: PATCH endpoints for updating member roles without remove/re-add
2. **Part 6 - Export TypeScript Types**: Re-export all public-facing types from `@chatsdk/react`
3. **Part 9 - Error Classification**: Add `ErrorCodes` const object for type-safe error handling

## User Stories

- As an SDK consumer, I want to update a member's role in a single API call so that I don't risk leaving users in a removed state during role changes.
- As an SDK consumer, I want to import all public types from `@chatsdk/react` so that I don't maintain parallel type definitions.
- As an SDK consumer, I want typed error codes so that I can distinguish between error types without parsing strings.

## Acceptance Criteria

### Part 5 - Role Update API

- [ ] AC1: `PATCH /api/workspaces/:id/members/:userId` updates a workspace member's role
- [ ] AC2: `PATCH /api/channels/:channelId/members/:userId` updates a channel member's role
- [ ] AC3: Workspace role update requires owner/admin permission (or API key auth)
- [ ] AC4: Channel role update requires owner/admin/moderator permission
- [ ] AC5: Cannot demote the last owner of a workspace
- [ ] AC6: Returns 404 if the member doesn't exist
- [ ] AC7: `ChatClient` exposes `updateWorkspaceMemberRole(workspaceId, userId, role)`
- [ ] AC8: `ChatClient` exposes `updateChannelMemberRole(channelId, userId, role)`
- [ ] AC9: `useWorkspaces` hook exposes `updateMemberRole(workspaceId, userId, role)`

### Part 6 - Export TypeScript Types

- [ ] AC10: `@chatsdk/react` re-exports all EventMap, event payload types from `@chatsdk/core`
- [ ] AC11: `@chatsdk/react` re-exports all error classes and `ErrorCodes` from `@chatsdk/core`
- [ ] AC12: `@chatsdk/react` re-exports core domain types: `User`, `Channel`, `Message`, `Attachment`, `Reaction`, `ReactionGroup`, `ReadState`, `TypingEvent`, `ChatEvent`, `ChatEventType`, `EventCallback`
- [ ] AC13: Existing aliased exports (`CoreUser`, `CoreChannel`, etc.) remain for backward compatibility

### Part 9 - Error Classification

- [ ] AC14: `ErrorCodes` const object exported from `@chatsdk/core` with all 12 error codes
- [ ] AC15: All error classes use `ErrorCodes` values instead of string literals
- [ ] AC16: `ErrorCode` type exported as union of all values
- [ ] AC17: `createError()` uses `ErrorCodes` values
- [ ] AC18: `assert()` uses `ErrorCodes.ASSERTION_ERROR`

## Scope

**In Scope:**
- API route endpoints (PATCH)
- Zod validation schemas
- Permission checks (owner/admin/moderator, API key bypass)
- Last-owner protection for workspaces
- ChatClient methods
- React hook methods
- ErrorCodes const + type
- Type re-exports

**Out of Scope:**
- UI components for role management
- Real-time events for role changes (future enhancement)
- Channel member role management in useChannels hook (only useWorkspaces for now)
- Migration scripts for existing data

## Technical Requirements

### Part 5
- New Zod schema: `updateMemberRoleSchema` with `role` field
- New PATCH routes in `workspaces.ts` and `channels.ts`
- Permission pattern follows existing add/remove member endpoints
- Last-owner protection follows existing remove member pattern
- New methods on `ChatClient` class
- New method on `useWorkspaces` hook return type

### Part 6
- Add type re-exports to `packages/react/src/index.ts`
- Keep existing aliased exports for backward compatibility

### Part 9
- Add `ErrorCodes` const object to `packages/core/src/lib/errors.ts`
- Export `ErrorCode` type as `typeof ErrorCodes[keyof typeof ErrorCodes]`
- Update all error class constructors to use enum values
- Export from `packages/core/src/index.ts` and `packages/react/src/index.ts`

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Use `as const` object instead of TypeScript `enum` | `as const` objects are more idiomatic in modern TS, tree-shake better, and work with `typeof` for type inference |
| Keep `CoreUser`/`CoreChannel` aliases | Backward compatibility - existing consumers may use these |
| Add `updateMemberRole` only to `useWorkspaces` | Channel member management is less common in hooks; `ChatClient` methods cover channel case |
