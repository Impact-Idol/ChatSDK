# Performance Optimization

Optimize ChatSDK for 10,000+ messages, 1000+ channels, and smooth 60fps scrolling.

## Message Pagination

```typescript
// Load messages in batches
const loadMessages = async (channelId) => {
  let messages = [];
  let cursor = null;
  
  while (true) {
    const batch = await sdk.getMessages({
      channelId,
      limit: 100,
      before: cursor,
    });
    
    messages = [...messages, ...batch];
    
    if (batch.length < 100) break;
    cursor = batch[batch.length - 1].id;
  }
  
  return messages;
};
```

## Virtual Scrolling

```typescript
import { FixedSizeList } from 'react-window';

function VirtualMessageList({ messages }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={60}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <Message message={messages[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

## Image Lazy Loading

```typescript
function LazyImage({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
```

## Message Caching

```typescript
// Enable message cache
const sdk = await ChatSDK.connect({
  cache: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxSize: 1000, // Max messages to cache
  },
});
```

## Bundle Size Optimization

```javascript
// Use dynamic imports
const Chat = lazy(() => import('./components/Chat'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Chat />
    </Suspense>
  );
}
```

## Debounce Search

```typescript
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query) => {
  const results = await sdk.searchMessages({ query });
  setResults(results);
}, 300);
```

---

## Next Steps

- **[Offline Mode →](./offline-support.md)**
- **[Production Deployment →](./deployment.md)**
