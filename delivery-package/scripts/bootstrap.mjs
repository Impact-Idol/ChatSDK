#!/usr/bin/env node
/**
 * ChatSDK Bootstrap Tool
 *
 * Generates secure secrets and creates your first application.
 * Run this ONCE during initial deployment setup.
 *
 * Usage:
 *   node scripts/bootstrap.mjs
 *   node scripts/bootstrap.mjs --app-name="My Chat App"
 */

import { randomBytes } from 'crypto';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Secret Generation
// ============================================================================

function generateSecret(length = 32) {
  return randomBytes(length).toString('hex');
}

function generateApiKey() {
  return randomBytes(32).toString('hex');
}

function generateJWT() {
  return randomBytes(64).toString('hex');
}

// ============================================================================
// Configuration
// ============================================================================

const secrets = {
  // Admin API key for managing apps
  ADMIN_API_KEY: generateSecret(32),

  // JWT secret for signing user tokens (256-bit)
  JWT_SECRET: generateJWT(),

  // Centrifugo secret for WebSocket authentication
  CENTRIFUGO_TOKEN_SECRET: generateSecret(32),

  // API key for your first application
  APP_API_KEY: generateApiKey(),

  // Secret key for your first application
  APP_SECRET_KEY: generateSecret(32),
};

// ============================================================================
// Main Bootstrap Process
// ============================================================================

