I will start by checking the list of permissions and viewing the files requested in `/Users/pushkar/chatsdk` to perform the review.
I will read the SQL migration file `docker/migrations/V014__client_owned_token_broker.sql` to verify that `chatsdk_broker_system` is correctly created/provisioned and granted the required privileges.
Let's analyze the migration. It defines `chatsdk_broker_system` (without superuser/createdb/createrole/inherit/bypassrls) and grants SELECT, INSERT, etc., to specific tables.
Now let's read the rest of the requested files:
1. `packages/api/src/services/broker-auth.ts`
2. `packages/api/src/services/tokens.ts`
3. `packages/api/src/middleware/auth.ts`
4. `packages/api/src/routes/server.ts`
5. `packages/api/src/routes/messages.ts`
6. `packages/api/src/routes/uploads.ts`
7. `packages/api/src/routes/search.ts`
8. `packages/api/src/routes/realtime.ts`
9. `packages/api/src/routes/presence.ts`
10. `packages/api/tests/broker-token-mint.test.ts`
11. `packages/api/tests/message-outbox.test.ts`

Let's read `packages/api/src/services/broker-auth.ts` first.
Let's look at `packages/api/src/services/tokens.ts`. I will view it next.
In `packages/api/src/services/tokens.ts`, let's see how scopes are signed into broker access/ws tokens:
Lines 193-203 (in `issueBrokerTokenBundle`):
```typescript
  const token = await new jose.SignJWT({
    user_id: input.userId,
    app_id: input.appId,
    type: 'access',
    sid: sessionId,
    broker_client_id: input.brokerClientId,
    broker_credential_id: input.brokerCredentialId,
    external_tenant_id: input.externalTenantId,
    membership_version: input.membershipVersion,
    scopes: input.scopes,
  })
```
And lines 214-224:
```typescript
  const wsToken = await new jose.SignJWT({
    sub: realtimeUserSubject(input.appId, input.userId),
    user_id: input.userId,
    app_id: input.appId,
    sid: sessionId,
    broker_client_id: input.brokerClientId,
    broker_credential_id: input.brokerCredentialId,
    external_tenant_id: input.externalTenantId,
    membership_version: input.membershipVersion,
    scopes: input.scopes,
  })
```
So yes! `scopes` are signed into broker access and ws tokens.

Now let's check `packages/api/src/middleware/auth.ts`. Let's view that file.
Let's review the scopes logic in `packages/api/src/middleware/auth.ts`:
Line 153:
```typescript
export function requireScope(scope: string) {
  return createMiddleware(async (c, next) => {
    const auth = c.get('auth');
    if (auth?.authType === 'user' && auth.scopes && !auth.scopes.includes(scope)) {
      throw new HTTPException(403, { message: `Token scope required: ${scope}` });
    }
    await next();
  });
}
```
Wait, if `auth.scopes` is undefined, does `requireScope` bypass enforcement?
Let's see: `if (auth?.authType === 'user' && auth.scopes && !auth.scopes.includes(scope))`
Wait! If `auth.scopes` is undefined/not set, the condition `auth.scopes && !auth.scopes.includes(scope)` is falsy, so it bypasses the exception throwing!
Wait, is this correct/expected?
Let's check if the standard user token (issued via non-broker context) has `auth.scopes` or if it's undefined.
Ah, in `issueTokenBundle`:
```typescript
  const token = await new jose.SignJWT({
    user_id: input.userId,
    app_id: input.appId,
    type: 'access',
    sid: sessionId,
  })
```
It does not have a `scopes` claim!
So for standard client-owned tokens (where the client SDK or app gets a token direct from the app backend using a legacy token bundle), there are NO scopes. The legacy model might not use scopes, meaning standard tokens have full access (`scopes` is undefined).
But wait, for broker tokens, `scopes` is defined as an array of strings in the token (from `input.scopes`).
So if a token has scopes, they are enforced. But wait! If a broker token is signed with an empty scopes array `[]` or if a malicious broker client manages to bypass something, wait, `scopes` in the broker token is signed.
Wait! Let's read `getTokenScopes` at line 224:
```typescript
function getTokenScopes(payload: Record<string, unknown>): string[] | undefined {
  const rawScopes = payload.scopes ?? payload.scp;
  if (Array.isArray(rawScopes) && rawScopes.every((scope) => typeof scope === 'string')) {
    return rawScopes;
  }
  if (typeof rawScopes === 'string') {
    return rawScopes.split(' ').filter(Boolean);
  }
  return undefined;
}
```
So if `payload.scopes` is present, it returns `rawScopes` (the array or split string). If `payload.scopes` is not present, it returns `undefined`.
Wait, if a broker-minted token has `payload.scopes` but it's an array (which is signed into the token), `getTokenScopes` returns that array (e.g. `['chat:read']`).
Then `auth.scopes` is set to `['chat:read']`.
If the user tries to access a route requiring `upload:write` (which is not in `['chat:read']`), `auth.scopes.includes('upload:write')` is false, and it throws 403.
Wait, what if a broker-minted token does *not* contain the `scopes` claim?
Wait, `issueBrokerTokenBundle` always signs the token with `scopes: input.scopes`. If `input.scopes` is passed, it will be an array of strings (from `broker_app_scope`'s default/allowed scopes).
Wait, is it possible for a broker-minted token to NOT have `scopes`? E.g., if a broker client does not pass or somehow skips scopes?
Wait, if a broker-minted token has `scopes: []` (empty array), then `auth.scopes` is `[]`.
But wait! If a broker token has NO scopes claim at all, then `auth.scopes` is undefined, and they get full access!
Wait, does `issueBrokerTokenBundle` allow `scopes` to be undefined or missing?
```typescript
export async function issueBrokerTokenBundle(input: {
  ...
  scopes: string[];
}): Promise<BrokerTokenBundle> {
```
It requires `scopes` to be `string[]`.
Let's see where `issueBrokerTokenBundle` is called in the routes. Let's view `packages/api/src/routes/server.ts`. I will view `packages/api/src/routes/server.ts` to see how it handles broker token minting.
Let's check the route files requested next.
Let's see:
1. `packages/api/src/routes/messages.ts`
2. `packages/api/src/routes/uploads.ts`
3. `packages/api/src/routes/search.ts`
4. `packages/api/src/routes/realtime.ts`
5. `packages/api/src/routes/presence.ts`

Let's read `packages/api/src/routes/messages.ts` using `view_file`. We can view the first 800 lines (or the whole file if it's less). Let's do it.
Wait! Let's check:
In `packages/api/src/routes/messages.ts`, lines 63-64:
```typescript
messageRoutes.post(
  '/',
  requireUser,
  requireScope('chat:write'),
```
And line 366:
```typescript
messageRoutes.get(
  '/',
  requireUser,
  requireScope('chat:read'),
```
And line 782:
```typescript
messageRoutes.post(
  '/:messageId/reactions',
  requireUser,
  requireScope('reaction:write'),
```

Wait, let's look at the remaining router files:
- `packages/api/src/routes/uploads.ts`
- `packages/api/src/routes/search.ts`
- `packages/api/src/routes/realtime.ts`
- `packages/api/src/routes/presence.ts`

