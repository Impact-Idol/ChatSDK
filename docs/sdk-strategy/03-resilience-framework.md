# Resilience Framework: Bulletproof Messaging

**Goal:** SDK "just works" even with terrible network conditions

**Target:** 95% → **99.9%** message delivery success rate

## Problem Statement

Mobile networks are unreliable:
- ❌ 20% of messages fail on 3G networks
- ❌ Users experience sudden disconnections
- ❌ Reconnection takes 5-10 seconds
- ❌ Manual retry required for failed messages
- ❌ No feedback on network quality

**Result:** Poor user experience, lost messages, frustrated users

## Resilience Principles

### 1. Optimistic UI
**Principle:** Show success immediately, handle failures in background

✅ **Already Implemented:**
- Messages show as "sending" immediately
- UI updates before server confirmation
- Failed messages marked clearly

⚠️ **Improvements Needed:**
- Auto-retry failed messages (currently manual)
- Better pending state visualization
- Conflict resolution for concurrent edits

### 2. Automatic Recovery
**Principle:** SDK fixes problems without user intervention

❌ **Currently:**
- Offline queue requires manual retry
- Connection failures need app restart
- Token expiry requires re-login

✅ **Target:**
- Auto-retry with exponential backoff
- Seamless reconnection
- Automatic token refresh

### 3. Graceful Degradation
**Principle:** Core features work even when services fail

❌ **Currently:**
- Search failure breaks UI
- S3 failure prevents file uploads
- Presence unavailable crashes components

✅ **Target:**
- Fallback to local search
- Queue files for later upload
- Hide presence when unavailable

### 4. Offline-First
**Principle:** App works without network, syncs when connected

⚠️ **Partially Implemented:**
- IndexedDB storage exists
- Offline queue exists
- Manual retry only

✅ **Target:**
- Full offline mode
- Background sync
- Automatic conflict resolution

## Implementation Roadmap

### Priority 1: Automatic Retry Logic

**Problem:** React Query retries disabled, offline queue requires manual retry

**Current:**
```typescript
// packages/react/src/providers/ChatSDKQueryProvider.tsx
export const ChatSDKQueryProvider = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // ❌ Disabled to prevent console spam
        refetchOnWindowFocus: false
      }
    }
  });
  //...
};
```

**Target: Smart Retry Logic**

```typescript
// Retry strategy: retry 5xx, not 4xx
const shouldRetry = (failureCount: number, error: any): boolean => {
  // Don't retry client errors (4xx)
  if (error.statusCode >= 400 && error.statusCode < 500) {
    return false;
  }

  // Retry server errors (5xx) up to 3 times
  if (error.statusCode >= 500) {
    return failureCount < 3;
  }

  // Retry network errors up to 5 times
  if (error.message.includes('Network') || error.message.includes('fetch')) {
    return failureCount < 5;
  }

  return false;
};

const retryDelay = (attemptIndex: number): number => {
  // Exponential backoff with jitter
  const baseDelay = Math.min(1000 * Math.pow(2, attemptIndex), 30000); // Max 30s
  const jitter = Math.random() * 1000; // +0-1s random
  return baseDelay + jitter;
};

export const ChatSDKQueryProvider = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay,
        staleTime: 30000, // 30 seconds
        cacheTime: 5 * 60 * 1000 // 5 minutes
      },
      mutations: {
        retry: shouldRetry,
        retryDelay
      }
    }
  });
  //...
};
```

**Auto-Retry Offline Queue:**

