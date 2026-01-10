# Sending Messages

Complete guide to sending and managing messages in ChatSDK 2.0 - from simple text to rich media with mentions, formatting, and more.

## Quick Start

```typescript
import { ChatSDK } from '@chatsdk/core';

const sdk = await ChatSDK.connect({ apiUrl: '...', userId: 'user-123' });

// Send text message
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: 'Hello world!',
});
```

---

## Message Types

### 1. Text Messages

```typescript
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: 'Simple text message',
});
```

### 2. Rich Text with Markdown

```typescript
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: '**Bold** _italic_ `code` [link](https://example.com)',
  format: 'markdown',
});
```

### 3. Mentions

```typescript
// Mention user
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: '@alice can you review this?',
  mentions: [{ userId: 'user-alice', position: 0, length: 6 }],
});

// Mention everyone
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: '@channel Important announcement!',
  mentionEveryone: true,
});
```

### 4. Code Blocks

```typescript
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: '```javascript\nconst hello = () => console.log("Hi!");\n```',
  format: 'markdown',
});
```

### 5. Quotes/Replies

```typescript
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: 'Yes, I agree!',
  replyTo: 'msg-previous-123', // Quote previous message
});
```

---

## Message Management

### Update Message

```typescript
await sdk.updateMessage({
  messageId: 'msg-123',
  text: 'Updated text',
});
```

### Delete Message

```typescript
await sdk.deleteMessage({ messageId: 'msg-123' });
```

### Pin Message

```typescript
await sdk.pinMessage({ messageId: 'msg-123', channelId: 'ch-abc123' });
await sdk.unpinMessage({ messageId: 'msg-123' });
```

---

## Message History

### Load Messages

```typescript
const messages = await sdk.getMessages({
  channelId: 'ch-abc123',
  limit: 50,
  before: 'msg-latest', // Load older messages
});
```

### Pagination

```typescript
let allMessages = [];
let cursor = null;

while (true) {
  const batch = await sdk.getMessages({
    channelId: 'ch-abc123',
    limit: 100,
    before: cursor,
  });

  allMessages = [...allMessages, ...batch];

  if (batch.length < 100) break;
  cursor = batch[batch.length - 1].id;
}
```

---

## Link Previews

```typescript
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: 'Check out https://example.com',
  linkPreview: true, // Auto-fetch and attach preview
});
```

---

## React Component

```typescript
import { useSendMessage, useMessages } from '@chatsdk/react';

function ChatBox({ channelId }) {
  const { messages } = useMessages({ channelId });
  const { send, loading } = useSendMessage();
  const [text, setText] = useState('');

  const handleSend = async () => {
    await send({ channelId, text });
    setText('');
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.text}</div>
      ))}
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={handleSend} disabled={loading}>
        Send
      </button>
    </div>
  );
}
```

---

## Next Steps

- **[File Uploads →](./files.md)** - Send images, videos, documents
- **[Reactions →](./reactions.md)** - Add emoji reactions
- **[Threads →](./threads.md)** - Organize conversations
