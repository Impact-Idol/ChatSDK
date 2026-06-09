import { describe, expect, it, vi } from 'vitest';
import { app } from '../src/index';

vi.mock('../src/services/database', () => ({
  db: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

vi.mock('../src/services/storage', () => ({
  checkStorageHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
  initStorage: vi.fn(),
}));

vi.mock('../src/services/search', () => ({
  checkSearchHealth: vi.fn().mockResolvedValue({ status: 'skipped', message: 'Meilisearch not configured' }),
  initSearch: vi.fn(),
}));

vi.mock('../src/services/centrifugo', () => ({
  initCentrifugo: vi.fn(),
  getCentrifugo: vi.fn(() => ({ ping: vi.fn().mockResolvedValue(true) })),
}));

vi.mock('../src/services/novu', () => ({
  initNovu: vi.fn(),
}));

describe('request tracing headers', () => {
  it('echoes inbound X-Request-ID on responses', async () => {
    const res = await app.request('/health', {
      headers: {
        'X-Request-ID': 'req-test-123',
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00',
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Request-ID')).toBe('req-test-123');
    expect(res.headers.get('traceparent')).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00');
  });

  it('allows browser request and trace headers in CORS preflight', async () => {
    const res = await app.request('/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Headers': 'X-Request-ID, traceparent',
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-Request-ID');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('traceparent');
  });

  it('includes request IDs in error responses', async () => {
    const res = await app.request('/api/users', {
      headers: { 'X-Request-ID': 'req-error-123' },
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(res.headers.get('X-Request-ID')).toBe('req-error-123');
    expect(body.error.requestId).toBe('req-error-123');
  });
});
