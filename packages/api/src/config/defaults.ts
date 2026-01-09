/**
 * ChatSDK 2.0 - Smart Environment Defaults
 *
 * Automatically configures all services in development mode with zero configuration.
 * In production, only 3 environment variables are required:
 * - DATABASE_URL
 * - JWT_SECRET
 * - CENTRIFUGO_TOKEN_SECRET
 *
 * Everything else auto-configures with sensible defaults.
 */

export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isTest = process.env.NODE_ENV === 'test';
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Development defaults for local Docker setup
 */
export const DEV_DEFAULTS = {
  // Database
  database: {
    url: 'postgresql://chatsdk:chatsdk_dev@localhost:5432/chatsdk',
    ssl: false,
    poolMin: 2,
    poolMax: 10,
  },

  // Centrifugo WebSocket
  centrifugo: {
    url: 'http://localhost:8001',
    apiKey: 'chatsdk-api-key-change-in-production',
    tokenSecret: 'chatsdk-dev-secret-key-change-in-production',
    adminPassword: 'admin',
    adminSecret: 'admin-secret',
  },

  // Redis
  redis: {
    url: 'redis://localhost:6379',
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0,
  },

  // MinIO S3 Storage
  s3: {
    endpoint: 'http://localhost:9000',
    accessKeyId: 'chatsdk',
    secretAccessKey: 'chatsdk_dev_123',
    bucket: 'chatsdk-uploads',
    region: 'us-east-1',
    forcePathStyle: true, // Required for MinIO
  },

  // Meilisearch
  meilisearch: {
    host: 'http://localhost:7700',
    apiKey: 'chatsdk_dev_key',
  },

  // JWT
  jwt: {
    secret: 'chatsdk-dev-jwt-secret-CHANGE-IN-PRODUCTION',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '24h',
  },

  // Server
  server: {
    port: 5500,
    host: '0.0.0.0',
  },

  // CORS
  cors: {
    origins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
    ],
  },
};

/**
 * Get configuration value with smart defaults
 *
 * Priority:
 * 1. Environment variable (if set)
 * 2. Development default (if in dev mode)
 * 3. Throw error (if in production and required)
 *
 * @example
 * const dbUrl = getConfig('DATABASE_URL', DEV_DEFAULTS.database.url);
 */
export function getConfig(
  envKey: string,
  devDefault?: string,
  required: boolean = true
): string {
  const value = process.env[envKey];

  if (value) {
    return value;
  }

  if (isDevelopment && devDefault !== undefined) {
    return devDefault;
  }

  if (required && isProduction) {
    throw new Error(
      `Missing required environment variable: ${envKey}\n\n` +
      `💡 Hint: Set ${envKey} in your .env file or environment.\n` +
      `   This is required in production mode.`
    );
  }

  return devDefault || '';
}

/**
 * Get numeric config value
 */
export function getNumericConfig(
  envKey: string,
  devDefault: number,
  required: boolean = false
): number {
  const value = process.env[envKey];

  if (value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      console.warn(`Warning: ${envKey} is not a valid number, using default: ${devDefault}`);
      return devDefault;
    }
    return parsed;
  }

  if (isDevelopment) {
    return devDefault;
  }

  if (required && isProduction) {
    throw new Error(`Missing required environment variable: ${envKey}`);
  }

  return devDefault;
}

/**
 * Get boolean config value
 */
