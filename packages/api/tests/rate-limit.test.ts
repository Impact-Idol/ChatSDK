import { beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import {
  applyRateLimit,
  consumeRateLimit,
  rateLimitUser,
  resetRateLimitStateForTests,
  type RateLimitPolicy,
} from '../src/services/rate-limit';
import { config } from '../src/config/defaults';

const oneShotPolicy: RateLimitPolicy = {
  action: 'test.action',
  limit: 1,
  windowSeconds: 60,
  burst: 1,
};

describe('rate-limit service', () => {
  const originalRedisRequired = config.rateLimit.redisRequired;
  const originalTrustProxyHeaders = config.rateLimit.trustProxyHeaders;

  beforeEach(() => {
    resetRateLimitStateForTests();
    config.rateLimit.redisRequired = originalRedisRequired;
    config.rateLimit.trustProxyHeaders = originalTrustProxyHeaders;
  });

  it('allows the burst and then denies with a retry interval', async () => {
    const first = await consumeRateLimit(oneShotPolicy, {
      appId: 'app-a',
      userId: 'user-a',
      channelId: 'channel-a',
      ip: 'ip-a',
    });
    const second = await consumeRateLimit(oneShotPolicy, {
      appId: 'app-a',
      userId: 'user-a',
      channelId: 'channel-a',
      ip: 'ip-a',
    });

    expect(first.allowed).toBe(true);
    expect(first.store).toBe('memory');
    expect(second.allowed).toBe(false);
    expect(second.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('isolates buckets by app, user, and channel', async () => {
    await consumeRateLimit(oneShotPolicy, {
      appId: 'app-a',
      userId: 'user-a',
      channelId: 'channel-a',
      ip: 'ip-a',
    });

    await expect(consumeRateLimit(oneShotPolicy, {
      appId: 'app-a',
      userId: 'user-a',
      channelId: 'channel-a',
      ip: 'ip-a',
    })).resolves.toMatchObject({ allowed: false });

    await expect(consumeRateLimit(oneShotPolicy, {
      appId: 'app-b',
      userId: 'user-a',
      channelId: 'channel-a',
      ip: 'ip-a',
    })).resolves.toMatchObject({ allowed: true });

    await expect(consumeRateLimit(oneShotPolicy, {
      appId: 'app-a',
      userId: 'user-b',
      channelId: 'channel-a',
      ip: 'ip-a',
    })).resolves.toMatchObject({ allowed: true });

    await expect(consumeRateLimit(oneShotPolicy, {
      appId: 'app-a',
      userId: 'user-a',
      channelId: 'channel-b',
      ip: 'ip-a',
    })).resolves.toMatchObject({ allowed: true });
  });

  it('isolates app-wide global budgets by tenant', async () => {
    await consumeRateLimit(oneShotPolicy, { appId: 'app-a', global: true });

    await expect(consumeRateLimit(oneShotPolicy, {
      appId: 'app-a',
      userId: 'another-user',
      global: true,
    })).resolves.toMatchObject({ allowed: false });

    await expect(consumeRateLimit(oneShotPolicy, {
      appId: 'app-b',
      global: true,
    })).resolves.toMatchObject({ allowed: true });
  });

  it('returns 429 with retry headers when middleware denies a route', async () => {
    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('auth', {
        authType: 'user',
        appId: c.req.header('X-App-Id') || 'app-a',
        userId: c.req.header('X-User-Id') || 'user-a',
      });
      await next();
    });
    app.get(
      '/channels/:channelId/write',
      rateLimitUser(oneShotPolicy, (c) => ({ channelId: c.req.param('channelId') })),
      (c) => c.json({ ok: true })
    );

    const first = await app.request('/channels/channel-a/write', {
      headers: { 'X-Forwarded-For': '203.0.113.10' },
    });
    const second = await app.request('/channels/channel-a/write', {
      headers: { 'X-Forwarded-For': '203.0.113.10' },
    });
    const body = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect(second.headers.get('X-RateLimit-Limit')).toBe('1');
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('can be applied before body parsing and is not bypassed by random API keys', async () => {
    const app = new Hono();
    app.post('/connect', async (c) => {
      const limited = await applyRateLimit(c, oneShotPolicy, {
        appId: 'public',
        ip: 'fixed-ip',
      });
      if (limited) return limited;
      const body = await c.req.json();
      return c.json({ ok: true, body });
    });

    expect((await app.request('/connect', {
      method: 'POST',
      headers: { 'X-API-Key': 'secret-one' },
      body: JSON.stringify({ userId: 'user-a' }),
    })).status).toBe(200);
    expect((await app.request('/connect', {
      method: 'POST',
      headers: { 'X-API-Key': 'secret-two' },
      body: JSON.stringify({ userId: 'user-a' }),
    })).status).toBe(429);
  });

  it('ignores spoofed forwarded IP headers unless proxy trust is explicitly enabled', async () => {
    config.rateLimit.trustProxyHeaders = false;
    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('auth', {
        authType: 'user',
        appId: 'app-a',
        userId: 'user-a',
      });
      await next();
    });
    app.get('/limited', rateLimitUser(oneShotPolicy), (c) => c.json({ ok: true }));

    expect((await app.request('/limited', {
      headers: { 'X-Forwarded-For': '203.0.113.1' },
    })).status).toBe(200);
    expect((await app.request('/limited', {
      headers: { 'X-Forwarded-For': '203.0.113.2' },
    })).status).toBe(429);
  });

  it('fails closed when Redis is required but unavailable', async () => {
    config.rateLimit.redisRequired = true;

    const result = await consumeRateLimit(oneShotPolicy, {
      appId: 'app-a',
      userId: 'user-a',
    });

    expect(result).toMatchObject({
      allowed: false,
      store: 'unavailable',
      unavailable: true,
    });
  });
});