async function bootstrap() {
  console.log('🚀 ChatSDK Bootstrap Tool\n');
  console.log('This will generate secure secrets and create your first app.\n');

  // Parse app name from args
  const appNameArg = process.argv.find(arg => arg.startsWith('--app-name='));
  const appName = appNameArg ? appNameArg.split('=')[1].replace(/["']/g, '') : 'My Chat Application';

  // Step 1: Generate secrets
  console.log('📝 Step 1: Generating Secure Secrets');
  console.log('─'.repeat(60));
  console.log(`✓ ADMIN_API_KEY: ${secrets.ADMIN_API_KEY.substring(0, 20)}...`);
  console.log(`✓ JWT_SECRET: ${secrets.JWT_SECRET.substring(0, 20)}... (128 chars)`);
  console.log(`✓ CENTRIFUGO_TOKEN_SECRET: ${secrets.CENTRIFUGO_TOKEN_SECRET.substring(0, 20)}...`);
  console.log(`✓ APP_API_KEY: ${secrets.APP_API_KEY.substring(0, 20)}...`);
  console.log(`✓ APP_SECRET_KEY: ${secrets.APP_SECRET_KEY.substring(0, 20)}...`);
  console.log('');

  // Step 2: Update .env file
  console.log('📝 Step 2: Updating Environment Configuration');
  console.log('─'.repeat(60));

  const envPath = join(__dirname, '..', '.env.production');
  const envExamplePath = join(__dirname, '..', '.env.production.example');

  let envContent = '';

  if (existsSync(envPath)) {
    console.log('⚠️  .env.production already exists');
    const backupPath = `${envPath}.backup.${Date.now()}`;
    await writeFile(backupPath, await readFile(envPath, 'utf-8'));
    console.log(`✓ Backup created: ${backupPath}`);
    envContent = await readFile(envPath, 'utf-8');
  } else if (existsSync(envExamplePath)) {
    console.log('✓ Using .env.production.example as template');
    envContent = await readFile(envExamplePath, 'utf-8');
  } else {
    console.log('✓ Creating new .env.production');
    envContent = generateDefaultEnv();
  }

  // Replace placeholders with generated secrets
  envContent = envContent
    .replace(/ADMIN_API_KEY=.*/g, `ADMIN_API_KEY=${secrets.ADMIN_API_KEY}`)
    .replace(/JWT_SECRET=.*/g, `JWT_SECRET=${secrets.JWT_SECRET}`)
    .replace(/CENTRIFUGO_TOKEN_SECRET=.*/g, `CENTRIFUGO_TOKEN_SECRET=${secrets.CENTRIFUGO_TOKEN_SECRET}`)
    .replace(/CENTRIFUGO_API_KEY=.*/g, `CENTRIFUGO_API_KEY=${secrets.CENTRIFUGO_TOKEN_SECRET}`);

  await writeFile(envPath, envContent);
  console.log('✓ Updated .env.production');
  console.log('');

  // Step 3: Save app credentials
  console.log('📝 Step 3: Saving Application Credentials');
  console.log('─'.repeat(60));

  const credentialsDir = join(__dirname, '..', 'credentials');
  if (!existsSync(credentialsDir)) {
    await mkdir(credentialsDir, { recursive: true });
  }

  const appId = `app-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const credentials = {
    app: {
      id: appId,
      name: appName,
      apiKey: secrets.APP_API_KEY,
      secretKey: secrets.APP_SECRET_KEY,
      createdAt: new Date().toISOString(),
    },
    usage: {
      createToken: {
        endpoint: 'POST /tokens',
        headers: {
          'X-API-Key': secrets.APP_API_KEY,
          'Content-Type': 'application/json',
        },
        body: {
          userId: 'user-123',
          name: 'John Doe',
          image: 'https://example.com/avatar.jpg',
        },
      },
      adminEndpoint: {
        endpoint: 'POST /admin/apps',
        headers: {
          'Authorization': `Bearer ${secrets.ADMIN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        note: 'Use this to create additional apps',
      },
    },
  };

  const credentialsPath = join(credentialsDir, `${appId}.json`);
  await writeFile(credentialsPath, JSON.stringify(credentials, null, 2));
  console.log(`✓ Saved to: ${credentialsPath}`);
  console.log('');

  // Step 3.5: Update Centrifugo Configuration
  console.log('📝 Step 3.5: Updating Centrifugo Configuration');
  console.log('─'.repeat(60));

  const centrifugoConfigPath = join(__dirname, '..', 'docker', 'centrifugo.json');

  if (existsSync(centrifugoConfigPath)) {
    try {
      const centrifugoConfig = JSON.parse(await readFile(centrifugoConfigPath, 'utf-8'));

      // Update secrets to match .env
      centrifugoConfig.token_hmac_secret_key = secrets.CENTRIFUGO_TOKEN_SECRET;
      centrifugoConfig.api_key = secrets.CENTRIFUGO_TOKEN_SECRET;

      // Add common development ports if not present
      const devPorts = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:4500',
        'http://localhost:5173',
        'http://localhost:5175',
        'http://localhost:5500',
        'http://localhost:5502',
        'http://localhost:6001',
        'http://localhost:6007'
      ];

      if (!centrifugoConfig.allowed_origins || !Array.isArray(centrifugoConfig.allowed_origins)) {
        centrifugoConfig.allowed_origins = devPorts;
      } else {
        // Add missing ports
        devPorts.forEach(port => {
          if (!centrifugoConfig.allowed_origins.includes(port)) {
            centrifugoConfig.allowed_origins.push(port);
          }
        });
      }

      await writeFile(centrifugoConfigPath, JSON.stringify(centrifugoConfig, null, 2));
      console.log('✓ Updated docker/centrifugo.json');
      console.log(`  - token_hmac_secret_key: ${secrets.CENTRIFUGO_TOKEN_SECRET.substring(0, 20)}...`);
      console.log(`  - api_key: ${secrets.CENTRIFUGO_TOKEN_SECRET.substring(0, 20)}...`);
      console.log(`  - allowed_origins: ${centrifugoConfig.allowed_origins.length} origins`);
    } catch (error) {
      console.log(`⚠️  Could not update Centrifugo config: ${error.message}`);
      console.log('   You may need to update docker/centrifugo.json manually');
    }
  } else {
    console.log('⚠️  Centrifugo config not found at docker/centrifugo.json');
    console.log('   You may need to update it manually with:');
    console.log(`   "token_hmac_secret_key": "${secrets.CENTRIFUGO_TOKEN_SECRET}"`);
  }
  console.log('');

  // Step 4: Generate SQL to insert the app
  console.log('📝 Step 4: Database Setup');
  console.log('─'.repeat(60));

  const sqlPath = join(credentialsDir, `bootstrap-${appId}.sql`);
  const sql = `-- Bootstrap SQL for ${appName}
-- Run this against your PostgreSQL database

-- Insert your first application
INSERT INTO app (id, name, api_key, api_secret, settings, created_at, updated_at)
VALUES (
  '${appId}',
  '${appName.replace(/'/g, "''")}',
  '${secrets.APP_API_KEY}',
  '${secrets.APP_SECRET_KEY}',
  '{"ai_enabled": false, "max_file_size": 10485760, "allowed_file_types": ["image", "video", "audio", "file"]}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT id, name, api_key, api_secret, created_at FROM app WHERE id = '${appId}';
`;

  await writeFile(sqlPath, sql);
  console.log(`✓ SQL script: ${sqlPath}`);
  console.log('');

  // Step 5: Instructions
  console.log('✅ Bootstrap Complete!\n');
  console.log('═'.repeat(60));
  console.log('📋 NEXT STEPS:');
  console.log('═'.repeat(60));
  console.log('');
  console.log('1️⃣  Apply database migration:');
  console.log('   docker-compose exec postgres psql -U chatsdk -d chatsdk -f /path/to/bootstrap.sql');
  console.log('   OR');
  console.log(`   psql -U chatsdk -d chatsdk -f "${sqlPath}"`);
  console.log('');
  console.log('2️⃣  Restart your API server to load new environment variables:');
  console.log('   docker-compose restart api');
  console.log('');
  console.log('3️⃣  Test token creation:');
  console.log(`   curl -X POST http://localhost:5500/tokens \\`);
  console.log(`     -H "X-API-Key: ${secrets.APP_API_KEY}" \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"userId": "user-1", "name": "Test User"}'`);
  console.log('');
  console.log('═'.repeat(60));
  console.log('🔐 SECURITY REMINDERS:');
  console.log('═'.repeat(60));
  console.log('');
  console.log('⚠️  NEVER commit .env.production to git');
  console.log('⚠️  Store credentials/ directory in a secure location');
  console.log('⚠️  Use environment variables in production (AWS Secrets Manager, etc.)');
  console.log('⚠️  Rotate secrets periodically for security');
  console.log('');
  console.log('═'.repeat(60));
  console.log('📁 FILES CREATED:');
  console.log('═'.repeat(60));
  console.log(`  • .env.production - Environment configuration`);
  console.log(`  • ${credentialsPath}`);
  console.log(`  • ${sqlPath}`);
  console.log('');
  console.log('🎉 Your ChatSDK is ready to use!');
  console.log('');
}

