import { expect, test } from '@playwright/test';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';

const API_URL = process.env.PLAYWRIGHT_CHATSDK_API_URL || 'http://localhost:5501';
const API_KEY = process.env.PLAYWRIGHT_CHATSDK_API_KEY;
const DATABASE_URL = process.env.PLAYWRIGHT_CHATSDK_DATABASE_URL;
const COMPOSE_FILE = process.env.CHATSDK_CHAOS_COMPOSE_FILE || 'docker-compose.test.yml';
const COMPOSE_PROJECT = process.env.CHATSDK_CHAOS_PROJECT || 'chatsdk-chaos';
const enabled = process.env.CHATSDK_CHAOS === '1';

test.describe('ChatSDK chaos recovery', () => {
  test.skip(!enabled, 'Set CHATSDK_CHAOS=1 to run container restart chaos tests');
  test.skip(!API_KEY, 'Set PLAYWRIGHT_CHATSDK_API_KEY');
  test.skip(!DATABASE_URL, 'Set PLAYWRIGHT_CHATSDK_DATABASE_URL');

  test('Centrifugo outage commits messages and drains realtime outbox after recovery', async ({ request }) => {
    const runId = Date.now().toString(36);
    const senderId = `chaos-sender-${runId}`;
    const recipientId = `chaos-recipient-${runId}`;
    const marker = `chaos-centrifugo-${runId}`;
    const clientMsgId = randomUUID();
    let senderToken: string | undefined;
    let channelId: string | undefined;
    let appId: string | undefined;

    try {
      senderToken = await connectUser(request, senderId, 'Chaos Sender');
      await connectUser(request, recipientId, 'Chaos Recipient');

      const channelResponse = await request.post(`${API_URL}/api/channels`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${senderToken}`,
        },
        data: {
          type: 'messaging',
          name: `Chaos ${runId}`,
          memberIds: [recipientId],
          idempotencyKey: `chaos-channel-${runId}`,
        },
      });
      expect(channelResponse.status()).toBe(201);
      const channel = await channelResponse.json();
      channelId = channel.id;
      appId = channel.appId;

      compose('stop', 'centrifugo');

      const sendResponse = await request.post(`${API_URL}/api/channels/${channelId}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${senderToken}`,
        },
        data: { text: marker, clientMsgId },
      });
      expect(sendResponse.status()).toBe(201);

      await expectOutboxRows({
        appId: appId!,
        idempotencyKey: `message.new:${appId}:${clientMsgId}`,
        statuses: ['pending', 'processing', 'failed'],
      });

      compose('start', 'centrifugo');
      await waitForReady(request);

      await expect.poll(async () => {
        const rows = await queryDb(
          `SELECT status FROM event_outbox WHERE app_id = $1 AND idempotency_key = $2`,
          [appId, `message.new:${appId}:${clientMsgId}`]
        );
        return rows[0]?.status;
      }, { timeout: 30_000 }).toBe('published');

      const historyResponse = await request.get(`${API_URL}/api/channels/${channelId}/messages`, {
        headers: { Authorization: `Bearer ${senderToken}` },
      });
      expect(historyResponse.ok()).toBe(true);
      const history = await historyResponse.json();
      expect(JSON.stringify(history)).toContain(marker);
    } finally {
      compose('start', 'centrifugo');
      if (channelId && senderToken) {
        await request.delete(`${API_URL}/api/channels/${channelId}`, {
          headers: { Authorization: `Bearer ${senderToken}` },
        }).catch(() => undefined);
      }
      for (const userId of [senderId, recipientId]) {
        await request.delete(`${API_URL}/api/users/${encodeURIComponent(userId)}`, {
          headers: { 'X-API-Key': API_KEY! },
        }).catch(() => undefined);
      }
    }
  });
});

async function connectUser(request: any, userId: string, displayName: string): Promise<string> {
  const response = await request.post(`${API_URL}/api/auth/connect`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY!,
    },
    data: { userId, displayName },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.token;
}

async function waitForReady(request: any): Promise<void> {
  await expect.poll(async () => {
    const response = await request.get(`${API_URL}/ready`);
    return response.status();
  }, { timeout: 30_000 }).toBe(200);
}

async function expectOutboxRows(input: {
  appId: string;
  idempotencyKey: string;
  statuses: string[];
}): Promise<void> {
  await expect.poll(async () => {
    const rows = await queryDb(
      `SELECT status FROM event_outbox WHERE app_id = $1 AND idempotency_key = $2`,
      [input.appId, input.idempotencyKey]
    );
    return input.statuses.includes(rows[0]?.status);
  }, { timeout: 10_000 }).toBe(true);
}

async function queryDb(sql: string, params: unknown[]): Promise<any[]> {
  const script = `
    const pg = require('pg');
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    (async () => {
      await client.connect();
      const result = await client.query(process.argv[1], JSON.parse(process.argv[2]));
      console.log(JSON.stringify(result.rows));
      await client.end();
    })().catch(async (error) => {
      console.error(error);
      try { await client.end(); } catch {}
      process.exit(1);
    });
  `;
  const output = execFileSync(
    process.execPath,
    ['-e', script, sql, JSON.stringify(params)],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL },
      encoding: 'utf8',
    }
  );
  return JSON.parse(output);
}

function compose(action: 'start' | 'stop' | 'restart', service: string): void {
  const containerId = execFileSync(
    'docker',
    ['compose', '-p', COMPOSE_PROJECT, '-f', COMPOSE_FILE, 'ps', '-q', service],
    { cwd: process.cwd(), encoding: 'utf8' }
  ).trim();

  if (!containerId) {
    throw new Error(
      `No compose container found for ${service} in project ${COMPOSE_PROJECT}. ` +
      `Start it with COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT} docker compose -f ${COMPOSE_FILE} up -d`
    );
  }

  execFileSync(
    'docker',
    ['compose', '-p', COMPOSE_PROJECT, '-f', COMPOSE_FILE, action, service],
    { cwd: process.cwd(), stdio: 'inherit' }
  );
}