Let's read `packages/api/src/routes/uploads.ts`. I will view it next.
Okay, let's review:
In `packages/api/src/routes/uploads.ts`:
Line 194:
```typescript
uploadRoutes.post(
  '/presigned',
  requireUser,
  requireScope('upload:write'),
```
Line 263:
```typescript
uploadRoutes.post(
  '/direct',
  requireUser,
  requireScope('upload:write'),
```
Wait, other upload endpoints (like `confirm`, `content`, `download`, `delete`) don't seem to have `requireScope('upload:write')` or any other scope. Wait, do they have any other scope, or are they scoped-checked? E.g. download is not scoped-checked (or maybe mediaRead rate limit policy is applied, but no `requireScope` middleware). Let's double check if that's expected. Wait, the prompt says "scopes are signed into broker access/ws tokens, propagated through auth middleware, and enforced on representative client routes;".
The representative client routes are indeed:
- messages: `chat:write` on POST message (line 64), `chat:read` on GET messages (line 366).
- uploads: `upload:write` on `/presigned` (line 194) and `/direct` (line 263).
- Let's check `packages/api/src/routes/search.ts` for search scope, `packages/api/src/routes/realtime.ts`, and `packages/api/src/routes/presence.ts`.

Let's read `packages/api/src/routes/search.ts` first.
Excellent. In `packages/api/src/routes/search.ts`:
Line 127: `requireScope('search:read')` on `searchRoutes.get('/', ...)`
Line 212: `requireScope('search:read')` on `searchRoutes.get('/suggestions', ...)`
Line 261: `requireScope('search:read')` on `channelSearchRoutes.get('/', ...)`

Now let's check `packages/api/src/routes/realtime.ts`. I will view it next.
Perfect. In `packages/api/src/routes/realtime.ts`:
Line 27: `requireScope('chat:read')` on `/subscription-token` route.

Now let's check `packages/api/src/routes/presence.ts`. I will view it next.
Let's review presence routes:
Line 20: `presenceRoutes.post('/heartbeat', requireUser, requireScope('typing:write'), ...)`
Line 36: `presenceRoutes.post('/online', requireUser, requireScope('typing:write'), ...)`
Line 69: `presenceRoutes.post('/offline', requireUser, requireScope('typing:write'), ...)`

Wait, what about `/query`, `/` (channel presence), `/live`?
Wait, do they have any `requireScope`?
Ah, they have `requireUser` but NO `requireScope`! E.g. `presenceRoutes.post('/query', requireUser, ...)`
Wait, is this normal or is it a security issue?
Well, let's verify if there is any other route or if this is fine. The prompt says: "scopes are signed into broker access/ws tokens, propagated through auth middleware, and enforced on representative client routes".
Wait, what are the representative client routes?
1. POST /api/channels/:channelId/messages (`chat:write`)
2. GET /api/channels/:channelId/messages (`chat:read`)
3. POST /api/presence/heartbeat (`typing:write`)
4. POST /api/presence/online (`typing:write`)
5. POST /api/presence/offline (`typing:write`)
6. POST /api/uploads/presigned (`upload:write`)
7. POST /api/uploads/direct (`upload:write`)
8. GET /api/search (`search:read`)
9. GET /api/search/suggestions (`search:read`)
10. GET /api/channels/:channelId/search (`search:read`)
11. POST /api/realtime/subscription-token (`chat:read`)

Wait, are there other presence or upload routes that do NOT enforce scopes?
Yes, `presenceRoutes.post('/query')` (line 107), `channelPresenceRoutes.get('/')` (line 165), `channelPresenceRoutes.get('/live')` (line 223) do NOT enforce scopes.
Wait, what about `uploadRoutes.post('/:key/confirm')` (line 381), `uploadRoutes.get('/content')` (line 503), `uploadRoutes.get('/:key/content')` (line 527), `uploadRoutes.get('/:key/download')` (line 540), `uploadRoutes.delete('/:key')` (line 576), `channelUploadsRoutes.get('/')` (line 619)?
None of those enforce any scopes (they only have `requireUser`).
Wait, is that a medium finding? Or is it intended because these are not "representative client routes"? The prompt says: "enforced on representative client routes".
Wait, let's think: if a client has a broker token with scopes, e.g. `['chat:read']`, and they try to upload a file (`upload:write`) or search (`search:read`), those scopes are checked and they are denied.
But what if they try to do a presence query `/query`? Since there's no scope check, they can query presence even if their broker token doesn't have a typing/presence scope!
Wait, is there a presence read scope?
Let's look at SQL migration V014:
Lines 80-87:
```sql
  allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY[
    'chat:read',
    'chat:write',
    'reaction:write',
    'typing:write',
    'upload:write',
    'search:read'
  ],
```
Wait! There is NO `presence:read` or `typing:read` scope! The only typing/presence scope is `typing:write`!
So there is indeed no scope for reading presence, which is why `/query` and `/live` and `/` (channel presence) do not have scope checks.
But wait! What about `/confirm` upload?
Wait, if a client has `upload:write`, they can do presigned or direct upload. But once the upload is in S3, confirming it requires `/confirm` which doesn't check `upload:write` scope. But typically if you can't upload, confirming doesn't do much (as you need to have uploaded the file first).
What about deleting an upload (`DELETE /:key`)? That also only has `requireUser` and doesn't check `upload:write`.
Wait, is there an `upload:delete` or `upload:read` scope? No, only `upload:write`.
What about listing channel uploads (`GET /api/channels/:channelId/uploads`)? That also doesn't check any scope. Is there a `chat:read` scope that should cover it? Or `upload:read`? But there is no `upload:read` scope. Should listing uploads be covered by `chat:read`?
Let's see: `channelUploadsRoutes.get('/')` does NOT check `chat:read`.
Wait! Is it possible for a user to list uploads if they have a token scoped only to `reaction:write`?
Yes, because `channelUploadsRoutes.get('/')` only has `requireUser` and no `requireScope` check!
Wait, what about `GET /api/channels/:channelId/messages/:messageId`?
Lines 504-506:
```typescript
messageRoutes.get(
  '/:messageId',
  requireUser,
  rateLimitUser(RATE_LIMIT_POLICIES.messageHistory, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
```
It does NOT check `chat:read`!
Oh, wow! `GET /:messageId` does NOT have `requireScope('chat:read')`!
Wait, let's verify if `messageRoutes.patch('/:messageId')` checks `chat:write`?
Lines 561-563:
```typescript
messageRoutes.patch(
  '/:messageId',
  requireUser,
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
```
It does NOT check `chat:write`!
Wait, `messageRoutes.delete('/:messageId')`?
Lines 638-640:
```typescript
messageRoutes.delete(
  '/:messageId',
  requireUser,
```
It does NOT check `chat:write`!
Wait, `messageRoutes.delete('/:messageId/purge')`?
Lines 717-719:
```typescript
messageRoutes.delete(
  '/:messageId/purge',
  requireUser,
```
It does NOT check `chat:write`!

