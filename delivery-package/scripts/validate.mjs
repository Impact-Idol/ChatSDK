#!/usr/bin/env node
/**
 * ChatSDK Pre-flight Validation Script
 *
 * Validates your deployment is ready before going live.
 * Checks environment variables, services, database, S3, and more.
 *
 * Usage:
 *   node scripts/validate.mjs
 *   node scripts/validate.mjs --fix  # Auto-fix some issues
 */

import { readFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const FIX_MODE = process.argv.includes('--fix');

let errors = 0;
let warnings = 0;
let fixed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message, fixable = false) {
  errors++;
  const prefix = fixable && FIX_MODE ? '🔧' : '❌';
  log(`${prefix} ${message}`, 'red');
}

function warn(message) {
  warnings++;
  log(`⚠️  ${message}`, 'yellow');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function section(title) {
  console.log('');
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

async function loadEnv() {
  const envPath = join(__dirname, '..', '.env.production');

  if (!existsSync(envPath)) {
    return {};
  }

  const content = await readFile(envPath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      env[match[1]] = match[2].trim();
    }
  });

  return env;
}

function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (err) {
    return null;
  }
}

async function validateNodeVersion() {
  section('1. Node.js Version');

  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);

  if (majorVersion < 18) {
    error(`Node.js ${majorVersion} detected. Requires Node.js 18+`);
    log(`  Current: ${version}`, 'red');
    log('  Install: https://nodejs.org/', 'yellow');
  } else {
    success(`Node.js ${version} ✓`);
  }
}

async function validateEnvironmentFile() {
  section('2. Environment Configuration');

  const envPath = join(__dirname, '..', '.env.production');
  const envExamplePath = join(__dirname, '..', '.env.production.example');

  if (!existsSync(envPath)) {
    error('.env.production not found', true);

    if (FIX_MODE && existsSync(envExamplePath)) {
      const { copyFile } = await import('fs/promises');
      await copyFile(envExamplePath, envPath);
      fixed++;
      success('Created .env.production from example');
      warn('Remember to run: node scripts/bootstrap.mjs');
    } else {
      log('  Run: cp .env.production.example .env.production', 'yellow');
      log('  Then: node scripts/bootstrap.mjs', 'yellow');
    }
    return;
  }

  success('.env.production exists');
}

async function validateSecrets() {
  section('3. Required Secrets');

  const env = await loadEnv();

  const requiredSecrets = {
    'JWT_SECRET': { minLength: 64, description: 'JWT signing secret' },
    'ADMIN_API_KEY': { minLength: 32, description: 'Admin API authentication' },
    'CENTRIFUGO_TOKEN_SECRET': { minLength: 32, description: 'WebSocket authentication' },
  };

  for (const [key, config] of Object.entries(requiredSecrets)) {
    const value = env[key];

    if (!value || value.includes('change-this') || value.includes('replace-with')) {
      error(`${key} not configured - ${config.description}`, true);

      if (FIX_MODE) {
        warn('Run: node scripts/bootstrap.mjs to generate all secrets');
      } else {
        log(`  Run: node scripts/bootstrap.mjs`, 'yellow');
      }
    } else if (value.length < config.minLength) {
      error(`${key} too short (${value.length} chars, need ${config.minLength}+)`);
    } else {
      success(`${key}: ${value.substring(0, 10)}... (${value.length} chars)`);
    }
  }
}

