import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/database', () => ({
  db: {
    query: vi.fn(),
  },
}));

async function importAuthRoutesWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  const previousEnv = new Map(
    Object.keys(env).map((key) => [key, process.env[key]])
  );
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const module = await import('../src/routes/auth');
  for (const [key, value] of previousEnv) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return module.authRoutes;
}

describe('development auth route registration', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('does not register connect-dev in test mode', async () => {
    const authRoutes = await importAuthRoutesWithEnv({
      NODE_ENV: 'test',
      ALLOW_DEV_AUTH: 'true',
      JWT_SECRET: 'test-secret-key-for-testing',
      CENTRIFUGO_TOKEN_SECRET: 'test-centrifugo-secret-key-for-testing',
    });

    const response = await authRoutes.request('/connect-dev', { method: 'POST' });

    expect(response.status).toBe(404);
  });

  it('requires explicit development mode and ALLOW_DEV_AUTH for connect-dev', async () => {
    const authRoutes = await importAuthRoutesWithEnv({
      NODE_ENV: 'development',
      ALLOW_DEV_AUTH: 'true',
      JWT_SECRET: 'test-secret-key-for-testing',
      CENTRIFUGO_TOKEN_SECRET: 'test-centrifugo-secret-key-for-testing',
    });

    const response = await authRoutes.request('/connect-dev', { method: 'POST' });

    expect(response.status).not.toBe(404);
  });
});
