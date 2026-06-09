import { describe, expect, it, vi } from 'vitest';
import { validateProductionEnv } from '../src/config/defaults';

const validProductionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:password@db.example.internal:5432/chatsdk',
  REDIS_URL: 'redis://redis.example.internal:6379',
  REDIS_TLS: 'true',
  S3_ENDPOINT: 'https://storage.example.internal',
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY_ID: 'prod-storage-access-key',
  S3_SECRET_ACCESS_KEY: 'prod-storage-secret-key',
  S3_BUCKET: 'prod-bucket',
	  JWT_SECRET: '0123456789abcdefABCDEF!@#$%^&*()0123456789abcdef',
	  JWT_KEY_ID: 'prod-key-2026-06',
	  CENTRIFUGO_TOKEN_SECRET: 'fedcba9876543210FEDCBA)(*&^%$#@!fedcba9876543210',
  CENTRIFUGO_API_URL: 'http://centrifugo:8000/api',
  CENTRIFUGO_API_KEY: '89abcdef01234567ABCDEF!@#$%^&*()89abcdef01234567',
  ALLOWED_ORIGINS: 'https://chat.example.com',
  CENTRIFUGO_ALLOWED_ORIGINS: 'https://chat.example.com',
  BROKER_DATABASE_URL: 'postgresql://chatsdk_broker_system:password@db.example.internal:5432/chatsdk',
};

