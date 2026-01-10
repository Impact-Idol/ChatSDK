# Real-Time Updates

Subscribe to live events for typing indicators, presence, and real-time message updates.

## Event Subscription

### New Messages

```typescript
sdk.on('message.new', (message) => {
  console.log('New message:', message.text);
});
```

### Message Updated

```typescript
sdk.on('message.updated', (message) => {
  console.log('Message edited:', message.text);
});
```

### Message Deleted

```typescript
sdk.on('message.deleted', ({ messageId }) => {
  console.log('Message deleted:', messageId);
});
```

## Typing Indicators

### Send Typing

```typescript
sdk.sendTypingIndicator({ channelId: 'ch-abc123' });
```

### Listen for Typing

```typescript
sdk.on('typing.start', ({ userId, channelId }) => {
  console.log(`${userId} is typing...`);
});

sdk.on('typing.stop', ({ userId, channelId }) => {
  console.log(`${userId} stopped typing`);
});
```

### React Hook

```typescript
function TypingIndicator({ channelId }) {
  const { typingUsers } = useTyping({ channelId });
  
  if (typingUsers.length === 0) return null;
  
  return (
    <div>
      {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
    </div>
  );
}
```

## Presence

### Update Status

```typescript
await sdk.updatePresence({ status: 'online' });
// Status: 'online', 'away', 'busy', 'offline'
```

### Listen for Presence

```typescript
sdk.on('user.presence', ({ userId, status }) => {
  console.log(`${userId} is ${status}`);
});
```

### React Hook

```typescript
function UserStatus({ userId }) {
  const { status } = usePresence({ userId });
  
  return (
    <div className={`status-${status}`}>
      {status}
    </div>
  );
}
```

---

## Connection State

```typescript
sdk.on('connection.state', (state) => {
  console.log('Connection:', state);
  // 'CONNECTING', 'CONNECTED', 'RECONNECTING', 'DISCONNECTED'
});
```

---

## Next Steps

- **[Channels →](./channels.md)** - Channel management
- **[Read Receipts →](./receipts.md)** - Message read status
