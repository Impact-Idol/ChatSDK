# React Integration

Use ChatSDK with React using our hooks and components.

## Setup

```bash
npm install @chatsdk/core @chatsdk/react
```

## Provider Setup

Wrap your app with the ChatProvider:

```tsx
import { ChatProvider, ChatClient } from '@chatsdk/react';

const client = new ChatClient({
  apiKey: 'your-api-key',
  apiUrl: 'https://api.your-server.com',
});

function App() {
  return (
    <ChatProvider client={client}>
      <YourApp />
    </ChatProvider>
  );
}
```

## Authentication

Connect the user after login:

```tsx
import { useChatClient } from '@chatsdk/react';

function AuthWrapper({ children }) {
  const client = useChatClient();
  const { user: authUser } = useAuth(); // Your auth context

  useEffect(() => {
    if (authUser) {
      const connect = async () => {
        const token = await getChatToken(); // From your backend
        await client.connectUser(
          { id: authUser.id, name: authUser.name },
          token
        );
      };
      connect();

      return () => client.disconnect();
    }
  }, [authUser, client]);

  return children;
}
```

## Hooks

### useChannels

```tsx
import { useChannels } from '@chatsdk/react';

function ChannelList() {
  const { channels, loading, error, refresh } = useChannels();

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {channels.map(channel => (
        <li key={channel.id}>
          {channel.name}
          {channel.unreadCount > 0 && (
            <Badge count={channel.unreadCount} />
          )}
        </li>
      ))}
    </ul>
  );
}
```

### useMessages

```tsx
import { useMessages } from '@chatsdk/react';

function MessageList({ channelId }) {
  const { messages, loading, hasMore, loadMore } = useMessages(channelId);

  return (
    <div>
      {hasMore && (
        <button onClick={loadMore}>Load older messages</button>
      )}
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
```

### useReactions

```tsx
import { useReactions, QUICK_REACTIONS } from '@chatsdk/react';

function MessageReactions({ channelId, message }) {
  const { addReaction, removeReaction, toggleReaction } = useReactions(channelId);

  return (
    <div className="reactions">
      {/* Show existing reactions */}
      {message.reactions?.map(reaction => (
        <button
          key={reaction.type}
          onClick={() => toggleReaction(message.id, reaction.type, reaction.own)}
          className={reaction.own ? 'active' : ''}
        >
          {reaction.type} {reaction.count}
        </button>
      ))}

      {/* Quick reaction picker */}
      <div className="reaction-picker">
        {QUICK_REACTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => addReaction(message.id, emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### useTypingIndicator

```tsx
import { useTypingIndicator } from '@chatsdk/react';

function TypingIndicator({ channelId }) {
  const { typingUsers } = useTypingIndicator(channelId);

  if (typingUsers.length === 0) return null;

  if (typingUsers.length === 1) {
    return <span>{typingUsers[0].name} is typing...</span>;
  }

  return <span>Several people are typing...</span>;
}
```

### useMentions

```tsx
import { useMentions, useMentionSearch, highlightMentions } from '@chatsdk/react';

// Display mentions badge
function MentionsBadge() {
  const { unreadCount } = useMentions();
  return unreadCount > 0 ? <Badge count={unreadCount} /> : null;
}

// Mention autocomplete in composer
function MentionAutocomplete({ channelId, onSelect }) {
  const { query, setQuery, users, loading } = useMentionSearch({ channelId });

  return (
    <div className="mention-autocomplete">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
      />
      {users.map(user => (
        <button key={user.id} onClick={() => onSelect(user)}>
          <Avatar user={user} />
          {user.name}
        </button>
      ))}
    </div>
  );
}

// Render message with highlighted mentions
function MessageText({ text, currentUserId }) {
  const parts = highlightMentions(text, currentUserId);

  return (
    <p>
      {parts.map((part, i) => (
        part.type === 'mention' ? (
          <span
            key={i}
            className={`mention ${part.isCurrentUser ? 'mention-me' : ''}`}
          >
            @{part.content}
          </span>
        ) : (
          <span key={i}>{part.content}</span>
        )
      ))}
    </p>
  );
}
```

### useReadReceipts

```tsx
import { useReadReceipts } from '@chatsdk/react';

