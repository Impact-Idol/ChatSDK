import React, { useState } from 'react';

export interface BannedUser {
  id: string;
  userId: string;
  userName: string;
  userImageUrl?: string;
  reason: string;
  type: 'ban' | 'mute' | 'shadow_ban';
  channelId?: string;
  channelName?: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface BanManagerProps {
  bans: BannedUser[];
  onBanUser?: (data: {
    userId: string;
    reason: string;
    type: 'ban' | 'mute' | 'shadow_ban';
    channelId?: string;
    duration?: number;
  }) => void;
  onUnban?: (banId: string) => void;
  onSearchUser?: (query: string) => Promise<{ id: string; name: string; imageUrl?: string }[]>;
  loading?: boolean;
}

export function BanManager({
  bans,
  onBanUser,
  onUnban,
  onSearchUser,
  loading = false,
}: BanManagerProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'ban' | 'mute' | 'shadow_ban'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBan, setNewBan] = useState({
    userId: '',
    userName: '',
    reason: '',
    type: 'ban' as 'ban' | 'mute' | 'shadow_ban',
    channelId: '',
    duration: 0,
  });
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<{ id: string; name: string; imageUrl?: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const filteredBans = bans.filter((ban) => {
    const matchesTab = activeTab === 'all' || ban.type === activeTab;
    const matchesSearch =
      ban.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ban.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ban':
        return 'Banned';
      case 'mute':
        return 'Muted';
      case 'shadow_ban':
        return 'Shadow Banned';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ban':
        return { bg: 'var(--chatsdk-error-light, #fee2e2)', text: 'var(--chatsdk-error-color, #ef4444)' };
      case 'mute':
        return { bg: 'var(--chatsdk-warning-light, #fef3c7)', text: 'var(--chatsdk-warning-color, #f59e0b)' };
      case 'shadow_ban':
        return { bg: 'var(--chatsdk-bg-tertiary, #e5e7eb)', text: 'var(--chatsdk-text-secondary, #6b7280)' };
      default:
        return { bg: 'var(--chatsdk-bg-tertiary, #e5e7eb)', text: 'var(--chatsdk-text-secondary, #6b7280)' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleUserSearch = async (query: string) => {
    setUserSearch(query);
    if (query.length < 2) {
      setUserResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await onSearchUser?.(query);
      setUserResults(results || []);
    } catch {
      setUserResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmitBan = () => {
    onBanUser?.({
      userId: newBan.userId,
      reason: newBan.reason,
      type: newBan.type,
      channelId: newBan.channelId || undefined,
      duration: newBan.duration || undefined,
    });
    setShowAddModal(false);
    setNewBan({
      userId: '',
      userName: '',
      reason: '',
      type: 'ban',
      channelId: '',
      duration: 0,
    });
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      padding: '24px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      minHeight: '100vh',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    },
    titleSection: {},
    title: {
      fontSize: '24px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      margin: 0,
      marginBottom: '4px',
    },
    subtitle: {
      fontSize: '14px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      margin: 0,
    },
    addButton: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'var(--chatsdk-error-color, #ef4444)',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    controls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    tabs: {
      display: 'flex',
      gap: '4px',
      padding: '4px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '10px',
    },
    tab: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'transparent',
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    tabActive: {
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      color: 'var(--chatsdk-text-primary, #111827)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    searchInput: {
      padding: '10px 16px',
      paddingLeft: '40px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      fontSize: '14px',
      color: 'var(--chatsdk-text-primary, #111827)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      outline: 'none',
      width: '280px',
    },
    searchWrapper: {
      position: 'relative' as const,
    },
    searchIcon: {
      position: 'absolute' as const,
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    th: {
      textAlign: 'left' as const,
      padding: '14px 16px',
      fontSize: '12px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    td: {
      padding: '16px',
      fontSize: '14px',
      color: 'var(--chatsdk-text-primary, #111827)',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    userCell: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    avatar: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: 600,
      flexShrink: 0,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      objectFit: 'cover' as const,
    },
    userName: {
      fontWeight: 500,
    },
    userId: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 500,
    },
    reason: {
      maxWidth: '300px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    unbanButton: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    emptyState: {
      padding: '60px 24px',
      textAlign: 'center' as const,
    },
    emptyIcon: {
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      margin: '0 auto 16px',
    },
    emptyTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '4px',
    },
    emptyText: {
      fontSize: '14px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    modal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      width: '480px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    },
    modalHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      margin: 0,
    },
    modalBody: {
      padding: '24px',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '8px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      fontSize: '14px',
      color: 'var(--chatsdk-text-primary, #111827)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      fontSize: '14px',
      color: 'var(--chatsdk-text-primary, #111827)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      outline: 'none',
      minHeight: '80px',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      fontSize: '14px',
      color: 'var(--chatsdk-text-primary, #111827)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      outline: 'none',
      cursor: 'pointer',
    },
    userSearchResults: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      zIndex: 10,
      maxHeight: '200px',
      overflowY: 'auto' as const,
    },
    userSearchItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 12px',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
    },
    selectedUser: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '8px',
      marginTop: '8px',
    },
    removeUser: {
      marginLeft: 'auto',
      background: 'none',
      border: 'none',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      cursor: 'pointer',
      padding: '4px',
    },
    modalFooter: {
      padding: '16px 24px',
      borderTop: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    buttonPrimary: {
      backgroundColor: 'var(--chatsdk-error-color, #ef4444)',
      color: '#ffffff',
    },
    buttonSecondary: {
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Ban Manager</h1>
          <p style={styles.subtitle}>Manage banned, muted, and shadow banned users</p>
        </div>
        <button style={styles.addButton} onClick={() => setShowAddModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Add Ban
        </button>
      </div>

      <div style={styles.controls}>
        <div style={styles.tabs}>
          {(['all', 'ban', 'mute', 'shadow_ban'] as const).map((tab) => (
            <button
              key={tab}
              style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' ? 'All' : getTypeLabel(tab)}
              {tab !== 'all' && (
                <span style={{ marginLeft: '6px', opacity: 0.7 }}>
                  ({bans.filter((b) => b.type === tab).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={styles.searchWrapper}>
          <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search users or reasons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>User</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Reason</th>
            <th style={styles.th}>Channel</th>
            <th style={styles.th}>Expires</th>
            <th style={styles.th}>Banned By</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {filteredBans.length === 0 ? (
            <tr>
              <td colSpan={8}>
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  </div>
                  <div style={styles.emptyTitle}>No bans found</div>
                  <div style={styles.emptyText}>
                    {searchQuery ? 'Try a different search term' : 'No users have been banned yet'}
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            filteredBans.map((ban) => {
              const typeColor = getTypeColor(ban.type);
              return (
                <tr key={ban.id}>
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      <div style={styles.avatar}>
                        {ban.userImageUrl ? (
                          <img src={ban.userImageUrl} alt={ban.userName} style={styles.avatarImage} />
                        ) : (
                          getInitials(ban.userName)
                        )}
                      </div>
                      <div>
                        <div style={styles.userName}>{ban.userName}</div>
                        <div style={styles.userId}>{ban.userId}</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor: typeColor.bg,
                        color: typeColor.text,
                      }}
                    >
                      {getTypeLabel(ban.type)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.reason} title={ban.reason}>
                      {ban.reason}
                    </div>
                  </td>
                  <td style={styles.td}>
                    {ban.channelName ? (
                      <span style={{ color: 'var(--chatsdk-text-secondary, #6b7280)' }}>
                        #{ban.channelName}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--chatsdk-text-tertiary, #9ca3af)' }}>Global</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {ban.expiresAt ? (
                      formatDate(ban.expiresAt)
                    ) : (
                      <span style={{ color: 'var(--chatsdk-text-tertiary, #9ca3af)' }}>Never</span>
                    )}
                  </td>
                  <td style={styles.td}>{ban.createdByName}</td>
                  <td style={styles.td}>{formatDate(ban.createdAt)}</td>
                  <td style={styles.td}>
                    <button style={styles.unbanButton} onClick={() => onUnban?.(ban.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {showAddModal && (
        <div style={styles.modal} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add Ban</h2>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>User</label>
                <div style={{ position: 'relative' as const }}>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Search for a user..."
                    value={userSearch}
                    onChange={(e) => handleUserSearch(e.target.value)}
                  />
                  {userResults.length > 0 && (
                    <div style={styles.userSearchResults}>
                      {userResults.map((user) => (
                        <div
                          key={user.id}
                          style={styles.userSearchItem}
                          onClick={() => {
                            setNewBan({ ...newBan, userId: user.id, userName: user.name });
                            setUserSearch('');
                            setUserResults([]);
                          }}
                        >
                          <div style={{ ...styles.avatar, width: '28px', height: '28px', fontSize: '10px' }}>
                            {user.imageUrl ? (
                              <img src={user.imageUrl} alt={user.name} style={styles.avatarImage} />
                            ) : (
                              getInitials(user.name)
                            )}
                          </div>
                          <span>{user.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {newBan.userId && (
                  <div style={styles.selectedUser}>
                    <div style={{ ...styles.avatar, width: '24px', height: '24px', fontSize: '9px' }}>
                      {getInitials(newBan.userName)}
                    </div>
                    <span>{newBan.userName}</span>
                    <button
                      style={styles.removeUser}
                      onClick={() => setNewBan({ ...newBan, userId: '', userName: '' })}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Type</label>
                <select
                  style={styles.select}
                  value={newBan.type}
                  onChange={(e) => setNewBan({ ...newBan, type: e.target.value as any })}
                >
                  <option value="ban">Ban - User cannot access chat</option>
                  <option value="mute">Mute - User cannot send messages</option>
                  <option value="shadow_ban">Shadow Ban - Messages only visible to user</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Reason</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Enter the reason for this action..."
                  value={newBan.reason}
                  onChange={(e) => setNewBan({ ...newBan, reason: e.target.value })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Duration (hours, 0 = permanent)</label>
                <input
                  type="number"
                  style={styles.input}
                  placeholder="0"
                  value={newBan.duration || ''}
                  onChange={(e) => setNewBan({ ...newBan, duration: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={handleSubmitBan}
                disabled={!newBan.userId || !newBan.reason}
              >
                Add Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
