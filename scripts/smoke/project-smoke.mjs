#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Centrifuge } from 'centrifuge';

const DEFAULT_API_URL = 'http://192.168.68.244:5500';
const DEFAULT_TOKEN_URL = 'http://192.168.68.244:5511/api/chatsdk-token';
const DEFAULT_WS_URL = 'ws://192.168.68.244:8001/connection/websocket';

export async function main(argv = process.argv.slice(2), env = process.env) {
  const { options } = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const config = await buildSmokeConfig(options, env);
  if (options.dryRun) {
    printConfigSummary(config, { json: options.json });
    return 0;
  }

  const result = await runProjectSmoke(config);
  printRunSummary(config, result, { json: options.json });
  return result.failed === 0 ? 0 : 1;
}

export async function buildSmokeConfig(options = {}, env = process.env) {
  const fileConfig = options.config ? await readJsonFile(options.config) : {};
  const seed = {
    ...(fileConfig.seed ?? {}),
    slug: pick(options.slug, env.CHATSDK_PROJECT_SLUG, fileConfig.seed?.slug, 'project-smoke'),
    primaryUserId: pick(options.primaryUserId, env.CHATSDK_SMOKE_USER_ID, fileConfig.seed?.primaryUserId, `smoke-primary-${Date.now()}`),
    peerUserId: pick(options.peerUserId, env.CHATSDK_SMOKE_PEER_ID, fileConfig.seed?.peerUserId),
    message: pick(options.message, env.CHATSDK_SMOKE_MESSAGE, fileConfig.seed?.message, `ChatSDK project smoke ${new Date().toISOString()}`),
  };
  seed.peerUserId ??= `${seed.primaryUserId}-peer`;

  return {
    slug: seed.slug,
    apiUrl: stripTrailingSlash(pick(options.apiUrl, env.CHATSDK_API_URL, fileConfig.apiUrl, DEFAULT_API_URL)),
    tokenUrl: pick(options.tokenUrl, env.CHATSDK_TOKEN_URL, fileConfig.tokenUrl, DEFAULT_TOKEN_URL),
    wsUrl: pick(options.wsUrl, env.CHATSDK_WS_URL, fileConfig.wsUrl, DEFAULT_WS_URL),
    apiKey: pick(options.apiKey, env.CHATSDK_API_KEY, env.CHATSDK_APP_API_KEY, fileConfig.apiKey),
    origin: pick(options.origin, env.CHATSDK_SMOKE_ORIGIN, fileConfig.origin),
    skipWs: Boolean(options.skipWs ?? parseBoolean(env.CHATSDK_SMOKE_SKIP_WS) ?? fileConfig.skipWs ?? false),
    wsTimeoutMs: Number(pick(options.wsTimeoutMs, env.CHATSDK_SMOKE_WS_TIMEOUT_MS, fileConfig.wsTimeoutMs, 10000)),
    seed,
  };
}

