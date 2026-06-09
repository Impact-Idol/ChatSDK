/**
 * ChatSDK 2.0 - Smart Environment Defaults
 *
 * Automatically configures all services in development mode with zero configuration.
 * In production, core service endpoints and secrets are required:
 * - DATABASE_URL
 * - JWT_SECRET
 * - CENTRIFUGO_TOKEN_SECRET
 * - CENTRIFUGO_API_URL
 * - CENTRIFUGO_API_KEY
 * - ALLOWED_ORIGINS
 * - CENTRIFUGO_ALLOWED_ORIGINS
 */

const runtimeEnv = process.env.NODE_ENV;
const VALID_NODE_ENVS = ['development', 'test', 'production'];

export const isDevelopment = runtimeEnv === 'development';
export const isTest = runtimeEnv === 'test';
export const isProduction = runtimeEnv === 'production';
export const usesLocalDefaults = isDevelopment || isTest;

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
    url: 'ws://localhost:8001/connection/websocket',
    apiUrl: 'http://localhost:8001/api',
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
    allowPublicRead: false,
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

  if (usesLocalDefaults && devDefault !== undefined) {
    return devDefault;
  }

  if (required && isProduction) {
    throw new Error(
      `Missing required environment variable: ${envKey}\n\n` +
      `💡 Hint: Set ${envKey} in your .env file or environment.\n` +
      `   This is required in production mode.`
    );
  }

  return '';
}

export function getConfigWithAliases(
  envKeys: string[],
  devDefault?: string,
  required: boolean = true
): string {
  for (const envKey of envKeys) {
    const value = process.env[envKey];
    if (value) {
      return value;
    }
  }

  const primaryKey = envKeys[0];
  if (usesLocalDefaults && devDefault !== undefined) {
    return devDefault;
  }

  if (required && isProduction) {
    throw new Error(
      `Missing required environment variable: ${primaryKey}\n\n` +
      `💡 Hint: Set ${primaryKey} in your .env file or environment.\n` +
      `   This is required in production mode.`
    );
  }

  return '';
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

  if (usesLocalDefaults) {
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
    return devDefault;
  }

  return value === 'true' || value === '1' || value === 'yes';
}

function getDatabaseSslConfig(): boolean {
  if (process.env.DATABASE_SSL === undefined) {
    return isProduction;
  }

  return getBooleanConfig('DATABASE_SSL', DEV_DEFAULTS.database.ssl);
}

/**
 * Complete configuration object with smart defaults
 */
