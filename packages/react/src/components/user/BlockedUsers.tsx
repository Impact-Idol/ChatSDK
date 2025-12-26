import React, { useState } from 'react';

export interface BlockedUser {
  id: string;
  userId: string;
  userName: string;
  userImageUrl?: string;
  blockedAt: string;
  reason?: string;
}

export interface BlockedUsersProps {
  blockedUsers: BlockedUser[];
  onUnblock?: (userId: string) => void;
  onBlock?: (userId: string, reason?: string) => void;
  onSearchUser?: (query: string) => Promise<{ id: string; name: string; imageUrl?: string }[]>;
  loading?: boolean;
}

export function BlockedUsers({
  blockedUsers,
  onUnblock,
  onBlock,
  onSearchUser,
  loading = false,
}: BlockedUsersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<{ id: string; name: string; imageUrl?: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; imageUrl?: string } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [searching, setSearching] = useState(false);
  const [confirmUnblock, setConfirmUnblock] = useState<string | null>(null);

  const filteredUsers = blockedUsers.filter((user) =>
    user.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  const handleBlock = () => {
    if (selectedUser) {
      onBlock?.(selectedUser.id, blockReason || undefined);
      setShowBlockModal(false);
      setSelectedUser(null);
      setBlockReason('');
      setUserSearch('');
    }
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
    blockButton: {
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
    searchWrapper: {
      position: 'relative' as const,
      marginBottom: '20px',
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px',
      paddingLeft: '44px',
      borderRadius: '10px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      fontSize: '14px',
      color: 'var(--chatsdk-text-primary, #111827)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    searchIcon: {
      position: 'absolute' as const,
      left: '14px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    list: {
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      overflow: 'hidden',
    },
    userItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px 20px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    avatar: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '16px',
      fontWeight: 600,
      flexShrink: 0,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      objectFit: 'cover' as const,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: '15px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '4px',
    },
    userMeta: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    reason: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      marginTop: '4px',
      fontStyle: 'italic' as const,
    },
    unblockButton: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    confirmButtons: {
      display: 'flex',
      gap: '8px',
    },
    confirmYes: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'var(--chatsdk-error-color, #ef4444)',
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    confirmNo: {
      padding: '8px 16px',
      borderRadius: '8px',
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
      width: '440px',
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
    selectedUserCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
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
    warning: {
      padding: '12px 16px',
      backgroundColor: 'var(--chatsdk-warning-light, #fef3c7)',
      borderRadius: '8px',
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
    },
    warningIcon: {
      color: 'var(--chatsdk-warning-color, #f59e0b)',
      flexShrink: 0,
    },
    warningText: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      lineHeight: 1.5,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Blocked Users</h1>
          <p style={styles.subtitle}>
            Manage users you've blocked from contacting you
          </p>
        </div>
        <button style={styles.blockButton} onClick={() => setShowBlockModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          Block User
        </button>
      </div>

      <div style={styles.searchWrapper}>
        <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          style={styles.searchInput}
          placeholder="Search blocked users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div style={styles.list}>
        {filteredUsers.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <div style={styles.emptyTitle}>
              {searchQuery ? 'No matching users' : 'No blocked users'}
            </div>
            <div style={styles.emptyText}>
              {searchQuery
                ? 'Try a different search term'
                : 'Users you block will appear here'}
            </div>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} style={styles.userItem}>
              <div style={styles.avatar}>
                {user.userImageUrl ? (
                  <img src={user.userImageUrl} alt={user.userName} style={styles.avatarImage} />
                ) : (
                  getInitials(user.userName)
                )}
              </div>
              <div style={styles.userInfo}>
                <div style={styles.userName}>{user.userName}</div>
                <div style={styles.userMeta}>Blocked on {formatDate(user.blockedAt)}</div>
                {user.reason && <div style={styles.reason}>"{user.reason}"</div>}
              </div>
              {confirmUnblock === user.userId ? (
                <div style={styles.confirmButtons}>
                  <button
                    style={styles.confirmYes}
                    onClick={() => {
                      onUnblock?.(user.userId);
                      setConfirmUnblock(null);
                    }}
                  >
                    Unblock
                  </button>
                  <button
                    style={styles.confirmNo}
                    onClick={() => setConfirmUnblock(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  style={styles.unblockButton}
                  onClick={() => setConfirmUnblock(user.userId)}
                >
                  Unblock
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showBlockModal && (
        <div style={styles.modal} onClick={() => setShowBlockModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Block User</h2>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.warning}>
                <svg style={styles.warningIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div style={styles.warningText}>
                  Blocked users won't be able to send you messages, add you to channels, or see your online status.
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>User to block</label>
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
                            setSelectedUser(user);
                            setUserSearch('');
                            setUserResults([]);
                          }}
                        >
                          <div style={{ ...styles.avatar, width: '32px', height: '32px', fontSize: '12px' }}>
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
                {selectedUser && (
                  <div style={styles.selectedUserCard}>
                    <div style={{ ...styles.avatar, width: '32px', height: '32px', fontSize: '12px' }}>
                      {selectedUser.imageUrl ? (
                        <img src={selectedUser.imageUrl} alt={selectedUser.name} style={styles.avatarImage} />
                      ) : (
                        getInitials(selectedUser.name)
                      )}
                    </div>
                    <span style={{ fontWeight: 500 }}>{selectedUser.name}</span>
                    <button
                      style={styles.removeUser}
                      onClick={() => setSelectedUser(null)}
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
                <label style={styles.label}>Reason (optional)</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Why are you blocking this user?"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => {
                  setShowBlockModal(false);
                  setSelectedUser(null);
                  setBlockReason('');
                }}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={handleBlock}
                disabled={!selectedUser}
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