async function validateDatabase() {
  section('4. Database Configuration');

  const env = await loadEnv();

  const dbConfig = {
    'DB_HOST': env.DB_HOST || 'localhost',
    'DB_PORT': env.DB_PORT || '5432',
    'DB_NAME': env.DB_NAME || 'chatsdk',
    'DB_USER': env.DB_USER || 'chatsdk',
    'DB_PASSWORD': env.DB_PASSWORD,
  };

  if (!dbConfig.DB_PASSWORD || dbConfig.DB_PASSWORD.includes('change')) {
    error('DB_PASSWORD not set');
  } else {
    success(`Database: ${dbConfig.DB_USER}@${dbConfig.DB_HOST}:${dbConfig.DB_PORT}/${dbConfig.DB_NAME}`);
  }

  // Try to connect to database (if Docker is running)
  const dockerRunning = execCommand('docker ps 2>/dev/null');

  if (dockerRunning) {
    const postgresRunning = dockerRunning.includes('postgres');

    if (postgresRunning) {
      success('PostgreSQL container is running');

      // Check if database is accessible
      const dbCheck = execCommand(
        `docker exec -i $(docker ps -q -f name=postgres) psql -U ${dbConfig.DB_USER} -d ${dbConfig.DB_NAME} -c "SELECT 1" 2>/dev/null`
      );

      if (dbCheck) {
        success('Database connection successful');
      } else {
        warn('Cannot connect to database - check credentials');
      }
    } else {
      warn('PostgreSQL container not running');
      log('  Start with: docker-compose up -d postgres', 'yellow');
    }
  }
}

async function validateS3Storage() {
  section('5. S3 Storage Configuration');

  const env = await loadEnv();

  const s3Config = {
    'S3_ENDPOINT': env.S3_ENDPOINT,
    'S3_REGION': env.S3_REGION,
    'S3_BUCKET': env.S3_BUCKET,
    'S3_ACCESS_KEY': env.S3_ACCESS_KEY,
    'S3_SECRET_KEY': env.S3_SECRET_KEY,
  };

  let s3Configured = true;

  for (const [key, value] of Object.entries(s3Config)) {
    if (!value || value.includes('your-') || value.includes('change')) {
      warn(`${key} not configured`);
      s3Configured = false;
    }
  }

  if (s3Configured) {
    success(`S3: ${s3Config.S3_BUCKET} in ${s3Config.S3_REGION}`);
    success(`Endpoint: ${s3Config.S3_ENDPOINT}`);
  } else {
    warn('S3 storage not fully configured');
    log('  Required for file uploads, attachments, avatars', 'yellow');
    log('  Supported: AWS S3, DigitalOcean Spaces, Cloudflare R2, MinIO', 'yellow');
  }
}

async function validateDocker() {
  section('6. Docker & Services');

  // Check Docker
  const dockerVersion = execCommand('docker --version');
  if (!dockerVersion) {
    error('Docker not installed or not in PATH');
    log('  Install: https://docs.docker.com/get-docker/', 'yellow');
    return;
  }

  success(`Docker: ${dockerVersion}`);

  // Check Docker Compose
  const composeVersion = execCommand('docker compose version 2>/dev/null || docker-compose --version');
  if (!composeVersion) {
    error('Docker Compose not installed');
  } else {
    success(`Docker Compose: ${composeVersion}`);
  }

  // Check if containers are running
  const dockerPs = execCommand('docker ps --format "{{.Names}}" 2>/dev/null');

  if (dockerPs) {
    const containers = dockerPs.split('\n').filter(Boolean);

    if (containers.length > 0) {
      success(`Running containers: ${containers.length}`);

      const expectedServices = [
        { name: 'postgres', pattern: /postgres/i },
        { name: 'centrifugo', pattern: /centrifugo/i },
        { name: 'api', pattern: /api/i },
      ];

      expectedServices.forEach(({ name, pattern }) => {
        const running = containers.some(c => pattern.test(c));
        if (running) {
          success(`  ✓ ${name}`);
        } else {
          warn(`  ${name} not running`);
        }
      });
    } else {
      warn('No Docker containers running');
      log('  Start with: cd docker && docker-compose up -d', 'yellow');
    }
  }
}

async function validateCredentials() {
  section('7. Application Credentials');

  const credentialsDir = join(__dirname, '..', 'credentials');

  if (!existsSync(credentialsDir)) {
    warn('credentials/ directory not found');
    log('  Run: node scripts/bootstrap.mjs to create your first app', 'yellow');
    return;
  }

  const { readdirSync } = await import('fs');
  const files = readdirSync(credentialsDir).filter(f => f.startsWith('app-') && f.endsWith('.json'));

  if (files.length === 0) {
    warn('No application credentials found');
    log('  Run: node scripts/bootstrap.mjs to create your first app', 'yellow');
  } else {
    success(`Found ${files.length} application(s)`);

    // Read first app
    const appPath = join(credentialsDir, files[0]);
    const appData = JSON.parse(await readFile(appPath, 'utf-8'));

    success(`  App: ${appData.app.name}`);
    log(`  API Key: ${appData.app.apiKey.substring(0, 20)}...`, 'blue');

    if (files.length > 1) {
      log(`  + ${files.length - 1} more app(s)`, 'blue');
    }
  }
}