export async function runProjectSmoke(config) {
  const results = [];

  const step = async (name, fn) => {
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
  };

  try {
    await step('api health', async () => {
      const data = await getJson(`${config.apiUrl}/health`, config);
      return data.status || data.ok || 'ok';
    });

    await step('token broker health', async () => {
      const healthUrl = new URL(config.tokenUrl);
      healthUrl.pathname = '/health';
      healthUrl.search = '';
      const data = await getJson(healthUrl.toString(), config);
      return data.status || data.ok || 'ok';
    });

    if (config.apiKey) {
      await step('ensure primary user', async () => ensureUser(config, config.seed.primaryUserId, 'Project Smoke Primary'));
      await step('ensure peer user', async () => ensureUser(config, config.seed.peerUserId, 'Project Smoke Peer'));
    }

    const primaryTokens = await step('mint primary user token', async () => {
      const tokens = await mintToken(config, config.seed.primaryUserId, 'Project Smoke Primary');
      assertTokenSet(tokens);
      return tokens;
    });

    if (!config.skipWs) {
      await step('websocket connect', async () => {
        await connectWebSocket(config, primaryTokens.wsToken);
        return 'connected';
      });
    }

    await step('mint peer user token', async () => {
      const tokens = await mintToken(config, config.seed.peerUserId, 'Project Smoke Peer');
      assertTokenSet(tokens);
      return tokens;
    });

    await step('query authenticated channels', async () => {
      const data = await apiFetch(config, primaryTokens.token, '/api/channels?limit=5');
      if (!Array.isArray(data.channels)) {
        throw new Error('Expected channels array');
      }
      return `${data.channels.length} channel(s)`;
    });

    const channel = await step('create or open deterministic DM', async () => {
      const data = config.apiKey
        ? await apiKeyFetch(config, '/api/channels/dm/ensure', {
          method: 'POST',
          body: JSON.stringify({
            requesterUserId: config.seed.primaryUserId,
            peerUserId: config.seed.peerUserId,
            custom: { source: 'project-smoke', project: config.slug },
          }),
        })
        : await apiFetch(config, primaryTokens.token, '/api/channels', {
          method: 'POST',
          body: JSON.stringify({
            type: 'messaging',
            memberIds: [config.seed.peerUserId],
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
        await apiFetch(config, primaryTokens.token, '/api/channels', {
          method: 'POST',
          body: JSON.stringify({
            type: 'messaging',
            memberIds: [config.seed.peerUserId],
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
      const data = await apiFetch(config, primaryTokens.token, `/api/channels/${encodeURIComponent(channel.id)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: config.seed.message }),
      });
      if (!data.id) {
        throw new Error('Expected message id');
      }
      return data;
    });

    await step('query messages', async () => {
      const data = await apiFetch(config, primaryTokens.token, `/api/channels/${encodeURIComponent(channel.id)}/messages?limit=10`);
      if (!Array.isArray(data.messages)) {
        throw new Error('Expected messages array');
      }
      const found = data.messages.some((item) => item.id === message.id || item.text === config.seed.message);
      if (!found) {
        throw new Error('Sent message was not found in query result');
      }
      return `${data.messages.length} message(s)`;
    });
  } catch {
    // The failing step has already been recorded.
  }

  return {
    passed: results.filter((item) => item.status === 'ok').length,
    failed: results.filter((item) => item.status === 'failed').length,
    results,
  };
}

export function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith('--')) {
      throw new Error(`Unexpected argument: ${raw}`);
    }
    const [flag, inlineValue] = raw.slice(2).split('=', 2);
    const key = toCamelCase(flag);
    if (['dryRun', 'json', 'help', 'skipWs'].includes(key)) {
      options[key] = inlineValue === undefined ? true : parseBoolean(inlineValue);
      continue;
    }
    const value = inlineValue ?? argv[++index];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${flag}`);
    }
    options[key] = value;
  }
  return { options };
}

export function redactedConfig(config) {
  return {
    slug: config.slug,
    apiUrl: config.apiUrl,
    tokenUrl: config.tokenUrl,
    wsUrl: config.wsUrl,
    origin: config.origin ?? null,
    apiKey: redactSecret(config.apiKey),
    skipWs: config.skipWs,
    seed: {
      slug: config.seed.slug,
      primaryUserId: config.seed.primaryUserId,
      peerUserId: config.seed.peerUserId,
      message: config.seed.message,
    },
  };
}

export function redactSecret(value) {
  if (!value) return null;
  if (value.length <= 4) return '<redacted>';
  if (value.length <= 12) return `${value.slice(0, 2)}...${value.slice(-2)}`;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

async function ensureUser(config, userId, name) {
  return apiKeyFetch(config, '/api/users/ensure', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      name,
      custom: { source: 'project-smoke', project: config.slug },
    }),
  });
}

async function mintToken(config, userId, displayName) {
  return postJson(config.tokenUrl, {
    userId,
    displayName,
    metadata: {
      source: 'project-smoke',
      project: config.slug,
      createdAt: new Date().toISOString(),
    },
  }, config);
}

async function apiFetch(config, token, path, init = {}) {
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(config.origin ? { Origin: config.origin } : {}),
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  return readResponse(response);
}

async function apiKeyFetch(config, path, init = {}) {
  if (!config.apiKey) {
    throw new Error('CHATSDK_API_KEY or --api-key is required for this step');
  }
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(config.origin ? { Origin: config.origin } : {}),
      'X-API-Key': config.apiKey,
      ...init.headers,
    },
  });
  return readResponse(response);
}

async function getJson(url, config) {
  const response = await fetch(url, {
    headers: config.origin ? { Origin: config.origin } : undefined,
  });
  return readResponse(response);
}

async function postJson(url, body, config) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.origin ? { Origin: config.origin } : {}),
    },
    body: JSON.stringify(body),
  });
  return readResponse(response);
}

