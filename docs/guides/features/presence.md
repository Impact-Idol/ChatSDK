# User Presence & Typing Indicators

Show user online status and real-time typing indicators for better engagement.

## User Presence

### Set Your Status

```typescript
// Set online
await sdk.updatePresence({ status: 'online' });

// Set away
await sdk.updatePresence({ status: 'away' });

// Set custom status
await sdk.updatePresence({
  status: 'online',
  customStatus: 'In a meeting',
  emoji: '📅',
});
```

### Get User Status

```typescript
const presence = await sdk.getUserPresence({ userId: 'user-123' });
console.log(presence.status); // 'online', 'away', 'busy', 'offline'
console.log(presence.lastSeenAt); // Timestamp
```

### Subscribe to Presence Updates

```typescript
sdk.on('user.presence', ({ userId, status, customStatus }) => {
  console.log(`${userId} is now ${status}`);
});
```

### React Component

```typescript
function UserPresence({ userId }) {
  const { status, customStatus, emoji } = usePresence({ userId });
  
  return (
    <div className="presence">
      <div className={`status-dot status-${status}`} />
      {customStatus && (
        <span>
          {emoji} {customStatus}
        </span>
      )}
    </div>
  );
}
```

## Typing Indicators

### Send Typing Event

```typescript
// User starts typing
sdk.sendTypingIndicator({ channelId: 'ch-abc123', isTyping: true });

// User stops typing
sdk.sendTypingIndicator({ channelId: 'ch-abc123', isTyping: false });

// Auto-stop after 5s
sdk.sendTypingIndicator({ channelId: 'ch-abc123', timeout: 5000 });
```

### Listen for Typing

```typescript
sdk.on('typing.start', ({ userId, userName, channelId }) => {
  console.log(`${userName} is typing in ${channelId}`);
});

sdk.on('typing.stop', ({ userId, channelId }) => {
  console.log(`User stopped typing`);
});
```

### Auto Typing (React)

```typescript
function MessageInput({ channelId }) {
  const [text, setText] = useState('');
  const { sendTyping } = useTyping();
  
  const handleChange = (e) => {
    setText(e.target.value);
    
    // Auto-send typing indicator
    sendTyping({ channelId });
  };
  
  return (
    <input
      value={text}
      onChange={handleChange}
      placeholder="Type a message..."
    />
  );
}
```

### Typing Indicator UI

```typescript
function TypingIndicator({ channelId }) {
  const { typingUsers } = useTyping({ channelId });
  
  if (typingUsers.length === 0) return null;
  
  const names = typingUsers.map((u) => u.name);
  
  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span>
        {names.length === 1
          ? `${names[0]} is typing...`
          : names.length === 2
          ? `${names[0]} and ${names[1]} are typing...`
          : `${names.length} people are typing...`}
      </span>
    </div>
  );
}
```

## Best Practices

### 1. Debounce Typing Events

```typescript
import { debounce } from 'lodash';

const sendTyping = debounce((channelId) => {
  sdk.sendTypingIndicator({ channelId });
}, 300);
```

### 2. Stop Typing on Blur

```typescript
<input
  onFocus={() => sdk.sendTypingIndicator({ channelId, isTyping: true })}
  onBlur={() => sdk.sendTypingIndicator({ channelId, isTyping: false })}
/>
```

### 3. Auto-Cleanup

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    sdk.sendTypingIndicator({ channelId, isTyping: false });
  }, 5000);
  
  return () => clearTimeout(timer);
}, [text]);
```

---

## Next Steps

- **[Real-Time Updates →](./realtime.md)** - WebSocket events
- **[Read Receipts →](./receipts.md)** - Message read status