describe('production config validation', () => {
  it('accepts a complete production environment', () => {
    const result = validateProductionEnv(validProductionEnv);

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('requires database, JWT, and Centrifugo publish API settings', () => {
    const result = validateProductionEnv({ NODE_ENV: 'production' });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'DATABASE_URL is required in production',
        'S3_ENDPOINT is required in production',
        'S3_BUCKET is required in production',
        'S3_REGION is required in production',
        'S3_ACCESS_KEY_ID is required in production',
        'S3_SECRET_ACCESS_KEY is required in production',
	        'JWT_SECRET is required in production',
	        'JWT_KEY_ID is required in production',
	        'CENTRIFUGO_TOKEN_SECRET is required in production',
        'CENTRIFUGO_API_URL is required in production',
        'CENTRIFUGO_API_KEY is required in production',
        'ALLOWED_ORIGINS is required in production',
        'CENTRIFUGO_ALLOWED_ORIGINS is required in production',
        'REDIS_URL or REDIS_HOST is required in production when RATE_LIMIT_ENABLED is true',
      ])
    );
	  });

  it('requires Redis for production rate limiting unless explicitly waived', () => {
    const missingRedis = validateProductionEnv({
      ...validProductionEnv,
      REDIS_URL: undefined,
    } as NodeJS.ProcessEnv);
    const waived = validateProductionEnv({
      ...validProductionEnv,
      REDIS_URL: undefined,
      RATE_LIMIT_REDIS_REQUIRED: 'false',
    } as NodeJS.ProcessEnv);

    expect(missingRedis.valid).toBe(false);
    expect(missingRedis.errors).toContain(
      'REDIS_URL or REDIS_HOST is required in production when RATE_LIMIT_ENABLED is true'
    );
    expect(waived).toEqual({ valid: true, errors: [] });
  });

  it('enables production rate limiting and Redis-required mode when env flags are unset', async () => {
    const previousEnv = process.env;
    vi.resetModules();
    const nextEnv = {
      ...previousEnv,
      ...validProductionEnv,
    } as NodeJS.ProcessEnv;
    delete nextEnv.RATE_LIMIT_ENABLED;
    delete nextEnv.RATE_LIMIT_REDIS_REQUIRED;
    process.env = nextEnv;

    try {
      const module = await import('../src/config/defaults');

      expect(module.config.rateLimit.enabled).toBe(true);
      expect(module.config.rateLimit.redisRequired).toBe(true);
      expect(module.config.rateLimit.trustProxyHeaders).toBe(false);
      expect(module.config.redis.tls).toBe(true);
    } finally {
      process.env = previousEnv;
      vi.resetModules();
    }
  });

  it('rejects development auth flags in production', () => {
	    const result = validateProductionEnv({
	      ...validProductionEnv,
	      ALLOW_DEV_AUTH: 'true',
	    });

	    expect(result.valid).toBe(false);
	    expect(result.errors).toContain('ALLOW_DEV_AUTH must not be enabled in production');
	  });

  it('rejects legacy arbitrary-user token brokers when production server mint is enabled', () => {
    const result = validateProductionEnv({
      ...validProductionEnv,
      CHATSDK_ENABLE_SERVER_MINT: 'true',
      CHATSDK_ENABLE_API_KEY_USER_CONNECT: 'true',
      CHATSDK_ENABLE_LEGACY_TOKENS: 'true',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'CHATSDK_ENABLE_API_KEY_USER_CONNECT must not be enabled with CHATSDK_ENABLE_SERVER_MINT in production',
      'CHATSDK_ENABLE_LEGACY_TOKENS must not be enabled with CHATSDK_ENABLE_SERVER_MINT in production',
    ]));
  });

  it('requires a broker-system database connection when production server mint is enabled', () => {
    const result = validateProductionEnv({
      ...validProductionEnv,
      CHATSDK_ENABLE_SERVER_MINT: 'true',
      BROKER_DATABASE_URL: undefined,
    } as NodeJS.ProcessEnv);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'BROKER_DATABASE_URL is required in production when CHATSDK_ENABLE_SERVER_MINT is true'
    );
  });

  it('requires short service JWT lifetimes for production server mint', () => {
    const result = validateProductionEnv({
      ...validProductionEnv,
      CHATSDK_ENABLE_SERVER_MINT: 'true',
      CHATSDK_SERVER_MINT_JWT_MAX_LIFETIME_SECONDS: '300',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'CHATSDK_SERVER_MINT_JWT_MAX_LIFETIME_SECONDS must be between 1 and 60 in production'
    );
  });

  it('strictly parses server mint service JWT lifetime', () => {
    const result = validateProductionEnv({
      ...validProductionEnv,
      CHATSDK_ENABLE_SERVER_MINT: 'true',
      CHATSDK_SERVER_MINT_JWT_MAX_LIFETIME_SECONDS: '60junk',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'CHATSDK_SERVER_MINT_JWT_MAX_LIFETIME_SECONDS must be between 1 and 60 in production'
    );
  });

  it('rejects disabled database SSL in production unless explicitly waived', () => {
    const result = validateProductionEnv({
      ...validProductionEnv,
      DATABASE_SSL: 'false',
    });
    const waived = validateProductionEnv({
      ...validProductionEnv,
      DATABASE_SSL: 'false',
      ALLOW_INSECURE_DATABASE_TRANSPORT: 'true',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'DATABASE_SSL must not be disabled in production without ALLOW_INSECURE_DATABASE_TRANSPORT=true'
    );
    expect(waived).toEqual({ valid: true, errors: [] });
  });

	  it('rejects public-read object storage in production', () => {
	    const result = validateProductionEnv({
	      ...validProductionEnv,
	      S3_ALLOW_PUBLIC_READ: 'true',
	    });

	    expect(result.valid).toBe(false);
	    expect(result.errors).toContain('S3_ALLOW_PUBLIC_READ must not be enabled in production');
	  });

  it('requires an explicit known NODE_ENV', () => {
    expect(validateProductionEnv({}).errors).toEqual([
      'NODE_ENV must be set to development, test, or production',
    ]);
    expect(validateProductionEnv({ NODE_ENV: 'prod' }).errors).toEqual([
      'NODE_ENV must be one of: development, test, production',
    ]);
  });

  it('rejects placeholders, low-entropy secrets, equal secrets, and wildcard CORS tokens', () => {
    const result = validateProductionEnv({
      ...validProductionEnv,
      JWT_SECRET: 'replace-with-secure-jwt-secret-64-chars-min',
      CENTRIFUGO_TOKEN_SECRET: 'replace-with-secure-jwt-secret-64-chars-min',
      CENTRIFUGO_API_KEY: 'short',
      ALLOWED_ORIGINS: 'https://chat.example.com,*',
      CENTRIFUGO_ALLOWED_ORIGINS: 'https://chat.example.com,*',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'JWT_SECRET must not use a placeholder value',
        'CENTRIFUGO_TOKEN_SECRET must not use a placeholder value',
        'JWT_SECRET and CENTRIFUGO_TOKEN_SECRET must be different',
        'CENTRIFUGO_API_KEY must be at least 32 characters long',
        'CENTRIFUGO_API_KEY must have sufficient entropy',
        'ALLOWED_ORIGINS must not include "*" in production',
        'CENTRIFUGO_ALLOWED_ORIGINS must not include "*" in production',
      ])
    );
  });

  it('rejects long repeated or single-class secrets as low entropy', () => {
    const result = validateProductionEnv({
      ...validProductionEnv,
      JWT_SECRET: 'a'.repeat(64),
      CENTRIFUGO_TOKEN_SECRET: '1234567890'.repeat(7),
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'JWT_SECRET must have sufficient entropy',
      'CENTRIFUGO_TOKEN_SECRET must have sufficient entropy',
    ]));
  });

  it('validates Meilisearch secrets when search is configured', () => {
    const missingKey = validateProductionEnv({
      ...validProductionEnv,
      MEILISEARCH_HOST: 'https://search.example.internal',
    });
    const weakKey = validateProductionEnv({
      ...validProductionEnv,
      MEILISEARCH_HOST: 'https://search.example.internal',
      MEILISEARCH_API_KEY: 'replace-with-meilisearch-key',
    });

    expect(missingKey.valid).toBe(false);
    expect(missingKey.errors).toContain(
      'MEILISEARCH_API_KEY is required when Meilisearch is configured'
    );
    expect(weakKey.valid).toBe(false);
    expect(weakKey.errors).toEqual(expect.arrayContaining([
      'MEILISEARCH_API_KEY must not use a placeholder value',
      'MEILISEARCH_API_KEY must be at least 32 characters long',
    ]));
  });

  it('does not enforce production-only requirements outside production', () => {
    const result = validateProductionEnv({ NODE_ENV: 'test' });

    expect(result).toEqual({ valid: true, errors: [] });
  });
});
