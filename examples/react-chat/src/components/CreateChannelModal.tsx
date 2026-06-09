import { useEffect, useState } from 'react';
import { useChatContext } from '@chatsdk/react';

interface CreateChannelModalProps {
  onClose: () => void;
  onChannelCreated: () => void;
}

interface DemoUser {
  id: string;
  name: string;
}

export function CreateChannelModal({ onClose, onChannelCreated }: CreateChannelModalProps) {
  const { client } = useChatContext();
  const [channelType, setChannelType] = useState<'group' | 'messaging'>('group');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || channelType !== 'messaging') return;

    let cancelled = false;

    async function loadUsers() {
      setLoadingUsers(true);
      setError(null);

      try {
        const result = await client!.fetch<{ users: DemoUser[] }>('/api/users?limit=100');
        if (cancelled) return;

        const otherUsers = result.users.filter((user) => user.id !== client!.user?.id);
        setUsers(otherUsers);
        setSelectedUserId((current) =>
          current && otherUsers.some((user) => user.id === current)
            ? current
            : otherUsers[0]?.id ?? ''
        );
      } catch (err) {
        if (!cancelled) {
          console.error('Load users error:', err);
          setError(err instanceof Error ? err.message : 'Failed to load users');
        }
      } finally {
        if (!cancelled) {
          setLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [client, channelType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (channelType === 'group' && !name.trim()) {
      setError('Please enter a channel name');
      return;
    }
    if (channelType === 'messaging' && !selectedUserId) {
      setError('Please select a user to message');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      if (!client) {
        throw new Error('User not authenticated. Please refresh the page.');
      }

      if (channelType === 'messaging') {
        await client.createChannel({
          type: 'messaging',
          memberIds: [selectedUserId],
        });
      } else {
        await client.fetch('/api/channels', {
          method: 'POST',
          body: JSON.stringify({
            type: 'group',
            name: name.trim(),
            memberIds: [],
            description: description.trim() || undefined,
            config: { private: isPrivate },
            idempotencyKey: `demo-group:${client.user!.id}:${name.trim().toLowerCase()}`,
          }),
        });
      }

      onChannelCreated();
      onClose();
    } catch (err) {
      console.error('Create channel error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Channel</h2>
          <button className="icon-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label>Channel Type</label>
            <div className="type-selector">
              <button
                type="button"
                className={`type-option ${channelType === 'group' ? 'active' : ''}`}
                onClick={() => setChannelType('group')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <div>
                  <div className="type-title">Group Channel</div>
                  <div className="type-desc">For teams and communities</div>
                </div>
              </button>
              <button
                type="button"
                className={`type-option ${channelType === 'messaging' ? 'active' : ''}`}
                onClick={() => setChannelType('messaging')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <div>
                  <div className="type-title">Direct Message</div>
                  <div className="type-desc">1-on-1 conversation</div>
                </div>
              </button>
            </div>
          </div>

          {channelType === 'group' && (
            <>
              <div className="form-group">
                <label htmlFor="channel-name">Channel Name *</label>
                <input
                  id="channel-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. general, random, announcements"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="channel-desc">Description (optional)</label>
                <textarea
                  id="channel-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this channel about?"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  <span>Make this channel private</span>
                </label>
                <p className="help-text">
                  Private channels can only be accessed by invited members
                </p>
              </div>
            </>
          )}

          {channelType === 'messaging' && (
            <div className="form-group">
              <label htmlFor="user-select">Select User *</label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="user-select"
                disabled={loadingUsers || users.length === 0}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <p className="help-text">
                {loadingUsers
                  ? 'Loading users...'
                  : users.length === 0
                    ? 'No other users are available for a direct message'
                    : 'Start a direct message with this user'}
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={creating}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={
                creating ||
                (channelType === 'group' && !name.trim()) ||
                (channelType === 'messaging' && (!selectedUserId || loadingUsers))
              }
            >
              {creating ? 'Creating...' : channelType === 'group' ? 'Create Channel' : 'Create DM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