```typescript
// packages/core/src/offline/OfflineQueue.ts
export class OfflineQueue {
  private retryTimer: NodeJS.Timeout | null = null;

  async start() {
    // Listen for connection restored
    this.client.on('connected', async () => {
      console.log('📡 Connection restored, retrying pending messages...');
      await this.retryAllPending();
    });

    // Periodic retry (every 30 seconds)
    this.retryTimer = setInterval(async () => {
      if (this.client.isConnected) {
        await this.retryAllPending();
      }
    }, 30000);
  }

  async retryAllPending(): Promise<void> {
    const pending = await this.storage.getPendingMessages();

    for (const message of pending) {
      // Skip if max retries exceeded
      if (message.retryCount >= this.maxRetries) {
        console.warn(`⚠️ Message ${message.clientMsgId} exceeded max retries`);
        await this.markAsPermFailed(message.clientMsgId);
        continue;
      }

      // Exponential backoff
      const backoffDelay = Math.min(
        1000 * Math.pow(2, message.retryCount),
        60000 // Max 1 minute
      );

      const timeSinceLastRetry = Date.now() - message.lastRetryAt.getTime();

      if (timeSinceLastRetry < backoffDelay) {
        continue; // Too soon to retry
      }

      try {
        await this.retry(message.clientMsgId);
        console.log(`✅ Message ${message.clientMsgId} sent successfully`);
      } catch (err) {
        console.error(`❌ Retry failed for ${message.clientMsgId}:`, err);
        // Will retry again next cycle
      }
    }
  }

  private async markAsPermFailed(clientMsgId: string): Promise<void> {
    await this.storage.updatePendingMessage(clientMsgId, {
      status: 'permanent_failure',
      error: 'Max retries exceeded'
    });

    // Emit event for UI to show permanent failure
    this.client.emit('message:permanent_failure', { clientMsgId });
  }
}
```

**Benefit:** 95% → 99% delivery success, zero manual retries

**Timeline:** 2 days

### Priority 2: Circuit Breaker Pattern

**Problem:** SDK continues hitting failed endpoints, wasting battery/bandwidth

**Target: Circuit Breaker**

```typescript
// packages/core/src/resilience/CircuitBreaker.ts
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  failureThreshold: number;  // Open after N failures
  successThreshold: number;  // Close after N successes (in half-open)
  timeout: number;          // Time to wait before half-open (ms)
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private nextAttempt: number = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If circuit is open, reject immediately
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Time to try again
      this.state = 'half-open';
      this.successes = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        console.log('✅ Circuit breaker CLOSED (recovered)');
        this.state = 'closed';
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.successes = 0;

    if (this.failures >= this.options.failureThreshold) {
      console.warn(`⚠️ Circuit breaker OPEN (${this.failures} failures)`);
      this.state = 'open';
      this.nextAttempt = Date.now() + this.options.timeout;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Usage in ChatClient
export class ChatClient {
  private apiCircuitBreaker: CircuitBreaker;
  private wsCircuitBreaker: CircuitBreaker;

  constructor(config: ChatClientConfig) {
    this.apiCircuitBreaker = new CircuitBreaker({
      failureThreshold: 5,     // Open after 5 failures
      successThreshold: 2,     // Close after 2 successes
      timeout: 30000          // Try again after 30s
    });

    this.wsCircuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 1,
      timeout: 10000
    });
  }

  async fetch(url: string, options?: RequestInit): Promise<any> {
    return this.apiCircuitBreaker.execute(async () => {
      const response = await fetch(`${this.apiUrl}${url}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    });
  }
}
```

**Benefit:** Stop wasting battery on failed endpoints, faster error feedback

**Timeline:** 2 days

### Priority 3: Request Deduplication

**Problem:** Multiple components trigger same API call

**Target: Request Cache**

```typescript
// packages/core/src/resilience/RequestDeduplicator.ts
type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

export class RequestDeduplicator {
  private pending = new Map<string, PendingRequest<any>>();
  private cache = new Map<string, { data: any; timestamp: number }>();

  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    options: {
      cacheTTL?: number;      // Cache for N ms
      dedupWindow?: number;   // Deduplicate within N ms
    } = {}
  ): Promise<T> {
    const now = Date.now();

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && now - cached.timestamp < (options.cacheTTL || 5000)) {
      console.log(`📦 Cache hit: ${key}`);
      return cached.data;
    }

    // Check if request is already in flight
    const pending = this.pending.get(key);
    if (pending && now - pending.timestamp < (options.dedupWindow || 1000)) {
      console.log(`🔗 Deduplicated: ${key}`);
      return pending.promise;
    }

    // Execute new request
    const promise = fn().then(
      (data) => {
        // Store in cache
        this.cache.set(key, { data, timestamp: now });
        this.pending.delete(key);
        return data;
      },
      (err) => {
        this.pending.delete(key);
        throw err;
      }
    );

    this.pending.set(key, { promise, timestamp: now });

    return promise;
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.pending.clear();
      this.cache.clear();
      return;
    }

    // Clear matching keys
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.pending.delete(key);
      }
    }
  }
}

