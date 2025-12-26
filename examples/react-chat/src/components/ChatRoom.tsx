import { useState, useRef, useEffect } from 'react';
import { useMessages, useTypingIndicator, useChatClient, QUICK_REACTIONS } from '@chatsdk/react';
import type { Channel, MessageWithSeq } from '@chatsdk/core';

interface ChatRoomProps {
  channel: Channel;
}

export function ChatRoom({ channel }: ChatRoomProps) {
  const client = useChatClient();
  const { messages, loading, hasMore, loadMore, sendMessage, addReaction, removeReaction } = useMessages(channel.id);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(channel.id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number>();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    // Debounced typing indicator
    startTyping();
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(text.trim());
      setText('');
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReaction = async (messageId: string, emoji: string, own: boolean) => {
    try {
      if (own) {
        await removeReaction(messageId, emoji);
      } else {
        await addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  return (
    <div className="chat-area">
      <div className="chat-header">
        <h2>{channel.name || 'Unnamed Channel'}</h2>
        <span className="members">{channel.member_count} members</span>
      </div>

      <div className="messages-container">
        {hasMore && (
          <div className="load-more">
            <button onClick={loadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="loading">
            <div className="spinner" />
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.user?.id === client.user?.id}
            onReaction={(emoji, own) => handleReaction(message.id, emoji, own)}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.length === 1
            ? `${typingUsers[0].name} is typing...`
            : `${typingUsers.length} people are typing...`}
        </div>
      )}

      <div className="composer">
        <div className="composer-input">
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending}
          />
          <button onClick={handleSend} disabled={!text.trim() || sending}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: MessageWithSeq;
  isOwn: boolean;
  onReaction: (emoji: string, own: boolean) => void;
}

function MessageBubble({ message, isOwn, onReaction }: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);

  if (message.type === 'deleted') {
    return (
      <div className={`message ${isOwn ? 'own' : ''}`}>
        <div className="message-content">
          <div className="message-bubble" style={{ opacity: 0.5, fontStyle: 'italic' }}>
            <span className="message-text">This message was deleted</span>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`message ${isOwn ? 'own' : ''}`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      {!isOwn && (
        <div className="message-avatar">
          {message.user?.name?.charAt(0).toUpperCase() || '?'}
        </div>
      )}

      <div className="message-content">
        <div className="message-header">
          {!isOwn && <span className="message-sender">{message.user?.name}</span>}
          <span className="message-time">{formatTime(message.created_at)}</span>
        </div>

        <div className="message-bubble">
          <span className="message-text">{message.text}</span>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="message-reactions">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.type}
                className={`reaction-badge ${reaction.own ? 'own' : ''}`}
                onClick={() => onReaction(reaction.type, reaction.own ?? false)}
              >
                <span>{reaction.type}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {showReactions && (
          <div className="message-reactions">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                className="reaction-badge"
                onClick={() => onReaction(emoji, false)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
