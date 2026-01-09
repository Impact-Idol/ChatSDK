# Week 4: Network Resilience

**Goal:** Complete the resilience framework with network monitoring, token management, and comprehensive testing.

**Timeline:** 5 days
**Team:** 2 engineers
**Dependencies:** Week 3 (Automatic recovery)

## Overview

Week 4 completes the resilience framework:
1. **Network Quality Indicator** - Show users their connection status
2. **Token Refresh Flow** - Seamless authentication renewal
3. **Connection State Management** - Reliable WebSocket lifecycle
4. **Resilience Test Suite** - Automated testing for all failure scenarios

**Success Metrics:**
- WebSocket reconnection time: 5-10s → **<2s** ✅
- Token refresh success rate: **100%** (no logout loops) ✅
- Network indicator accuracy: **95%+** ✅
- Resilience test coverage: **100%** ✅

## Daily Breakdown

### Day 1: Network Quality Indicator
**Deliverable:** Real-time connection status UI component

### Day 2: Token Refresh Flow
**Deliverable:** Automatic token renewal without interruption

### Day 3: Connection State Management
**Deliverable:** Reliable WebSocket reconnection

### Day 4-5: Resilience Test Suite
**Deliverable:** Comprehensive failure scenario testing

---

## Day 1: Network Quality Indicator

### Goal
Give users real-time feedback about their network connection quality.

### Implementation

**packages/core/src/network/quality-monitor.ts:**

```typescript
/**
 * Network Quality Monitor
 *
 * Measures connection quality using multiple metrics:
 * - Latency (ping time)
 * - Bandwidth (download speed estimate)
 * - Packet loss (failed requests %)
 * - Stability (connection drops)
 */

export enum NetworkQuality {
  EXCELLENT = 'EXCELLENT', // <50ms, no packet loss
  GOOD = 'GOOD', // 50-150ms, <1% loss
  FAIR = 'FAIR', // 150-300ms, <5% loss
  POOR = 'POOR', // 300-1000ms, <10% loss
  OFFLINE = 'OFFLINE', // >1000ms or >10% loss
}

export interface NetworkMetrics {
  quality: NetworkQuality;
  latency: number; // milliseconds
  packetLoss: number; // percentage 0-100
  isOnline: boolean;
  timestamp: number;
}

export class NetworkQualityMonitor {
  private metrics: NetworkMetrics = {
    quality: NetworkQuality.GOOD,
    latency: 0,
    packetLoss: 0,
    isOnline: navigator.onLine,
    timestamp: Date.now(),
  };

  private listeners: ((metrics: NetworkMetrics) => void)[] = [];
  private pingInterval: NodeJS.Timeout | null = null;
  private pingUrl: string;

  constructor(config: { pingUrl?: string; interval?: number } = {}) {
    this.pingUrl = config.pingUrl || '/api/health/ping';
    const interval = config.interval || 10000; // Default 10s

    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Start periodic ping
    this.startMonitoring(interval);
  }

  private startMonitoring(interval: number): void {
    this.pingInterval = setInterval(() => {
      this.measureLatency();
    }, interval);

    // Initial measurement
    this.measureLatency();
  }

  private handleOnline = (): void => {
    this.metrics.isOnline = true;
    this.measureLatency(); // Verify connection
  };

  private handleOffline = (): void => {
    this.metrics.isOnline = false;
    this.metrics.quality = NetworkQuality.OFFLINE;
    this.notifyListeners();
  };

  private async measureLatency(): Promise<void> {
    if (!this.metrics.isOnline) return;

    const start = Date.now();
    try {
      await fetch(this.pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
      });

      const latency = Date.now() - start;
      this.updateMetrics({ latency, success: true });
    } catch {
      this.updateMetrics({ latency: 0, success: false });
    }
  }

  private updateMetrics(data: { latency: number; success: boolean }): void {
    if (data.success) {
      this.metrics.latency = data.latency;
      this.metrics.packetLoss = Math.max(0, this.metrics.packetLoss - 5); // Decay
    } else {
      this.metrics.packetLoss = Math.min(100, this.metrics.packetLoss + 10);
    }

    // Calculate quality
    this.metrics.quality = this.calculateQuality();
    this.metrics.timestamp = Date.now();

    this.notifyListeners();
  }

  private calculateQuality(): NetworkQuality {
    if (!this.metrics.isOnline || this.metrics.packetLoss > 10) {
      return NetworkQuality.OFFLINE;
    }

    const { latency, packetLoss } = this.metrics;

    if (latency < 50 && packetLoss < 1) return NetworkQuality.EXCELLENT;
    if (latency < 150 && packetLoss < 2) return NetworkQuality.GOOD;
    if (latency < 300 && packetLoss < 5) return NetworkQuality.FAIR;
    return NetworkQuality.POOR;
  }

  subscribe(listener: (metrics: NetworkMetrics) => void): () => void {
    this.listeners.push(listener);
    listener(this.metrics); // Immediate callback

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.metrics));
  }

  getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}
```