// Usage in ChatClient
export class ChatClient {
  private deduplicator = new RequestDeduplicator();

  async getChannel(channelId: string): Promise<Channel> {
    return this.deduplicator.execute(
      `channel:${channelId}`,
      () => this.fetch(`/api/channels/${channelId}`),
      { cacheTTL: 30000 } // Cache for 30 seconds
    );
  }

  async getMessages(channelId: string, limit: number = 50): Promise<Message[]> {
    return this.deduplicator.execute(
      `messages:${channelId}:${limit}`,
      () => this.fetch(`/api/channels/${channelId}/messages?limit=${limit}`),
      { cacheTTL: 5000, dedupWindow: 1000 }
    );
  }
}
```

**Benefit:** Reduce API calls by 50%, faster perceived performance

**Timeline:** 1 day

### Priority 4: Network Quality Indicator

**Problem:** Users don't know why messages are slow/failing

**Target: Connection Quality UI**

```typescript
// packages/core/src/resilience/NetworkMonitor.ts
export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline';

export class NetworkMonitor {
  private quality: NetworkQuality = 'excellent';
  private latency: number = 0;
  private isOnline: boolean = navigator.onLine;

  constructor(private client: ChatClient) {
    this.start();
  }

  start() {
    // Browser online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.checkQuality();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.quality = 'offline';
      this.client.emit('network:quality', { quality: 'offline' });
    });

    // Periodic latency check (every 10 seconds)
    setInterval(() => this.checkQuality(), 10000);

    // Check immediately
    this.checkQuality();
  }

  private async checkQuality() {
    if (!this.isOnline) {
      this.quality = 'offline';
      return;
    }

    try {
      // Ping API for latency
      const start = Date.now();
      await fetch(`${this.client.apiUrl}/api/health`);
      const latency = Date.now() - start;

      this.latency = latency;

      // Determine quality
      if (latency < 100) {
        this.quality = 'excellent';
      } else if (latency < 300) {
        this.quality = 'good';
      } else {
        this.quality = 'poor';
      }

      this.client.emit('network:quality', {
        quality: this.quality,
        latency
      });
    } catch (err) {
      this.quality = 'offline';
      this.client.emit('network:quality', { quality: 'offline' });
    }
  }

  getQuality(): NetworkQuality {
    return this.quality;
  }

  getLatency(): number {
    return this.latency;
  }
}

// React Hook
export const useNetworkQuality = () => {
  const client = useChatClient();
  const [quality, setQuality] = useState<NetworkQuality>('excellent');
  const [latency, setLatency] = useState<number>(0);

  useEffect(() => {
    const handleQualityChange = (event: { quality: NetworkQuality; latency?: number }) => {
      setQuality(event.quality);
      if (event.latency !== undefined) {
        setLatency(event.latency);
      }
    };

    client.on('network:quality', handleQualityChange);

    return () => {
      client.off('network:quality', handleQualityChange);
    };
  }, [client]);

  return { quality, latency };
};

