# Offline Mode

ChatSDK 2.0 automatically queues messages when offline and sends them when connection returns.

## How It Works

```
User sends message while offline
  ↓
Message added to IndexedDB queue
  ↓
User shown "Sending..." status
  ↓
Connection returns
  ↓
Queue auto-syncs to server
  ↓
Message status updates to "Sent ✓"
```

## Automatic Offline Queue

```typescript
// Offline queueing is enabled by default!
const sdk = await ChatSDK.connect({
  apiUrl: 'https://api.yourdomain.com',
  userId: 'user-123',
});

// Send message (works offline or online)
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: 'This will send when online!',
});
// ↑ Automatically queued if offline
```

## Configuration

```typescript
const sdk = await ChatSDK.connect({
  apiUrl: '...',
  userId: '...',
  
  offline: {
    enabled: true,
    storage: 'indexeddb', // 'indexeddb' or 'localstorage'
    maxQueueSize: 1000, // Max messages to queue
    syncOnReconnect: true, // Auto-sync when online
  },
});
```

## Manual Queue Management

```typescript
// Get queued messages
const queued = await sdk.getQueuedMessages();
console.log(`${queued.length} messages waiting to send`);

// Manually sync queue
await sdk.syncQueue();

// Clear queue (if needed)
await sdk.clearQueue();
```

## Offline Indicator

```typescript
function OfflineBanner() {
  const { isOnline, queuedCount } = useOfflineStatus();
  
  if (isOnline) return null;
  
  return (
    <div className="offline-banner">
      ⚠️ Offline - {queuedCount} messages queued
    </div>
  );
}
```

## Storage Options

### IndexedDB (Default)

- Best for web apps
- 50MB+ storage
- Survives browser restart

### LocalStorage

- Fallback for older browsers
- 5-10MB storage
- Simple key-value store

### AsyncStorage (React Native)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const sdk = await ChatSDK.connect({
  offline: {
    storage: AsyncStorage,
  },
});
```

---

## Next Steps

- **[Performance →](./performance.md)** - Optimize for large datasets
- **[React Native →](../getting-started/react-native-first-steps.md)**
