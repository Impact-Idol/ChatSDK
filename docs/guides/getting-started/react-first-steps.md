# First Steps with React

Build your first real-time chat application with React and ChatSDK 2.0 in 15 minutes.

## What You'll Build

A functional chat application with:
- ✅ Real-time messaging with WebSocket
- ✅ Automatic offline queueing
- ✅ Message history and pagination
- ✅ Typing indicators
- ✅ Read receipts
- ✅ File uploads
- ✅ Auto-reconnection &lt;2s

**Final Result:** A production-ready chat interface similar to Slack, WhatsApp, or iMessage.

---

## Prerequisites

- **Node.js 18+** installed
- **React 18+** (or create new project)
- **ChatSDK backend running** - See [Installation Guide](./installation.md)
- **Basic React knowledge** - Hooks, components, state

---

## Step 1: Create React Project (Optional)

If you don't have a React project yet:

```bash
# Create new React app with Vite (faster than CRA)
npm create vite@latest my-chat-app -- --template react-ts
cd my-chat-app
npm install
```

Or use Create React App:
```bash
npx create-react-app my-chat-app --template typescript
cd my-chat-app
```

---

## Step 2: Install ChatSDK

```bash
npm install @chatsdk/core
# or
yarn add @chatsdk/core
```

---

## Step 3: Create ChatSDK Context

Create `src/contexts/ChatContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ChatSDK } from '@chatsdk/core';
import type { Message, ConnectionState } from '@chatsdk/core';

interface ChatContextType {
  sdk: ChatSDK | null;
  messages: Message[];
  connectionState: ConnectionState;
  sendMessage: (text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sdk, setSDK] = useState<ChatSDK | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');

  useEffect(() => {
    const initChat = async () => {
      // Create SDK instance
      const chatSDK = new ChatSDK({
        apiUrl: 'http://localhost:5500',
        wsUrl: 'ws://localhost:8001/connection/websocket',

        // Auto-refresh tokens
        onTokenRefresh: (tokens) => {
          console.log('Tokens refreshed!');
          localStorage.setItem('chatTokens', JSON.stringify(tokens));
        },

        // Connection state changes
        onConnectionStateChange: (state) => {
          console.log('Connection state:', state);
          setConnectionState(state);
        },
      });

      // Listen for new messages
      chatSDK.onMessage((message) => {
        setMessages((prev) => [...prev, message]);
      });

      // Load stored tokens
      const storedTokens = localStorage.getItem('chatTokens');
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);

        // Connect with stored tokens
        await chatSDK.connect({
          userID: 'user-123', // Replace with actual user ID
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        });
      }

      setSDK(chatSDK);
    };

    initChat();

    // Cleanup
    return () => {
      sdk?.disconnect();
    };
  }, []);

  const sendMessage = async (text: string) => {
    if (!sdk || !text.trim()) return;

    await sdk.sendTextMessage({
      receiverID: 'other-user-123', // Replace with actual receiver
      message: text,
    });
  };

  return (
    <ChatContext.Provider value={{ sdk, messages, connectionState, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
```

---

## Step 4: Create Message List Component

Create `src/components/MessageList.tsx`:

```typescript
import React, { useEffect, useRef } from 'react';
import type { Message } from '@chatsdk/core';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
  currentUserID: string;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, currentUserID }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-state">
          <p>No messages yet. Start the conversation! 👋</p>
        </div>
      ) : (
        messages.map((msg) => {
          const isOwn = msg.sendID === currentUserID;

          return (
            <div
              key={msg.clientMsgID}
              className={`message ${isOwn ? 'message-own' : 'message-other'}`}
            >
              {/* Avatar */}
              {!isOwn && (
                <img
                  src={msg.senderFaceURL || '/default-avatar.png'}
                  alt={msg.senderNickname}
                  className="avatar"
                />
              )}

              {/* Message Bubble */}
              <div className="message-content">
                {!isOwn && <div className="sender-name">{msg.senderNickname}</div>}

                <div className="message-bubble">
                  {msg.contentType === 101 ? (
                    // Text message
                    <p>{msg.content}</p>
                  ) : msg.contentType === 102 ? (
                    // Image
                    <img src={msg.pictureElem?.sourcePicture?.url} alt="attachment" />
                  ) : (
                    // Other types
                    <p>Unsupported message type</p>
                  )}

                  {/* Timestamp */}
                  <span className="timestamp">
                    {new Date(msg.sendTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Status (for own messages) */}
                {isOwn && (
                  <div className="message-status">
                    {msg.status === 'sending' && '⏳'}
                    {msg.status === 'sent' && '✓'}
                    {msg.status === 'delivered' && '✓✓'}
                    {msg.status === 'read' && <span className="read-receipt">✓✓</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
};
```

**CSS** (`src/components/MessageList.css`):
```css
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.message {
  display: flex;
  gap: 8px;
  max-width: 70%;
}

.message-own {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-other {
  align-self: flex-start;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sender-name {
  font-size: 12px;
  color: #666;
  margin-left: 8px;
}

.message-bubble {
  background: #f0f0f0;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
}

.message-own .message-bubble {
  background: #007aff;
  color: white;
}

.timestamp {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
  display: block;
}

.message-own .timestamp {
  color: rgba(255, 255, 255, 0.7);
}

.message-status {
  font-size: 12px;
  color: #999;
  align-self: flex-end;
}

.read-receipt {
  color: #007aff;
}
```

---

## Step 5: Create Message Input Component

Create `src/components/MessageInput.tsx`:

```typescript
import React, { useState } from 'react';
import './MessageInput.css';

interface MessageInputProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      await onSend(text);
      setText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input">
      <button className="attach-button" title="Attach file">
        📎
      </button>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type a message..."
        disabled={disabled || sending}
        className="message-textbox"
      />

      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled || sending}
        className="send-button"
      >
        {sending ? '⏳' : '➤'}
      </button>
    </div>
  );
};
```

