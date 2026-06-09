import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';

const API_URL = process.env.PLAYWRIGHT_CHATSDK_API_URL;
const WS_URL = process.env.PLAYWRIGHT_CHATSDK_WS_URL;
const TOKEN_URL = process.env.PLAYWRIGHT_CHATSDK_TOKEN_URL;
const PAGE_URL = process.env.PLAYWRIGHT_CHATSDK_PAGE_URL;
const API_KEY = process.env.PLAYWRIGHT_CHATSDK_API_KEY;
const DATABASE_URL = process.env.PLAYWRIGHT_CHATSDK_DATABASE_URL;
const ALLOW_INSECURE_LAN = process.env.PLAYWRIGHT_CHATSDK_ALLOW_INSECURE_LAN === 'true';

const missingEnv = [
  ['PLAYWRIGHT_CHATSDK_API_URL', API_URL],
  ['PLAYWRIGHT_CHATSDK_WS_URL', WS_URL],
  ['PLAYWRIGHT_CHATSDK_API_KEY', API_KEY],
].filter(([, value]) => !value).map(([name]) => name);

if (missingEnv.length > 0 && process.env.CI) {
  throw new Error(`Missing required CI env for Playwright realtime tests: ${missingEnv.join(', ')}`);
}

if (!DATABASE_URL && process.env.CI) {
  throw new Error('PLAYWRIGHT_CHATSDK_DATABASE_URL is required for durable Playwright realtime tests in CI');
}

if (missingEnv.length === 0) {
  assertTransportIsSafe(API_URL!, 'PLAYWRIGHT_CHATSDK_API_URL');
  assertTransportIsSafe(WS_URL!, 'PLAYWRIGHT_CHATSDK_WS_URL');
}

test.describe('ChatSDK browser realtime', () => {
  test.skip(missingEnv.length > 0, 'Set PLAYWRIGHT_CHATSDK_API_URL, PLAYWRIGHT_CHATSDK_WS_URL, and PLAYWRIGHT_CHATSDK_API_KEY');

  test('delivers durable message.new to the recipient in Chromium', async ({ page, request }) => {
    const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const user1 = `pw-user-${runId}-1`;
    const user2 = `pw-user-${runId}-2`;
    let user1Tokens: ChatTokens | undefined;
    let user2Tokens: ChatTokens | undefined;
    let channel: any;

    const connectUser = async (userId: string, displayName: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!TOKEN_URL && API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      const response = await request.post(TOKEN_URL || `${API_URL}/api/auth/connect`, {
        headers,
        data: { userId, displayName },
      });
      expect(response.ok()).toBe(true);
      const body = await response.json();
      expect(body.token).toBeTruthy();
      expect(body._internal?.wsToken).toBeTruthy();
      return {
        token: body.token as string,
        wsToken: body._internal.wsToken as string,
      };
    };

    try {
      user1Tokens = await connectUser(user1, 'Playwright User One');
      user2Tokens = await connectUser(user2, 'Playwright User Two');

      const channelResponse = await request.post(`${API_URL}/api/channels`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Tokens.token}`,
        },
        data: {
          type: 'messaging',
          name: `Playwright Realtime ${runId}`,
          memberIds: [user2],
          idempotencyKey: `pw-channel-${runId}`,
        },
      });
      expect(channelResponse.status()).toBe(201);
      channel = await channelResponse.json();
      const appId = channel.appId ?? decodeAppId(user1Tokens.wsToken);
      const channelName = `chat:${appId}:${channel.id}`;
      const unauthorizedUserChannel = `user:${appId}:${user2}`;

      await page.goto(PAGE_URL || `${API_URL}/health`);

      const unauthorizedTokenResponse = await request.post(`${API_URL}/api/realtime/subscription-token`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Tokens.token}`,
        },
        data: { channel: unauthorizedUserChannel },
      });
      expect(unauthorizedTokenResponse.status()).toBe(403);

      const unauthorizedSubscribe = await attemptUnauthorizedSubscribe(page, {
        wsUrl: WS_URL!,
        wsToken: user1Tokens.wsToken,
        channelName: unauthorizedUserChannel,
      });
      expect(unauthorizedSubscribe.code).toBe(103);
      expect(unauthorizedSubscribe.message).toBe('permission denied');

      const messageText = `Playwright realtime ${runId}`;
      const clientMsgId = randomUUID();
      const publication = await receiveAsRecipientAndSendFromSender(page, {
        apiUrl: API_URL!,
        wsUrl: WS_URL!,
        recipientToken: user2Tokens.token,
        recipientWsToken: user2Tokens.wsToken,
        senderToken: user1Tokens.token,
        channelName,
        channelId: channel.id,
        messageText,
        clientMsgId,
      });

      expect(publication.type).toBe('message.new');
      expect(publication.payload.channelId).toBe(channel.id);
      expect(publication.payload.message.text).toBe(messageText);
      await expectOutboxPublished({
        appId,
        idempotencyKey: `message.new:${appId}:${clientMsgId}`,
      });
    } finally {
      if (channel?.id && user1Tokens?.token) {
        await request.delete(`${API_URL}/api/channels/${channel.id}`, {
          headers: { Authorization: `Bearer ${user1Tokens.token}` },
        }).catch(() => undefined);
      }

      for (const userId of [user1, user2]) {
        await request.delete(`${API_URL}/api/users/${encodeURIComponent(userId)}`, {
          headers: { 'X-API-Key': API_KEY! },
        }).catch(() => undefined);
      }
    }
  });
});

