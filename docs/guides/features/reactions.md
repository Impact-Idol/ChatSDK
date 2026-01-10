# Reactions & Threads

Add emoji reactions and organize conversations with threaded replies.

## Reactions

### Add Reaction

```typescript
await sdk.addReaction({
  messageId: 'msg-123',
  emoji: '👍',
});
```

### Remove Reaction

```typescript
await sdk.removeReaction({
  messageId: 'msg-123',
  emoji: '👍',
});
```

### List Reactions

```typescript
const reactions = await sdk.getReactions({ messageId: 'msg-123' });
// [{ emoji: '👍', users: ['user-1', 'user-2'], count: 2 }]
```

### React Component

```typescript
function MessageReactions({ messageId, reactions }) {
  const { addReaction } = useReactions();
  
  return (
    <div className="reactions">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => addReaction({ messageId, emoji: r.emoji })}
        >
          {r.emoji} {r.count}
        </button>
      ))}
    </div>
  );
}
```

## Threads

### Start Thread

```typescript
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: 'Reply in thread',
  parentId: 'msg-123', // Parent message
});
```

### Get Thread

```typescript
const thread = await sdk.getThread({ messageId: 'msg-123' });
// { parentMessage: {...}, replies: [...], replyCount: 5 }
```

### Thread Component

```typescript
function ThreadView({ messageId }) {
  const { thread, loading } = useThread({ messageId });
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="thread">
      <Message message={thread.parentMessage} />
      <div className="replies">
        {thread.replies.map((reply) => (
          <Message key={reply.id} message={reply} isReply />
        ))}
      </div>
    </div>
  );
}
```

---

## Next Steps

- **[Messages →](./messages.md)** - Message basics
- **[Real-Time →](./realtime.md)** - Live updates
