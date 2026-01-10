# Search & Filters

Full-text search across messages, channels, and users with advanced filtering.

## Search Messages

```typescript
const results = await sdk.searchMessages({
  query: 'meeting tomorrow',
  channelId: 'ch-abc123', // Optional: search in specific channel
  limit: 20,
});

results.forEach((msg) => {
  console.log(`${msg.senderName}: ${msg.text}`);
});
```

## Advanced Filters

```typescript
const results = await sdk.searchMessages({
  query: 'report',
  
  // Filters
  channelId: 'ch-abc123',
  userId: 'user-456', // Messages from specific user
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
  hasAttachments: true,
  
  // Sorting
  sortBy: 'relevance', // 'relevance', 'date_desc', 'date_asc'
  limit: 50,
  offset: 0,
});
```

## Search Channels

```typescript
const channels = await sdk.searchChannels({
  query: 'engineering',
  workspaceId: 'ws-abc123',
});
```

## Search Users

```typescript
const users = await sdk.searchUsers({
  query: 'alice',
  workspaceId: 'ws-abc123',
});
```

## React Component

```typescript
function SearchBox() {
  const [query, setQuery] = useState('');
  const { results, loading } = useSearch({ query });
  
  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search messages..."
      />
      
      {loading && <div>Searching...</div>}
      
      {results.map((result) => (
        <SearchResult key={result.id} result={result} />
      ))}
    </div>
  );
}
```

---

## Next Steps

- **[Messages →](./messages.md)** - Message management
- **[Channels →](./channels.md)** - Channel basics
