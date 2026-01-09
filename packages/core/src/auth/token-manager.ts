/**
 * Token Manager
 *
 * Handles automatic token refresh before expiration to prevent logout loops.
 *
 * Features:
 * - Automatic refresh 5 minutes before expiration
 * - Request deduplication (concurrent refresh requests)
 * - Proactive scheduling (no user interruption)
 * - 401 retry with forced refresh
 *
 * Usage:
 * ```typescript
 * const manager = new TokenManager({
 *   apiUrl: 'http://localhost:5500',
 *   onTokenRefresh: (tokens) => {
 *     console.log('Tokens refreshed!');
 *   },
 * });
 *
 * manager.setTokens({
 *   accessToken: 'xxx',
 *   refreshToken: 'yyy',
 *   expiresAt: Date.now() + 15 * 60 * 1000, // 15 min
 * });
 *
 * // Always get valid token (auto-refreshes if needed)
 * const token = await manager.getValidToken();
 * ```
 */

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export interface TokenManagerConfig {
  apiUrl: string;
  onTokenRefresh?: (tokens: Tokens) => void;
  onRefreshError?: (error: Error) => void;
  refreshBufferMs?: number; // Refresh this many ms before expiration (default 5 minutes)
  debug?: boolean;
}

export class TokenManager {
  private tokens: Tokens | null = null;
  private refreshPromise: Promise<Tokens> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private onTokenRefresh?: (tokens: Tokens) => void;
  private onRefreshError?: (error: Error) => void;
  private apiUrl: string;
  private refreshBufferMs: number;
  private debug: boolean;
  private isDestroyed = false;

  constructor(config: TokenManagerConfig) {
    this.apiUrl = config.apiUrl;
    this.onTokenRefresh = config.onTokenRefresh;
    this.onRefreshError = config.onRefreshError;
    this.refreshBufferMs = config.refreshBufferMs || 5 * 60 * 1000; // Default 5 minutes
    this.debug = config.debug || false;

    this.log('TokenManager initialized', {
      apiUrl: this.apiUrl,
      refreshBufferMs: this.refreshBufferMs,
    });
  }

  private log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[TokenManager] ${message}`, data || '');
    }
  }

  /**
   * Set tokens and schedule automatic refresh
   */
  setTokens(tokens: Tokens): void {
    this.tokens = tokens;
    this.log('Tokens set', {
      expiresAt: new Date(tokens.expiresAt).toISOString(),
      expiresIn: `${Math.floor((tokens.expiresAt - Date.now()) / 1000)}s`,
    });

    this.scheduleRefresh();
  }

  /**
   * Get current access token (may be expired)
   */
  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  /**
   * Get valid access token, refreshing if necessary
   *
   * This is the main method to use when making API requests.
   * It ensures the token is always valid by:
   * 1. Checking expiration (with 60s buffer)
   * 2. Auto-refreshing if expiring soon or expired
   * 3. Deduplicating concurrent refresh requests
   */
  async getValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('No tokens available. User must login first.');
    }

    // Token still valid (with 60s buffer to avoid edge cases)
    const now = Date.now();
    const expiresIn = this.tokens.expiresAt - now;

    if (expiresIn > 60000) {
      this.log('Token still valid', { expiresIn: `${Math.floor(expiresIn / 1000)}s` });
      return this.tokens.accessToken;
    }

    // Token expiring soon or expired, refresh it
    this.log('Token expiring soon, refreshing', { expiresIn: `${Math.floor(expiresIn / 1000)}s` });
    return this.refreshToken();
  }

  /**
   * Force refresh token (with deduplication)
   *
   * Public method to allow manual refresh (e.g., on 401 response)
   */
  async refreshToken(): Promise<string> {
    // If refresh already in progress, wait for it (deduplication)
    if (this.refreshPromise) {
      this.log('Refresh already in progress, waiting...');
      const tokens = await this.refreshPromise;
      return tokens.accessToken;
    }

    // Start new refresh
    this.log('Starting token refresh');
    this.refreshPromise = this.performRefresh();

    try {
      const tokens = await this.refreshPromise;
      this.log('Token refresh successful');
      return tokens.accessToken;
    } catch (error) {
      this.log('Token refresh failed', { error: (error as Error).message });
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform actual refresh API call
   */
  private async performRefresh(): Promise<Tokens> {
    if (!this.tokens?.refreshToken) {
      const error = new Error('No refresh token available');
      this.onRefreshError?.(error);
      throw error;
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Token refresh failed: ${errorMessage}`);
      }

      const data = await response.json();

      // Create new tokens object
      const newTokens: Tokens = {
        accessToken: data.token,
        refreshToken: data.refreshToken || this.tokens.refreshToken, // Keep old if not provided
        expiresAt: Date.now() + data.expiresIn * 1000,
      };

      // Update tokens and schedule next refresh
      this.setTokens(newTokens);

      // Notify callback
      this.onTokenRefresh?.(newTokens);

      return newTokens;
    } catch (error) {
      const err = error as Error;
      this.onRefreshError?.(err);
      throw err;
    }
  }

  /**
   * Schedule automatic refresh before expiration
   *
   * Refreshes tokens N minutes before they expire (configurable)
   * This prevents interruptions during user actions
   */
  private scheduleRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (!this.tokens || this.isDestroyed) {
      return;
    }

    // Calculate when to refresh (N minutes before expiration)
    const now = Date.now();
    const refreshAt = this.tokens.expiresAt - this.refreshBufferMs;
    const delay = Math.max(0, refreshAt - now);

    this.log('Scheduled automatic refresh', {
      refreshAt: new Date(refreshAt).toISOString(),
      delay: `${Math.floor(delay / 1000)}s`,
    });

    // Schedule refresh
    this.refreshTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.log('Automatic refresh triggered');
        this.refreshToken().catch((error) => {
          console.error('[TokenManager] Auto-refresh failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Clear tokens (logout)
   */
  clearTokens(): void {
    this.log('Clearing tokens');
    this.tokens = null;
    this.refreshPromise = null;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if tokens are available
   */
  hasTokens(): boolean {
    return this.tokens !== null;
  }

  /**
   * Get token expiration info
   */
  getTokenExpiration(): { expiresAt: number; expiresIn: number } | null {
    if (!this.tokens) {
      return null;
    }

    const expiresIn = this.tokens.expiresAt - Date.now();

    return {
      expiresAt: this.tokens.expiresAt,
      expiresIn: Math.max(0, expiresIn),
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.log('Destroying TokenManager');
    this.isDestroyed = true;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.tokens = null;
    this.refreshPromise = null;
  }
}