async function validatePorts() {
  section('8. Port Availability');

  const requiredPorts = [
    { port: 5500, service: 'API Server' },
    { port: 8000, service: 'Centrifugo (WebSocket)' },
    { port: 5432, service: 'PostgreSQL' },
  ];

  for (const { port, service } of requiredPorts) {
    const inUse = execCommand(`lsof -ti:${port} 2>/dev/null || netstat -an 2>/dev/null | grep ${port}`);

    if (inUse) {
      success(`Port ${port} (${service}): In use ✓`);
    } else {
      warn(`Port ${port} (${service}): Not in use`);
      log(`  Expected if ${service} is running`, 'yellow');
    }
  }
}

async function validateDependencies() {
  section('9. Project Dependencies');

  const packageJsonPath = join(__dirname, '..', 'examples', 'react-chat-huly', 'package.json');

  if (existsSync(packageJsonPath)) {
    const nodeModulesPath = join(__dirname, '..', 'examples', 'react-chat-huly', 'node_modules');

    if (existsSync(nodeModulesPath)) {
      success('Frontend dependencies installed');
    } else {
      warn('Frontend dependencies not installed');
      log('  Run: cd examples/react-chat-huly && npm install', 'yellow');
    }
  }
}

async function printSummary() {
  console.log('');
  log('='.repeat(60), 'cyan');
  log('VALIDATION SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  console.log('');

  if (errors === 0 && warnings === 0) {
    log('🎉 Perfect! Your ChatSDK deployment is ready!', 'green');
  } else {
    if (errors > 0) {
      log(`❌ Errors: ${errors}`, 'red');
    }
    if (warnings > 0) {
      log(`⚠️  Warnings: ${warnings}`, 'yellow');
    }
    if (fixed > 0) {
      log(`🔧 Fixed: ${fixed}`, 'green');
    }
  }

  console.log('');

  if (errors > 0 || warnings > 0) {
    log('📋 Recommended Actions:', 'cyan');
    console.log('');

    if (errors > 0) {
      log('1. Fix critical errors (marked with ❌)', 'yellow');
      log('   Run: node scripts/bootstrap.mjs', 'yellow');
      console.log('');
    }

    if (warnings > 0) {
      log('2. Review warnings (marked with ⚠️)', 'yellow');
      log('   Most warnings are non-blocking but should be addressed', 'yellow');
      console.log('');
    }

    log('3. Re-run validation after fixes:', 'yellow');
    log('   node scripts/validate.mjs', 'yellow');
    console.log('');
  }

  if (errors === 0 && warnings === 0) {
    log('🚀 Next Steps:', 'cyan');
    console.log('');
    log('1. Start services: cd docker && docker-compose up -d', 'blue');
    log('2. Test auth: node scripts/test-auth.mjs', 'blue');
    log('3. Build frontend: cd examples/react-chat-huly && npm run build', 'blue');
    console.log('');
  }

  log('='.repeat(60), 'cyan');
  console.log('');

  process.exit(errors > 0 ? 1 : 0);
}

async function main() {
  console.clear();
  log('🔍 ChatSDK Pre-flight Validation\n', 'cyan');

  if (FIX_MODE) {
    log('🔧 Fix mode enabled - will attempt to auto-fix issues\n', 'yellow');
  }

  await validateNodeVersion();
  await validateEnvironmentFile();
  await validateSecrets();
  await validateDatabase();
  await validateS3Storage();
  await validateDocker();
  await validateCredentials();
  await validatePorts();
  await validateDependencies();
  await printSummary();
}

main().catch(error => {
  console.error('\n❌ Validation failed:', error);
  process.exit(1);
});