export const config = {
  env: runtimeEnv || '',
  isDevelopment,
  isProduction,
  isTest,
  usesLocalDefaults,

  // Server
  server: {
    port: getNumericConfig('PORT', DEV_DEFAULTS.server.port),
    host: getConfig('HOST', DEV_DEFAULTS.server.host, false),
  },

  // Database (REQUIRED in production)
  database: {
    url: getConfig('DATABASE_URL', DEV_DEFAULTS.database.url, true),
    brokerUrl: getConfig('BROKER_DATABASE_URL', usesLocalDefaults ? DEV_DEFAULTS.database.url : undefined, false),
    ssl: getDatabaseSslConfig(),
    poolMin: getNumericConfig('DATABASE_POOL_MIN', DEV_DEFAULTS.database.poolMin),
    poolMax: getNumericConfig('DATABASE_POOL_MAX', DEV_DEFAULTS.database.poolMax),
  },

  // Centrifugo (REQUIRED in production)
  centrifugo: {
    url: getConfig('CENTRIFUGO_URL', DEV_DEFAULTS.centrifugo.url, false),
    apiUrl: getConfig('CENTRIFUGO_API_URL', DEV_DEFAULTS.centrifugo.apiUrl, true),
    apiKey: getConfig('CENTRIFUGO_API_KEY', DEV_DEFAULTS.centrifugo.apiKey, true),
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
    keyId: getConfig('JWT_KEY_ID', usesLocalDefaults ? 'local-dev-key' : undefined, false),
    issuer: getConfig('JWT_ISSUER', 'chatsdk-api', false),
    audience: getConfig('JWT_AUDIENCE', 'chatsdk-client', false),
  },

  auth: {
    allowApiKeyTokenBroker: getBooleanConfig('CHATSDK_ENABLE_API_KEY_USER_CONNECT', usesLocalDefaults),
    allowLegacyTokenEndpoint: getBooleanConfig('CHATSDK_ENABLE_LEGACY_TOKENS', usesLocalDefaults),
    enableServerMint: getBooleanConfig('CHATSDK_ENABLE_SERVER_MINT', false),
    serverMintAudience: getConfig('CHATSDK_SERVER_MINT_AUDIENCE', 'chatsdk-server-mint', false),
    serverMintJwtMaxLifetimeSeconds: getNumericConfig('CHATSDK_SERVER_MINT_JWT_MAX_LIFETIME_SECONDS', 60),
  },

  // Redis (optional, but recommended)
  redis: {
    url: getConfig('REDIS_URL', DEV_DEFAULTS.redis.url, false),
    host: getConfig('REDIS_HOST', DEV_DEFAULTS.redis.host, false),
    port: getNumericConfig('REDIS_PORT', DEV_DEFAULTS.redis.port),
    password: process.env.REDIS_PASSWORD,
    db: getNumericConfig('REDIS_DB', DEV_DEFAULTS.redis.db),
    tls: getBooleanConfig('REDIS_TLS', false),
  },

  rateLimit: {
    enabled: getBooleanConfig('RATE_LIMIT_ENABLED', true),
    redisRequired: getBooleanConfig('RATE_LIMIT_REDIS_REQUIRED', isProduction),
    trustProxyHeaders: getBooleanConfig('RATE_LIMIT_TRUST_PROXY_HEADERS', false),
  },

  // S3 Storage (optional, defaults to local MinIO)
  s3: {
    endpoint: getConfig('S3_ENDPOINT', DEV_DEFAULTS.s3.endpoint, false),
    accessKeyId: getConfigWithAliases(['S3_ACCESS_KEY_ID', 'S3_ACCESS_KEY'], DEV_DEFAULTS.s3.accessKeyId, false),
    secretAccessKey: getConfigWithAliases(['S3_SECRET_ACCESS_KEY', 'S3_SECRET_KEY'], DEV_DEFAULTS.s3.secretAccessKey, false),
    bucket: getConfig('S3_BUCKET', DEV_DEFAULTS.s3.bucket, false),
    region: getConfig('S3_REGION', DEV_DEFAULTS.s3.region, false),
    forcePathStyle: getBooleanConfig('S3_FORCE_PATH_STYLE', DEV_DEFAULTS.s3.forcePathStyle),
    allowPublicRead: getBooleanConfig('S3_ALLOW_PUBLIC_READ', DEV_DEFAULTS.s3.allowPublicRead),
  },

  // Meilisearch (optional)
  meilisearch: {
    host: getConfigWithAliases(
      ['MEILISEARCH_HOST', 'MEILI_HOST'],
      isDevelopment ? DEV_DEFAULTS.meilisearch.host : undefined,
      false
    ),
    apiKey: getConfigWithAliases(
      ['MEILISEARCH_API_KEY', 'MEILI_MASTER_KEY'],
      isDevelopment ? DEV_DEFAULTS.meilisearch.apiKey : undefined,
      false
    ),
  },

  // Inngest async workflows
  inngest: {
    eventKey: getConfig('INNGEST_EVENT_KEY', undefined, false),
    signingKey: getConfig('INNGEST_SIGNING_KEY', undefined, false),
    required: getBooleanConfig('REQUIRE_INNGEST', isProduction),
  },

  // CORS
  cors: {
    origins: process.env.ALLOWED_ORIGINS
      ? parseAllowedOrigins(process.env.ALLOWED_ORIGINS)
      : usesLocalDefaults
      ? DEV_DEFAULTS.cors.origins
      : [],
    allowAllOrigins: !isProduction && parseAllowedOrigins(process.env.ALLOWED_ORIGINS).includes('*'),
  },
};

export interface ProductionConfigValidationResult {
  valid: boolean;
  errors: string[];
}

const PLACEHOLDER_PATTERNS = [
  'change-this',
  'changeme',
  'change-in-production',
  'replace-with',
  'your-',
  'example.com',
  'placeholder',
  'secret-here',
  'test_',
  'for_testing',
];

const REQUIRED_PRODUCTION_ENV = [
  'DATABASE_URL',
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_REGION',
  'JWT_SECRET',
  'CENTRIFUGO_TOKEN_SECRET',
  'CENTRIFUGO_API_URL',
  'CENTRIFUGO_API_KEY',
  'ALLOWED_ORIGINS',
  'CENTRIFUGO_ALLOWED_ORIGINS',
];