type ChatTokens = {
  token: string;
  wsToken: string;
};

type Publication = {
  type: string;
  payload: {
    channelId: string;
    message: {
      text: string;
    };
  };
};

async function attemptUnauthorizedSubscribe(
  page: any,
  input: { wsUrl: string; wsToken: string; channelName: string }
): Promise<any> {
  return await page.evaluate(
    async ({ wsUrl, wsToken, channelName }) => {
      return await new Promise((resolve, reject) => {
        const socket = new WebSocket(wsUrl);
        const timeout = window.setTimeout(() => {
          socket.close();
          reject(new Error('Timed out waiting for unauthorized subscribe result'));
        }, 10_000);

        socket.addEventListener('open', () => {
          socket.send(JSON.stringify({ id: 1, connect: { token: wsToken } }) + '\n');
        });

        socket.addEventListener('message', (event) => {
          for (const frame of parseFrames(String(event.data))) {
            if (frame.id === 1 && frame.error) {
              window.clearTimeout(timeout);
              socket.close();
              reject(new Error(`connect failed: ${frame.error.message}`));
            }

            if (frame.id === 1 && frame.connect) {
              socket.send(JSON.stringify({ id: 2, subscribe: { channel: channelName } }) + '\n');
            }

            if (frame.id === 2) {
              window.clearTimeout(timeout);
              socket.close();
              resolve(frame.error ?? frame.subscribe ?? frame);
            }
          }
        });

        socket.addEventListener('error', () => {
          window.clearTimeout(timeout);
          reject(new Error('WebSocket error during unauthorized subscribe check'));
        });

        socket.addEventListener('close', (event) => {
          window.clearTimeout(timeout);
          reject(new Error(`WebSocket closed during unauthorized subscribe check: ${event.code} ${event.reason}`));
        });
      });

      function parseFrames(eventData: string): any[] {
        return eventData
          .split('\n')
          .map((frame) => frame.trim())
          .filter(Boolean)
          .map((frame) => JSON.parse(frame));
      }
    },
    input
  );
}