function connectWebSocket(config, token) {
  return new Promise((resolve, reject) => {
    const centrifuge = new Centrifuge(config.wsUrl, { token });
    const timeout = setTimeout(() => {
      centrifuge.disconnect();
      reject(new Error('Timed out waiting for WebSocket connection'));
    }, config.wsTimeoutMs);

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
  const wsToken = tokens.wsToken ?? tokens._internal?.wsToken;
  const missing = ['token'].filter((key) => typeof tokens[key] !== 'string' || !tokens[key]);
  if (!wsToken) {
    missing.push('wsToken');
  }
  if (missing.length > 0) {
    throw new Error(`Token response missing ${missing.join(', ')}`);
  }
  tokens.wsToken = wsToken;
  if (tokens.expiresIn !== undefined && typeof tokens.expiresIn !== 'number') {
    throw new Error('Token response expiresIn must be a number when present');
  }
}

function parseJwtPayload(token) {
  const [, payload] = token.split('.');
  if (!payload) return {};
  return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

function printConfigSummary(config, { json = false } = {}) {
  const summary = redactedConfig(config);
  if (json) {
    console.log(JSON.stringify({ dryRun: true, config: summary }, null, 2));
    return;
  }
  console.log('Project smoke dry run');
  console.log(`Project: ${summary.slug}`);
  console.log(`API: ${summary.apiUrl}`);
  console.log(`Token broker: ${summary.tokenUrl}`);
  console.log(`WebSocket: ${summary.wsUrl}`);
  console.log(`Origin: ${summary.origin ?? 'none'}`);
  console.log(`API key: ${summary.apiKey ?? 'not provided'}`);
  console.log(`Primary user: ${summary.seed.primaryUserId}`);
  console.log(`Peer user: ${summary.seed.peerUserId}`);
}

function printRunSummary(config, result, { json = false } = {}) {
  const summary = {
    project: redactedConfig(config),
    passed: result.passed,
    failed: result.failed,
    results: result.results,
  };
  if (json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  console.log(`\nProject smoke summary: ${result.passed} passed, ${result.failed} failed`);
  console.log(`Project: ${config.slug}`);
  console.log(`API: ${config.apiUrl}`);
  console.log(`Token broker: ${config.tokenUrl}`);
  console.log(`WebSocket: ${config.wsUrl}`);
  console.log(`Primary user: ${config.seed.primaryUserId}`);
  console.log(`Peer user: ${config.seed.peerUserId}`);
}

function printHelp() {
  console.log(`Usage:
  node scripts/smoke/project-smoke.mjs --slug vouch-dev [--api-url URL] [--token-url URL] [--ws-url URL] [--api-key KEY] [--origin ORIGIN] [--dry-run] [--json]
  node scripts/smoke/project-smoke.mjs --config smoke-project.json --dry-run

Environment:
  CHATSDK_PROJECT_SLUG, CHATSDK_API_URL, CHATSDK_TOKEN_URL, CHATSDK_WS_URL
  CHATSDK_API_KEY or CHATSDK_APP_API_KEY
  CHATSDK_SMOKE_USER_ID, CHATSDK_SMOKE_PEER_ID, CHATSDK_SMOKE_ORIGIN

Notes:
  --dry-run validates and prints redacted configuration without network calls.
  Live mode mints tokens, checks WebSocket connectivity, ensures users when an API key is provided, opens a deterministic DM, sends a message, and verifies readback.
`);
}

async function readJsonFile(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function pick(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function parseBoolean(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
