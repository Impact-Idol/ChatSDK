import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Avatar } from '../shared/Avatar';

export interface Channel {
  id: string;
  name: string;
  image?: string;
  type: 'messaging' | 'team' | 'group';
  lastMessage?: {
    text: string;
    user: string;
    timestamp: string;
  };
  unreadCount: number;
  members?: { id: string; name: string; image?: string }[];
  isOnline?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
}

export interface ChannelListProps {
  channels: Channel[];
  activeChannelId?: string;
  onChannelSelect?: (channel: Channel) => void;
  loading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

const ChannelItem: React.FC<{
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
}> = ({ channel, isActive, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={clsx(
        'chatsdk-channel-item',
        isActive && 'chatsdk-channel-item-active',
        channel.unreadCount > 0 && 'chatsdk-channel-item-unread'
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="chatsdk-channel-avatar-wrapper">
        <Avatar
          src={channel.image}
          name={channel.name}
          size="md"
          presence={channel.isOnline ? 'online' : undefined}
        />
      </div>

      <div className="chatsdk-channel-content">
        <div className="chatsdk-channel-header">
          <span className="chatsdk-channel-name">{channel.name}</span>
          {channel.lastMessage && (
            <span className="chatsdk-channel-time">
              {formatTime(channel.lastMessage.timestamp)}
            </span>
          )}
        </div>

        <div className="chatsdk-channel-preview">
          {channel.lastMessage ? (
            <span className="chatsdk-channel-message">
              {channel.type !== 'messaging' && (
                <span className="chatsdk-channel-sender">{channel.lastMessage.user}: </span>
              )}
              {channel.lastMessage.text}
            </span>
          ) : (
            <span className="chatsdk-channel-empty">No messages yet</span>
          )}

          <div className="chatsdk-channel-indicators">
            {channel.isMuted && (
              <svg className="chatsdk-channel-muted-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
            {channel.unreadCount > 0 && (
              <span className="chatsdk-channel-badge">
                {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {isHovered && (
        <div className="chatsdk-channel-actions">
          <button className="chatsdk-channel-action-btn" aria-label="More options">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  activeChannelId,
  onChannelSelect,
  loading,
  searchQuery = '',
  onSearchChange,
}) => {
  const pinnedChannels = channels.filter((c) => c.isPinned);
  const regularChannels = channels.filter((c) => !c.isPinned);

  return (
    <div className="chatsdk-channel-list">
      {/* Search Header */}
      <div className="chatsdk-channel-search">
        <div className="chatsdk-channel-search-input-wrapper">
          <svg className="chatsdk-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="chatsdk-channel-search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        <button className="chatsdk-new-chat-btn" aria-label="New conversation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="chatsdk-channel-loading">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="chatsdk-channel-skeleton">
              <div className="chatsdk-skeleton-avatar" />
              <div className="chatsdk-skeleton-content">
                <div className="chatsdk-skeleton-line chatsdk-skeleton-name" />
                <div className="chatsdk-skeleton-line chatsdk-skeleton-message" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Channel List */}
      {!loading && (
        <div className="chatsdk-channel-scroll">
          {pinnedChannels.length > 0 && (
            <>
              <div className="chatsdk-channel-section-header">
                <svg viewBox="0 0 24 24" fill="currentColor" className="chatsdk-pin-icon">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
                </svg>
                Pinned
              </div>
              {pinnedChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === activeChannelId}
                  onClick={() => onChannelSelect?.(channel)}
                />
              ))}
            </>
          )}

          {regularChannels.length > 0 && (
            <>
              {pinnedChannels.length > 0 && (
                <div className="chatsdk-channel-section-header">All Messages</div>
              )}
              {regularChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === activeChannelId}
                  onClick={() => onChannelSelect?.(channel)}
                />
              ))}
            </>
          )}

          {channels.length === 0 && (
            <div className="chatsdk-channel-empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="chatsdk-empty-icon">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
              </svg>
              <h3>No conversations yet</h3>
              <p>Start a new conversation to get chatting</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        .chatsdk-channel-list {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--chatsdk-background);
          border-right: 1px solid var(--chatsdk-border);
          width: 320px;
          min-width: 280px;
        }

        .chatsdk-channel-search {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-4);
          border-bottom: 1px solid var(--chatsdk-border);
        }

        .chatsdk-channel-search-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          background: var(--chatsdk-muted);
          border-radius: var(--chatsdk-radius-lg);
          padding: 0 var(--chatsdk-space-3);
          transition: all var(--chatsdk-transition-fast);
        }

        .chatsdk-channel-search-input-wrapper:focus-within {
          background: var(--chatsdk-background);
          box-shadow: 0 0 0 2px var(--chatsdk-primary);
        }

        .chatsdk-search-icon {
          width: 18px;
          height: 18px;
          color: var(--chatsdk-muted-foreground);
          flex-shrink: 0;
        }

        .chatsdk-channel-search-input {
          flex: 1;
          height: 40px;
          border: none;
          background: transparent;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          outline: none;
        }

        .chatsdk-channel-search-input::placeholder {
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-new-chat-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-primary);
          color: var(--chatsdk-primary-foreground);
          border: none;
          border-radius: var(--chatsdk-radius-lg);
          cursor: pointer;
          transition: all var(--chatsdk-transition-fast);
        }

        .chatsdk-new-chat-btn:hover {
          background: var(--chatsdk-primary-hover);
          transform: scale(1.05);
        }

        .chatsdk-new-chat-btn svg {
          width: 20px;
          height: 20px;
        }

        .chatsdk-channel-scroll {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .chatsdk-channel-section-header {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-2) var(--chatsdk-space-4);
          font-size: var(--chatsdk-text-xs);
          font-weight: 600;
          color: var(--chatsdk-muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chatsdk-pin-icon {
          width: 12px;
          height: 12px;
        }

        .chatsdk-channel-item {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-3) var(--chatsdk-space-4);
          cursor: pointer;
          transition: all var(--chatsdk-transition-fast);
          position: relative;
        }

        .chatsdk-channel-item:hover {
          background: var(--chatsdk-muted);
        }

        .chatsdk-channel-item-active {
          background: var(--chatsdk-accent);
        }

        .chatsdk-channel-item-active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 24px;
          background: var(--chatsdk-primary);
          border-radius: 0 2px 2px 0;
        }

        .chatsdk-channel-avatar-wrapper {
          flex-shrink: 0;
        }

        .chatsdk-channel-content {
          flex: 1;
          min-width: 0;
        }

        .chatsdk-channel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--chatsdk-space-2);
          margin-bottom: 2px;
        }

        .chatsdk-channel-name {
          font-weight: 500;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chatsdk-channel-item-unread .chatsdk-channel-name {
          font-weight: 600;
        }

        .chatsdk-channel-time {
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
          flex-shrink: 0;
        }

        .chatsdk-channel-item-unread .chatsdk-channel-time {
          color: var(--chatsdk-primary);
        }

        .chatsdk-channel-preview {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-channel-message {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .chatsdk-channel-item-unread .chatsdk-channel-message {
          color: var(--chatsdk-foreground);
        }

        .chatsdk-channel-sender {
          font-weight: 500;
        }

        .chatsdk-channel-empty {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
          font-style: italic;
        }

        .chatsdk-channel-indicators {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          flex-shrink: 0;
        }

        .chatsdk-channel-muted-icon {
          width: 14px;
          height: 14px;
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-channel-badge {
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-primary);
          color: var(--chatsdk-primary-foreground);
          font-size: 11px;
          font-weight: 600;
          border-radius: var(--chatsdk-radius-full);
        }

        .chatsdk-channel-actions {
          position: absolute;
          right: var(--chatsdk-space-3);
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          animation: chatsdk-fade-in 0.15s ease forwards;
        }

        @keyframes chatsdk-fade-in {
          to { opacity: 1; }
        }

        .chatsdk-channel-action-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-md);
          cursor: pointer;
          color: var(--chatsdk-muted-foreground);
          transition: all var(--chatsdk-transition-fast);
        }

        .chatsdk-channel-action-btn:hover {
          background: var(--chatsdk-muted);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-channel-action-btn svg {
          width: 16px;
          height: 16px;
        }

        /* Loading Skeleton */
        .chatsdk-channel-loading {
          padding: var(--chatsdk-space-2);
        }

        .chatsdk-channel-skeleton {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-3) var(--chatsdk-space-4);
        }

        .chatsdk-skeleton-avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--chatsdk-radius-full);
          background: linear-gradient(90deg, var(--chatsdk-muted) 25%, var(--chatsdk-border) 50%, var(--chatsdk-muted) 75%);
          background-size: 200% 100%;
          animation: chatsdk-shimmer 1.5s infinite;
        }

        .chatsdk-skeleton-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-skeleton-line {
          height: 12px;
          border-radius: var(--chatsdk-radius-sm);
          background: linear-gradient(90deg, var(--chatsdk-muted) 25%, var(--chatsdk-border) 50%, var(--chatsdk-muted) 75%);
          background-size: 200% 100%;
          animation: chatsdk-shimmer 1.5s infinite;
        }

        .chatsdk-skeleton-name { width: 60%; }
        .chatsdk-skeleton-message { width: 85%; }

        @keyframes chatsdk-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Empty State */
        .chatsdk-channel-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--chatsdk-space-8);
          text-align: center;
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-empty-icon {
          width: 64px;
          height: 64px;
          margin-bottom: var(--chatsdk-space-4);
          opacity: 0.5;
        }

        .chatsdk-channel-empty-state h3 {
          font-size: var(--chatsdk-text-lg);
          font-weight: 600;
          color: var(--chatsdk-foreground);
          margin-bottom: var(--chatsdk-space-2);
        }

        .chatsdk-channel-empty-state p {
          font-size: var(--chatsdk-text-sm);
        }
      `}</style>
    </div>
  );
};

export default ChannelList;
