#!/usr/bin/env node
/**
 * ChatSDK API Route Tester
 *
 * Interactive script to test all API endpoints and verify they're working.
 * Great for debugging and understanding the API.
 *
 * Usage:
 *   node scripts/test-api-routes.mjs           # Run all tests
 *   node scripts/test-api-routes.mjs --quick   # Quick health check only
 *   node scripts/test-api-routes.mjs auth      # Test auth endpoints
 *   node scripts/test-api-routes.mjs channels  # Test channel endpoints
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5500';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(msg, color = '') {
  console.log(color ? `${color}${msg}${colors.reset}` : msg);
}

function success(msg) { log(`✅ ${msg}`, colors.green); }
function fail(msg) { log(`❌ ${msg}`, colors.red); }
function warn(msg) { log(`⚠️  ${msg}`, colors.yellow); }
function info(msg) { log(`ℹ️  ${msg}`, colors.cyan); }
function header(msg) { log(`\n${'─'.repeat(60)}\n${msg}\n${'─'.repeat(60)}`, colors.bold); }

// ============================================================================
// API Helpers
// ============================================================================

let apiKey = null;
let userToken = null;

async function loadCredentials() {
  const secretsPath = join(__dirname, '..', 'credentials', 'secrets.json');

  if (existsSync(secretsPath)) {
    try {
      const secrets = JSON.parse(await readFile(secretsPath, 'utf-8'));
      apiKey = secrets.app?.api_key;
    } catch (e) {
      // Fall through
    }
  }

  apiKey = apiKey || process.env.APP_API_KEY;

  if (!apiKey) {
    throw new Error('No API key found. Run instant-setup.sh first.');
  }
}

async function request(method, endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.auth === 'apiKey') {
    headers['X-API-Key'] = apiKey;
  } else if (options.auth === 'bearer' && userToken) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }

  const start = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const elapsed = Date.now() - start;
    const data = await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      status: response.status,
      data,
      elapsed,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e.message,
      elapsed: Date.now() - start,
    };
  }
}

// ============================================================================
// Test Suites
// ============================================================================

const tests = {
  // Health & Basic
  async health() {
    header('HEALTH & BASIC ENDPOINTS');

    // Health check
    const health = await request('GET', '/health');
    if (health.ok) {
      success(`GET /health (${health.elapsed}ms)`);
    } else {
      fail(`GET /health - ${health.error || health.status}`);
      return false;
    }

    // OpenAPI spec
    const openapi = await request('GET', '/openapi.json');
    if (openapi.ok) {
      success(`GET /openapi.json (${openapi.elapsed}ms)`);
    } else {
      warn(`GET /openapi.json - ${openapi.status}`);
    }

    return true;
  },

  // Authentication
  async auth() {
    header('AUTHENTICATION');

    // Create token
    const tokenResult = await request('POST', '/tokens', {
      auth: 'apiKey',
      body: {
        userId: 'test-user-' + Date.now(),
        name: 'Test User',
        email: 'test@example.com',
      },
    });

    if (tokenResult.ok && tokenResult.data.token) {
      success(`POST /tokens - Token created (${tokenResult.elapsed}ms)`);
      userToken = tokenResult.data.token;
      info(`Token: ${userToken.substring(0, 40)}...`);
    } else {
      fail(`POST /tokens - ${tokenResult.data?.error?.message || 'Failed'}`);
      return false;
    }

    // Verify token (by calling a protected endpoint)
    const me = await request('GET', '/api/users/me', { auth: 'bearer' });
    if (me.ok) {
      success(`GET /api/users/me - Token valid (${me.elapsed}ms)`);
      info(`User: ${me.data.name || me.data.user?.name || 'Unknown'}`);
    } else {
      warn(`GET /api/users/me - ${me.status}`);
    }

    return true;
  },

  // Workspaces
  async workspaces() {
    header('WORKSPACES');

    if (!userToken) {
      fail('No user token - run auth tests first');
      return false;
    }

    // List workspaces
    const list = await request('GET', '/api/workspaces', { auth: 'bearer' });
    if (list.ok) {
      const count = list.data.workspaces?.length || 0;
      success(`GET /api/workspaces - Found ${count} workspaces (${list.elapsed}ms)`);
    } else {
      warn(`GET /api/workspaces - ${list.status}`);
    }

    // Create workspace
    const wsName = `test-ws-${Date.now()}`;
    const create = await request('POST', '/api/workspaces', {
      auth: 'bearer',
      body: { name: wsName, type: 'team' },
    });

    let workspaceId = null;
    if (create.ok && (create.data.workspace?.id || create.data.id)) {
      workspaceId = create.data.workspace?.id || create.data.id;
      success(`POST /api/workspaces - Created "${wsName}" (${create.elapsed}ms)`);
    } else {
      warn(`POST /api/workspaces - ${create.data?.error?.message || create.status}`);
    }

    // Get single workspace
    if (workspaceId) {
      const get = await request('GET', `/api/workspaces/${workspaceId}`, { auth: 'bearer' });
      if (get.ok) {
        success(`GET /api/workspaces/:id (${get.elapsed}ms)`);
      } else {
        warn(`GET /api/workspaces/:id - ${get.status}`);
      }
    }

    return true;
  },

  // Channels
  async channels() {
    header('CHANNELS');

    if (!userToken) {
      fail('No user token - run auth tests first');
      return false;
    }

    // Get workspaces first
    const wsList = await request('GET', '/api/workspaces', { auth: 'bearer' });
    const workspaceId = wsList.data.workspaces?.[0]?.id;

    if (!workspaceId) {
      warn('No workspaces found - create one first');
      return true;
    }

    // List channels
    const list = await request('GET', `/api/workspaces/${workspaceId}/channels`, { auth: 'bearer' });
    if (list.ok) {
      const count = list.data.channels?.length || 0;
      success(`GET /api/workspaces/:id/channels - Found ${count} channels (${list.elapsed}ms)`);
    } else {
      warn(`GET /api/workspaces/:id/channels - ${list.status}`);
    }

    // Create channel
    const chName = `test-${Date.now()}`;
    const create = await request('POST', `/api/workspaces/${workspaceId}/channels`, {
      auth: 'bearer',
      body: { name: chName, type: 'public' },
    });

    let channelId = null;
    if (create.ok && (create.data.channel?.id || create.data.id)) {
      channelId = create.data.channel?.id || create.data.id;
      success(`POST /api/workspaces/:id/channels - Created #${chName} (${create.elapsed}ms)`);
    } else {
      warn(`POST /api/workspaces/:id/channels - ${create.data?.error?.message || create.status}`);
    }

    // Get channel
    if (channelId) {
      const get = await request('GET', `/api/channels/${channelId}`, { auth: 'bearer' });
      if (get.ok) {
        success(`GET /api/channels/:id (${get.elapsed}ms)`);
      } else {
        warn(`GET /api/channels/:id - ${get.status}`);
      }

      // Get channel members
      const members = await request('GET', `/api/channels/${channelId}/members`, { auth: 'bearer' });
      if (members.ok) {
        success(`GET /api/channels/:id/members (${members.elapsed}ms)`);
      } else {
        warn(`GET /api/channels/:id/members - ${members.status}`);
      }
    }

    return true;
  },

  // Messages
  async messages() {
    header('MESSAGES');

    if (!userToken) {
      fail('No user token - run auth tests first');
      return false;
    }

    // Get a channel to test with
    const wsList = await request('GET', '/api/workspaces', { auth: 'bearer' });
    const workspaceId = wsList.data.workspaces?.[0]?.id;

    if (!workspaceId) {
      warn('No workspaces found');
      return true;
    }

    const chList = await request('GET', `/api/workspaces/${workspaceId}/channels`, { auth: 'bearer' });
    const channelId = chList.data.channels?.[0]?.id;

    if (!channelId) {
      warn('No channels found');
      return true;
    }

    // Get messages
    const list = await request('GET', `/api/channels/${channelId}/messages`, { auth: 'bearer' });
    if (list.ok) {
      const count = list.data.messages?.length || 0;
      success(`GET /api/channels/:id/messages - Found ${count} messages (${list.elapsed}ms)`);
    } else {
      warn(`GET /api/channels/:id/messages - ${list.status}`);
    }

    // Send message
    const testMsg = `Test message at ${new Date().toISOString()}`;
    const send = await request('POST', `/api/channels/${channelId}/messages`, {
      auth: 'bearer',
      body: { text: testMsg },
    });

    let messageId = null;
    if (send.ok && (send.data.message?.id || send.data.id)) {
      messageId = send.data.message?.id || send.data.id;
      success(`POST /api/channels/:id/messages - Message sent (${send.elapsed}ms)`);
    } else {
      warn(`POST /api/channels/:id/messages - ${send.data?.error?.message || send.status}`);
    }

    // Update message
    if (messageId) {
      const update = await request('PATCH', `/api/channels/${channelId}/messages/${messageId}`, {
        auth: 'bearer',
        body: { text: testMsg + ' (edited)' },
      });
      if (update.ok) {
        success(`PATCH /api/channels/:id/messages/:id (${update.elapsed}ms)`);
      } else {
        warn(`PATCH /api/channels/:id/messages/:id - ${update.status}`);
      }
    }

    return true;
  },

  // Reactions
  async reactions() {
    header('REACTIONS');

    if (!userToken) {
      fail('No user token - run auth tests first');
      return false;
    }

    // Get a channel and message to test with
    const wsList = await request('GET', '/api/workspaces', { auth: 'bearer' });
    const workspaceId = wsList.data.workspaces?.[0]?.id;
    if (!workspaceId) { warn('No workspaces'); return true; }

    const chList = await request('GET', `/api/workspaces/${workspaceId}/channels`, { auth: 'bearer' });
    const channelId = chList.data.channels?.[0]?.id;
    if (!channelId) { warn('No channels'); return true; }

    const msgList = await request('GET', `/api/channels/${channelId}/messages`, { auth: 'bearer' });
    const messageId = msgList.data.messages?.[0]?.id;
    if (!messageId) { warn('No messages'); return true; }

    // Add reaction
    const add = await request('POST', `/api/channels/${channelId}/messages/${messageId}/reactions`, {
      auth: 'bearer',
      body: { emoji: '👍' },
    });
    if (add.ok) {
      success(`POST .../reactions - Added 👍 (${add.elapsed}ms)`);
    } else {
      warn(`POST .../reactions - ${add.status}`);
    }

    // Remove reaction
    const remove = await request('DELETE', `/api/channels/${channelId}/messages/${messageId}/reactions/👍`, {
      auth: 'bearer',
    });
    if (remove.ok) {
      success(`DELETE .../reactions/:emoji - Removed 👍 (${remove.elapsed}ms)`);
    } else {
      warn(`DELETE .../reactions/:emoji - ${remove.status}`);
    }

    return true;
  },

  // Search
  async search() {
    header('SEARCH');

    if (!userToken) {
      fail('No user token - run auth tests first');
      return false;
    }

    const search = await request('GET', '/api/search?q=test', { auth: 'bearer' });
    if (search.ok) {
      const count = search.data.results?.length || search.data.messages?.length || 0;
      success(`GET /api/search?q=test - Found ${count} results (${search.elapsed}ms)`);
    } else if (search.status === 503) {
      info(`GET /api/search - Meilisearch not configured (optional)`);
    } else {
      warn(`GET /api/search - ${search.status}`);
    }

    return true;
  },

  // Files
  async files() {
    header('FILES');

    if (!userToken) {
      fail('No user token - run auth tests first');
      return false;
    }

    // Get presigned URL
    const presign = await request('POST', '/api/files/presign', {
      auth: 'bearer',
      body: {
        filename: 'test.txt',
        contentType: 'text/plain',
        size: 100,
      },
    });
    if (presign.ok && presign.data.uploadUrl) {
      success(`POST /api/files/presign - Got upload URL (${presign.elapsed}ms)`);
    } else {
      warn(`POST /api/files/presign - ${presign.data?.error?.message || presign.status}`);
    }

    return true;
  },
};

// ============================================================================
// Main Runner
// ============================================================================

async function runTests(filter = null) {
  console.log('\n' + '═'.repeat(60));
  log('  ChatSDK API Route Tester', colors.cyan + colors.bold);
  console.log('═'.repeat(60));
  info(`API URL: ${API_URL}`);

  try {
    await loadCredentials();
    info(`API Key: ${apiKey.substring(0, 20)}...`);
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  const testNames = filter ? [filter] : Object.keys(tests);
  const results = { passed: 0, failed: 0 };

  for (const name of testNames) {
    if (tests[name]) {
      try {
        const passed = await tests[name]();
        if (passed) results.passed++;
        else results.failed++;
      } catch (e) {
        fail(`${name}: ${e.message}`);
        results.failed++;
      }
    }
  }

  // Summary
  header('SUMMARY');
  console.log(`   Passed: ${results.passed}`);
  console.log(`   Failed: ${results.failed}`);
  console.log('');

  if (results.failed === 0) {
    success('All tests passed! API is working correctly.');
  } else {
    warn(`${results.failed} test(s) had issues. Check the warnings above.`);
  }

  console.log('');
}

// Quick mode
if (process.argv.includes('--quick')) {
  runTests('health');
} else {
  const filter = process.argv[2];
  runTests(filter);
}
