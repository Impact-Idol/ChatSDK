import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  withTenantContext: vi.fn(async (_tenant: any, fn: () => Promise<void>) => fn()),
}));

vi.mock('../src/services/database', () => ({
  db: {
    withTenantContext: mocks.withTenantContext,
  },
}));

import { tenantContextMiddleware } from '../src/middleware/tenant-context';

describe('tenantContextMiddleware', () => {
  it('wraps authenticated requests with app and user tenant context', async () => {
    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('auth', {
        authType: 'user',
        appId: 'app-1',
        userId: 'user-1',
      });
      await next();
    });
    app.use('*', tenantContextMiddleware);
    app.get('/ok', (c) => c.json({ ok: true }));

    const res = await app.request('/ok');

    expect(res.status).toBe(200);
    expect(mocks.withTenantContext).toHaveBeenCalledWith(
      { appId: 'app-1', userId: 'user-1', system: false },
      expect.any(Function)
    );
  });

  it('keeps app-authenticated server requests app-scoped', async () => {
    mocks.withTenantContext.mockClear();

    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('auth', {
        authType: 'app',
        appId: 'app-1',
      });
      await next();
    });
    app.use('*', tenantContextMiddleware);
    app.get('/ok', (c) => c.json({ ok: true }));

    const res = await app.request('/ok');

	    expect(res.status).toBe(200);
	    expect(mocks.withTenantContext).toHaveBeenCalledWith(
	      { appId: 'app-1', userId: undefined, system: false },
	      expect.any(Function)
	    );
	  });

  it('returns 500 when auth is present but appId is missing (fail-closed)', async () => {
    mocks.withTenantContext.mockClear();

    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('auth', {
        authType: 'user',
        appId: '', // empty = falsy
        userId: 'user-1',
      });
      await next();
    });
    app.use('*', tenantContextMiddleware);
    app.get('/ok', (c) => c.json({ ok: true }));

    const res = await app.request('/ok');

    expect(res.status).toBe(500);
    expect(mocks.withTenantContext).not.toHaveBeenCalled();
  });

  it('passes through when auth is not set at all', async () => {
    mocks.withTenantContext.mockClear();

    const app = new Hono();
    // No auth middleware — auth is never set
    app.use('*', tenantContextMiddleware);
    app.get('/ok', (c) => c.json({ ok: true }));

    const res = await app.request('/ok');

    expect(res.status).toBe(200);
    expect(mocks.withTenantContext).not.toHaveBeenCalled();
  });
});
