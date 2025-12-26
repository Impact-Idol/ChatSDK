import React, { useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Avatar } from '../shared/Avatar';

export interface MessageUser {
  id: string;
  name: string;
  image?: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface Message {
  id: string;
  text: string;
  user: MessageUser;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  reactions?: Reaction[];
  isEdited?: boolean;
  replyTo?: {
    id: string;
    text: string;
    user: MessageUser;
  };
  attachments?: {
    type: 'image' | 'file' | 'voice';
    url: string;
    name?: string;
    duration?: number;
    waveform?: number[];
  }[];
}

export interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  typingUsers?: MessageUser[];
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }
};

const shouldShowDateSeparator = (current: Message, previous?: Message) => {
  if (!previous) return true;
  const currentDate = new Date(current.timestamp).toDateString();
  const previousDate = new Date(previous.timestamp).toDateString();
  return currentDate !== previousDate;
};

const shouldGroupMessage = (current: Message, previous?: Message) => {
  if (!previous) return false;
  if (previous.user.id !== current.user.id) return false;
  const diff = new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime();
  return diff < 60000; // Group if within 1 minute
};

const StatusIcon: React.FC<{ status?: Message['status'] }> = ({ status }) => {
  if (!status || status === 'sending') {
    return (
      <svg className="chatsdk-status-icon chatsdk-status-sending" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="32" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
        </circle>
      </svg>
    );
  }
  if (status === 'sent') {
    return (
      <svg className="chatsdk-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === 'delivered' || status === 'read') {
    return (
      <svg className={clsx('chatsdk-status-icon', status === 'read' && 'chatsdk-status-read')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="18 6 9 17 4 12" />
        <polyline points="22 6 13 17" />
      </svg>
    );
  }
  if (status === 'failed') {
    return (
      <svg className="chatsdk-status-icon chatsdk-status-failed" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
};

const MessageBubble: React.FC<{
  message: Message;
  isOwn: boolean;
  isGrouped: boolean;
  showAvatar: boolean;
  onReaction?: (emoji: string) => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ message, isOwn, isGrouped, showAvatar, onReaction, onReply, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

  return (
    <div
      className={clsx(
        'chatsdk-message',
        isOwn ? 'chatsdk-message-own' : 'chatsdk-message-other',
        isGrouped && 'chatsdk-message-grouped'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
    >
      {!isOwn && showAvatar && (
        <Avatar
          src={message.user.image}
          name={message.user.name}
          size="sm"
          className="chatsdk-message-avatar"
        />
      )}
      {!isOwn && !showAvatar && <div className="chatsdk-message-avatar-spacer" />}

      <div className="chatsdk-message-content-wrapper">
        {!isOwn && !isGrouped && (
          <span className="chatsdk-message-sender">{message.user.name}</span>
        )}

        {message.replyTo && (
          <div className="chatsdk-message-reply-preview">
            <span className="chatsdk-reply-author">{message.replyTo.user.name}</span>
            <span className="chatsdk-reply-text">{message.replyTo.text}</span>
          </div>
        )}

        <div className="chatsdk-message-bubble-wrapper">
          <div className={clsx('chatsdk-message-bubble', message.status === 'failed' && 'chatsdk-message-failed')}>
            {/* Image Attachments */}
            {message.attachments?.filter(a => a.type === 'image').map((att, i) => (
              <img
                key={i}
                src={att.url}
                alt="Attachment"
                className="chatsdk-message-image"
              />
            ))}

            {/* Voice Message */}
            {message.attachments?.filter(a => a.type === 'voice').map((att, i) => (
              <div key={i} className="chatsdk-voice-message">
                <button className="chatsdk-voice-play-btn">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
                <div className="chatsdk-voice-waveform">
                  {(att.waveform || [...Array(30)].map(() => Math.random())).map((h, j) => (
                    <div
                      key={j}
                      className="chatsdk-waveform-bar"
                      style={{ height: `${Math.max(4, (h as number) * 24)}px` }}
                    />
                  ))}
                </div>
                <span className="chatsdk-voice-duration">
                  {Math.floor((att.duration || 0) / 60)}:{String((att.duration || 0) % 60).padStart(2, '0')}
                </span>
              </div>
            ))}

            {/* Text Content */}
            {message.text && <p className="chatsdk-message-text">{message.text}</p>}

            <div className="chatsdk-message-meta">
              <span className="chatsdk-message-time">{formatTime(message.timestamp)}</span>
              {message.isEdited && <span className="chatsdk-message-edited">edited</span>}
              {isOwn && <StatusIcon status={message.status} />}
            </div>
          </div>

          {/* Quick Actions */}
          {showActions && (
            <div className={clsx('chatsdk-message-actions', isOwn && 'chatsdk-message-actions-own')}>
              <button
                className="chatsdk-action-btn"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                aria-label="Add reaction"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
              <button className="chatsdk-action-btn" onClick={onReply} aria-label="Reply">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
              </button>
              <button className="chatsdk-action-btn" aria-label="More options">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div className="chatsdk-emoji-picker">
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      className="chatsdk-emoji-btn"
                      onClick={() => {
                        onReaction?.(emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="chatsdk-message-reactions">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                className={clsx('chatsdk-reaction', reaction.hasReacted && 'chatsdk-reaction-own')}
                onClick={() => onReaction?.(reaction.emoji)}
              >
                <span className="chatsdk-reaction-emoji">{reaction.emoji}</span>
                <span className="chatsdk-reaction-count">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TypingIndicator: React.FC<{ users: MessageUser[] }> = ({ users }) => {
  if (users.length === 0) return null;

  const names = users.length === 1
    ? users[0].name
    : users.length === 2
    ? `${users[0].name} and ${users[1].name}`
    : `${users[0].name} and ${users.length - 1} others`;

  return (
    <div className="chatsdk-typing-indicator">
      <div className="chatsdk-typing-avatars">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.id} src={user.image} name={user.name} size="xs" />
        ))}
      </div>
      <div className="chatsdk-typing-content">
        <span className="chatsdk-typing-text">{names} typing</span>
        <div className="chatsdk-typing-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onReaction,
  onReply,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore,
  loading,
  typingUsers = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < 100);

    if (scrollTop < 100 && hasMore && !loading) {
      onLoadMore?.();
    }
  };

  return (
    <div className="chatsdk-message-list" ref={containerRef} onScroll={handleScroll}>
      {loading && (
        <div className="chatsdk-messages-loading">
          <div className="chatsdk-loading-spinner" />
          <span>Loading messages...</span>
        </div>
      )}

      <div className="chatsdk-messages-container">
        {messages.map((message, index) => {
          const previousMessage = messages[index - 1];
          const showDate = shouldShowDateSeparator(message, previousMessage);
          const isGrouped = shouldGroupMessage(message, previousMessage);
          const isOwn = message.user.id === currentUserId;

          return (
            <React.Fragment key={message.id}>
              {showDate && (
                <div className="chatsdk-date-separator">
                  <span>{formatDate(message.timestamp)}</span>
                </div>
              )}
              <MessageBubble
                message={message}
                isOwn={isOwn}
                isGrouped={isGrouped}
                showAvatar={!isGrouped}
                onReaction={(emoji) => onReaction?.(message.id, emoji)}
                onReply={() => onReply?.(message)}
                onEdit={() => onEdit?.(message)}
                onDelete={() => onDelete?.(message)}
              />
            </React.Fragment>
          );
        })}

        <TypingIndicator users={typingUsers} />
        <div ref={bottomRef} />
      </div>

      {!isNearBottom && (
        <button
          className="chatsdk-scroll-bottom"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      <style>{`
        .chatsdk-message-list {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: var(--chatsdk-space-4);
          background: var(--chatsdk-background-subtle);
          position: relative;
        }

        .chatsdk-messages-container {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-1);
          min-height: 100%;
          justify-content: flex-end;
        }

        .chatsdk-messages-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-4);
          color: var(--chatsdk-muted-foreground);
          font-size: var(--chatsdk-text-sm);
        }

        .chatsdk-loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--chatsdk-border);
          border-top-color: var(--chatsdk-primary);
          border-radius: 50%;
          animation: chatsdk-spin 0.8s linear infinite;
        }

        @keyframes chatsdk-spin {
          to { transform: rotate(360deg); }
        }

        .chatsdk-date-separator {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--chatsdk-space-4) 0;
        }

        .chatsdk-date-separator span {
          background: var(--chatsdk-background);
          padding: var(--chatsdk-space-1) var(--chatsdk-space-3);
          border-radius: var(--chatsdk-radius-full);
          font-size: var(--chatsdk-text-xs);
          font-weight: 500;
          color: var(--chatsdk-muted-foreground);
          box-shadow: var(--chatsdk-shadow-sm);
        }

        .chatsdk-message {
          display: flex;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-1) 0;
          max-width: 75%;
        }

        .chatsdk-message-own {
          flex-direction: row-reverse;
          margin-left: auto;
        }

        .chatsdk-message-grouped {
          padding-top: 0;
        }

        .chatsdk-message-avatar {
          flex-shrink: 0;
          align-self: flex-end;
        }

        .chatsdk-message-avatar-spacer {
          width: 32px;
          flex-shrink: 0;
        }

        .chatsdk-message-content-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-1);
        }

        .chatsdk-message-own .chatsdk-message-content-wrapper {
          align-items: flex-end;
        }

        .chatsdk-message-sender {
          font-size: var(--chatsdk-text-xs);
          font-weight: 600;
          color: var(--chatsdk-muted-foreground);
          margin-left: var(--chatsdk-space-3);
        }

        .chatsdk-message-reply-preview {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
          background: var(--chatsdk-muted);
          border-left: 3px solid var(--chatsdk-primary);
          border-radius: var(--chatsdk-radius-md);
          font-size: var(--chatsdk-text-xs);
          max-width: 200px;
        }

        .chatsdk-reply-author {
          font-weight: 600;
          color: var(--chatsdk-primary);
        }

        .chatsdk-reply-text {
          color: var(--chatsdk-muted-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chatsdk-message-bubble-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-message-own .chatsdk-message-bubble-wrapper {
          flex-direction: row-reverse;
        }

        .chatsdk-message-bubble {
          background: var(--chatsdk-message-bubble);
          color: var(--chatsdk-message-text);
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
          border-radius: var(--chatsdk-radius-2xl);
          border-bottom-left-radius: var(--chatsdk-radius-sm);
          max-width: 100%;
          animation: chatsdk-message-in 0.2s ease;
        }

        @keyframes chatsdk-message-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .chatsdk-message-own .chatsdk-message-bubble {
          background: var(--chatsdk-message-bubble-own);
          color: var(--chatsdk-message-text-own);
          border-bottom-left-radius: var(--chatsdk-radius-2xl);
          border-bottom-right-radius: var(--chatsdk-radius-sm);
        }

        .chatsdk-message-failed {
          background: rgba(239, 68, 68, 0.1) !important;
        }

        .chatsdk-message-image {
          max-width: 280px;
          max-height: 200px;
          border-radius: var(--chatsdk-radius-lg);
          margin-bottom: var(--chatsdk-space-1);
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .chatsdk-message-image:hover {
          transform: scale(1.02);
        }

        .chatsdk-voice-message {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-1) 0;
          min-width: 200px;
        }

        .chatsdk-voice-play-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: var(--chatsdk-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }

        .chatsdk-voice-play-btn:hover {
          transform: scale(1.1);
        }

        .chatsdk-voice-play-btn svg {
          width: 14px;
          height: 14px;
          margin-left: 2px;
        }

        .chatsdk-voice-waveform {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          height: 32px;
        }

        .chatsdk-waveform-bar {
          width: 3px;
          background: currentColor;
          opacity: 0.5;
          border-radius: 2px;
          transition: opacity 0.15s;
        }

        .chatsdk-voice-duration {
          font-size: var(--chatsdk-text-xs);
          opacity: 0.7;
          flex-shrink: 0;
        }

        .chatsdk-message-text {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.4;
        }

        .chatsdk-message-meta {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-1);
          margin-top: var(--chatsdk-space-1);
          font-size: 11px;
          opacity: 0.7;
        }

        .chatsdk-message-time {
          font-variant-numeric: tabular-nums;
        }

        .chatsdk-message-edited {
          font-style: italic;
        }

        .chatsdk-status-icon {
          width: 14px;
          height: 14px;
        }

        .chatsdk-status-read {
          color: #3b82f6;
        }

        .chatsdk-status-failed {
          color: var(--chatsdk-destructive);
        }

        .chatsdk-message-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-lg);
          padding: 2px;
          box-shadow: var(--chatsdk-shadow-md);
          animation: chatsdk-fade-scale 0.15s ease;
          position: relative;
        }

        @keyframes chatsdk-fade-scale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .chatsdk-message-actions-own {
          order: -1;
        }

        .chatsdk-action-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--chatsdk-radius-md);
          cursor: pointer;
          color: var(--chatsdk-muted-foreground);
          transition: all 0.15s ease;
        }

        .chatsdk-action-btn:hover {
          background: var(--chatsdk-muted);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-action-btn svg {
          width: 16px;
          height: 16px;
        }

        .chatsdk-emoji-picker {
          position: absolute;
          bottom: 100%;
          left: 0;
          margin-bottom: var(--chatsdk-space-2);
          display: flex;
          gap: 2px;
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-lg);
          padding: var(--chatsdk-space-1);
          box-shadow: var(--chatsdk-shadow-lg);
          animation: chatsdk-fade-scale 0.15s ease;
        }

        .chatsdk-emoji-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--chatsdk-radius-md);
          cursor: pointer;
          font-size: 18px;
          transition: all 0.15s ease;
        }

        .chatsdk-emoji-btn:hover {
          background: var(--chatsdk-muted);
          transform: scale(1.2);
        }

        .chatsdk-message-reactions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--chatsdk-space-1);
          margin-top: var(--chatsdk-space-1);
        }

        .chatsdk-reaction {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: var(--chatsdk-reaction-bg);
          border: 1px solid transparent;
          border-radius: var(--chatsdk-radius-full);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chatsdk-reaction:hover {
          background: var(--chatsdk-muted);
        }

        .chatsdk-reaction-own {
          background: var(--chatsdk-reaction-bg-own);
          border-color: var(--chatsdk-primary);
        }

        .chatsdk-reaction-emoji {
          font-size: 14px;
        }

        .chatsdk-reaction-count {
          font-size: 12px;
          font-weight: 500;
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-typing-indicator {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-2) 0;
        }

        .chatsdk-typing-avatars {
          display: flex;
        }

        .chatsdk-typing-avatars > * {
          margin-left: -8px;
        }

        .chatsdk-typing-avatars > *:first-child {
          margin-left: 0;
        }

        .chatsdk-typing-content {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-1);
          background: var(--chatsdk-muted);
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
          border-radius: var(--chatsdk-radius-2xl);
        }

        .chatsdk-typing-text {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-typing-dots {
          display: flex;
          gap: 3px;
        }

        .chatsdk-typing-dots span {
          width: 6px;
          height: 6px;
          background: var(--chatsdk-muted-foreground);
          border-radius: 50%;
          animation: chatsdk-typing-bounce 1.4s infinite ease-in-out;
        }

        .chatsdk-typing-dots span:nth-child(1) { animation-delay: 0s; }
        .chatsdk-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .chatsdk-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes chatsdk-typing-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }

        .chatsdk-scroll-bottom {
          position: absolute;
          bottom: var(--chatsdk-space-4);
          right: var(--chatsdk-space-4);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: var(--chatsdk-shadow-lg);
          transition: all 0.2s ease;
          animation: chatsdk-fade-in 0.2s ease;
        }

        .chatsdk-scroll-bottom:hover {
          transform: scale(1.1);
          background: var(--chatsdk-muted);
        }

        .chatsdk-scroll-bottom svg {
          width: 20px;
          height: 20px;
          color: var(--chatsdk-foreground);
        }
      `}</style>
    </div>
  );
};

export default MessageList;