function generateDefaultEnv() {
  return `# ChatSDK Production Environment
# Generated by bootstrap.mjs on ${new Date().toISOString()}

# ============================================================================
# Server Configuration
# ============================================================================
NODE_ENV=production
PORT=5500
LOG_LEVEL=info

# ============================================================================
# Database Configuration
# ============================================================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatsdk
DB_USER=chatsdk
DB_PASSWORD=change-this-password
DB_SSL=false

# ============================================================================
# Security & Authentication
# ============================================================================
# Admin API key for creating/managing apps
ADMIN_API_KEY=replace-with-generated

# JWT secret for signing user tokens (256-bit minimum)
JWT_SECRET=replace-with-generated

# ============================================================================
# Centrifugo (Real-time WebSocket)
# ============================================================================
CENTRIFUGO_URL=ws://localhost:8000/connection/websocket
CENTRIFUGO_API_URL=http://localhost:8000/api
CENTRIFUGO_API_KEY=replace-with-generated
CENTRIFUGO_TOKEN_SECRET=replace-with-generated

# ============================================================================
# S3 Storage
# ============================================================================
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=chatsdk-uploads
S3_PUBLIC_URL=https://s3.amazonaws.com/chatsdk-uploads

# ============================================================================
# Redis (Optional - for caching)
# ============================================================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false

# ============================================================================
# Features
# ============================================================================
METRICS_ENABLED=true
`;
}

// Run bootstrap
bootstrap().catch(error => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