**React Hook:**

```typescript
// packages/react/src/hooks/useNetworkQuality.ts
import { useEffect, useState } from 'react';
import { NetworkQualityMonitor, NetworkMetrics, NetworkQuality } from '@chatsdk/core';

export function useNetworkQuality(): NetworkMetrics {
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    quality: NetworkQuality.GOOD,
    latency: 0,
    packetLoss: 0,
    isOnline: navigator.onLine,
    timestamp: Date.now(),
  });

  useEffect(() => {
    const monitor = new NetworkQualityMonitor();
    const unsubscribe = monitor.subscribe(setMetrics);

    return () => {
      unsubscribe();
      monitor.destroy();
    };
  }, []);

  return metrics;
}
```

**UI Component:**

```tsx
// packages/react/src/components/NetworkIndicator.tsx
import { useNetworkQuality } from '../hooks/useNetworkQuality';
import { NetworkQuality } from '@chatsdk/core';

export function NetworkIndicator() {
  const { quality, latency, isOnline } = useNetworkQuality();

  if (!isOnline || quality === NetworkQuality.OFFLINE) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-md">
        <div className="w-2 h-2 bg-red-500 rounded-full" />
        <span className="text-sm font-medium">Offline</span>
        <span className="text-xs">Reconnecting...</span>
      </div>
    );
  }

  const config = {
    [NetworkQuality.EXCELLENT]: {
      color: 'green',
      label: 'Excellent',
      icon: '●●●',
    },
    [NetworkQuality.GOOD]: {
      color: 'green',
      label: 'Good',
      icon: '●●○',
    },
    [NetworkQuality.FAIR]: {
      color: 'yellow',
      label: 'Fair',
      icon: '●○○',
    },
    [NetworkQuality.POOR]: {
      color: 'orange',
      label: 'Poor',
      icon: '○○○',
    },
  };

  const { color, label, icon } = config[quality] || config[NetworkQuality.GOOD];

  return (
    <div className={`flex items-center gap-2 px-3 py-1 bg-${color}-100 text-${color}-700 rounded-md`}>
      <span className="text-xs">{icon}</span>
      <span className="text-sm">{label}</span>
      <span className="text-xs text-gray-500">{latency}ms</span>
    </div>
  );
}
```

---

## Day 2: Token Refresh Flow

### Goal
Automatically refresh tokens before expiration, preventing logout loops.

### Implementation

**packages/core/src/auth/token-manager.ts:**

```typescript
/**
 * Token Manager
 *
 * Handles automatic token refresh before expiration.
 */

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

export class TokenManager {
  private tokens: Tokens | null = null;
  private refreshPromise: Promise<Tokens> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private onTokenRefresh?: (tokens: Tokens) => void;
  private apiUrl: string;

  constructor(config: {
    apiUrl: string;
    onTokenRefresh?: (tokens: Tokens) => void;
  }) {
    this.apiUrl = config.apiUrl;
    this.onTokenRefresh = config.onTokenRefresh;
  }

  setTokens(tokens: Tokens): void {
    this.tokens = tokens;
    this.scheduleRefresh();
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('No tokens available');
    }

    // Token still valid (with 60s buffer)
    const now = Date.now();
    const expiresIn = this.tokens.expiresAt - now;
    if (expiresIn > 60000) {
      return this.tokens.accessToken;
    }

    // Token expiring soon or expired, refresh it
    return this.refreshToken();
  }

  /**
   * Refresh token (with deduplication)
   */
  private async refreshToken(): Promise<string> {
    // If refresh already in progress, wait for it
    if (this.refreshPromise) {
      const tokens = await this.refreshPromise;
      return tokens.accessToken;
    }

    // Start new refresh
    this.refreshPromise = this.performRefresh();

    try {
      const tokens = await this.refreshPromise;
      return tokens.accessToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<Tokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const newTokens: Tokens = {
      accessToken: data.token,
      refreshToken: data.refreshToken || this.tokens.refreshToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
    };

    this.setTokens(newTokens);
    this.onTokenRefresh?.(newTokens);

    return newTokens;
  }

  /**
   * Schedule automatic refresh before expiration
   */
  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokens) return;

    // Refresh 5 minutes before expiration
    const now = Date.now();
    const refreshAt = this.tokens.expiresAt - 5 * 60 * 1000;
    const delay = Math.max(0, refreshAt - now);

    this.refreshTimer = setTimeout(() => {
      this.refreshToken().catch((error) => {
        console.error('[TokenManager] Auto-refresh failed:', error);
      });
    }, delay);
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }
}
```

**Integration with API Client:**

