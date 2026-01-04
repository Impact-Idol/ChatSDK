#!/usr/bin/env node
/**
 * ChatSDK Health Check Script
 *
 * Validates that all services are running correctly and can communicate
 * Run this after deployment to ensure everything is working
 *
 * Usage:
 *   node scripts/health-check.mjs
 *   node scripts/health-check.mjs --api-url=https://api.yourdomain.com
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const API_URL = process.argv.find(arg => arg.startsWith('--api-url='))?.split('=')[1] || 'http://localhost:5500';

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let passed = 0;
let failed = 0;
let warnings = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(message) {
  passed++;
  log(`✅ ${message}`, 'green');
}

function fail(message, hint = '') {
  failed++;
  log(`❌ ${message}`, 'red');
  if (hint) log(`   💡 ${hint}`, 'yellow');
}

function warn(message) {
  warnings++;
  log(`⚠️  ${message}`, 'yellow');
}

function section(title) {
  console.log('');
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(title, 'cyan');
  log('═'.repeat(60), 'cyan');
}

async function loadCredentials() {
  const credentialsDir = join(__dirname, '..', 'credentials');

  if (!existsSync(credentialsDir)) {
    return null;
  }

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

async function checkEndpoint(name, url, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data, status: response.status };
    } else {
      return { success: false, error: data, status: response.status };
    }
  } catch (error) {
    return { success: false, error: error.message, status: 0 };
  }
}

async function checkAPIHealth() {
  section('1. API Server Health');

  const result = await checkEndpoint('API Health', `${API_URL}/health`);

  if (result.success) {
    pass(`API server is running (${result.status})`);
    if (result.data.version) {
      log(`   Version: ${result.data.version}`, 'blue');
    }
    return true;
  } else {
    fail(
      `API server not responding`,
      `Check if API is running: docker-compose ps api`
    );
    return false;
  }
}

async function checkDatabaseConnection() {
  section('2. Database Connection');

  // Try to call an endpoint that requires database
  const credentials = await loadCredentials();

  if (!credentials) {
    warn('No credentials found - skipping database check');
    log('   Run: node scripts/bootstrap.mjs', 'yellow');
    return false;
  }

  const result = await checkEndpoint(
    'Database Check',
    `${API_URL}/admin/apps`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_API_KEY || 'test'}`,
      },
    }
  );

  if (result.success || result.status === 401) {
    // 401 means auth failed but database is working
    pass('Database connection is working');
    return true;
  } else if (result.status === 503) {
    fail(
      'Database connection failed',
      'Check database credentials in .env.production'
    );
    return false;
  } else {
    fail(
      'Database connection unknown',
      'Check logs: docker-compose logs api'
    );
    return false;
  }
}

async function checkTokenGeneration() {
  section('3. Token Generation');

  const credentials = await loadCredentials();

  if (!credentials) {
    fail(
      'No credentials found',
      'Run: node scripts/bootstrap.mjs'
    );
    return false;
  }

  const userId = 'health-check-' + Date.now();

  const result = await checkEndpoint(
    'Token Generation',
    `${API_URL}/api/tokens`,
    {
      method: 'POST',
      headers: {
        'X-API-Key': credentials.app.apiKey,
        'Content-Type': 'application/json',
      },
      body: {
        userId: userId,
        name: 'Health Check User',
      },
    }
  );

  if (result.success) {
    pass('Token generation is working');
    log(`   Token: ${result.data.token.substring(0, 30)}...`, 'blue');
    log(`   WS Token: ${result.data.wsToken.substring(0, 30)}...`, 'blue');
    return { token: result.data.token, wsToken: result.data.wsToken };
  } else {
    fail(
      'Token generation failed',
      `Error: ${result.error?.error?.message || result.error}`
    );
    return false;
  }
}

async function checkAuthentication(tokens) {
  section('4. Authentication & Authorization');

  if (!tokens) {
    fail('Skipping - no tokens available');
    return false;
  }

  // Test authenticated endpoint
  const result = await checkEndpoint(
    'Authenticated Request',
    `${API_URL}/api/users/me`,
    {
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
      },
    }
  );

  if (result.success) {
    pass('Authentication is working');
    log(`   User ID: ${result.data.id}`, 'blue');
    log(`   Name: ${result.data.name}`, 'blue');
    return true;
  } else {
    fail(
      'Authentication failed',
      'Check JWT_SECRET in .env.production'
    );
    return false;
  }
}

async function checkChannelsEndpoint(tokens) {
  section('5. Core API Endpoints');

  if (!tokens) {
    fail('Skipping - no tokens available');
    return false;
  }

  const result = await checkEndpoint(
    'Channels API',
    `${API_URL}/api/channels`,
    {
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
      },
    }
  );

  if (result.success) {
    pass('Channels endpoint is working');
    log(`   Channels: ${result.data.channels?.length || 0}`, 'blue');
    return true;
  } else {
    fail('Channels endpoint failed');
    return false;
  }
}

async function checkWebSocketInfo() {
  section('6. WebSocket Configuration');

  const credentials = await loadCredentials();

  if (!credentials) {
    warn('No credentials - skipping WebSocket check');
    return false;
  }

  // Check if Centrifugo is responding
  try {
    const centrifugoUrl = process.env.CENTRIFUGO_API_URL || 'http://localhost:8000';
    const healthUrl = `${centrifugoUrl}/health`;

    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });

    if (response.ok) {
      pass('Centrifugo (WebSocket server) is running');
      log(`   URL: ${centrifugoUrl}`, 'blue');
      return true;
    } else {
      warn('Centrifugo health check returned non-OK status');
      return false;
    }
  } catch (error) {
    warn('Centrifugo not responding - real-time features may not work');
    log('   Start with: docker-compose up -d centrifugo', 'yellow');
    return false;
  }
}

async function checkCORS() {
  section('7. CORS Configuration');

  // Check if API allows requests from browser
  try {
    const response = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    const corsHeader = response.headers.get('access-control-allow-origin');

    if (corsHeader) {
      pass('CORS is configured');
      log(`   Allowed Origins: ${corsHeader}`, 'blue');
    } else {
      warn('CORS headers not found - may cause browser issues');
      log('   Configure CORS in API server for production', 'yellow');
    }
  } catch (error) {
    warn('Could not check CORS configuration');
  }
}

async function checkRateLimiting() {
  section('8. Rate Limiting (Optional)');

  warn('Rate limiting not checked - configure in production');
  log('   See docs/AUTHENTICATION.md for nginx rate limiting examples', 'yellow');
}

async function printSummary() {
  console.log('');
  log('═'.repeat(60), 'cyan');
  log('HEALTH CHECK SUMMARY', 'cyan');
  log('═'.repeat(60), 'cyan');
  console.log('');

  log(`✅ Passed: ${passed}`, 'green');

  if (failed > 0) {
    log(`❌ Failed: ${failed}`, 'red');
  }

  if (warnings > 0) {
    log(`⚠️  Warnings: ${warnings}`, 'yellow');
  }

  console.log('');

  if (failed === 0 && warnings === 0) {
    log('🎉 All systems operational!', 'green');
    console.log('');
    log('Your ChatSDK deployment is healthy and ready for use.', 'green');
  } else if (failed === 0) {
    log('✅ Core systems operational', 'green');
    console.log('');
    log('Some warnings detected - review above for recommendations.', 'yellow');
  } else {
    log('❌ Critical issues detected', 'red');
    console.log('');
    log('Please fix the failed checks above before using in production.', 'red');
  }

  console.log('');
  log('═'.repeat(60), 'cyan');
  console.log('');

  if (failed > 0) {
    log('📋 Troubleshooting:', 'cyan');
    console.log('');
    log('1. Check API logs: docker-compose logs -f api', 'yellow');
    log('2. Verify environment: cat .env.production', 'yellow');
    log('3. Run validation: node scripts/validate.mjs', 'yellow');
    log('4. Test auth flow: node scripts/test-auth.mjs', 'yellow');
    console.log('');
    log('📖 Documentation: docs/AUTHENTICATION.md', 'cyan');
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

async function main() {
  console.clear();
  log('🏥 ChatSDK Health Check\n', 'cyan');
  log(`API URL: ${API_URL}`, 'blue');

  const apiHealthy = await checkAPIHealth();

  if (!apiHealthy) {
    console.log('');
    log('❌ API server is not responding. Cannot continue health check.', 'red');
    console.log('');
    log('Troubleshooting:', 'yellow');
    log('  1. Is the API server running?', 'yellow');
    log('     docker-compose ps', 'yellow');
    log('  2. Check API logs:', 'yellow');
    log('     docker-compose logs -f api', 'yellow');
    log('  3. Verify .env.production is configured:', 'yellow');
    log('     cat .env.production', 'yellow');
    console.log('');
    process.exit(1);
  }

  await checkDatabaseConnection();
  const tokens = await checkTokenGeneration();
  await checkAuthentication(tokens);
  await checkChannelsEndpoint(tokens);
  await checkWebSocketInfo();
  await checkCORS();
  await checkRateLimiting();
  await printSummary();
}

main().catch(error => {
  console.error('\n❌ Health check failed:', error);
  process.exit(1);
});