export function parseAllowedOrigins(value: string | undefined): string[] {
  return value
    ? value.split(/[\s,]+/).map(origin => origin.trim()).filter(Boolean)
    : [];
}

export function validateProductionEnv(
  env: NodeJS.ProcessEnv = process.env
): ProductionConfigValidationResult {
  const runtimeResult = validateRuntimeEnv(env);
  if (!runtimeResult.valid) {
    return runtimeResult;
  }

  if (env.NODE_ENV !== 'production') {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  for (const key of REQUIRED_PRODUCTION_ENV) {
    if (!env[key]) {
      errors.push(`${key} is required in production`);
    }
  }

  if (isFalsy(env.DATABASE_SSL) && !isTruthy(env.ALLOW_INSECURE_DATABASE_TRANSPORT)) {
    errors.push('DATABASE_SSL must not be disabled in production without ALLOW_INSECURE_DATABASE_TRANSPORT=true');
  }

		  validateSecret('JWT_SECRET', env.JWT_SECRET, errors);
		  if (!env.JWT_KEY_ID) {
		    errors.push('JWT_KEY_ID is required in production');
		  }
		  validateSecret('CENTRIFUGO_TOKEN_SECRET', env.CENTRIFUGO_TOKEN_SECRET, errors);
		  validateSecret('CENTRIFUGO_API_KEY', env.CENTRIFUGO_API_KEY, errors);

  if (isTruthy(env.ALLOW_DEV_AUTH)) {
    errors.push('ALLOW_DEV_AUTH must not be enabled in production');
  }

  if (isTruthy(env.CHATSDK_ENABLE_SERVER_MINT)) {
    if (!env.BROKER_DATABASE_URL) {
      errors.push('BROKER_DATABASE_URL is required in production when CHATSDK_ENABLE_SERVER_MINT is true');
    }
    const rawLifetime = env.CHATSDK_SERVER_MINT_JWT_MAX_LIFETIME_SECONDS || '60';
    const lifetime = /^\d+$/.test(rawLifetime) ? Number(rawLifetime) : NaN;
    if (!Number.isFinite(lifetime) || lifetime < 1 || lifetime > 60) {
      errors.push('CHATSDK_SERVER_MINT_JWT_MAX_LIFETIME_SECONDS must be between 1 and 60 in production');
    }
    if (isTruthy(env.CHATSDK_ENABLE_API_KEY_USER_CONNECT)) {
      errors.push('CHATSDK_ENABLE_API_KEY_USER_CONNECT must not be enabled with CHATSDK_ENABLE_SERVER_MINT in production');
    }
    if (isTruthy(env.CHATSDK_ENABLE_LEGACY_TOKENS)) {
      errors.push('CHATSDK_ENABLE_LEGACY_TOKENS must not be enabled with CHATSDK_ENABLE_SERVER_MINT in production');
    }
  }

	  const s3AccessKey = env.S3_ACCESS_KEY_ID || env.S3_ACCESS_KEY;
	  const s3SecretKey = env.S3_SECRET_ACCESS_KEY || env.S3_SECRET_KEY;
	  if (!s3AccessKey) {
	    errors.push('S3_ACCESS_KEY_ID is required in production');
	  }
	  if (!s3SecretKey) {
	    errors.push('S3_SECRET_ACCESS_KEY is required in production');
	  }
	  if (isTruthy(env.S3_ALLOW_PUBLIC_READ)) {
	    errors.push('S3_ALLOW_PUBLIC_READ must not be enabled in production');
	  }

	  const meilisearchHost = env.MEILISEARCH_HOST || env.MEILI_HOST;
	  const meilisearchApiKey = env.MEILISEARCH_API_KEY || env.MEILI_MASTER_KEY;
	  if (meilisearchHost || meilisearchApiKey) {
	    if (!meilisearchHost) {
	      errors.push('MEILISEARCH_HOST is required when Meilisearch is configured');
	    }
	    if (!meilisearchApiKey) {
	      errors.push('MEILISEARCH_API_KEY is required when Meilisearch is configured');
	    }
	    validateSecret('MEILISEARCH_API_KEY', meilisearchApiKey, errors);
	  }

  if (isTruthy(env.RATE_LIMIT_ENABLED ?? 'true')) {
    const hasRedisConfig = Boolean(env.REDIS_URL || env.REDIS_HOST);
    if (!hasRedisConfig && !isFalsy(env.RATE_LIMIT_REDIS_REQUIRED)) {
      errors.push('REDIS_URL or REDIS_HOST is required in production when RATE_LIMIT_ENABLED is true');
    }
  }

  if (
    env.JWT_SECRET
    && env.CENTRIFUGO_TOKEN_SECRET
    && env.JWT_SECRET === env.CENTRIFUGO_TOKEN_SECRET
  ) {
    errors.push('JWT_SECRET and CENTRIFUGO_TOKEN_SECRET must be different');
  }

  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  if (allowedOrigins.length === 0) {
    errors.push('ALLOWED_ORIGINS is required in production');
  }
  if (allowedOrigins.includes('*')) {
    errors.push('ALLOWED_ORIGINS must not include "*" in production');
  }

  const centrifugoAllowedOrigins = parseAllowedOrigins(env.CENTRIFUGO_ALLOWED_ORIGINS);
  if (centrifugoAllowedOrigins.length === 0) {
    errors.push('CENTRIFUGO_ALLOWED_ORIGINS is required in production');
  }
  if (centrifugoAllowedOrigins.includes('*')) {
    errors.push('CENTRIFUGO_ALLOWED_ORIGINS must not include "*" in production');
  }

	  return { valid: errors.length === 0, errors };
	}

function isTruthy(value: string | undefined): boolean {
  return value === 'true' || value === '1' || value === 'yes';
}

function isFalsy(value: string | undefined): boolean {
  return value === 'false' || value === '0' || value === 'no';
}

export function validateRuntimeEnv(
  env: NodeJS.ProcessEnv = process.env
): ProductionConfigValidationResult {
  if (!env.NODE_ENV) {
    return { valid: false, errors: ['NODE_ENV must be set to development, test, or production'] };
  }

  if (!VALID_NODE_ENVS.includes(env.NODE_ENV)) {
    return { valid: false, errors: [`NODE_ENV must be one of: ${VALID_NODE_ENVS.join(', ')}`] };
  }

  return { valid: true, errors: [] };
}

function validateSecret(
  key: string,
  value: string | undefined,
  errors: string[]
): void {
  if (!value) {
    return;
  }

  const normalized = value.toLowerCase();
  if (PLACEHOLDER_PATTERNS.some(pattern => normalized.includes(pattern))) {
    errors.push(`${key} must not use a placeholder value`);
  }

  if (value.length < 32) {
    errors.push(`${key} must be at least 32 characters long`);
  }

  const uniqueChars = new Set(value).size;
  const characterClasses = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^a-zA-Z\d]/.test(value),
  ].filter(Boolean).length;

  if (uniqueChars < 12 || characterClasses < 2) {
    errors.push(`${key} must have sufficient entropy`);
  }
}

