# Quickstart Guide

**From zero to first message in 5 minutes** ⚡

This guide gets you sending messages with ChatSDK 2.0 as quickly as possible. Perfect for mobile-first chat applications.

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Backend running** - See [Installation & Setup](./installation.md) for full backend setup
- **5 minutes** of your time

## Step 1: Install ChatSDK (30 seconds)

```bash
npm install @chatsdk/core
# or
yarn add @chatsdk/core
```

## Step 2: Create Your First Chat (2 minutes)

Create a new file `simple-chat.tsx` (or `.jsx` for JavaScript):

```typescript
import { ChatSDK } from '@chatsdk/core';
import { useEffect, useState } from 'react';

function SimpleChat() {
  const [sdk, setSDK] = useState<ChatSDK | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  // Step 1: Initialize SDK
  useEffect(() => {
    const chatSDK = new ChatSDK({
      apiUrl: 'http://localhost:5500',
      wsUrl: 'ws://localhost:8001/connection/websocket',
    });

    // Step 2: Listen for new messages
    chatSDK.onMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    setSDK(chatSDK);
  }, []);

  // Step 3: Connect with user credentials
  const handleLogin = async () => {
    await sdk?.connect({
      userID: 'user-123',
      token: 'your-auth-token', // Get from your backend auth
    });
  };

  // Step 4: Send a message
  const handleSend = async () => {
    if (!input.trim() || !sdk) return;

    await sdk.sendTextMessage({
      receiverID: 'friend-456',
      message: input,
    });

    setInput('');
  };

  return (
    <div className="chat-container">
      {!sdk?.isConnected() ? (
        <button onClick={handleLogin}>Login & Connect</button>
      ) : (
        <>
          {/* Message List */}
          <div className="messages">
            {messages.map((msg) => (
              <div key={msg.clientMsgID} className="message">
                <strong>{msg.sendID}:</strong> {msg.content}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="input-area">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}

export default SimpleChat;
```

## Step 3: Send Your First Message (1 minute)

1. **Start your app**:
   ```bash
   npm run dev
   ```

2. **Click "Login & Connect"** - This establishes the WebSocket connection

3. **Type a message and press Enter** - That's it! 🎉

## What Just Happened?

You just:
- ✅ Installed ChatSDK with automatic offline queue, retry logic, and connection recovery
- ✅ Connected to real-time WebSocket with &lt;2s reconnection
- ✅ Sent your first message with automatic delivery tracking
- ✅ Set up real-time message listeners

## Mobile-First Features Built In

ChatSDK 2.0 is designed for mobile chat apps. You automatically get:

- **Offline Queue** - Messages send automatically when connection returns
- **Fast Reconnection** - &lt;2 seconds vs 10+ seconds in v1
- **Auto Token Refresh** - No expired token errors
- **Network Quality Monitoring** - Adapts to poor connections
- **Retry Logic** - Smart exponential backoff
- **Circuit Breaker** - Prevents cascading failures

## Next Steps

Now that you've sent your first message, dive deeper:

- **[Installation & Setup](./installation.md)** - Full backend and environment setup
- **[Authentication Guide](./authentication.md)** - Secure token generation and management
- **[React Integration](./react-first-steps.md)** - Build a full React chat app
- **[React Native Guide](./react-native-first-steps.md)** - Mobile app with offline support
- **[Message Features](../features/messages.md)** - Rich text, media, replies, reactions

## Troubleshooting

### "Connection failed"
Make sure your backend services are running:
```bash
# Check if services are up
docker ps

# Start services if needed
docker-compose up -d
```

### "Token expired"
ChatSDK 2.0 auto-refreshes tokens, but you need to configure it:
```typescript
const sdk = new ChatSDK({
  apiUrl: 'http://localhost:5500',
  wsUrl: 'ws://localhost:8001/connection/websocket',
  // Add token refresh callback
  onTokenRefresh: (tokens) => {
    // Save to localStorage or secure storage
    localStorage.setItem('accessToken', tokens.accessToken);
  },
});
```

### "Messages not appearing"
Check that both users are in the same channel/conversation:
```typescript
// Join a channel first
await sdk.joinChannel({ channelID: 'general' });
```

## Working Example

See a complete working example with:
- React + TypeScript
- Mobile-responsive UI
- Offline support
- Read receipts
- Typing indicators

👉 [View React Example](/examples/react-chat-app)
👉 [View React Native Example](/examples/mobile-chat-app)

---

**Next:** [Installation & Setup →](./installation.md)
