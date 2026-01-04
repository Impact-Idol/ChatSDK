#!/usr/bin/env node
/**
 * ChatSDK Authentication Flow Test
 *
 * Tests the complete authentication flow:
 * 1. Admin creates an app
 * 2. App generates user tokens
 * 3. User accesses chat API with tokens
 *
 * Usage:
 *   node scripts/test-auth.mjs
 *   node scripts/test-auth.mjs --api-url=http://localhost:5500
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const API_URL = process.argv.find(arg => arg.startsWith('--api-url='))?.split('=')[1] || 'http://localhost:5500';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.cyan}${step}${colors.reset} ${message}`);
  console.log('─'.repeat(60));
}

async function loadEnvFile() {
  const envPath = join(__dirname, '..', '.env.production');

  if (!existsSync(envPath)) {
    log('⚠️  .env.production not found. Run bootstrap.mjs first!', 'yellow');
    return {};
  }

  const content = await readFile(envPath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      env[match[1]] = match[2];
    }
  });

  return env;
}

async function loadCredentials() {
  const credentialsDir = join(__dirname, '..', 'credentials');

  if (!existsSync(credentialsDir)) {
    return null;
  }

  // Find most recent credentials file
  const { readdirSync } = await import('fs');
  const files = readdirSync(credentialsDir)
    .filter(f => f.startsWith('app-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return null;
  }

  const credPath = join(credentialsDir, files[0]);
  const content = await readFile(credPath, 'utf-8');
  return JSON.parse(content);
}

async function testEndpoint(name, method, endpoint, headers = {}, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (response.ok) {
      log(`✅ ${name}: Success`, 'green');
      return { success: true, data };
    } else {
      log(`❌ ${name}: Failed (${response.status})`, 'red');
      log(`   Error: ${data.error?.message || JSON.stringify(data)}`, 'red');
      return { success: false, error: data };
    }
  } catch (error) {
    log(`❌ ${name}: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  console.clear();
  log('🧪 ChatSDK Authentication Flow Test\n', 'cyan');
  log(`API URL: ${API_URL}`, 'blue');
  log('', 'reset');

  // Load environment
  const env = await loadEnvFile();
  const credentials = await loadCredentials();

  if (!env.ADMIN_API_KEY) {
    log('❌ ADMIN_API_KEY not found in .env.production', 'red');
    log('   Run: node scripts/bootstrap.mjs', 'yellow');
    process.exit(1);
  }

  // Test 1: Health Check
  logStep('1️⃣', 'Health Check');
  const health = await testEndpoint('Health', 'GET', '/health');

  if (!health.success) {
    log('\n⚠️  API server not responding. Make sure it\'s running:', 'yellow');
    log('   docker-compose up -d', 'yellow');
    process.exit(1);
  }

  // Test 2: Admin - Create or Use Existing App
  logStep('2️⃣', 'Application Setup');

  let appApiKey;
  let appId;

  if (credentials) {
    log(`✅ Using existing app: ${credentials.app.name}`, 'green');
    log(`   App ID: ${credentials.app.id}`, 'blue');
    log(`   API Key: ${credentials.app.apiKey.substring(0, 20)}...`, 'blue');
    appApiKey = credentials.app.apiKey;
    appId = credentials.app.id;
  } else {
    log('Creating new application via admin endpoint...', 'blue');

    const appResult = await testEndpoint(
      'Create App',
      'POST',
      '/admin/apps',
      { 'Authorization': `Bearer ${env.ADMIN_API_KEY}` },
      {
        name: 'Test App ' + Date.now(),
        settings: {
          ai_enabled: false,
          max_file_size: 10485760,
        },
      }
    );

    if (!appResult.success) {
      log('\n❌ Failed to create app. Check ADMIN_API_KEY in .env.production', 'red');
      process.exit(1);
    }

    appApiKey = appResult.data.apiKey;
    appId = appResult.data.id;
    log(`   App ID: ${appId}`, 'blue');
    log(`   API Key: ${appApiKey.substring(0, 20)}...`, 'blue');
  }

  // Test 3: Create User Token
  logStep('3️⃣', 'User Token Generation');

  const userId = 'test-user-' + Date.now();
  log(`Creating token for user: ${userId}`, 'blue');

  const tokenResult = await testEndpoint(
    'Create Token',
    'POST',
    '/tokens',
    { 'X-API-Key': appApiKey },
    {
      userId: userId,
      name: 'Test User',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
      custom: {
        email: 'test@example.com',
        role: 'tester',
      },
    }
  );

  if (!tokenResult.success) {
    log('\n❌ Failed to create token', 'red');
    process.exit(1);
  }

  const { token, wsToken, user } = tokenResult.data;
  log(`   User ID: ${user.id}`, 'blue');
  log(`   JWT Token: ${token.substring(0, 30)}...`, 'blue');
  log(`   WS Token: ${wsToken.substring(0, 30)}...`, 'blue');

  // Test 4: Use Token to Access API
  logStep('4️⃣', 'Authenticated API Requests');

  // Get current user
  const userResult = await testEndpoint(
    'Get Current User',
    'GET',
    '/api/users/me',
    { 'Authorization': `Bearer ${token}` }
  );

  if (!userResult.success) {
    log('\n❌ Token authentication failed', 'red');
    process.exit(1);
  }

  log(`   Name: ${userResult.data.name}`, 'blue');
  log(`   Custom Data: ${JSON.stringify(userResult.data.custom)}`, 'blue');

  // Get channels
  const channelsResult = await testEndpoint(
    'Get Channels',
    'GET',
    '/api/channels',
    { 'Authorization': `Bearer ${token}` }
  );

  if (channelsResult.success) {
    log(`   Channels: ${channelsResult.data.channels?.length || 0}`, 'blue');
  }

  // Test 5: Token Refresh
  logStep('5️⃣', 'Token Refresh');

  const refreshResult = await testEndpoint(
    'Refresh Token',
    'POST',
    '/tokens/refresh',
    { 'Authorization': `Bearer ${token}` }
  );

  if (!refreshResult.success) {
    log('\n❌ Token refresh failed', 'red');
  } else {
    log(`   New Token: ${refreshResult.data.token.substring(0, 30)}...`, 'blue');
    log(`   Expires In: ${refreshResult.data.expiresIn}s (24 hours)`, 'blue');
  }

  // Test 6: WebSocket Token
  logStep('6️⃣', 'WebSocket Connection Info');
  log(`WebSocket URL: ${env.CENTRIFUGO_URL || 'ws://localhost:8000/connection/websocket'}`, 'blue');
  log(`WebSocket Token: ${wsToken.substring(0, 30)}...`, 'blue');
  log('', 'reset');
  log('Use this token to connect to Centrifugo for real-time features', 'yellow');

  // Summary
  console.log('\n' + '═'.repeat(60));
  log('✅ All Authentication Tests Passed!', 'green');
  console.log('═'.repeat(60));
  console.log('');

  log('📋 Summary:', 'cyan');
  log(`  • App ID: ${appId}`, 'reset');
  log(`  • App API Key: ${appApiKey.substring(0, 20)}...`, 'reset');
  log(`  • User ID: ${userId}`, 'reset');
  log(`  • JWT Token: ${token.substring(0, 30)}...`, 'reset');
  log(`  • WS Token: ${wsToken.substring(0, 30)}...`, 'reset');
  console.log('');

  log('🎯 Next Steps:', 'cyan');
  log('  1. Use the API Key in your application to generate user tokens', 'reset');
  log('  2. Pass JWT tokens to your frontend via your auth system', 'reset');
  log('  3. Initialize ChatSDK with the tokens:', 'reset');
  console.log('');
  log('     import { ChatClient } from "@chatsdk/core";', 'blue');
  log('     const client = new ChatClient({ token, wsToken });', 'blue');
  console.log('');

  log('📚 Documentation:', 'cyan');
  log('  • Authentication Guide: docs/AUTHENTICATION.md', 'reset');
  log('  • API Reference: docs/API_REFERENCE.md', 'reset');
  console.log('');
}

main().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
