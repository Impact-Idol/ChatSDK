# Slice 4: Seeded Runtime and Playwright Validation

Status: implemented and live-validated against the LAN demo deployment

## Goal

Add non-smoke browser validation with seed data and multiple users:

- seed two users and a shared channel through the API/token broker
- open the real React chat UI as two different users
- verify seeded message history renders in the UI
- send a message from one browser session
- verify the other browser session receives it through the UI/realtime path

## Changes

- Added `tests/playwright/react-chat-ui.spec.ts`.
  - Requires `PLAYWRIGHT_CHATSDK_API_URL`, `PLAYWRIGHT_CHATSDK_PAGE_URL`, and `PLAYWRIGHT_CHATSDK_API_KEY`.
  - Uses `PLAYWRIGHT_CHATSDK_TOKEN_URL` when provided.
  - Enforces safe transport for API, UI, and token broker URLs by default; `PLAYWRIGHT_CHATSDK_ALLOW_INSECURE_LAN=true` is required for HTTP LAN runs.
  - Creates unique seeded users/channel/messages per run and attempts best-effort cleanup.
  - Uses separate browser contexts with different `userId` query params against the React chat UI.
  - Waits for each UI session to report `Connected` before sending the cross-user message.

## Verification

- Dry skip check:
  - `npx playwright test tests/playwright/react-chat-ui.spec.ts --reporter=list`
  - Result: 1 skipped when live env is absent.
- Live LAN UI validation:
  - API: `http://192.168.68.113:5500`
  - UI: `http://192.168.68.113:5173`
  - Token broker: `http://192.168.68.113:5511/api/chatsdk-token`
  - Result: 1 passed after review fixes for separate browser contexts, token URL transport validation, CI env failure, and UI connection readiness.
- Existing browser realtime protocol validation:
  - `tests/playwright/realtime-browser.spec.ts`
  - API: `http://192.168.68.113:5500`
  - WS: `ws://192.168.68.113:8001/connection/websocket`
  - Result: 1 passed.

## Caveat

The LAN deployment is healthy for current demo/runtime validation, but `/ready` reports latest migration `013`, not V014. Therefore this slice validates the current React UI, seeded chat, token broker demo path, and realtime delivery. It does not yet prove the live database has the final V014 client-owned broker schema/role posture applied.

## Follow-up

- Run this Playwright UI spec again after syncing the live deployment to V014.
- Add a broker-native seeded Playwright flow once the client-owned RS256 broker endpoint is deployed live.
- Add an optional assertion for the UI bundle's configured WS URL if the demo app exposes it at runtime.
