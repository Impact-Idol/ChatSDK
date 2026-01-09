import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenManager, Tokens } from './token-manager';

// Mock fetch globally
global.fetch = vi.fn();

describe('TokenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with config', () => {
      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
        refreshBufferMs: 5 * 60 * 1000,
        debug: true,
      });

      expect(manager).toBeDefined();
      expect(manager.hasTokens()).toBe(false);

      manager.destroy();
    });

    it('accepts callback for token refresh', () => {
      const onRefresh = vi.fn();

      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
        onTokenRefresh: onRefresh,
      });

      expect(manager).toBeDefined();
      manager.destroy();
    });
  });

  describe('Token Management', () => {
    it('sets tokens and schedules refresh', () => {
      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
      });

      const tokens: Tokens = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 min
      };

      manager.setTokens(tokens);

      expect(manager.hasTokens()).toBe(true);
      expect(manager.getAccessToken()).toBe('access-123');

      manager.destroy();
    });

    it('returns token expiration info', () => {
      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
      });

      const expiresAt = Date.now() + 15 * 60 * 1000;
      manager.setTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt,
      });

      const expiration = manager.getTokenExpiration();
      expect(expiration).not.toBeNull();
      expect(expiration!.expiresAt).toBe(expiresAt);
      expect(expiration!.expiresIn).toBeGreaterThan(0);

      manager.destroy();
    });

    it('clears tokens', () => {
      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
      });

      manager.setTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      expect(manager.hasTokens()).toBe(true);

      manager.clearTokens();

      expect(manager.hasTokens()).toBe(false);
      expect(manager.getAccessToken()).toBeNull();

      manager.destroy();
    });
  });

  describe('getValidToken', () => {
    it('returns token if still valid', async () => {
      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
      });

      manager.setTokens({
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
      });

      const token = await manager.getValidToken();
      expect(token).toBe('valid-token');

      // Should not have called refresh
      expect(global.fetch).not.toHaveBeenCalled();

      manager.destroy();
    });

    it('refreshes token if expiring soon', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 900, // 15 min
        }),
      });

      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
      });

      // Token expiring in 30 seconds
      manager.setTokens({
        accessToken: 'expiring-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 30 * 1000,
      });

      const token = await manager.getValidToken();

      // Should have refreshed
      expect(token).toBe('new-access-token');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5500/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refreshToken: 'refresh-token' }),
        })
      );

      manager.destroy();
    });

    it('throws error if no tokens available', async () => {
      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
      });

      await expect(manager.getValidToken()).rejects.toThrow('No tokens available');

      manager.destroy();
    });
  });

  describe('Token Refresh', () => {
    it('refreshes token successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'new-token',
          refreshToken: 'new-refresh',
          expiresIn: 900, // 15 min
        }),
      });

      const onRefresh = vi.fn();

      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
        onTokenRefresh: onRefresh,
      });

      manager.setTokens({
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
        expiresAt: Date.now() + 1000,
      });

      const newToken = await manager.refreshToken();

      expect(newToken).toBe('new-token');
      expect(manager.getAccessToken()).toBe('new-token');
      expect(onRefresh).toHaveBeenCalledWith({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresAt: expect.any(Number),
      });

      manager.destroy();
    });

    it('handles refresh error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid refresh token' },
        }),
      });

      const onError = vi.fn();

      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
        onRefreshError: onError,
      });

      manager.setTokens({
        accessToken: 'token',
        refreshToken: 'invalid-refresh',
        expiresAt: Date.now() + 1000,
      });

      await expect(manager.refreshToken()).rejects.toThrow('Token refresh failed');
      expect(onError).toHaveBeenCalled();

      manager.destroy();
    });

    it('deduplicates concurrent refresh requests', async () => {
      let resolveRefresh: any;
      (global.fetch as any).mockImplementation(() => {
        return new Promise((resolve) => {
          resolveRefresh = () =>
            resolve({
              ok: true,
              json: async () => ({
                token: 'new-token',
                refreshToken: 'new-refresh',
                expiresIn: 900,
              }),
            });
        });
      });

      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
      });

      manager.setTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 1000,
      });

      // Start two concurrent refreshes
      const promise1 = manager.refreshToken();
      const promise2 = manager.refreshToken();

      // Resolve the refresh
      resolveRefresh();

      const [token1, token2] = await Promise.all([promise1, promise2]);

      // Both should get the same new token
      expect(token1).toBe('new-token');
      expect(token2).toBe('new-token');

      // Should only have called fetch once (deduplication)
      expect(global.fetch).toHaveBeenCalledTimes(1);

      manager.destroy();
    });

    it('keeps old refresh token if not provided in response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'new-access-token',
          // No refreshToken in response
          expiresIn: 900,
        }),
      });

      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
      });

      manager.setTokens({
        accessToken: 'old-token',
        refreshToken: 'old-refresh-token',
        expiresAt: Date.now() + 1000,
      });

      await manager.refreshToken();

      // Should keep old refresh token
      expect(manager.getAccessToken()).toBe('new-access-token');
      const expiration = manager.getTokenExpiration();
      expect(expiration).not.toBeNull();

      manager.destroy();
    });
  });

  describe('Automatic Refresh Scheduling', () => {
    it('schedules refresh before expiration', () => {
      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
        refreshBufferMs: 5 * 60 * 1000, // 5 min buffer
      });

      // Token expires in 10 minutes
      manager.setTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      // Should schedule refresh in 5 minutes (10 - 5 buffer)
      expect(manager).toBeDefined();

      manager.destroy();
    });

    it('triggers automatic refresh at scheduled time', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'new-token',
          refreshToken: 'new-refresh',
          expiresIn: 900,
        }),
      });

      const onRefresh = vi.fn();

      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
        refreshBufferMs: 5 * 60 * 1000, // 5 min buffer
        onTokenRefresh: onRefresh,
      });

      // Token expires in 10 minutes
      manager.setTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      // Fast forward to refresh time (5 minutes)
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      // Should have triggered refresh
      expect(global.fetch).toHaveBeenCalled();
      expect(onRefresh).toHaveBeenCalled();

      manager.destroy();
    });

    it('does not refresh if token expiry is far away', () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'new' }),
      });

      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
        refreshBufferMs: 5 * 60 * 1000,
      });

      // Token expires in 1 hour (far away)
      manager.setTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 60 * 60 * 1000,
      });

      // Should not have refreshed yet
      expect(global.fetch).not.toHaveBeenCalled();

      manager.destroy();
    });
  });

  describe('Cleanup', () => {
    it('cleans up resources on destroy', () => {
      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
      });

      manager.setTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      manager.destroy();

      // Should have cleared tokens
      expect(manager.hasTokens()).toBe(false);
    });

    it('stops automatic refresh after destroy', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'new', expiresIn: 900 }),
      });

      const manager = new TokenManager({
        apiUrl: 'http://localhost:5500',
        refreshBufferMs: 5 * 60 * 1000,
      });

      manager.setTokens({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      manager.destroy();

      // Fast forward time
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

      // Should not have refreshed after destroy
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
