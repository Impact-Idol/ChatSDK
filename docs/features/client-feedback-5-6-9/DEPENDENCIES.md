# Dependency Map: Client Feedback Parts 5, 6, 9

## Overview Diagram

```
Client Feedback (5, 6, 9)
├── Part 9: ErrorCodes (no deps - implement first)
│   └── packages/core/src/lib/errors.ts
│       ├── Add ErrorCodes const object
│       └── Update all error classes to use it
│
├── Part 6: Type Re-exports (depends on Part 9 for ErrorCodes export)
│   └── packages/react/src/index.ts
│       ├── Re-export core domain types
│       ├── Re-export error classes + ErrorCodes
│       └── Re-export event types
│
└── Part 5: Role Update API (independent of 6, 9)
    ├── API Layer
    │   ├── packages/api/src/routes/workspaces.ts (PATCH endpoint)
    │   └── packages/api/src/routes/channels.ts (PATCH endpoint)
    ├── Core SDK
    │   └── packages/core/src/client/ChatClient.ts (new methods)
    └── React Hooks
        └── packages/react/src/hooks/useWorkspaces.ts (new method)
```

## Files Modified

| File | Changes | Part |
|------|---------|------|
| `packages/core/src/lib/errors.ts` | Add `ErrorCodes` const, update error classes | 9 |
| `packages/core/src/index.ts` | Export `ErrorCodes`, `ErrorCode` type | 9 |
| `packages/react/src/index.ts` | Re-export types, errors, events | 6, 9 |
| `packages/api/src/routes/workspaces.ts` | Add PATCH member role endpoint | 5 |
| `packages/api/src/routes/channels.ts` | Add PATCH member role endpoint | 5 |
| `packages/core/src/client/ChatClient.ts` | Add member management methods | 5 |
| `packages/react/src/hooks/useWorkspaces.ts` | Add `updateMemberRole` method | 5 |

## New Test Files

| File | Purpose | Part |
|------|---------|------|
| `packages/core/src/lib/errors.test.ts` | Update existing tests for ErrorCodes | 9 |
| `packages/api/tests/member-role-update.test.ts` | API endpoint tests | 5 |
| `packages/core/src/__tests__/ChatClient.member-ops.test.ts` | Client method tests | 5 |

## Implementation Order

1. **ErrorCodes** (Part 9) - No dependencies, foundational
2. **Type re-exports** (Part 6) - Depends on ErrorCodes being exported
3. **API PATCH endpoints** (Part 5) - Independent
4. **ChatClient methods** (Part 5) - Depends on API endpoints
5. **React hook methods** (Part 5) - Depends on ChatClient methods

## Internal Dependencies

| Import Source | Imports Used | By File |
|---------------|-------------|---------|
| `hono` | `Hono`, `Context` | workspaces.ts, channels.ts |
| `@hono/zod-validator` | `zValidator` | workspaces.ts, channels.ts |
| `zod` | `z` | workspaces.ts, channels.ts |
| `../middleware/auth` | `requireUser` | workspaces.ts, channels.ts |
| `../services/database` | `db` | workspaces.ts, channels.ts |
| `../services/logger` | `logger` | workspaces.ts |
| `@chatsdk/core` | types, errors | react/index.ts |