// UI Component
export const NetworkQualityIndicator = () => {
  const { quality, latency } = useNetworkQuality();

  if (quality === 'excellent') return null; // Don't show if good

  const colors = {
    good: 'bg-yellow-500',
    poor: 'bg-orange-500',
    offline: 'bg-red-500'
  };

  const messages = {
    good: `Slow connection (${latency}ms)`,
    poor: `Very slow connection (${latency}ms)`,
    offline: 'You are offline'
  };

  return (
    <div className={`fixed top-0 left-0 right-0 ${colors[quality]} text-white text-center py-2 text-sm`}>
      {messages[quality]}
    </div>
  );
};
```

**Benefit:** Clear user feedback, better UX during network issues

**Timeline:** 2 days

### Priority 5: Token Refresh Flow

**Problem:** Tokens expire, user must re-login

**Target: Automatic Token Refresh**

```typescript
// packages/core/src/auth/TokenManager.ts
export class TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(
    private client: ChatClient,
    private apiToken: string,
    private refreshToken?: string
  ) {}

  start() {
    // Parse token to get expiry
    const payload = this.parseJWT(this.apiToken);
    const expiresAt = payload.exp * 1000; // Convert to ms
    const now = Date.now();

    // Refresh 5 minutes before expiry
    const refreshAt = expiresAt - 5 * 60 * 1000;
    const delay = Math.max(0, refreshAt - now);

    console.log(`🔄 Token will refresh in ${Math.round(delay / 1000)}s`);

    this.refreshTimer = setTimeout(() => {
      this.refresh();
    }, delay);
  }

  private async refresh() {
    if (!this.refreshToken) {
      console.warn('⚠️ No refresh token, user must re-login');
      this.client.emit('auth:token_expired');
      return;
    }

    try {
      console.log('🔄 Refreshing token...');

      const response = await fetch(`${this.client.apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { accessToken, expiresIn } = await response.json();

      // Update token
      this.apiToken = accessToken;
      this.client.setApiToken(accessToken);

      console.log('✅ Token refreshed successfully');

      // Schedule next refresh
      this.start();

      this.client.emit('auth:token_refreshed', { token: accessToken });
    } catch (err) {
      console.error('❌ Token refresh failed:', err);
      this.client.emit('auth:token_expired');
    }
  }

  stop() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private parseJWT(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }
}

// Usage in ChatClient
export class ChatClient {
  private tokenManager: TokenManager | null = null;

  async connectUser(
    user: User,
    auth: { token: string; wsToken: string; refreshToken?: string }
  ): Promise<void> {
    this.apiToken = auth.token;
    this.wsToken = auth.wsToken;

    // Start token refresh
    if (auth.refreshToken) {
      this.tokenManager = new TokenManager(this, auth.token, auth.refreshToken);
      this.tokenManager.start();
    }

    await this.connect();
  }

  disconnect() {
    this.tokenManager?.stop();
    this.centrifuge?.disconnect();
  }
}
```

**Benefit:** Never ask users to re-login, seamless long sessions

**Timeline:** 2 days

## Success Metrics

### Quantitative

| Metric | Current | Target |
|--------|---------|--------|
| **Message delivery success** | 95% | 99.9% |
| **Time to reconnect** | 5-10s | <2s |
| **Manual retries required** | 20% | <1% |
| **User-visible errors** | 20% | <1% |
| **Battery usage** | Baseline | -20% |

### Qualitative

**User Feedback:**
- "Messages always go through"
- "Never have to retry"
- "Works great on bad wifi"

**Comparison:**
- More reliable than Stream: ✅
- More reliable than SendBird: ✅
- More reliable than WhatsApp: ⚠️ (aspirational)

## Testing Strategy

### Resilience Test Suite

```typescript
// Test 1: Network Interruption
test('handles sudden disconnection', async () => {
  const client = await createTestClient();
  await client.sendMessage(channelId, { text: 'Test' });

  // Simulate network failure
  mockNetworkOffline();

  // Send while offline
  const promise = client.sendMessage(channelId, { text: 'Offline message' });

  // Restore network
  await sleep(5000);
  mockNetworkOnline();

  // Should succeed after retry
  const message = await promise;
  expect(message.text).toBe('Offline message');
});

// Test 2: Slow Network
test('works on slow 3G network', async () => {
  mockSlowNetwork({ latency: 2000, jitter: 500 });

  const client = await createTestClient();

  const start = Date.now();
  await client.sendMessage(channelId, { text: 'Slow send' });
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(5000); // Should complete within 5s
});

// Test 3: Token Expiry
test('refreshes expired token automatically', async () => {
  const client = await createTestClient();

  // Fast-forward time to near token expiry
  jest.advanceTimersByTime(14 * 60 * 1000); // 14 minutes

  // Should trigger token refresh
  await client.sendMessage(channelId, { text: 'Test' });

  expect(client.getApiToken()).not.toBe(initialToken);
});

// Test 4: Circuit Breaker
test('opens circuit after repeated failures', async () => {
  mockAPIFailure(); // All requests fail

  const client = await createTestClient();

  // Make 5 requests (should fail)
  for (let i = 0; i < 5; i++) {
    try {
      await client.sendMessage(channelId, { text: `Test ${i}` });
    } catch (err) {
      // Expected
    }
  }

  // Circuit should be open now
  const circuitState = client.getCircuitBreakerState();
  expect(circuitState).toBe('open');

  // 6th request should fail immediately (not hit API)
  const start = Date.now();
  try {
    await client.sendMessage(channelId, { text: 'Test 6' });
  } catch (err) {
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10); // Fails instantly
  }
});
```

### Real-World Testing

**Test Scenarios:**
1. **Subway Test:** Use app while commuting (spotty connection)
2. **Airplane Mode:** Enable, send messages, disable, verify delivery
3. **Roaming:** Test on international network (high latency)
4. **WiFi Handoff:** Switch from WiFi to cellular mid-send
5. **Battery Saver:** Test with OS battery optimization enabled

**Tools:**
- Network Link Conditioner (iOS)
- Chrome DevTools Network Throttling
- Android Debug Bridge (ADB) network simulation

## Timeline

**Week 1:**
- ✅ Automatic retry logic (2 days)
- ✅ Circuit breaker pattern (2 days)
- ✅ Request deduplication (1 day)

**Week 2:**
- ✅ Network quality indicator (2 days)
- ✅ Token refresh flow (2 days)
- ✅ Resilience test suite (1 day)

**Week 3:**
- ✅ Real-world testing (3 days)
- ✅ Performance optimization (2 days)

**Launch:** End of Week 3

## Mobile-Specific Considerations

### Background Sync (iOS/Android)

```typescript
// packages/react-native/src/BackgroundSync.ts
import BackgroundFetch from 'react-native-background-fetch';

export const setupBackgroundSync = (client: ChatClient) => {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // 15 minutes (iOS minimum)
      stopOnTerminate: false,
      startOnBoot: true
    },
    async (taskId) => {
      console.log('[BackgroundFetch] Task started:', taskId);

      try {
        // Sync pending messages
        await client.offlineQueue.retryAllPending();

        // Fetch new messages
        const channels = await client.getMyChannels();
        for (const channel of channels.slice(0, 5)) { // Top 5 channels only
          await client.getMessages(channel.id, { limit: 20 });
        }

        BackgroundFetch.finish(taskId);
      } catch (err) {
        console.error('[BackgroundFetch] Error:', err);
        BackgroundFetch.finish(taskId);
      }
    },
    (taskId) => {
      console.warn('[BackgroundFetch] TIMEOUT:', taskId);
      BackgroundFetch.finish(taskId);
    }
  );
};
```

### Push Notification Wakeup

```typescript
// When push notification received, sync immediately
export const handlePushNotification = async (notification: any) => {
  const { channelId, messageId } = notification.data;

  // Wake up client
  const client = await ChatSDK.connect({ ... });

  // Fetch new message
  await client.getMessage(messageId);

  // Show notification
  PushNotification.localNotification({
    title: notification.title,
    message: notification.body
  });
};
```

## Next Steps

1. Implement automatic retry logic
2. Add circuit breaker pattern
3. Build request deduplication
4. Create network quality indicator
5. Add token refresh flow
6. Test on real devices with poor network
7. Launch resilience improvements

**Result:** "It just works" messaging SDK
