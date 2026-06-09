# Milestone 4: Client SDK Auth Hardening

Date: 2026-06-08
Status: completed

## Scope

Harden browser/mobile client integration so app API keys stay server-side and user operations use bearer tokens from a token provider.

## Changes

- Added `ChatTokenProvider` / `ChatTokenSet` support to core client configuration and `ChatSDK.connect`.
- Made browser/mobile clients use `tokenProvider`; legacy `apiKey` token brokering now throws in client runtimes and remains server-only compatibility.
- Removed retained `apiKey` from connected user clients after legacy server token brokering.
- Added bearer refresh handling before REST calls and on 401 retry.
- Updated `/api/auth/refresh` to return a fresh Centrifugo websocket token in `_internal.wsToken`.
- Updated React provider types so client components do not send app keys.
- Updated React, Next.js, React Native, admin, Impact Idol, Huly, create-app templates, and docs away from public app-key examples.
- Added Next/create-app server token broker routes using server `CHATSDK_API_KEY`; demo arbitrary-user minting is guarded or allowlisted.
- Removed production-facing `connect-dev` fallbacks from browser examples/templates.

## Tests And Builds

- `npm test --workspace=@chatsdk/core -- --run`: 347 passed.
- `npm test --workspace=@chatsdk/api -- --run`: 39 passed.
- `npm test --workspace=@chatsdk/react -- --run`: 43 passed.
- `npm run build --workspace=@chatsdk/core`: passed.
- `npm run build --workspace=@chatsdk/api`: passed.
- `npm run build --workspace=@chatsdk/react`: passed.
- `npm run build --workspace=create-chatsdk-app`: passed.
- `examples/react-chat`: `npm run build` passed.
- `examples/nextjs-chat`: `npm run build` passed; generated `.next` output removed and build-time `tsconfig.json` mutation restored.
- `git diff --check`: passed.

## Live Verification

Deployment target:

- LXC: `chatsdk-hardening`
- API: `http://192.168.68.113:5500`
- Centrifugo: `http://192.168.68.113:8001`
- Database: external DB host configured in container environment.

Final live smoke inside the API container:

```text
LIVE_CLIENT_AUTH_SMOKE bearer=200 apikey_only=401 mixed=200 refresh=200 refreshed_ws=true
```

This verifies:

- `/api/auth/connect` mints access, refresh, and websocket tokens using the server API key.
- Bearer-only user routes work.
- API-key-only user routes are rejected.
- Mixed bearer plus API-key requests do not bypass bearer user auth.
- `/api/auth/refresh` returns a fresh websocket token.

## Reviews

- GPT-5.5 high adversarial review found blockers around browser-callable `apiKey`, create-app dev token routing, websocket-token refresh, Next token cache expiry, and React Native dev-only token fetching.
- Antigravity adversarial review found blockers around refresh not returning/forwarding websocket tokens, Next cached token expiry, and stale docs.
- Fixes were implemented and covered by tests:
  - Browser/mobile runtime rejects `apiKey` config.
  - Refresh response includes `_internal.wsToken`.
  - SDK forwards refreshed websocket token.
  - Next token cache tracks `expiresAt`.
  - Create-app template uses server token route with explicit demo allowlist.
  - React Native example uses a backend token broker and full token set.

## Residuals

- Older docs still contain some legacy instance-style SDK and `/tokens` references unrelated to browser API-key exposure; they should be handled in a docs modernization pass.
- `examples/admin-dashboard` and `examples/react-chat-huly` still have pre-existing TypeScript/build issues outside this auth slice.
- `ChatSDK.connectDevelopment` remains as an explicit dev-only helper and fails against production API deployments where `/api/auth/connect-dev` is absent.