Wow! This is a significant finding!
Let's list these routes in `packages/api/src/routes/messages.ts` that lack scope checks:
- `GET /api/channels/:channelId/messages/:messageId` (should require `chat:read`)
- `PATCH /api/channels/:channelId/messages/:messageId` (should require `chat:write`)
- `DELETE /api/channels/:channelId/messages/:messageId` (should require `chat:write`)
- `DELETE /api/channels/:channelId/messages/:messageId/purge` (should require `chat:write`)

Wait, let's check if there are other routes in `messages.ts` that don't check scopes.
Let's check lines 800+ of `packages/api/src/routes/messages.ts`.
Let's read lines 800 to 1491 of `packages/api/src/routes/messages.ts` using `view_file`.I will view the rest of `packages/api/src/routes/messages.ts` to inspect all remaining message and reaction routes.
Okay, let's look at the remaining code of `messages.ts` (lines 1492 to the end). Since it's only a few lines, let's just view them quickly. Or we don't have to, let's check `packages/api/tests/broker-token-mint.test.ts` and `packages/api/tests/message-outbox.test.ts`.

Let's read `packages/api/tests/broker-token-mint.test.ts` first. I will view it.
Let's read `packages/api/tests/message-outbox.test.ts`. I will view it next.
Let's re-verify the list of verification points from the prompt:

1. **"scopes are signed into broker access/ws tokens, propagated through auth middleware, and enforced on representative client routes"**
   - **Signed in broker access/ws tokens:** Let's verify `packages/api/src/services/tokens.ts`:
     - Yes, `issueBrokerTokenBundle` encodes `scopes: input.scopes` into access token (lines 193-212) and ws token (lines 214-232).
   - **Propagated through auth middleware:** Let's verify `packages/api/src/middleware/auth.ts`:
     - In `authenticateBearer` (lines 163-222), it calls `getTokenScopes(payload)` (line 215) and sets `scopes` in the returned `AuthContext`.
     - In `getTokenScopes` (line 224), it extracts `payload.scopes ?? payload.scp`, supports string array or space-separated string, and returns them.
     - Yes, this propagates it through the auth middleware.
   - **Enforced on representative client routes:**
     - Let's list the routes in messages, uploads, search, realtime, presence:
       - `packages/api/src/routes/messages.ts`:
         - `POST /` (send message) has `requireScope('chat:write')` (line 64).
         - `GET /` (query messages) has `requireScope('chat:read')` (line 366).
         - `POST /:messageId/reactions` has `requireScope('reaction:write')` (line 782).
         - `DELETE /:messageId/reactions/:emoji` has `requireScope('reaction:write')` (line 866).
         - `POST /:messageId/pin` has `requireScope('chat:write')` (line 1186).
         - **MISSING SCOPE ENFORCEMENT:**
           - `GET /:messageId` does NOT have any scope check! It only has `requireUser` (line 506). Any user token can read single messages without `chat:read` scope.
           - `PATCH /:messageId` (edit message) does NOT have `chat:write` scope check! It only has `requireUser` (line 562).
           - `DELETE /:messageId` (soft-delete message) does NOT have `chat:write` scope check! It only has `requireUser` (line 639).
           - `DELETE /:messageId/purge` (hard-purge message) does NOT have `chat:write` scope check! It only has `requireUser` (line 718).
           - `DELETE /:messageId/pin` (unpin message) does NOT have `chat:write` scope check! It only has `requireUser` (line 1269).
           - `GET /pins` (get pinned messages) does NOT have `chat:read` scope check! It only has `requireUser` (line 1331).
           - `POST /:messageId/save` (save message) does NOT have `chat:write` (or `chat:read`) scope check! It only has `requireUser` (line 1383).
           - `DELETE /:messageId/save` (unsave message) does NOT have `chat:write` scope check! It only has `requireUser` (line 1424).
           - `GET /me/saved` (get saved messages) does NOT have `chat:read` scope check! It only has `requireUser` (line 1447).
       - `packages/api/src/routes/uploads.ts`:
         - `POST /presigned` has `requireScope('upload:write')` (line 194).
         - `POST /direct` has `requireScope('upload:write')` (line 263).
         - **MISSING SCOPE ENFORCEMENT:**
           - `POST /:key/confirm` does NOT check `upload:write` scope.
           - `GET /content` (stream upload) does NOT check any scope. (Wait, media read only checks `requireUser`).
           - `GET /:key/content` does NOT check any scope.
           - `GET /:key/download` does NOT check any scope.
           - `DELETE /:key` (delete upload) does NOT check `upload:write`.
           - `GET /api/channels/:channelId/uploads` (list uploads) does NOT check any scope.
       - `packages/api/src/routes/search.ts`:
         - `GET /` (search messages) has `requireScope('search:read')` (line 127).
         - `GET /suggestions` has `requireScope('search:read')` (line 212).
         - `GET /api/channels/:channelId/search` has `requireScope('search:read')` (line 261).
       - `packages/api/src/routes/realtime.ts`:
         - `POST /subscription-token` has `requireScope('chat:read')` (line 27).
       - `packages/api/src/routes/presence.ts`:
         - `POST /heartbeat` has `requireScope('typing:write')` (line 20).
         - `POST /online` has `requireScope('typing:write')` (line 36).
         - `POST /offline` has `requireScope('typing:write')` (line 69).
         - **MISSING SCOPE ENFORCEMENT:**
           - `POST /query` (query presence) does NOT check any scope. (Maybe `chat:read` or a typing scope should be required?).
           - `GET /api/channels/:channelId/presence` does NOT check any scope.
           - `GET /api/channels/:channelId/presence/live` does NOT check any scope.

