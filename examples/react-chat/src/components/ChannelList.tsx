import { useChannels } from '@chatsdk/react';
import type { Channel } from '@chatsdk/core';

interface ChannelListProps {
  selectedId?: string;
  onSelect: (channel: Channel) => void;
}

export function ChannelList({ selectedId, onSelect }: ChannelListProps) {
  const { channels, loading, error, refresh } = useChannels();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Channels</h1>
        <button onClick={refresh} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      <div className="channel-list">
        {loading && channels.length === 0 && (
          <div className="loading">
            <div className="spinner" />
          </div>
        )}

        {error && (
          <div style={{ padding: 16, color: '#ef4444' }}>
            Error: {error.message}
          </div>
        )}

        {channels.map((channel) => (
          <div
            key={channel.id}
            className={`channel-item ${channel.id === selectedId ? 'active' : ''}`}
            onClick={() => onSelect(channel)}
          >
            <span className="name">{channel.name || 'Unnamed Channel'}</span>
            {(channel.unread_count ?? 0) > 0 && (
              <span className="unread">{channel.unread_count}</span>
            )}
          </div>
        ))}

        {!loading && channels.length === 0 && (
          <div style={{ padding: 16, color: '#6b7280', textAlign: 'center' }}>
            No channels yet
          </div>
        )}
      </div>
    </aside>
  );
}