export function getBooleanConfig(
  envKey: string,
  devDefault: boolean
): boolean {
  const value = process.env[envKey];

  if (value === undefined) {
    return isDevelopment ? devDefault : false;
  }

  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Complete configuration object with smart defaults
 */
export const config = {
  env: process.env.NODE_ENV || 'development',
  isDevelopment,
  isProduction,
  isTest,

  // Server
  server: {
    port: getNumericConfig('PORT', DEV_DEFAULTS.server.port),
    host: getConfig('HOST', DEV_DEFAULTS.server.host, false),
  },

  // Database (REQUIRED in production)
  database: {
    url: getConfig('DATABASE_URL', DEV_DEFAULTS.database.url, true),
    ssl: getBooleanConfig('DATABASE_SSL', DEV_DEFAULTS.database.ssl),
    poolMin: getNumericConfig('DATABASE_POOL_MIN', DEV_DEFAULTS.database.poolMin),
    poolMax: getNumericConfig('DATABASE_POOL_MAX', DEV_DEFAULTS.database.poolMax),
  },

  // Centrifugo (REQUIRED in production)
  centrifugo: {
    url: getConfig('CENTRIFUGO_URL', DEV_DEFAULTS.centrifugo.url, false),
    apiKey: getConfig('CENTRIFUGO_API_KEY', DEV_DEFAULTS.centrifugo.apiKey, false),
    tokenSecret: getConfig(
      'CENTRIFUGO_TOKEN_SECRET',
      DEV_DEFAULTS.centrifugo.tokenSecret,
      true
    ),
  },

  // JWT (REQUIRED in production)
  jwt: {
    secret: getConfig('JWT_SECRET', DEV_DEFAULTS.jwt.secret, true),
    accessTokenExpiry: getConfig('JWT_ACCESS_EXPIRY', DEV_DEFAULTS.jwt.accessTokenExpiry, false),
    refreshTokenExpiry: getConfig('JWT_REFRESH_EXPIRY', DEV_DEFAULTS.jwt.refreshTokenExpiry, false),
  },

  // Redis (optional, but recommended)
  redis: {
    url: getConfig('REDIS_URL', DEV_DEFAULTS.redis.url, false),
    host: getConfig('REDIS_HOST', DEV_DEFAULTS.redis.host, false),
    port: getNumericConfig('REDIS_PORT', DEV_DEFAULTS.redis.port),
    password: process.env.REDIS_PASSWORD,
    db: getNumericConfig('REDIS_DB', DEV_DEFAULTS.redis.db),
  },

  // S3 Storage (optional, defaults to local MinIO)
  s3: {
    endpoint: getConfig('S3_ENDPOINT', DEV_DEFAULTS.s3.endpoint, false),
    accessKeyId: getConfig('S3_ACCESS_KEY_ID', DEV_DEFAULTS.s3.accessKeyId, false),
    secretAccessKey: getConfig('S3_SECRET_ACCESS_KEY', DEV_DEFAULTS.s3.secretAccessKey, false),
    bucket: getConfig('S3_BUCKET', DEV_DEFAULTS.s3.bucket, false),
    region: getConfig('S3_REGION', DEV_DEFAULTS.s3.region, false),
    forcePathStyle: getBooleanConfig('S3_FORCE_PATH_STYLE', DEV_DEFAULTS.s3.forcePathStyle),
  },

  // Meilisearch (optional)
  meilisearch: {
    host: getConfig('MEILISEARCH_HOST', DEV_DEFAULTS.meilisearch.host, false),
    apiKey: getConfig('MEILISEARCH_API_KEY', DEV_DEFAULTS.meilisearch.apiKey, false),
  },

  // CORS
  cors: {
    origins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : isDevelopment
      ? DEV_DEFAULTS.cors.origins
      : [],
    allowAllOrigins: process.env.ALLOWED_ORIGINS === '*',
  },
};

/**
 * Validate production configuration
 *
 * Ensures all required environment variables are set before starting the server.
 */
export function validateProductionConfig(): void {
  if (!isProduction) {
    return; // Skip validation in development
  }

  const errors: string[] = [];

  // Check required production variables
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required in production');
  }

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required in production');
  }

  if (!process.env.CENTRIFUGO_TOKEN_SECRET) {
    errors.push('CENTRIFUGO_TOKEN_SECRET is required in production');
  }

  // Warn about insecure defaults
  const warnings: string[] = [];

  if (config.jwt.secret.includes('dev') || config.jwt.secret.includes('CHANGE')) {
    warnings.push('⚠️  JWT_SECRET looks like a development value. Change it in production!');
  }

  if (config.centrifugo.tokenSecret.includes('dev') || config.centrifugo.tokenSecret.includes('CHANGE')) {
    warnings.push('⚠️  CENTRIFUGO_TOKEN_SECRET looks like a development value. Change it!');
  }

  // Print errors
  if (errors.length > 0) {
    console.error('\n❌ Production Configuration Errors:\n');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\n💡 Hint: Set these environment variables before starting the server.\n');
    process.exit(1);
  }

  // Print warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Production Configuration Warnings:\n');
    warnings.forEach(warning => console.warn(`  ${warning}`));
    console.warn('');
  }
}

/**
 * Print configuration summary (development only)
 */
export function printConfigSummary(): void {
  if (!isDevelopment) {
    return;
  }

  console.log('\n📋 ChatSDK Configuration Summary (Development Mode)\n');
  console.log('Database:     ', config.database.url);
  console.log('Centrifugo:   ', config.centrifugo.url);
  console.log('Redis:        ', config.redis.url);
  console.log('S3 Storage:   ', config.s3.endpoint);
  console.log('Meilisearch:  ', config.meilisearch.host);
  console.log('Server:       ', `http://${config.server.host}:${config.server.port}`);
  console.log('');
  console.log('💡 Using smart defaults for local development');
  console.log('   Set environment variables to override');
  console.log('');
}
