#!/usr/bin/env node

const apiUrl = stripTrailingSlash(process.env.CHATSDK_API_URL || 'http://192.168.68.244:5500');
const tokenUrl = process.env.CHATSDK_TOKEN_URL || 'http://192.168.68.244:5511/api/chatsdk-token';
const apiKey = process.env.CHATSDK_APP_API_KEY || process.env.CHATSDK_API_KEY;

if (!apiKey) {
  throw new Error('CHATSDK_APP_API_KEY or CHATSDK_API_KEY is required');
}

const seed = `private-isolation-${Date.now()}`;
const users = {
  primary: process.env.CHATSDK_SMOKE_USER_ID || `${seed}-a`,
  peer: process.env.CHATSDK_SMOKE_PEER_ID || `${seed}-b`,
  outsider: process.env.CHATSDK_SMOKE_OUTSIDER_ID || `${seed}-c`,
};
const messageText = process.env.CHATSDK_SMOKE_MESSAGE || `private isolation ${new Date().toISOString()}`;
const results = [];

try {
  await step('health', async () => getJson(`${apiUrl}/health`));
  await step('ensure primary user', async () => ensureUser(users.primary, 'Isolation Primary'));
  await step('ensure peer user', async () => ensureUser(users.peer, 'Isolation Peer'));
  await step('ensure outsider user', async () => ensureUser(users.outsider, 'Isolation Outsider'));

  const primaryTokens = await step('mint primary token', async () => mintToken(users.primary, 'Isolation Primary'));
  const peerTokens = await step('mint peer token', async () => mintToken(users.peer, 'Isolation Peer'));
  const outsiderTokens = await step('mint outsider token', async () => mintToken(users.outsider, 'Isolation Outsider'));

  const channel = await step('ensure private DM', async () => {
    const data = await apiKeyFetch('/api/channels/dm/ensure', {
      method: 'POST',
      body: JSON.stringify({
        requesterUserId: users.primary,
        peerUserId: users.peer,
        custom: { source: 'private-isolation-smoke' },
      }),
    });
    const channel = data.channel;
    if (!channel?.id) throw new Error('missing channel id');
    return channel;
  });

  const message = await step('primary sends private message', async () => {
    const data = await apiFetch(primaryTokens.token, `/api/channels/${channel.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: messageText }),
    });
    if (!data.id) throw new Error('missing message id');
    return data;
  });

  await step('primary can read DM', async () => {
    const data = await apiFetch(primaryTokens.token, `/api/channels/${channel.id}/messages?limit=10`);
    if (!data.messages?.some((item) => item.id === message.id || item.text === messageText)) {
      throw new Error('primary did not see sent message');
    }
    return 'allowed';
  });

  await step('peer can read DM', async () => {
    const data = await apiFetch(peerTokens.token, `/api/channels/${channel.id}/messages?limit=10`);
    if (!data.messages?.some((item) => item.id === message.id || item.text === messageText)) {
      throw new Error('peer did not see sent message');
    }
    return 'allowed';
  });

  await step('outsider channel list excludes DM', async () => {
    const data = await apiFetch(outsiderTokens.token, '/api/channels?limit=100');
    if (data.channels?.some((item) => item.id === channel.id)) {
      throw new Error('outsider channel list included private DM');
    }
    return 'excluded';
  });

  await step('outsider cannot query DM messages', async () => {
    await expectDenied(
      () => apiFetch(outsiderTokens.token, `/api/channels/${channel.id}/messages?limit=10`),
      [403]
    );
    return 'denied';
  });

  await step('outsider cannot query single private message', async () => {
    await expectDenied(
      () => apiFetch(outsiderTokens.token, `/api/channels/${channel.id}/messages/${message.id}`),
      [403]
    );
    return 'denied';
  });

  await step('outsider cannot send to DM', async () => {
    await expectDenied(
      () => apiFetch(outsiderTokens.token, `/api/channels/${channel.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: 'should not send' }),
      }),
      [403]
    );
    return 'denied';
  });

  await step('outsider cannot read DM read status', async () => {
    await expectDenied(
      () => apiFetch(outsiderTokens.token, `/api/channels/${channel.id}/receipts/read-status`),
      [403]
    );
    return 'denied';
  });
} catch {
  process.exitCode = 1;
} finally {
  const passed = results.filter((item) => item.status === 'ok').length;
  const failed = results.filter((item) => item.status === 'failed').length;
  console.log(`\nPrivate-isolation smoke summary: ${passed} passed, ${failed} failed`);
  console.log(`API: ${apiUrl}`);
  console.log(`Token broker: ${tokenUrl}`);
  console.log(`Primary user: ${users.primary}`);
  console.log(`Peer user: ${users.peer}`);
  console.log(`Outsider user: ${users.outsider}`);
}

async function step(name, fn) {
  const start = Date.now();
  try {
    const value = await fn();
    results.push({ name, status: 'ok' });
    console.log(`ok ${name} (${Date.now() - start}ms)`);
    return value;
  } catch (error) {
    results.push({ name, status: 'failed', error: error.message });
    console.error(`failed ${name} (${Date.now() - start}ms): ${error.message}`);
    throw error;
  }
}

async function ensureUser(userId, name) {
  return apiKeyFetch('/api/users/ensure', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      name,
      custom: { source: 'private-isolation-smoke' },
    }),
  });
}

async function mintToken(userId, displayName) {
  const data = await postJson(tokenUrl, {
    userId,
    displayName,
    metadata: { source: 'private-isolation-smoke' },
  });
  for (const key of ['token', 'refreshToken', 'wsToken']) {
    if (!data[key]) throw new Error(`missing ${key}`);
  }
  return data;
}

async function expectDenied(fn, allowedStatuses) {
  try {
    await fn();
  } catch (error) {
    if (allowedStatuses.includes(error.status)) {
      return;
    }
    throw error;
  }
  throw new Error('request unexpectedly succeeded');
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

async function readResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}
