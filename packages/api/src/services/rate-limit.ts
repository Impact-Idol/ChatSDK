import type { Context, MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { config } from '../config/defaults';
import { logger, logSecurityEvent } from './logger';
import { rateLimitDecisions } from './metrics';

export interface RateLimitPolicy {
  action: string;
  limit: number;
  windowSeconds: number;
  burst?: number;
  cost?: number;
}

export interface RateLimitScope {
  appId: string;
  userId?: string;
  channelId?: string;
  ip?: string;
  key?: string;
  global?: boolean;
}

interface BucketState {
  tokens: number;
  updatedAt: number;
  expiresAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetSeconds: number;
  store: 'redis' | 'memory' | 'disabled' | 'unavailable';
  unavailable?: boolean;
}

export interface RateLimitHealth {
  status: 'ok' | 'error' | 'skipped';
  message?: string;
}

const memoryBuckets = new Map<string, BucketState>();
let redis: Redis | null | undefined;
let redisWarned = false;
const MAX_MEMORY_BUCKETS = 10_000;

const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refill = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

local bucket = redis.call('HMGET', key, 'tokens', 'updatedAt')
local tokens = tonumber(bucket[1])
local updatedAt = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  updatedAt = now
end

local elapsed = math.max(0, now - updatedAt)
tokens = math.min(capacity, tokens + ((elapsed / 1000) * refill))

local allowed = 0
local retryAfter = 0
if tokens >= cost then
  allowed = 1
  tokens = tokens - cost
  redis.call('HMSET', key, 'tokens', tokens, 'updatedAt', now)
  redis.call('PEXPIRE', key, ttl)
else
  retryAfter = math.ceil((cost - tokens) / refill)
end

local remaining = math.floor(tokens)
local reset = math.ceil((capacity - tokens) / refill)
return { allowed, remaining, retryAfter, reset }
`;

export const RATE_LIMIT_POLICIES = {
  tokenConnectIp: { action: 'token.connect.ip', limit: 60, windowSeconds: 60, burst: 60 },
  tokenConnectUser: { action: 'token.connect.user', limit: 30, windowSeconds: 60, burst: 30 },
  tokenRefresh: { action: 'token.refresh', limit: 60, windowSeconds: 60, burst: 60 },
  tokenValidate: { action: 'token.validate', limit: 120, windowSeconds: 60, burst: 60 },
  brokerPreAuth: { action: 'broker.pre_auth', limit: 120, windowSeconds: 60, burst: 60 },
  brokerMembershipSync: { action: 'broker.membership_sync', limit: 120, windowSeconds: 60, burst: 60 },
  brokerTokenMint: { action: 'broker.token_mint', limit: 600, windowSeconds: 60, burst: 300 },
  apiKeyAuth: { action: 'api_key.auth', limit: 600, windowSeconds: 60, burst: 300 },
  realtimeSubscription: { action: 'realtime.subscription_token', limit: 60, windowSeconds: 60, burst: 60 },
  channelRead: { action: 'channel.read', limit: 240, windowSeconds: 60, burst: 120 },
  channelMutation: { action: 'channel.mutate', limit: 60, windowSeconds: 60, burst: 30 },
  messageSend: { action: 'message.send', limit: 30, windowSeconds: 60, burst: 20 },
  messageHistory: { action: 'message.history', limit: 180, windowSeconds: 60, burst: 90 },
  messageMutation: { action: 'message.mutate', limit: 60, windowSeconds: 60, burst: 40 },
  reactionWrite: { action: 'reaction.write', limit: 90, windowSeconds: 60, burst: 45 },
  typing: { action: 'typing', limit: 180, windowSeconds: 60, burst: 60 },
  uploadPresign: { action: 'upload.presign', limit: 30, windowSeconds: 60, burst: 15 },
  uploadDirect: { action: 'upload.direct', limit: 20, windowSeconds: 60, burst: 10 },
  uploadConfirm: { action: 'upload.confirm', limit: 60, windowSeconds: 60, burst: 30 },
  mediaRead: { action: 'media.read', limit: 300, windowSeconds: 60, burst: 120 },
  mediaDownload: { action: 'media.download', limit: 120, windowSeconds: 60, burst: 60 },
  search: { action: 'search', limit: 90, windowSeconds: 60, burst: 45 },
  exportCreate: { action: 'export.create', limit: 10, windowSeconds: 60, burst: 5 },
  appWrites: { action: 'app.write_budget', limit: 1200, windowSeconds: 60, burst: 600 },
} satisfies Record<string, RateLimitPolicy>;

export function rateLimitUser(
  policy: RateLimitPolicy,
  scopeFromContext: (c: Context) => Partial<RateLimitScope> = () => ({})
): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const auth = c.get('auth');
    const response = await applyRateLimit(c, policy, {
      appId: auth.appId,
      userId: auth.userId,
      ip: getClientIp(c),
      ...scopeFromContext(c),
    });
    if (response) {
      return response;
    }
    await next();
  });
}

export function rateLimitPublic(
  policy: RateLimitPolicy,
  scopeFromContext: (c: Context) => Partial<RateLimitScope> = () => ({})
): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const response = await applyRateLimit(c, policy, {
      appId: 'public',
      ip: getClientIp(c),
      ...scopeFromContext(c),
    });
    if (response) {
      return response;
    }
    await next();
  });
}

export async function applyRateLimit(
  c: Context,
  policy: RateLimitPolicy,
  scope: RateLimitScope
): Promise<Response | null> {
  const result = await consumeRateLimit(policy, scope);
  setRateLimitHeaders(c, result);

  if (result.allowed) {
    return null;
  }

  if (result.unavailable) {
    return c.json({
      error: {
        code: 'RATE_LIMIT_UNAVAILABLE',
        message: 'Rate limit service unavailable',
        retryAfter: result.retryAfterSeconds,
      },
    }, 503);
  }

  logSecurityEvent('rate_limit_exceeded', scope.appId || 'unknown', scope.userId || 'unknown', 'medium', {
    action: policy.action,
    channel_id: scope.channelId,
    key_scope: scope.key ? hashKeyPart(scope.key) : undefined,
    retry_after_seconds: result.retryAfterSeconds,
  });

  return c.json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Rate limit exceeded',
      retryAfter: result.retryAfterSeconds,
    },
  }, 429);
}

export async function applyRateLimits(
  c: Context,
  checks: Array<{ policy: RateLimitPolicy; scope: RateLimitScope }>
): Promise<Response | null> {
  for (const check of checks) {
    const response = await applyRateLimit(c, check.policy, check.scope);
    if (response) {
      return response;
    }
  }
  return null;
}

export async function consumeRateLimit(
  policy: RateLimitPolicy,
  scope: RateLimitScope
): Promise<RateLimitResult> {
  if (!config.rateLimit.enabled) {
    return {
      allowed: true,
      limit: policy.limit,
      remaining: policy.burst ?? policy.limit,
      retryAfterSeconds: 0,
      resetSeconds: 0,
      store: 'disabled',
    };
  }

  const key = buildRateLimitKey(policy, scope);
  const now = Date.now();
  const capacity = policy.burst ?? policy.limit;
  const refillPerSecond = policy.limit / policy.windowSeconds;
  const cost = policy.cost ?? 1;
  const ttlMs = Math.max(policy.windowSeconds * 2 * 1000, Math.ceil((capacity / refillPerSecond) * 1000));

  const redisClient = getRedisClient();
  if (!redisClient && config.rateLimit.redisRequired) {
    const result = redisUnavailableResult(policy);
    trackRateLimit(policy, scope, result);
    return result;
  }
  if (redisClient) {
    try {
      if (redisClient.status === 'wait') {
        await redisClient.connect();
      }
      const raw = await redisClient.eval(
        TOKEN_BUCKET_SCRIPT,
        1,
        key,
        String(now),
        String(capacity),
        String(refillPerSecond),
        String(cost),
        String(ttlMs)
      ) as [number, number, number, number];
      const result = toResult(policy, raw[0] === 1, raw[1], raw[2], raw[3], 'redis');
      trackRateLimit(policy, scope, result);
      return result;
    } catch (error) {
      if (config.rateLimit.redisRequired) {
        const result = redisUnavailableResult(policy);
        trackRateLimit(policy, scope, result);
        logger.error({ error }, 'Rate-limit Redis unavailable while Redis is required');
        return result;
      }
      if (!redisWarned) {
        redisWarned = true;
        logger.warn({ error }, 'Rate-limit Redis unavailable; using process-local fallback');
      }
    }
  }

  const result = consumeMemoryBucket(key, policy, now);
  trackRateLimit(policy, scope, result);
  return result;
}

export function getClientIp(c: Context): string {
  const directIp = getDirectRemoteAddress(c);
  if (!config.rateLimit.trustProxyHeaders) {
    return hashKeyPart(directIp || 'direct-unknown');
  }

  const forwarded = c.req.header('CF-Connecting-IP')
    || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || c.req.header('X-Real-IP')
    || directIp
    || 'proxy-unknown';
  return hashKeyPart(forwarded);
}

export function resetRateLimitStateForTests(): void {
  memoryBuckets.clear();
  redisWarned = false;
  redis = undefined;
}

export async function checkRateLimitHealth(): Promise<RateLimitHealth> {
  if (!config.rateLimit.enabled) {
    return { status: 'skipped', message: 'Rate limiting disabled' };
  }

  const redisClient = getRedisClient();
  if (!redisClient) {
    return config.rateLimit.redisRequired
      ? { status: 'error', message: 'Redis is required for rate limiting but is not configured' }
      : { status: 'ok', message: 'Using process-local rate limit fallback' };
  }

  try {
    if (redisClient.status === 'wait') {
      await redisClient.connect();
    }
    await redisClient.ping();
    return { status: 'ok' };
  } catch (error) {
    logger.warn({ error }, 'Rate-limit Redis readiness check failed');
    return config.rateLimit.redisRequired
      ? { status: 'error', message: 'Rate-limit Redis unavailable' }
      : { status: 'ok', message: 'Rate-limit Redis unavailable; using process-local fallback' };
  }
}

function consumeMemoryBucket(key: string, policy: RateLimitPolicy, now: number): RateLimitResult {
  const capacity = policy.burst ?? policy.limit;
  const refillPerSecond = policy.limit / policy.windowSeconds;
  const cost = policy.cost ?? 1;
  const current = memoryBuckets.get(key);
  if (!current && memoryBuckets.size >= MAX_MEMORY_BUCKETS) {
    pruneMemoryBuckets(now);
    if (memoryBuckets.size >= MAX_MEMORY_BUCKETS) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of memoryBuckets.entries()) {
        if (v.updatedAt < oldestTime) {
          oldestTime = v.updatedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        memoryBuckets.delete(oldestKey);
      }
    }
  }
  const tokens = current
    ? Math.min(capacity, current.tokens + ((now - current.updatedAt) / 1000) * refillPerSecond)
    : capacity;

  const allowed = tokens >= cost;
  const nextTokens = allowed ? tokens - cost : tokens;
  const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((cost - tokens) / refillPerSecond));
  const resetSeconds = Math.ceil((capacity - nextTokens) / refillPerSecond);

  memoryBuckets.set(key, {
    tokens: nextTokens,
    updatedAt: now,
    expiresAt: now + Math.max(policy.windowSeconds * 2 * 1000, resetSeconds * 1000),
  });
  pruneMemoryBuckets(now);

  return toResult(policy, allowed, Math.floor(nextTokens), retryAfterSeconds, resetSeconds, 'memory');
}

function getRedisClient(): Redis | null {
  if (config.isTest && process.env.RATE_LIMIT_USE_REDIS_IN_TESTS !== 'true') {
    return null;
  }
  if (!config.redis.url && !config.redis.host) {
    return null;
  }
  if (redis !== undefined) {
    return redis;
  }

  redis = config.redis.url
    ? new Redis(config.redis.url, redisOptions())
    : new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        ...redisOptions(),
      });
  redis.on('error', (error) => {
    if (!redisWarned) {
      redisWarned = true;
      logger.warn({ error }, 'Rate-limit Redis connection error');
    }
  });
  return redis;
}

function redisOptions() {
  return {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 500,
    ...(config.redis.tls ? { tls: {} } : {}),
  };
}

function buildRateLimitKey(policy: RateLimitPolicy, scope: RateLimitScope): string {
  const parts = [
    'ratelimit',
    normalizePart(scope.appId || 'unknown-app'),
    normalizePart(policy.action),
  ];

  if (scope.global) {
    parts.push('global');
  } else {
    if (scope.userId) parts.push('user', hashKeyPart(scope.userId));
    if (scope.channelId) parts.push('channel', hashKeyPart(scope.channelId));
    if (scope.ip) parts.push('ip', normalizePart(scope.ip));
    if (scope.key) parts.push('key', hashKeyPart(scope.key));
  }

  return parts.join(':');
}

function normalizePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160);
}

function getDirectRemoteAddress(c: Context): string | undefined {
  const env = c.env as Record<string, any> | undefined;
  return env?.incoming?.socket?.remoteAddress
    || env?.request?.socket?.remoteAddress
    || env?.remoteAddress;
}

function hashKeyPart(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

function setRateLimitHeaders(c: Context, result: RateLimitResult): void {
  c.header('X-RateLimit-Limit', String(result.limit));
  c.header('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
  c.header('X-RateLimit-Reset', String(result.resetSeconds));
  if (!result.allowed) {
    c.header('Retry-After', String(result.retryAfterSeconds));
  }
}

function toResult(
  policy: RateLimitPolicy,
  allowed: boolean,
  remaining: number,
  retryAfterSeconds: number,
  resetSeconds: number,
  store: RateLimitResult['store']
): RateLimitResult {
  return {
    allowed,
    limit: policy.burst ?? policy.limit,
    remaining,
    retryAfterSeconds,
    resetSeconds,
    store,
  };
}

function trackRateLimit(policy: RateLimitPolicy, scope: RateLimitScope, result: RateLimitResult): void {
  rateLimitDecisions.inc({
    app_id: scope.appId || 'unknown',
    action: policy.action,
    result: result.allowed ? 'allow' : 'deny',
    store: result.store,
  });
}

function redisUnavailableResult(policy: RateLimitPolicy): RateLimitResult {
  return {
    allowed: false,
    limit: policy.burst ?? policy.limit,
    remaining: 0,
    retryAfterSeconds: 5,
    resetSeconds: 5,
    store: 'unavailable',
    unavailable: true,
  };
}

function pruneMemoryBuckets(now: number): void {
  if (memoryBuckets.size < 10_000) {
    return;
  }
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.expiresAt <= now) {
      memoryBuckets.delete(key);
    }
  }
}
