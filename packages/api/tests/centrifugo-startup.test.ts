import { afterEach, describe, expect, it, vi } from 'vitest';

import { initCentrifugo } from '../src/services/centrifugo';

describe('Centrifugo startup behavior', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('initializes the client in production even when Centrifugo ping fails', async () => {
    process.env.NODE_ENV = 'production';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(initCentrifugo()).resolves.toBeDefined();

    expect(warn).toHaveBeenCalledWith(
      'Centrifugo is not responding. Real-time features may not work.'
    );
  });
});
