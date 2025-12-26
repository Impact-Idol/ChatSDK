import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Avatar } from '../shared/Avatar';
import { MessageList, Message as MessageType, MessageUser } from './MessageList';
import { MessageInput } from './MessageInput';

export interface ThreadProps {
  parentMessage: MessageType;
  replies: MessageType[];
  currentUserId: string;
  onClose?: () => void;
  onSend?: (text: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  loading?: boolean;
  typingUsers?: MessageUser[];
}

export const Thread: React.FC<ThreadProps> = ({
  parentMessage,
  replies,
  currentUserId,
  onClose,
  onSend,
  onReaction,
  loading,
  typingUsers = [],
}) => {
  return (
    <div className="chatsdk-thread">
      {/* Thread Header */}
      <div className="chatsdk-thread-header">
        <div className="chatsdk-thread-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chatsdk-thread-icon">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
          </svg>
          <span>Thread</span>
          <span className="chatsdk-thread-count">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
        </div>
        <button className="chatsdk-thread-close" onClick={onClose} aria-label="Close thread">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Parent Message */}
      <div className="chatsdk-thread-parent">
        <div className="chatsdk-thread-parent-avatar">
          <Avatar
            src={parentMessage.user.image}
            name={parentMessage.user.name}
            size="md"
          />
        </div>
        <div className="chatsdk-thread-parent-content">
          <div className="chatsdk-thread-parent-header">
            <span className="chatsdk-thread-parent-name">{parentMessage.user.name}</span>
            <span className="chatsdk-thread-parent-time">
              {new Date(parentMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="chatsdk-thread-parent-text">{parentMessage.text}</p>
          {parentMessage.attachments?.filter(a => a.type === 'image').map((att, i) => (
            <img key={i} src={att.url} alt="Attachment" className="chatsdk-thread-parent-image" />
          ))}
        </div>
      </div>

      <div className="chatsdk-thread-divider">
        <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
      </div>

      {/* Thread Replies */}
      <div className="chatsdk-thread-messages">
        <MessageList
          messages={replies}
          currentUserId={currentUserId}
          onReaction={onReaction}
          loading={loading}
          typingUsers={typingUsers}
        />
      </div>

      {/* Thread Input */}
      <MessageInput
        placeholder="Reply in thread..."
        onSend={(content) => onSend?.(content.text)}
      />

      <style>{`
        .chatsdk-thread {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 400px;
          min-width: 320px;
          background: var(--chatsdk-background);
          border-left: 1px solid var(--chatsdk-border);
          animation: chatsdk-slide-in 0.3s ease;
        }

        @keyframes chatsdk-slide-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .chatsdk-thread-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--chatsdk-space-4);
          border-bottom: 1px solid var(--chatsdk-border);
        }

        .chatsdk-thread-title {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          font-weight: 600;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-thread-icon {
          width: 20px;
          height: 20px;
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-thread-count {
          font-size: var(--chatsdk-text-sm);
          font-weight: 400;
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-thread-close {
          width: 32px;
          height: 32px;
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

        .chatsdk-thread-close:hover {
          background: var(--chatsdk-muted);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-thread-close svg {
          width: 18px;
          height: 18px;
        }

        .chatsdk-thread-parent {
          display: flex;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-4);
          background: var(--chatsdk-background-subtle);
        }

        .chatsdk-thread-parent-avatar {
          flex-shrink: 0;
        }

        .chatsdk-thread-parent-content {
          flex: 1;
          min-width: 0;
        }

        .chatsdk-thread-parent-header {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          margin-bottom: var(--chatsdk-space-1);
        }

        .chatsdk-thread-parent-name {
          font-weight: 600;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-thread-parent-time {
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-thread-parent-text {
          margin: 0;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          line-height: 1.5;
        }

        .chatsdk-thread-parent-image {
          max-width: 200px;
          max-height: 150px;
          border-radius: var(--chatsdk-radius-lg);
          margin-top: var(--chatsdk-space-2);
        }

        .chatsdk-thread-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--chatsdk-space-2) var(--chatsdk-space-4);
          background: var(--chatsdk-background);
          border-bottom: 1px solid var(--chatsdk-border);
        }

        .chatsdk-thread-divider span {
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chatsdk-thread-messages {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .chatsdk-thread-messages .chatsdk-message-list {
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default Thread;