Wait! The finding that routes like `PATCH /:messageId`, `DELETE /:messageId`, `GET /:messageId` in `messages.ts` do not require scopes is a CRITICAL or HIGH finding because it allows a client with a restricted scope token (e.g. one issued with only `reaction:write` or `chat:read`) to modify/delete/read messages via direct API endpoints!
Wait! Let's think if the token middleware `requireScope` is robust.
Let's look at `requireScope` in `packages/api/src/middleware/auth.ts` again:
```typescript
export function requireScope(scope: string) {
  return createMiddleware(async (c, next) => {
    const auth = c.get('auth');
    if (auth?.authType === 'user' && auth.scopes && !auth.scopes.includes(scope)) {
      throw new HTTPException(403, { message: `Token scope required: ${scope}` });
    }
    await next();
  });
}
```
Wait, if `auth.scopes` is undefined, the condition `auth.scopes && !auth.scopes.includes(scope)` is skipped (evaluates to undefined/falsy).
Wait, if a broker-minted token does *not* contain the `scopes` claim, then `getTokenScopes` returns `undefined`, which means `auth.scopes` is `undefined`.
Is it possible for a broker-minted token to NOT have `scopes`?
Wait! In `issueBrokerTokenBundle`:
```typescript
export async function issueBrokerTokenBundle(input: {
  ...
  scopes: string[];
}): Promise<BrokerTokenBundle> {
```
And it signs the token with:
```typescript
  const token = await new jose.SignJWT({
    ...
    scopes: input.scopes,
  })
```
So it will always put a `scopes` field in the payload. However, what if a broker token was generated by a compromised/malicious broker, or what if someone generated a token manually?
Wait, if a client generates a token manually (e.g. bypassing the broker), they would need the HS256 secret `config.jwt.secret` to sign it, which they shouldn't have. So only the broker system or the main server can sign tokens.
Wait! If the main server signs a token for standard user login, e.g. via `issueTokenBundle`, it does NOT include a `scopes` claim.
And since it doesn't include a `scopes` claim, `auth.scopes` is `undefined`, so `requireScope` allows full access. This is the intended fallback behavior for standard first-party clients (legacy or official web/mobile clients) that run with un-scoped tokens.
But what if a broker-minted token is signed with a scopes array, e.g. `scopes: []` (empty array)?
Then `auth.scopes` is `[]`, so `auth.scopes.includes(scope)` will return `false`, and `requireScope` correctly throws 403.
Wait! What if the broker-minted token's scopes are signed, but they are NOT enforced on routes like `GET /api/channels/:channelId/messages/:messageId`?
A client token minted with `scopes: ['reaction:write']` has `auth.scopes = ['reaction:write']`.
If they request `GET /api/channels/:channelId/messages/:messageId`, Hono executes `messageRoutes.get('/:messageId', requireUser, ...)` which doesn't check any scope!
So the restricted client CAN read individual messages!
Even worse: if they request `PATCH /api/channels/:channelId/messages/:messageId` with a body `{ text: 'hacked' }`, since there's no scope check, they CAN edit their own messages (or if they can forge the message ownership, but even if they own the message, they shouldn't be allowed to edit it if they don't have `chat:write` scope). If a client token only has `chat:read` scope, they can still edit their message because `PATCH` doesn't check `chat:write` scope!
Let's confirm this logic. Yes! If a token is scoped only to `chat:read`, they should NOT be able to send messages, nor edit messages, nor delete messages.
But since `PATCH /:messageId` and `DELETE /:messageId` do not have `requireScope('chat:write')` middleware, a client with `chat:read` scope CAN call `PATCH` and `DELETE` on their messages successfully!
This is a HUGE security issue (HIGH/CRITICAL finding)!

Let's double-check all routes in `messages.ts` and their missing scopes:
- `GET /:messageId` (missing `chat:read` scope)
- `PATCH /:messageId` (missing `chat:write` scope)
- `DELETE /:messageId` (missing `chat:write` scope)
- `DELETE /:messageId/purge` (missing `chat:write` scope)
- `DELETE /:messageId/pin` (missing `chat:write` scope)
- `GET /pins` (missing `chat:read` scope)
- `POST /:messageId/save` (missing `chat:write` or whatever scope, maybe `chat:read` or `chat:write`? Wait, bookmarking is writing a bookmark/saved message. Usually saving/unsaving should require a scope, e.g. `chat:write` or `chat:read`).
- `DELETE /:messageId/save` (missing `chat:write`)
- `GET /me/saved` (missing `chat:read`)

Let's also look at `presence.ts`:
- `POST /query` (missing typing/presence read scope check? Wait, there is no typing/presence read scope, but maybe it should require `chat:read`? Or is it okay for presence to not be scoped-checked?). Wait, if presence is not scoped, a client with only `reaction:write` can read presence info.
- `GET /:channelId/presence` (missing scope check).
- `GET /:channelId/presence/live` (missing scope check).

