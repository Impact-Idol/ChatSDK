#!/usr/bin/env node

import { Centrifuge } from 'centrifuge';

const apiUrl = stripTrailingSlash(process.env.CHATSDK_API_URL || 'http://192.168.68.244:5500');
const tokenUrl = process.env.CHATSDK_TOKEN_URL || 'http://192.168.68.244:5511/api/chatsdk-token';
const wsUrl = process.env.CHATSDK_WS_URL || 'ws://192.168.68.244:8001/connection/websocket';
const apiKey = process.env.CHATSDK_API_KEY || process.env.CHATSDK_APP_API_KEY;
const primaryUserId = process.env.CHATSDK_SMOKE_USER_ID || `vouch-smoke-${Date.now()}`;
const peerUserId = process.env.CHATSDK_SMOKE_PEER_ID || `${primaryUserId}-peer`;
const messageText = process.env.CHATSDK_SMOKE_MESSAGE || `ChatSDK shared-server smoke ${new Date().toISOString()}`;

const results = [];

try {
  await step('api health', async () => {
    const data = await getJson(`${apiUrl}/health`);
    return data.status || data.ok || 'ok';
  });

  await step('token broker health', async () => {
    const healthUrl = new URL(tokenUrl);
    healthUrl.pathname = '/health';
    healthUrl.search = '';
    const data = await getJson(healthUrl.toString());
    return data.status || data.ok || 'ok';
  });

  const primaryTokens = await step('mint primary user token', async () => {
    const tokens = await mintToken(primaryUserId, 'Vouch Smoke Primary');
    assertTokenSet(tokens);
    return tokens;
  });

  await step('websocket connect', async () => {
    await connectWebSocket(primaryTokens.wsToken);
    return 'connected';
  });

  await step('mint peer user token', async () => {
    const tokens = await mintToken(peerUserId, 'Vouch Smoke Peer');
    assertTokenSet(tokens);
    return tokens;
  });

  await step('query authenticated channels', async () => {
    const data = await apiFetch(primaryTokens.token, '/api/channels?limit=5');
    if (!Array.isArray(data.channels)) {
      throw new Error('Expected channels array');
    }
    return `${data.channels.length} channel(s)`;
  });

  const channel = await step('create or open deterministic DM', async () => {
    const data = apiKey
      ? await apiKeyFetch('/api/channels/dm/ensure', {
        method: 'POST',
        body: JSON.stringify({
          requesterUserId: primaryUserId,
          peerUserId,
          custom: { source: 'shared-server-smoke' },
        }),
      })
      : await apiFetch(primaryTokens.token, '/api/channels', {
        method: 'POST',
        body: JSON.stringify({
          type: 'messaging',
          memberIds: [peerUserId],
        }),
    });
    const channel = data.channel ?? data;
    if (!channel.id || !channel.cid) {
      throw new Error('Expected channel id and cid');
    }
    return channel;
  });

  await step('browser channel create denied without channel:create when scoped', async () => {
    const tokenScopes = parseJwtPayload(primaryTokens.token).scopes;
    if (!Array.isArray(tokenScopes) || tokenScopes.includes('channel:create')) {
      return 'not applicable';
    }

    try {
      await apiFetch(primaryTokens.token, '/api/channels', {
        method: 'POST',
        body: JSON.stringify({
          type: 'messaging',
          memberIds: [peerUserId],
        }),
      });
    } catch (error) {
      if (error.message.includes('channel:create')) {
        return 'denied';
      }
      throw error;
    }

    throw new Error('Expected browser channel creation to be denied');
  });

  const message = await step('send message', async () => {
    const data = await apiFetch(primaryTokens.token, `/api/channels/${encodeURIComponent(channel.id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: messageText }),
    });
    if (!data.id) {
      throw new Error('Expected message id');
    }
    return data;
  });

  await step('query messages', async () => {
    const data = await apiFetch(primaryTokens.token, `/api/channels/${encodeURIComponent(channel.id)}/messages?limit=10`);
    if (!Array.isArray(data.messages)) {
      throw new Error('Expected messages array');
    }
    const found = data.messages.some((item) => item.id === message.id || item.text === messageText);
    if (!found) {
      throw new Error('Sent message was not found in query result');
    }
    return `${data.messages.length} message(s)`;
  });

  printSummary();
} catch (error) {
  printSummary();
  console.error(`\nSmoke failed: ${error.message}`);
  process.exitCode = 1;
}

async function step(name, fn) {
  const start = Date.now();
  try {
    const value = await fn();
    const elapsed = Date.now() - start;
    results.push({ name, status: 'ok', elapsed });
    console.log(`ok ${name} (${elapsed}ms)`);
    return value;
  } catch (error) {
    const elapsed = Date.now() - start;
    results.push({ name, status: 'failed', elapsed, error: error.message });
    console.error(`failed ${name} (${elapsed}ms): ${error.message}`);
    throw error;
  }
}

async function mintToken(userId, displayName) {
  return postJson(tokenUrl, {
    userId,
    displayName,
    metadata: {
      source: 'shared-server-smoke',
      createdAt: new Date().toISOString(),
    },
  });
}

async function apiFetch(token, path, init = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  return readResponse(response);
}

async function apiKeyFetch(path, init = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...init.headers,
    },
  });
  return readResponse(response);
}

async function getJson(url) {
  const response = await fetch(url);
  return readResponse(response);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return readResponse(response);
}

function connectWebSocket(token) {
  return new Promise((resolve, reject) => {
    const centrifuge = new Centrifuge(wsUrl, { token });
    const timeout = setTimeout(() => {
      centrifuge.disconnect();
      reject(new Error('Timed out waiting for WebSocket connection'));
    }, Number(process.env.CHATSDK_SMOKE_WS_TIMEOUT_MS || 10000));

    centrifuge.on('connected', () => {
      clearTimeout(timeout);
      centrifuge.disconnect();
      resolve();
    });

    centrifuge.on('disconnected', (ctx) => {
      if (ctx.reason === 'disconnect called') return;
      clearTimeout(timeout);
      reject(new Error(ctx.reason || 'WebSocket disconnected before connect'));
    });

    centrifuge.on('error', (ctx) => {
      clearTimeout(timeout);
      centrifuge.disconnect();
      reject(new Error(ctx.error?.message || 'WebSocket connection error'));
    });

    centrifuge.connect();
  });
}

async function readResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function assertTokenSet(tokens) {
  const missing = ['token', 'refreshToken', 'wsToken'].filter((key) => typeof tokens[key] !== 'string' || !tokens[key]);
  if (missing.length > 0) {
    throw new Error(`Token response missing ${missing.join(', ')}`);
  }
  if (tokens.expiresIn !== undefined && typeof tokens.expiresIn !== 'number') {
    throw new Error('Token response expiresIn must be a number when present');
  }
}

function parseJwtPayload(token) {
  const [, payload] = token.split('.');
  if (!payload) return {};
  return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function printSummary() {
  const ok = results.filter((item) => item.status === 'ok').length;
  const failed = results.filter((item) => item.status === 'failed').length;
  console.log(`\nShared-server smoke summary: ${ok} passed, ${failed} failed`);
  console.log(`API: ${apiUrl}`);
  console.log(`Token broker: ${tokenUrl}`);
  console.log(`WebSocket: ${wsUrl}`);
  console.log(`Primary user: ${primaryUserId}`);
  console.log(`Peer user: ${peerUserId}`);
}