**CSS** (`src/components/MessageInput.css`):
```css
.message-input {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background: white;
}

.attach-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
}

.message-textbox {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
}

.message-textbox:focus {
  border-color: #007aff;
}

.send-button {
  background: #007aff;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.send-button:not(:disabled):hover {
  background: #0056b3;
}
```

---

## Step 6: Create Main Chat Component

Create `src/components/Chat.tsx`:

```typescript
import React from 'react';
import { useChat } from '../contexts/ChatContext';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import './Chat.css';

export const Chat: React.FC = () => {
  const { messages, connectionState, sendMessage } = useChat();

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <h2>Chat</h2>
        <div className={`connection-status ${connectionState.toLowerCase()}`}>
          {connectionState === 'CONNECTED' && '🟢 Connected'}
          {connectionState === 'CONNECTING' && '🟡 Connecting...'}
          {connectionState === 'RECONNECTING' && '🟡 Reconnecting...'}
          {connectionState === 'DISCONNECTED' && '🔴 Offline'}
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} currentUserID="user-123" />

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        disabled={connectionState !== 'CONNECTED'}
      />
    </div>
  );
};
```

**CSS** (`src/components/Chat.css`):
```css
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.chat-header h2 {
  margin: 0;
  font-size: 20px;
}

.connection-status {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
}

.connection-status.connected {
  background: #e8f5e9;
  color: #2e7d32;
}

.connection-status.connecting,
.connection-status.reconnecting {
  background: #fff3e0;
  color: #f57c00;
}

.connection-status.disconnected {
  background: #ffebee;
  color: #c62828;
}
```

---

## Step 7: Wire Everything Up

Update `src/App.tsx`:

```typescript
import React from 'react';
import { ChatProvider } from './contexts/ChatContext';
import { Chat } from './components/Chat';
import './App.css';

function App() {
  return (
    <ChatProvider>
      <Chat />
    </ChatProvider>
  );
}

export default App;
```

Update `src/App.css`:
```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f5f5f5;
}

#root {
  height: 100vh;
}
```

---

## Step 8: Run Your App

```bash
npm run dev
# or
npm start
```

Open **http://localhost:5173** (Vite) or **http://localhost:3000** (CRA)

**Test it:**
1. Open two browser tabs
2. Send a message from one tab
3. See it appear instantly in the other! 🎉

---

## What's Working?

You now have:
- ✅ **Real-time messaging** - Messages appear instantly via WebSocket
- ✅ **Offline queueing** - Messages send when connection returns
- ✅ **Auto-reconnection** - &lt;2s reconnection on network drop
- ✅ **Connection status** - Visual indicator of connection state
- ✅ **Message status** - Sending → Sent → Delivered → Read
- ✅ **Auto-scroll** - Message list scrolls to latest message
- ✅ **Token refresh** - Automatic background token refresh

---

## Next Steps

### Add Typing Indicators

```typescript
// In ChatContext
const sendTypingIndicator = () => {
  sdk?.sendTypingIndicator({ receiverID: 'other-user-123' });
};

// In MessageInput
<input
  onChange={(e) => {
    setText(e.target.value);
    sendTypingIndicator(); // Notify other user
  }}
/>
```

### Add File Uploads

```typescript
const handleFileUpload = async (file: File) => {
  await sdk.sendFileMessage({
    receiverID: 'other-user-123',
    file: file,
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress}%`);
    },
  });
};
```

### Add Message History

```typescript
const loadHistory = async () => {
  const history = await sdk.getMessageHistory({
    conversationID: 'conv-123',
    limit: 20,
    offset: messages.length,
  });
  setMessages((prev) => [...history, ...prev]);
};
```

### Add Read Receipts

```typescript
// Mark messages as read when visible
useEffect(() => {
  const unreadMessages = messages.filter((m) => !m.isRead && m.sendID !== currentUserID);

  unreadMessages.forEach((msg) => {
    sdk.markMessageAsRead({ messageID: msg.clientMsgID });
  });
}, [messages]);
```

---

## Production Checklist

Before deploying to production:

- [ ] Replace hardcoded user IDs with actual user data
- [ ] Implement proper authentication ([Auth Guide](./authentication.md))
- [ ] Add error boundaries
- [ ] Add loading states
- [ ] Add empty states
- [ ] Add accessibility (ARIA labels, keyboard navigation)
- [ ] Test on mobile devices
- [ ] Add analytics
- [ ] Configure CSP headers
- [ ] Set up monitoring

---

## Troubleshooting

**Messages not appearing:**
- Check WebSocket connection status
- Verify receiverID is correct
- Check browser console for errors

**"Connection failed":**
- Ensure backend services are running (`docker compose ps`)
- Check firewall isn't blocking port 8001
- Verify wsUrl is correct

**Page is blank:**
- Check browser console for errors
- Ensure all components are properly imported
- Verify React 18+ is installed

---

## Complete Example

See the full working example:
- **[GitHub Repository](https://github.com/chatsdk/examples/tree/main/react-chat-app)**
- **[Live Demo](https://react-chat-demo.chatsdk.dev)**

---

## Further Reading

- **[React Native Guide →](./react-native-first-steps.md)** - Build mobile chat app
- **[Channels Guide →](../features/channels.md)** - Group chat implementation
- **[File Uploads →](../features/files.md)** - Images, videos, documents
- **[Real-time Features →](../features/realtime.md)** - Typing, presence, receipts

---

**Questions?** Join our [Discord community](https://discord.gg/chatsdk) or [open an issue](https://github.com/chatsdk/chatsdk/issues).
