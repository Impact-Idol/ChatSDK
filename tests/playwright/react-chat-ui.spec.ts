import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';

const API_URL = process.env.PLAYWRIGHT_CHATSDK_API_URL;
const TOKEN_URL = process.env.PLAYWRIGHT_CHATSDK_TOKEN_URL;
const PAGE_URL = process.env.PLAYWRIGHT_CHATSDK_PAGE_URL;
const API_KEY = process.env.PLAYWRIGHT_CHATSDK_API_KEY;
const ALLOW_INSECURE_LAN = process.env.PLAYWRIGHT_CHATSDK_ALLOW_INSECURE_LAN === 'true';

const missingEnv = [
  ['PLAYWRIGHT_CHATSDK_API_URL', API_URL],
  ['PLAYWRIGHT_CHATSDK_PAGE_URL', PAGE_URL],
  ['PLAYWRIGHT_CHATSDK_API_KEY', API_KEY],
].filter(([, value]) => !value).map(([name]) => name);

if (missingEnv.length === 0) {
  assertTransportIsSafe(API_URL!, 'PLAYWRIGHT_CHATSDK_API_URL');
  assertTransportIsSafe(PAGE_URL!, 'PLAYWRIGHT_CHATSDK_PAGE_URL');
  if (TOKEN_URL) {
    assertTransportIsSafe(TOKEN_URL, 'PLAYWRIGHT_CHATSDK_TOKEN_URL');
  }
} else if (process.env.CI) {
  throw new Error(`Missing required CI env for Playwright React chat UI test: ${missingEnv.join(', ')}`);
}

test.describe('React chat UI seeded multi-user flow', () => {
  test.skip(missingEnv.length > 0, 'Set PLAYWRIGHT_CHATSDK_API_URL, PLAYWRIGHT_CHATSDK_PAGE_URL, and PLAYWRIGHT_CHATSDK_API_KEY');

  test('renders seeded history and delivers a UI-sent message to another signed-in user', async ({ browser, request }) => {
    const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const alice = {
      id: `ui-alice-${runId}`,
      name: 'UI Alice',
    };
    const bob = {
      id: `ui-bob-${runId}`,
      name: 'UI Bob',
    };
    const channelName = `UI Seed ${runId}`;
    const seededText = `Seeded hello ${runId}`;
    const uiText = `Bob UI reply ${runId}`;
    let aliceToken: string | undefined;
    let channelId: string | undefined;
    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();
    const alicePage = await aliceContext.newPage();
    const bobPage = await bobContext.newPage();

    try {
      aliceToken = await connectUser(request, alice.id, alice.name);
      await connectUser(request, bob.id, bob.name);

      const channelResponse = await request.post(`${API_URL}/api/channels`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aliceToken}`,
        },
        data: {
          type: 'group',
          name: channelName,
          memberIds: [bob.id],
          idempotencyKey: `ui-seeded-channel-${runId}`,
        },
      });
      expect(channelResponse.status()).toBe(201);
      const channel = await channelResponse.json();
      channelId = channel.id;

      const seedResponse = await request.post(`${API_URL}/api/channels/${channelId}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aliceToken}`,
        },
        data: {
          text: seededText,
          clientMsgId: randomUUID(),
        },
      });
      expect(seedResponse.status()).toBe(201);

      await alicePage.goto(userUrl(alice));
      await bobPage.goto(userUrl(bob));

      await expectConnected(alicePage);
      await expectConnected(bobPage);

      await selectChannel(alicePage, channelName);
      await selectChannel(bobPage, channelName);

      await expectMessage(alicePage, seededText);
      await expectMessage(bobPage, seededText);

      await bobPage.getByPlaceholder('Type a message...').fill(uiText);
      await bobPage.getByPlaceholder('Type a message...').press('Enter');

      await expectMessage(bobPage, uiText);
      await expectMessage(alicePage, uiText, 20_000);
    } finally {
      await aliceContext.close().catch(() => undefined);
      await bobContext.close().catch(() => undefined);
      if (channelId && aliceToken) {
        await request.delete(`${API_URL}/api/channels/${channelId}`, {
          headers: { Authorization: `Bearer ${aliceToken}` },
        }).catch(() => undefined);
      }
      for (const userId of [alice.id, bob.id]) {
        await request.delete(`${API_URL}/api/users/${encodeURIComponent(userId)}`, {
          headers: { 'X-API-Key': API_KEY! },
        }).catch(() => undefined);
      }
    }
  });
});

async function connectUser(request: any, userId: string, displayName: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!TOKEN_URL && API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }

  const response = await request.post(TOKEN_URL || `${API_URL}/api/auth/connect`, {
    headers,
    data: { userId, displayName, name: displayName },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.token).toBeTruthy();
  return body.token as string;
}

async function selectChannel(page: any, channelName: string): Promise<void> {
  const channel = page.locator('.channel-item', { hasText: channelName }).first();
  await expect(channel).toBeVisible({ timeout: 20_000 });
  await channel.click();
  await expect(page.getByRole('heading', { name: `# ${channelName}` })).toBeVisible();
}

async function expectConnected(page: any): Promise<void> {
  await expect(page.locator('.connection-status', { hasText: 'Connected' })).toBeVisible({ timeout: 20_000 });
}

async function expectMessage(page: any, text: string, timeout = 10_000): Promise<void> {
  await expect(page.locator('.message-text', { hasText: text }).first()).toBeVisible({ timeout });
}

function userUrl(user: { id: string; name: string }): string {
  const url = new URL(PAGE_URL!);
  url.searchParams.set('userId', user.id);
  url.searchParams.set('name', user.name);
  return url.toString();
}

function assertTransportIsSafe(url: string, envName: string): void {
  const parsed = new URL(url);
  const insecureProtocol = parsed.protocol === 'http:' || parsed.protocol === 'ws:';
  if (!insecureProtocol || ALLOW_INSECURE_LAN || isLoopback(parsed.hostname)) {
    return;
  }

  throw new Error(
    `${envName} uses ${parsed.protocol} for non-loopback host ${parsed.hostname}. ` +
      'Use https/wss or set PLAYWRIGHT_CHATSDK_ALLOW_INSECURE_LAN=true for an explicit local-network test run.'
  );
}

function isLoopback(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '');
  return normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.startsWith('127.');
}