function MessageStatus({ channelId, messageId }) {
  const { getReceipts, formatReadReceipt } = useReadReceipts(channelId);

  const receipts = getReceipts(messageId);

  return (
    <span className="read-status">
      {formatReadReceipt(receipts)}
    </span>
  );
}
```

### usePresence

```tsx
import { usePresence } from '@chatsdk/react';

function UserStatus({ userId }) {
  const { isOnline, lastSeen } = usePresence(userId);

  if (isOnline) {
    return <span className="status online">Online</span>;
  }

  return (
    <span className="status offline">
      Last seen {formatDistanceToNow(lastSeen)} ago
    </span>
  );
}
```

## Message Composer

Complete message composer example:

```tsx
import { useState, useRef } from 'react';
import { useChatClient, useTypingIndicator, useFileUpload } from '@chatsdk/react';

function MessageComposer({ channelId }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const client = useChatClient();
  const { startTyping, stopTyping } = useTypingIndicator(channelId);
  const { upload, uploading, progress } = useFileUpload();
  const typingTimeout = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);

    // Debounced typing indicator
    startTyping();
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTyping, 2000);
  };

  const handleFileSelect = async (files) => {
    const uploaded = await Promise.all(
      files.map(file => upload(file, channelId))
    );
    setAttachments([...attachments, ...uploaded]);
  };

  const handleSend = async () => {
    if (!text.trim() && attachments.length === 0) return;

    await client.sendMessage(channelId, {
      text: text.trim(),
      attachments,
    });

    setText('');
    setAttachments([]);
    stopTyping();
  };

  return (
    <div className="composer">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map((att, i) => (
            <AttachmentPreview
              key={i}
              attachment={att}
              onRemove={() => setAttachments(attachments.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}

      {uploading && <ProgressBar value={progress} />}

      <div className="input-row">
        <input
          type="file"
          multiple
          onChange={(e) => handleFileSelect([...e.target.files])}
        />
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} disabled={!text.trim() && attachments.length === 0}>
          Send
        </button>
      </div>
    </div>
  );
}
```

## Complete Chat Component

```tsx
import {
  useChannels,
  useMessages,
  useTypingIndicator,
  ChatProvider,
} from '@chatsdk/react';

function Chat() {
  const [selectedChannel, setSelectedChannel] = useState(null);

  return (
    <div className="chat-container">
      <ChannelSidebar
        selectedId={selectedChannel?.id}
        onSelect={setSelectedChannel}
      />
      {selectedChannel && (
        <ChatRoom channel={selectedChannel} />
      )}
    </div>
  );
}

function ChannelSidebar({ selectedId, onSelect }) {
  const { channels, loading } = useChannels();

  if (loading) return <Spinner />;

  return (
    <aside className="channel-sidebar">
      {channels.map(channel => (
        <button
          key={channel.id}
          className={channel.id === selectedId ? 'active' : ''}
          onClick={() => onSelect(channel)}
        >
          <span className="name">{channel.name}</span>
          {channel.unreadCount > 0 && (
            <span className="unread">{channel.unreadCount}</span>
          )}
        </button>
      ))}
    </aside>
  );
}

function ChatRoom({ channel }) {
  const { messages, loading, hasMore, loadMore } = useMessages(channel.id);
  const { typingUsers } = useTypingIndicator(channel.id);

  return (
    <main className="chat-room">
      <header>{channel.name}</header>

      <div className="messages">
        {hasMore && <button onClick={loadMore}>Load more</button>}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <TypingIndicator users={typingUsers} />
      </div>

      <MessageComposer channelId={channel.id} />
    </main>
  );
}
```

## Next Steps

- [API Reference](../api/react.md) - Full React hooks documentation
- [Examples](../examples/react-chat.md) - Complete example apps