Let's look at `uploads.ts`:
- `POST /:key/confirm` (missing `upload:write` scope). If you have a restricted token, you can call `/confirm`.
- `DELETE /:key` (missing `upload:write` scope? Or should it require `upload:write`?).
- `GET /api/channels/:channelId/uploads` (missing `chat:read` scope? To list channel uploads, shouldn't you need `chat:read`?).

Wait, is there any other file we should check?
Let's verify the next point:
2. **"V014 creates/provisions chatsdk_broker_system and grants required privileges"**
   - Let's check `docker/migrations/V014__client_owned_token_broker.sql` again.
   - Lines 5-11:
     ```sql
     DO $$
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chatsdk_broker_system') THEN
         CREATE ROLE chatsdk_broker_system LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
       END IF;
     END;
     $$;
     ```
   - Grants in lines 297-328:
     - `GRANT USAGE ON SCHEMA public, chatsdk TO chatsdk_broker_system;`
     - `GRANT SELECT ON app TO chatsdk_broker_system;`
     - `GRANT SELECT, INSERT, UPDATE, DELETE ON app_user, channel_member, event_outbox, broker_membership_state TO chatsdk_broker_system;`
     - `GRANT SELECT, UPDATE ON channel TO chatsdk_broker_system;`
     - `GRANT SELECT, INSERT, UPDATE ON auth_session TO chatsdk_broker_system;`
     - `GRANT SELECT, INSERT ON broker_mint_audit TO chatsdk_broker_system;`
     - `GRANT SELECT, INSERT, DELETE ON broker_jwt_replay TO chatsdk_broker_system;`
     - `GRANT SELECT ON broker_client, broker_credential, broker_app_scope TO chatsdk_broker_system;`
   - Wait, is this correct and does it cover all required tables/operations?
     - Yes, `chatsdk_broker_system` is correctly created/provisioned, and it is granted select/insert/update/delete privileges on all tables it accesses in its database helper context.
     - Wait, are there any other tables or functions it needs privileges on? E.g., does it call any pg functions?
       - Yes, in `packages/api/src/routes/server.ts`, it does query `next_channel_seq` which might be a function. Wait, is `next_channel_seq` called under `chatsdk_broker_system`?
       - Let's see: `const seqResult = await client.query('SELECT next_channel_seq($1) as seq', [channelId]);`
       - This is called in `applyChannelSnapshot`, which is called under `db.withBrokerSystemContext(...)`.
       - Wait! Does `chatsdk_broker_system` have execute permission on `next_channel_seq` function?
       - In PostgreSQL, functions are by default executable by `PUBLIC` (all roles) unless default privileges are altered. So unless `PUBLIC` execute privilege is revoked, it should be executable. But wait! Is there any schema usage or other functions?
       - What about schema privileges? `GRANT USAGE ON SCHEMA public, chatsdk TO chatsdk_broker_system;`
       - Let's verify if `chatsdk_broker_system` has all privileges.
       - Let's check `packages/api/tests/broker-token-mint.test.ts` and see if the test passes (focused tests passed).

Wait, let's look at the next point:
3. **"broker mint scope/tenant/user checks are unconditional"**
   - Let's verify `packages/api/src/services/broker-auth.ts`:
     - Let's check `assertBrokerScopeAllowsMembership`:
       ```typescript
       export function assertBrokerScopeAllowsMembership(
         broker: BrokerAuthContext,
         input: {
           externalTenantId: string;
           userId: string;
           channelIds: string[];
         }
       ): void {
         if (
           broker.allowedExternalTenantIds.length > 0
           && !broker.allowedExternalTenantIds.includes(input.externalTenantId)
         ) {
           throw new BrokerAuthError('BROKER_TENANT_DENIED', 'Broker credential is not allowed for this external tenant', 403);
         }
         if (
           broker.allowedUserIdPrefixes.length > 0
           && !broker.allowedUserIdPrefixes.some(prefix => input.userId.startsWith(prefix))
         ) {
           throw new BrokerAuthError('BROKER_USER_DENIED', 'Broker credential is not allowed for this user', 403);
         }
         if (input.channelIds.length > broker.maxMembershipFanout) {
           throw new BrokerAuthError('BROKER_MEMBERSHIP_FANOUT_EXCEEDED', 'Membership snapshot exceeds broker fanout limit', 400);
         }
         if (
           broker.allowedChannelIdPrefixes.length > 0
           && input.channelIds.some(channelId => !broker.allowedChannelIdPrefixes.some(prefix => channelId.startsWith(prefix)))
         ) {
           throw new BrokerAuthError('BROKER_CHANNEL_DENIED', 'Broker credential is not allowed for one or more channels', 403);
         }
       }
       ```
     - Wait, in `/apps/:appId/tokens/mint` (in `server.ts`):
       ```typescript
       const requestedScopes = body.requestedScopes ?? broker.defaultScopes;
       const disallowedScopes = requestedScopes.filter(
         (scope) => !broker.allowedScopes.includes(scope)
       );
       if (disallowedScopes.length > 0) {
         throw new BrokerAuthError('BROKER_SCOPE_DENIED', 'Requested token scopes are not allowed', 403);
       }
       assertBrokerScopeAllowsMembership(broker, {
         externalTenantId: body.externalTenantId,
         userId: body.userId,
         channelIds: [],
       });
       ```
     - Wait, are these checks unconditional? Yes, they are performed on every token mint request.
     - Wait, is there any bypass or conditional check in `authenticateBrokerRequest`? Let's check `authenticateBrokerRequest` in `broker-auth.ts`:
       - It does a database query to verify credential.
       - Then it performs `jwtVerify`.
       - Then it checks `jti` length and expiration.
       - Then it does `broker_jwt_replay` check (using `INSERT ... ON CONFLICT DO NOTHING`).
       - Then it fetches the scope from `broker_app_scope`.
       - Then it validates origin (if `origin` header is present and `scope.allowed_origins` is not empty).
       - Yes, these checks are indeed unconditional!

Wait! Let's check the next point:
4. **"allowed Origin is enforced when present"**
   - Let's check `broker-auth.ts` lines 256-273:
     ```typescript
     const origin = c.req.header('Origin');
     if (
       origin
       && (scope.allowed_origins ?? []).length > 0
       && !scope.allowed_origins.includes(origin)
     ) {
       await writeBrokerAudit(c, {
         appId,
         clientId: credential.client_id,
         credentialId: credential.credential_id,
         clientSlug: credential.client_slug,
         credentialKid: credential.kid,
         tokenJti: jti,
         status: 'denied',
         denialReason: 'broker_origin_denied',
       });
       throw new BrokerAuthError('BROKER_ORIGIN_DENIED', 'Broker credential is not allowed from this origin', 403, true);
     }
     ```
     Wait, is this correct? "allowed Origin is enforced when present". Yes, if `origin` is present, it is checked. If it is NOT present, it is not checked.
     Wait, is this safe?
     If a client does not send an `Origin` header (e.g. they are a backend server sending the mint request, or a non-browser client like a mobile app), then `origin` is undefined/absent, so the origin check is skipped. But if it is a browser making the request, the browser automatically sends the `Origin` header, and if it's not in the allowed list, it's blocked.
     Wait, is there any vulnerability here?
     Wait, what if a malicious website makes a CORS request to `/api/server/apps/:appId/tokens/mint`?
     Since it's a cross-origin request from a browser, the browser will include the `Origin` header. Since the malicious origin is not in `scope.allowed_origins`, it will be blocked.
     Wait! What if the browser client accesses `/api/server/apps/:appId/tokens/mint` and is NOT a browser client, i.e., an attacker calling from postman or curl?
     They can omit the `Origin` header or forge it. But for non-browser clients, CORS doesn't apply anyway, and they can call it directly. The main protection here is to prevent unauthorized web apps (cross-origin browser clients) from using the broker credentials. So checking it when present is the expected behavior for origin verification.
     Wait! What if `scope.allowed_origins` is configured, but the request does NOT contain the `Origin` header, yet it is a browser request?
     Usually browsers *always* send the `Origin` header on POST requests.
     But wait, let's verify if `allowed_origins` contains `*`. In the database migration, we have:
     `CHECK (array_position(allowed_origins, '*') IS NULL)`
     So `*` is not allowed.
     Wait, is there any issue with `scope.allowed_origins ?? []`? E.g., if `scope.allowed_origins` is `NULL`, it defaults to `[]`.
     Let's check if the check itself is correct.
     `(scope.allowed_origins ?? []).length > 0 && !scope.allowed_origins.includes(origin)`
     If `origin` is present, and `scope.allowed_origins` is not empty, it checks that `origin` is in `scope.allowed_origins`. If it is not, it throws.
     Wait, what if `scope.allowed_origins` is empty or null? Then it bypasses the check.
     Is that correct? Yes, if no allowed origins are configured, it means origins are unrestricted (or it's a backend-only client).
     Wait, is there any other place where Origin is checked?
     No.

Wait, let's look at the next point:
5. **"broker audit caller_ip uses raw validated IP not hashed rate-limit key"**
   - Let's check `packages/api/src/services/broker-auth.ts`:
     - Line 355: `getAuditCallerIp(c),`
     - Let's inspect `getAuditCallerIp` (lines 362-374):
       ```typescript
       function getAuditCallerIp(c: Context): string | null {
         const directIp = getDirectRemoteAddress(c);
         const candidate = config.rateLimit.trustProxyHeaders
           ? c.req.header('CF-Connecting-IP')
             || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
             || c.req.header('X-Real-IP')
             || directIp
           : directIp;
         if (!candidate || isIP(candidate) === 0) {
           return null;
         }
         return candidate;
       }
       ```
     - And let's check `getDirectRemoteAddress` (lines 376-381):
       ```typescript
       function getDirectRemoteAddress(c: Context): string | undefined {
         const env = c.env as Record<string, any> | undefined;
         return env?.incoming?.socket?.remoteAddress
           || env?.request?.socket?.remoteAddress
           || env?.remoteAddress;
       }
       ```
     - Wait, does `getAuditCallerIp` use a raw validated IP?
       - Yes, it extracts the IP (using CF-Connecting-IP, X-Forwarded-For, X-Real-IP, or direct remote address depending on `trustProxyHeaders`), verifies it using `isIP(candidate) !== 0`, and returns the raw IP string or null.
     - Wait, does it use any hashed rate-limit key?
       - No. It is the raw IP.
     - Let's verify what the rate limit key does to make sure they are distinct.
       - Let's check `packages/api/src/services/rate-limit.ts` using `view_file` to see what it does.I will view `packages/api/src/services/rate-limit.ts` to check how the rate-limit key/IP hashing is implemented compared to the audit log's raw IP usage.
Let's check `getClientIp` in `packages/api/src/services/rate-limit.ts` (lines 267-279):
```typescript
export function getClientIp(c: Context): string {
  const directIp = getDirectRemoteAddress(c);
  if (!config.rateLimit.trustProxyHeaders) {
    return hashKeyPart(directIp || 'direct-unknown');
  }

  const forwarded = c.req.header('CF-Connecting-IP')
    || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || c.req.header('X-Real-IP')
    || directIp
    || 'proxy-unknown';
  return hashKeyPart(forwarded);
}
```
Ah! `getClientIp` returns the hashed value of the IP (`return hashKeyPart(forwarded)`).
But in `writeBrokerAudit` (in `broker-auth.ts`), the IP is recorded as `caller_ip` in `broker_mint_audit`.
Let's see what `writeBrokerAudit` does:
```typescript
        getAuditCallerIp(c),
```
And `getAuditCallerIp` (in `broker-auth.ts`) returns the raw (non-hashed) IP candidate:
```typescript
function getAuditCallerIp(c: Context): string | null {
  const directIp = getDirectRemoteAddress(c);
  const candidate = config.rateLimit.trustProxyHeaders
    ? c.req.header('CF-Connecting-IP')
      || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
      || c.req.header('X-Real-IP')
      || directIp
    : directIp;
  if (!candidate || isIP(candidate) === 0) {
    return null;
  }
  return candidate;
}
```
Yes! The audit logger uses `getAuditCallerIp(c)` which returns the raw validated IP (or null), NOT the hashed rate-limit IP returned by `getClientIp(c)`.
This matches the requirement: "broker audit caller_ip uses raw validated IP not hashed rate-limit key". This is correct!

Wait! Let's verify the next point:
6. **"broker membership sync rate limit is not per-user"**
   - Let's check `packages/api/src/routes/server.ts` line 271:
     ```typescript
     const brokerLimit = await applyRateLimit(c, RATE_LIMIT_POLICIES.brokerMembershipSync, {
       appId: c.req.param('appId'),
       ip: getClientIp(c),
       key: broker.credentialId,
     });
     ```
   - In the `RateLimitScope` object passed to `applyRateLimit`:
     - `appId` is `c.req.param('appId')`
     - `ip` is `getClientIp(c)`
     - `key` is `broker.credentialId`
     - Wait, is there a `userId`? No!
   - Let's check `buildRateLimitKey` in `rate-limit.ts` (lines 392-409):
     ```typescript
     function buildRateLimitKey(policy: RateLimitPolicy, scope: RateLimitScope): string {
       const parts = [
         'ratelimit',
         normalizePart(scope.appId || 'unknown-app'),
         normalizePart(policy.action),
       ];

       if (scope.global) {
         parts.push('global');
       } else {
         if (scope.userId) parts.push('user', hashKeyPart(scope.userId));
         if (scope.channelId) parts.push('channel', hashKeyPart(scope.channelId));
         if (scope.ip) parts.push('ip', normalizePart(scope.ip));
         if (scope.key) parts.push('key', hashKeyPart(scope.key));
       }

       return parts.join(':');
     }
     ```
   - So the key will be built using `scope.ip` and `scope.key` (which is `broker.credentialId`), NOT `scope.userId`.
   - Therefore, the broker membership sync rate limit is per-IP and per-credential key (representing the broker client credential), and is NOT per-user!
   - Wait, let's verify if `brokerTokenMint` also behaves similarly:
     - In `server.ts` line 84:
       ```typescript
       const brokerLimit = await applyRateLimit(c, RATE_LIMIT_POLICIES.brokerTokenMint, {
         appId: c.req.param('appId'),
         ip: getClientIp(c),
         key: broker.credentialId,
       });
       ```
       Yes, this is also per-IP and per-credential, NOT per-user!
   - This matches the requirement: "broker membership sync rate limit is not per-user". This is correct!

Wait! Let's check:
"allowed Origin is enforced when present;"
Yes, we verified that in `broker-auth.ts` lines 256-273:
```typescript
  const origin = c.req.header('Origin');
  if (
    origin
    && (scope.allowed_origins ?? []).length > 0
    && !scope.allowed_origins.includes(origin)
  ) {
    ...
    throw new BrokerAuthError('BROKER_ORIGIN_DENIED', 'Broker credential is not allowed from this origin', 403, true);
  }
```
This is correctly enforced *when present*.

Wait, are there any other files that we need to review?
Let's check the list of files to review:
- `packages/api/src/routes/server.ts` (Reviewed)
- `packages/api/src/services/tokens.ts` (Reviewed)
- `packages/api/src/middleware/auth.ts` (Reviewed)
- `packages/api/src/routes/messages.ts` (Reviewed)
- `packages/api/src/routes/uploads.ts` (Reviewed)
- `packages/api/src/routes/search.ts` (Reviewed)
- `packages/api/src/routes/realtime.ts` (Reviewed)
- `packages/api/src/routes/presence.ts` (Reviewed)
- `packages/api/src/services/broker-auth.ts` (Reviewed)
- `docker/migrations/V014__client_owned_token_broker.sql` (Reviewed)
- `packages/api/tests/broker-token-mint.test.ts` (Reviewed)
- `packages/api/tests/message-outbox.test.ts` (Reviewed)

Let's do a detailed analysis of findings:
First, is Slice 3 ready to proceed, or should we report findings and block/approve?
The user asks: "Return critical/high/medium findings and whether Slice 3 can proceed."
Wait, "Do not edit files." We must only report the findings.

Let's list the findings carefully:
1. **Critical/High Finding: Missing Scope Verification on Key Message Mutating and Reading Endpoints**
   - **File:** `packages/api/src/routes/messages.ts`
   - **Details:**
     While representative routes like `POST /api/channels/:channelId/messages` and `GET /api/channels/:channelId/messages` enforce `chat:write` and `chat:read` scopes, several other message endpoints do not enforce scopes at all (they only use `requireUser`).
     Specifically:
     - `GET /api/channels/:channelId/messages/:messageId` (individual message retrieval) does not enforce `chat:read` scope.
     - `PATCH /api/channels/:channelId/messages/:messageId` (updating message) does not enforce `chat:write` scope.
     - `DELETE /api/channels/:channelId/messages/:messageId` (deleting message) does not enforce `chat:write` scope.
     - `DELETE /api/channels/:channelId/messages/:messageId/purge` (purging message) does not enforce `chat:write` scope.
     - `DELETE /api/channels/:channelId/messages/:messageId/pin` (unpinning message) does not enforce `chat:write` scope.
     - `GET /api/channels/:channelId/pins` (retrieving pinned messages) does not enforce `chat:read` scope.
     - `POST /api/channels/:channelId/messages/:messageId/save` (saving message) does not enforce any scope (`chat:write` or `chat:read`).
     - `DELETE /api/channels/:channelId/messages/:messageId/save` (unsaving message) does not enforce any scope.
     - `GET /api/users/me/saved` (getting saved messages) does not enforce `chat:read` scope.
   - **Impact:** An API client using a restricted broker token (e.g., scoped to `reaction:write` or `chat:read` only) can bypass the restricted scope by directly hitting these endpoints to read, write, edit, pin/unpin, and delete messages.

2. **Medium Finding: Missing Scope Checks on Upload Confirm, Deletion, and Listing**
   - **File:** `packages/api/src/routes/uploads.ts`
   - **Details:**
     - `POST /api/uploads/:key/confirm` does not require `upload:write` scope.
     - `DELETE /api/uploads/:key` does not require `upload:write` scope.
     - `GET /api/channels/:channelId/uploads` (listing uploads) does not require `chat:read` scope.
   - **Impact:** A client with no `upload:write` scope can still confirm and delete uploads. A client without `chat:read` scope can list all uploads in a channel.

3. **Medium Finding: Missing Scope Checks on Presence Query and Live Status**
   - **File:** `packages/api/src/routes/presence.ts`
   - **Details:**
     - `POST /api/presence/query` does not require any scope.
     - `GET /api/channels/:channelId/presence` does not require any scope.
     - `GET /api/channels/:channelId/presence/live` does not require any scope.
   - **Impact:** A client without typing/chat scopes can query presence data and view active channel presence.

Let's double-check other aspects of the prompt:
- "scopes are signed into broker access/ws tokens, propagated through auth middleware, and enforced on representative client routes" -> verified yes, although representative routes have missing spots, the core mechanism is working and correct.
- "V014 creates/provisions chatsdk_broker_system and grants required privileges" -> verified yes. The role `chatsdk_broker_system` is correctly created and assigned appropriate privileges (SELECT, INSERT, UPDATE, DELETE).
- "broker mint scope/tenant/user checks are unconditional" -> verified yes. `assertBrokerScopeAllowsMembership` is called unconditionally on token mint.
- "allowed Origin is enforced when present" -> verified yes. `authenticateBrokerRequest` checks `Origin` header against `allowed_origins` when it's present.
- "broker audit caller_ip uses raw validated IP not hashed rate-limit key" -> verified yes. `getAuditCallerIp(c)` is used which retrieves the raw IP (validating it) whereas the rate-limiter hashes it via `hashKeyPart`.
- "broker membership sync rate limit is not per-user" -> verified yes. The rate-limiter check on membership sync uses `appId`, `ip`, and `broker.credentialId`, not `userId`.

Let's check if the tests cover the scope-enforcement:
In `packages/api/tests/broker-token-mint.test.ts`:
- Signs token, verifies `decodedAccess.scopes` contains the requested scopes.
- Verifies it calls `INSERT INTO auth_session` and `INSERT INTO broker_mint_audit`.
- Verifies it denies when membership is stale.
- Verifies it denies when requested scopes are not allowed.
- Verifies it denies when requested TTL exceeds the max.

In `packages/api/tests/message-outbox.test.ts`:
- Verifies reject broker read-only scoped tokens on message send (`res.status === 403` when using `chat:read` token for `POST /api/channels/${CHANNEL_ID}/messages`).
- But wait! The tests do NOT check if a `chat:read` token can call `PATCH /api/channels/${CHANNEL_ID}/messages/${MESSAGE_ID}` or `DELETE`. So the missing scope check vulnerability was not caught by the tests because there is no test verifying that those sub-routes reject restricted tokens. This highlights the importance of the finding.

Wait, is Slice 3 ready to proceed?
Given the security vulnerability where a restricted broker token can write/edit/delete/read via endpoints without `requireScope` checks, Slice 3 **cannot proceed** without first applying `requireScope` middleware to all these endpoints.
I should explicitly advise that Slice 3 should NOT proceed until these scope enforcement gaps are fixed.

Let's format the response clearly as requested.
We should organize the response into:
1. **Summary of Verification Checklist** (confirming the status of each item requested)
2. **Critical/High/Medium Findings** (detailing the security gaps in scope enforcement on representative/sub-routes)
3. **Recommendation / Proceed Status** (indicating if Slice 3 can proceed - clearly stating "NO" and providing the exact fixes needed).

Let's make sure we provide clickable links to the files as per communication guidelines:
"You MUST create clickable links for all files and code symbols (classes, types, functions, structs). Use github style markdown links with the `file://` scheme (e.g., [filename](file:///path/to/file) or [ClassName](file:///path/to/file#L10-L20)`)."

Let's write a very professional and structured report.
No tools are needed anymore since we have reviewed all the files and gathered all the required information.
Let's double-check the exact paths for the file links:
- [V014__client_owned_token_broker.sql](file:///Users/pushkar/chatsdk/docker/migrations/V014__client_owned_token_broker.sql)
- [broker-auth.ts](file:///Users/pushkar/chatsdk/packages/api/src/services/broker-auth.ts)
- [tokens.ts](file:///Users/pushkar/chatsdk/packages/api/src/services/tokens.ts)
- [auth.ts](file:///Users/pushkar/chatsdk/packages/api/src/middleware/auth.ts)
- [messages.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts)
- [uploads.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/uploads.ts)
- [search.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/search.ts)
- [realtime.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/realtime.ts)
- [presence.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/presence.ts)
- [broker-token-mint.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/broker-token-mint.test.ts)
- [message-outbox.test.ts](file:///Users/pushkar/chatsdk/packages/api/tests/message-outbox.test.ts)
- [rate-limit.ts](file:///Users/pushkar/chatsdk/packages/api/src/services/rate-limit.ts)

Let's review the line numbers for the missing scope checks:
In `packages/api/src/routes/messages.ts`:
- `GET /:messageId` on [messages.ts:L504-508](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L504-L508)
- `PATCH /:messageId` on [messages.ts:L561-567](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L561-L567)
- `DELETE /:messageId` on [messages.ts:L638-643](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L638-L643)
- `DELETE /:messageId/purge` on [messages.ts:L717-722](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L717-L722)
- `DELETE /:messageId/pin` on [messages.ts:L1268-1273](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L1268-L1273)
- `GET /pins` on [messages.ts:L1330-1334](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L1330-L1334)
- `POST /:messageId/save` on [messages.ts:L1382-1387](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L1382-L1387)
- `DELETE /:messageId/save` on [messages.ts:L1424-1429](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L1424-L1429)
- `GET /me/saved` on [messages.ts:L1446-1450](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L1446-L1450)

In `packages/api/src/routes/uploads.ts`:
- `POST /:key/confirm` on [uploads.ts:L381-386](file:///Users/pushkar/chatsdk/packages/api/src/routes/uploads.ts#L381-L386)
- `DELETE /:key` on [uploads.ts:L576-581](file:///Users/pushkar/chatsdk/packages/api/src/routes/uploads.ts#L576-L581)
- `GET /` on [uploads.ts:L619-623](file:///Users/pushkar/chatsdk/packages/api/src/routes/uploads.ts#L619-L623)

In `packages/api/src/routes/presence.ts`:
- `POST /query` on [presence.ts:L107-111](file:///Users/pushkar/chatsdk/packages/api/src/routes/presence.ts#L107-L111)
- `GET /` on [presence.ts:L165-170](file:///Users/pushkar/chatsdk/packages/api/src/routes/presence.ts#L165-L170)
- `GET /live` on [presence.ts:L223-228](file:///Users/pushkar/chatsdk/packages/api/src/routes/presence.ts#L223-L228)

Let's start drafting the response.# Post-Fix Adversarial Review Report: Slice 3 Broker Token Mint

This report presents the findings from a narrow, post-fix adversarial security review of the Client-Owned Token Broker implementation under `/Users/pushkar/chatsdk`. As requested, no files have been modified.

---

## 1. Verification Checklist

| Target Fix Requirement | Status | Notes / Location |
| :--- | :---: | :--- |
| **Scopes signed into broker access/ws tokens** | **PASS** | Signed in [issueBrokerTokenBundle](file:///Users/pushkar/chatsdk/packages/api/src/services/tokens.ts#L137-L150) using the `scopes` claim. |
| **Scopes propagated through auth middleware** | **PASS** | Handled in [getTokenScopes](file:///Users/pushkar/chatsdk/packages/api/src/middleware/auth.ts#L224-L233) and returned in the [AuthContext](file:///Users/pushkar/chatsdk/packages/api/src/middleware/auth.ts#L28-L44). |
| **V014 creates/provisions `chatsdk_broker_system`** | **PASS** | Defined in [V014__client_owned_token_broker.sql](file:///Users/pushkar/chatsdk/docker/migrations/V014__client_owned_token_broker.sql#L5-L11) with targeted privileges in [V014 SQL](file:///Users/pushkar/chatsdk/docker/migrations/V014__client_owned_token_broker.sql#L297-L328). |
| **Broker mint scope/tenant/user checks unconditional** | **PASS** | Checked unconditionally in [authenticateBrokerRequest](file:///Users/pushkar/chatsdk/packages/api/src/services/broker-auth.ts#L61) and [assertBrokerScopeAllowsMembership](file:///Users/pushkar/chatsdk/packages/api/src/services/broker-auth.ts#L411). |
| **Allowed Origin enforced when present** | **PASS** | Checked in [authenticateBrokerRequest](file:///Users/pushkar/chatsdk/packages/api/src/services/broker-auth.ts#L256-L273) if `Origin` header exists and `allowed_origins` is configured. |
| **Broker audit `caller_ip` uses raw validated IP** | **PASS** | [writeBrokerAudit](file:///Users/pushkar/chatsdk/packages/api/src/services/broker-auth.ts#L293) records the raw IP via `getAuditCallerIp` rather than the hashed value from [getClientIp](file:///Users/pushkar/chatsdk/packages/api/src/services/rate-limit.ts#L267). |
| **Broker membership sync rate limit is not per-user** | **PASS** | Rate limit checks in [server.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/server.ts#L271-L276) omit the `userId` field, scoping rate limit keys in [rate-limit.ts](file:///Users/pushkar/chatsdk/packages/api/src/services/rate-limit.ts#L402-L405) by credential key and IP. |

---

## 2. Security Findings

### 🔴 Critical/High Findings

#### 1. Missing Scope Enforcement on Message Read and Mutation Routes
* **File:** [messages.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts)
* **Risk/Impact:** **HIGH**
* **Details:** While the top-level collection routes enforce scopes (e.g. `POST /` requiring `chat:write` and `GET /` requiring `chat:read`), multiple individual message and pinning/saving sub-routes lack scope middleware completely. A token restricted to `reaction:write` or `typing:write` can read and mutate messages.
* **Vulnerable Routes:**
  * `GET /:messageId` on [messages.ts:L504-508](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L504-L508) — Missing `requireScope('chat:read')`
  * `PATCH /:messageId` on [messages.ts:L561-567](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L561-L567) — Missing `requireScope('chat:write')`
  * `DELETE /:messageId` on [messages.ts:L638-643](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L638-L643) — Missing `requireScope('chat:write')`
  * `DELETE /:messageId/purge` on [messages.ts:L717-722](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L717-L722) — Missing `requireScope('chat:write')`
  * `DELETE /:messageId/pin` on [messages.ts:L1268-1273](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L1268-L1273) — Missing `requireScope('chat:write')`
  * `GET /pins` on [messages.ts:L1330-1334](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L1330-L1334) — Missing `requireScope('chat:read')`
  * `POST /:messageId/save` on [messages.ts:L1382-1387](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L1382-L1387) — Missing `requireScope('chat:write')` (or corresponding scope)
  * `DELETE /:messageId/save` on [messages.ts:L1424-1429](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L1424-L1429) — Missing `requireScope('chat:write')`
  * `GET /me/saved` on [messages.ts:L1446-1450](file:///Users/pushkar/chatsdk/packages/api/src/routes/messages.ts#L1446-L1450) — Missing `requireScope('chat:read')`

---

### 🟡 Medium Findings

#### 2. Missing Scope Enforcement on Upload Actions
* **File:** [uploads.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/uploads.ts)
* **Risk/Impact:** **MEDIUM**
* **Details:** Upload scope checking is only done on `/presigned` and `/direct` routes. Post-upload verification and deletion routes bypass scope verification, and listing uploads in a channel bypasses the `chat:read` scope.
* **Vulnerable Routes:**
  * `POST /:key/confirm` on [uploads.ts:L381-386](file:///Users/pushkar/chatsdk/packages/api/src/routes/uploads.ts#L381-L386) — Missing `requireScope('upload:write')`
  * `DELETE /:key` on [uploads.ts:L576-581](file:///Users/pushkar/chatsdk/packages/api/src/routes/uploads.ts#L576-L581) — Missing `requireScope('upload:write')`
  * `GET /` on [uploads.ts:L619-623](file:///Users/pushkar/chatsdk/packages/api/src/routes/uploads.ts#L619-L623) — Missing `requireScope('chat:read')`

#### 3. Missing Scope Enforcement on Presence Queries
* **File:** [presence.ts](file:///Users/pushkar/chatsdk/packages/api/src/routes/presence.ts)
* **Risk/Impact:** **MEDIUM**
* **Details:** While the user is required to have a `typing:write` scope to broadcast their own presence status, retrieving presence information for other users or channel membership states has no scope checks.
* **Vulnerable Routes:**
  * `POST /query` on [presence.ts:L107-111](file:///Users/pushkar/chatsdk/packages/api/src/routes/presence.ts#L107-L111) — Missing scope check
  * `GET /` (channel presence list) on [presence.ts:L165-170](file:///Users/pushkar/chatsdk/packages/api/src/routes/presence.ts#L165-L170) — Missing scope check
  * `GET /live` (Centrifugo live presence) on [presence.ts:L223-228](file:///Users/pushkar/chatsdk/packages/api/src/routes/presence.ts#L223-L228) — Missing scope check

---

## 3. Slice 3 Proceed Status

> [!CAUTION]
> **PROCEED STATUS: BLOCKED**
>
> Slice 3 **cannot proceed** to production in its current state.
> Although the credential verification, SQL migration role setup, rate limiting, and auditing logic are correct, the lack of scope enforcement on sub-routes constitutes a security bypass.

### Action Required Before Proceeding:
Apply the `requireScope` middleware to the vulnerable routes identified above. For example:
```typescript
messageRoutes.patch(
  '/:messageId',
  requireUser,
  requireScope('chat:write'), // <-- ADD THIS
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  ...
```