/**
 * Validate production configuration
 *
 * Ensures all required environment variables are set before starting the server.
 */
export function validateProductionConfig(): void {
  const result = validateProductionEnv(process.env);

  if (!result.valid) {
    throw new Error(
      '\nProduction Configuration Errors:\n'
      + result.errors.map(error => `  - ${error}`).join('\n')
      + '\n\nSet secure production values before starting the server.'
    );
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
  console.log('Database:     ', redactUrl(config.database.url));
  console.log('Centrifugo:   ', config.centrifugo.url);
  console.log('Redis:        ', redactUrl(config.redis.url));
  console.log('S3 Storage:   ', config.s3.endpoint);
  console.log('Meilisearch:  ', config.meilisearch.host);
  console.log('Server:       ', `http://${config.server.host}:${config.server.port}`);
  console.log('');
  console.log('💡 Using smart defaults for local development');
  console.log('   Set environment variables to override');
  console.log('');
}

function redactUrl(value: string): string {
  if (!value) {
    return value;
  }

  try {
    const url = new URL(value);
    if (url.username) {
      url.username = '***';
    }
    if (url.password) {
      url.password = '***';
    }
    url.search = '';
    return url.toString();
  } catch {
    return value.replace(/\/\/([^:@/]+):([^@/]+)@/, '//***:***@');
  }
}