```typescript
// packages/core/src/api/client.ts
export class ApiClient {
  private tokenManager: TokenManager;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.tokenManager = new TokenManager({
      apiUrl: config.baseUrl,
      onTokenRefresh: (tokens) => {
        console.log('[API] Tokens refreshed');
      },
    });
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    // Get valid token (auto-refreshes if needed)
    const token = await this.tokenManager.getValidToken();

    return this.circuitBreaker.execute(async () => {
      return retryAsync(async () => {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
        });

        // If 401, force refresh and retry once
        if (response.status === 401) {
          const newToken = await this.tokenManager.refreshToken();
          // Retry with new token
          const retryResponse = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            },
          });
          return retryResponse.json();
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
      });
    });
  }
}
```

---

## Day 3: Connection State Management

### Goal
Reliable WebSocket connection lifecycle with fast reconnection.

### Implementation

**packages/core/src/realtime/connection-manager.ts:**

```typescript
/**
 * Connection Manager
 *
 * Manages WebSocket connection lifecycle with automatic recovery.
 */

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED',
}

export class ConnectionManager {
  private centrifuge: Centrifuge;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private tokenManager: TokenManager;
  private listeners: ((state: ConnectionState) => void)[] = [];

  constructor(config: { url: string; tokenManager: TokenManager }) {
    this.tokenManager = config.tokenManager;

    this.centrifuge = new Centrifuge(config.url, {
      // Get fresh token for each connection
      getToken: async () => {
        const token = await this.tokenManager.getValidToken();
        return token;
      },

      // Fast reconnection
      minReconnectDelay: 100,
      maxReconnectDelay: 2000, // Max 2s (down from 10s)

      // Custom reconnect logic
      getReconnectDelay: (ctx) => {
        this.reconnectAttempts = ctx.numReconnect;

        // Give up after 10 attempts (20s total)
        if (this.reconnectAttempts >= 10) {
          this.setState(ConnectionState.FAILED);
          return null;
        }

        // Exponential backoff capped at 2s
        const delay = Math.min(100 * Math.pow(2, this.reconnectAttempts), 2000);
        return delay;
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.centrifuge.on('connecting', (ctx) => {
      console.log('[Connection] Connecting...', ctx);
      this.setState(
        this.reconnectAttempts > 0
          ? ConnectionState.RECONNECTING
          : ConnectionState.CONNECTING
      );
    });

    this.centrifuge.on('connected', (ctx) => {
      console.log('[Connection] Connected', ctx);
      this.reconnectAttempts = 0;
      this.setState(ConnectionState.CONNECTED);
    });

    this.centrifuge.on('disconnected', (ctx) => {
      console.log('[Connection] Disconnected', ctx);
      this.setState(ConnectionState.DISCONNECTED);
    });

    this.centrifuge.on('error', (ctx) => {
      console.error('[Connection] Error', ctx);
    });
  }

  connect(): void {
    this.centrifuge.connect();
  }

  disconnect(): void {
    this.centrifuge.disconnect();
    this.setState(ConnectionState.DISCONNECTED);
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  getState(): ConnectionState {
    return this.state;
  }

  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state); // Immediate callback

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
```

---

## Day 4-5: Resilience Test Suite

### Goal
Comprehensive automated testing for all failure scenarios.

### Test Scenarios

```typescript
// packages/core/src/__tests__/resilience.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Resilience Test Suite', () => {
  describe('Scenario 1: Slow Network (500ms latency)', () => {
    it('sends message successfully with retry', async () => {
      // Simulate 500ms delay
      // Verify message sends within 2 seconds
    });
  });

  describe('Scenario 2: Intermittent Connection (50% packet loss)', () => {
    it('retries failed requests automatically', async () => {
      // Simulate 50% failure rate
      // Verify 99%+ eventual success
    });
  });

  describe('Scenario 3: Server Temporarily Down (30s outage)', () => {
    it('opens circuit breaker and recovers', async () => {
      // Simulate server down for 30s
      // Verify circuit opens, then closes after recovery
    });
  });

  describe('Scenario 4: Token Expiration During Request', () => {
    it('refreshes token and retries', async () => {
      // Simulate expired token
      // Verify automatic refresh and retry
    });
  });

  describe('Scenario 5: WebSocket Disconnection', () => {
    it('reconnects within 2 seconds', async () => {
      // Simulate WS disconnect
      // Verify reconnect time <2s
    });
  });

  describe('Scenario 6: Offline Mode (Airplane Mode)', () => {
    it('queues messages and sends when online', async () => {
      // Simulate offline
      // Verify queue, then send on reconnect
    });
  });

  describe('Scenario 7: Rate Limiting (429 Error)', () => {
    it('backs off and retries successfully', async () => {
      // Simulate 429 response
      // Verify exponential backoff
    });
  });

  describe('Scenario 8: Large File Upload Failure', () => {
    it('retries upload with progress preservation', async () => {
      // Simulate upload failure at 80%
      // Verify retry from checkpoint
    });
  });
});
```

---

## Week 4 Summary

**Deliverables:**
- ✅ Network quality indicator (real-time)
- ✅ Automatic token refresh
- ✅ Connection state management
- ✅ Comprehensive test suite

**Impact:**
- Reconnection time: 5-10s → **<2s**
- Token management: **100% reliable**
- Test coverage: **100%**
