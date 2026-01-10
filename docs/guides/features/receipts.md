# Read Receipts & Delivery Status

Track message delivery and read status with WhatsApp-style checkmarks.

## Message Status

Messages progress through these states:

```
sending ⏳ → sent ✓ → delivered ✓✓ → read ✓✓ (blue)
```

## Mark as Read

```typescript
// Mark single message as read
await sdk.markAsRead({ messageId: 'msg-123' });

// Mark all messages in channel as read
await sdk.markChannelAsRead({ channelId: 'ch-abc123' });
```

## Auto-Mark as Read

```typescript
function ChatView({ channelId }) {
  const { messages } = useMessages({ channelId });
  
  useEffect(() => {
    // Mark as read when channel opens
    sdk.markChannelAsRead({ channelId });
  }, [channelId]);
  
  useEffect(() => {
    // Mark new messages as read when they appear
    const unreadMessages = messages.filter((m) => !m.isRead && !m.isSentByMe);
    
    unreadMessages.forEach((msg) => {
      sdk.markAsRead({ messageId: msg.id });
    });
  }, [messages]);
  
  return <MessageList messages={messages} />;
}
```

## Read Receipts Component

```typescript
function MessageStatus({ message, currentUserId }) {
  if (message.senderId !== currentUserId) return null;
  
  return (
    <div className="message-status">
      {message.status === 'sending' && '⏳'}
      {message.status === 'sent' && '✓'}
      {message.status === 'delivered' && '✓✓'}
      {message.status === 'read' && (
        <span className="read-receipt">✓✓</span>
      )}
    </div>
  );
}
```

## See Who Read

```typescript
const readers = await sdk.getMessageReaders({ messageId: 'msg-123' });

readers.forEach((user) => {
  console.log(`${user.name} read at ${user.readAt}`);
});
```

## Group Chat Read Receipts

```typescript
function GroupReadReceipts({ messageId, channelMembers }) {
  const { readers } = useMessageReaders({ messageId });
  
  const readCount = readers.length;
  const totalMembers = channelMembers.length - 1; // Exclude sender
  
  return (
    <div>
      {readCount === 0 && '✓✓'} {/* Delivered */}
      {readCount > 0 && readCount < totalMembers && (
        <span title={`Read by ${readCount}/${totalMembers}`}>
          ✓✓ {readCount}
        </span>
      )}
      {readCount === totalMembers && (
        <span className="all-read">✓✓</span>
      )}
    </div>
  );
}
```

## Unread Count

```typescript
const unreadCount = await sdk.getUnreadCount({ channelId: 'ch-abc123' });
console.log(`${unreadCount} unread messages`);
```

## Real-Time Updates

```typescript
sdk.on('message.read', ({ messageId, userId, readAt }) => {
  console.log(`${userId} read message ${messageId}`);
});

sdk.on('channel.unread_count', ({ channelId, count }) => {
  console.log(`${count} unread in ${channelId}`);
});
```

---

## Next Steps

- **[Messages →](./messages.md)** - Send and manage messages
- **[Real-Time →](./realtime.md)** - Live updates