async function receiveAsRecipientAndSendFromSender(
  page: any,
  input: {
    apiUrl: string;
    wsUrl: string;
    recipientToken: string;
    recipientWsToken: string;
    senderToken: string;
    channelName: string;
    channelId: string;
    messageText: string;
    clientMsgId: string;
  }
): Promise<Publication> {
  return await page.evaluate(
    async ({
      apiUrl,
      wsUrl,
      recipientToken,
      recipientWsToken,
      senderToken,
      channelName,
      channelId,
      messageText,
      clientMsgId,
    }) => {
      const subscriptionResponse = await fetch(`${apiUrl}/api/realtime/subscription-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${recipientToken}`,
        },
        body: JSON.stringify({ channel: channelName }),
      });
      if (!subscriptionResponse.ok) {
        throw new Error(`subscription token failed: ${subscriptionResponse.status}`);
      }
      const { token: subscriptionToken } = await subscriptionResponse.json();

      return await new Promise((resolve, reject) => {
        const socket = new WebSocket(wsUrl);
        let sentMessage = false;
        const timeout = window.setTimeout(() => {
          socket.close();
          reject(new Error('Timed out waiting for message.new publication'));
        }, 20_000);

        socket.addEventListener('open', () => {
          socket.send(JSON.stringify({ id: 1, connect: { token: recipientWsToken } }) + '\n');
        });

        socket.addEventListener('message', (event) => {
          for (const frame of parseFrames(String(event.data))) {
            if (frame.id && frame.error) {
              window.clearTimeout(timeout);
              socket.close();
              reject(new Error(`Centrifugo command ${frame.id} failed: ${frame.error.message}`));
            }

            if (frame.id === 1 && frame.connect) {
              socket.send(JSON.stringify({
                id: 2,
                subscribe: {
                  channel: channelName,
                  token: subscriptionToken,
                },
              }) + '\n');
            }

            if (frame.id === 2 && frame.subscribe && !sentMessage) {
              sentMessage = true;
              fetch(`${apiUrl}/api/channels/${channelId}/messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${senderToken}`,
                },
                body: JSON.stringify({
                  text: messageText,
                  clientMsgId,
                }),
              }).then((response) => {
                if (!response.ok) {
                  throw new Error(`send message failed: ${response.status}`);
                }
              }).catch((error) => {
                window.clearTimeout(timeout);
                socket.close();
                reject(error);
              });
            }

            if (frame.push?.pub?.data?.type === 'message.new') {
              window.clearTimeout(timeout);
              socket.close();
              resolve(frame.push.pub.data);
            }
          }
        });

        socket.addEventListener('error', () => {
          window.clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        });

        socket.addEventListener('close', (event) => {
          window.clearTimeout(timeout);
          reject(new Error(`WebSocket closed before message.new publication: ${event.code} ${event.reason}`));
        });
      });

      function parseFrames(eventData: string): any[] {
        return eventData
          .split('\n')
          .map((frame) => frame.trim())
          .filter(Boolean)
          .map((frame) => JSON.parse(frame));
      }
    },
    input
  ) as Publication;
}

async function expectOutboxPublished(input: { appId: string; idempotencyKey: string }): Promise<void> {
  if (!DATABASE_URL) {
    test.info().annotations.push({
      type: 'durable-outbox-db-check',
      description: 'Skipped because PLAYWRIGHT_CHATSDK_DATABASE_URL is not set',
    });
    return;
  }

  const { default: pg } = await import('pg');
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.PLAYWRIGHT_CHATSDK_DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    await expect.poll(async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `SELECT
             set_config('app.current_app_id', $1, true),
             set_config('app.current_user_id', '', true),
             set_config('app.system_context', 'false', true)`,
          [input.appId]
        );
        const result = await client.query(
          `SELECT status
           FROM event_outbox
           WHERE app_id = $1 AND idempotency_key = $2`,
          [input.appId, input.idempotencyKey]
        );
        await client.query('COMMIT');
        return result.rows[0]?.status ?? 'missing';
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    }, {
      timeout: 10_000,
      intervals: [100, 250, 500, 1000],
    }).toBe('published');
  } finally {
    await pool.end();
  }
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

function decodeAppId(jwt: string): string {
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
  return payload.app_id;
}
