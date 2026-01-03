import { useState, useMemo } from 'react';
import { useChannels, useSearch } from '@chatsdk/react';
import type { Channel } from '@chatsdk/core';
import { CreateChannelModal } from './CreateChannelModal';

interface ChannelListProps {
  selectedId?: string;
  onSelect: (channel: Channel) => void;
}

type FilterType = 'all' | 'unread' | 'direct' | 'groups';

export function ChannelList({ selectedId, onSelect }: ChannelListProps) {
  const { channels, loading, error, refresh } = useChannels();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredChannels = useMemo(() => {
    let result = channels;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) =>
        c.name?.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (filter) {
      case 'unread':
        result = result.filter((c) => (c.unread_count ?? 0) > 0);
        break;
      case 'direct':
        result = result.filter((c) => c.type === 'messaging');
        break;
      case 'groups':
        result = result.filter((c) => c.type === 'group' || c.type === 'team');
        break;
    }

    return result;
  }, [channels, searchQuery, filter]);

  const getChannelIcon = (channel: Channel) => {
    switch (channel.type) {
      case 'messaging':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        );
      case 'group':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        );
      case 'team':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        );
    }
  };

  const formatLastMessage = (channel: Channel) => {
    if (!channel.last_message_at) return '';
    const date = new Date(channel.last_message_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="channel-list-container">
      {/* Search and Create */}
      <div className="channel-header-section">
        <div className="channel-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <button className="create-channel-btn" onClick={() => setShowCreateModal(true)} title="Create Channel or DM">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Filter chips */}
      <div className="channel-filters">
        {(['all', 'unread', 'direct', 'groups'] as FilterType[]).map((f) => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Channel list */}
      <div className="channel-list">
        {loading && channels.length === 0 && (
          <div className="loading">
            <div className="spinner" />
          </div>
        )}

        {error && (
          <div className="error-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error.message}</span>
            <button onClick={refresh}>Retry</button>
          </div>
        )}

        {filteredChannels.map((channel) => (
          <div
            key={channel.id}
            className={`channel-item ${channel.id === selectedId ? 'active' : ''}`}
            onClick={() => onSelect(channel)}
          >
            <div className="channel-icon">
              {getChannelIcon(channel)}
            </div>
            <div className="channel-info">
              <div className="channel-name-row">
                <span className="channel-name">{channel.name || 'Unnamed'}</span>
                <span className="channel-time">{formatLastMessage(channel)}</span>
              </div>
              {channel.last_message && (
                <p className="channel-preview">
                  {channel.last_message.text?.slice(0, 50) || 'No messages yet'}
                  {(channel.last_message.text?.length || 0) > 50 && '...'}
                </p>
              )}
            </div>
            {(channel.unread_count ?? 0) > 0 && (
              <span className="unread-badge">{channel.unread_count}</span>
            )}
          </div>
        ))}

        {!loading && filteredChannels.length === 0 && (
          <div className="empty-channels">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p>{searchQuery ? 'No channels match your search' : 'No channels yet'}</p>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onChannelCreated={() => {
            setShowCreateModal(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
