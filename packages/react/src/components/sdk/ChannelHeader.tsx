import React, { useState, useEffect } from 'react';

export interface ChannelHeaderProps {
  channel: {
    id: string;
    name: string;
    description?: string;
    type: 'messaging' | 'team' | 'livestream' | 'commerce' | 'support';
    imageUrl?: string;
    memberCount?: number;
    isPrivate?: boolean;
    isMuted?: boolean;
    isPinned?: boolean;
  };
  members?: {
    id: string;
    name: string;
    imageUrl?: string;
    online?: boolean;
  }[];
  onlineCount?: number;
  typingUsers?: { id: string; name: string }[];
  onMembersClick?: () => void;
  onSearchClick?: () => void;
  onPinClick?: () => void;
  onMuteClick?: () => void;
  onSettingsClick?: () => void;
  onCallClick?: () => void;
  onVideoCallClick?: () => void;
  onBackClick?: () => void;
  showBackButton?: boolean;
}

export function ChannelHeader({
  channel,
  members = [],
  onlineCount = 0,
  typingUsers = [],
  onMembersClick,
  onSearchClick,
  onPinClick,
  onMuteClick,
  onSettingsClick,
  onCallClick,
  onVideoCallClick,
  onBackClick,
  showBackButton = false,
}: ChannelHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMenu && !(e.target as Element).closest('[data-menu]')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusText = () => {
    if (typingUsers.length > 0) {
      if (typingUsers.length === 1) {
        return `${typingUsers[0].name} is typing...`;
      } else if (typingUsers.length === 2) {
        return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
      }
      return `${typingUsers.length} people are typing...`;
    }

    if (channel.type === 'messaging' && members.length === 2) {
      const otherMember = members.find(m => m.online);
      if (otherMember?.online) return 'Online';
      return 'Offline';
    }

    if (onlineCount > 0) {
      return `${onlineCount} online`;
    }

    if (channel.memberCount) {
      return `${channel.memberCount} members`;
    }

    return channel.description || '';
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      minHeight: '64px',
    },
    left: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1,
      minWidth: 0,
    },
    backButton: {
      padding: '8px',
      background: 'none',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: 600,
      flexShrink: 0,
      position: 'relative' as const,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: '10px',
      objectFit: 'cover' as const,
    },
    onlineIndicator: {
      position: 'absolute' as const,
      bottom: '-2px',
      right: '-2px',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-success-color, #10b981)',
      border: '2px solid var(--chatsdk-bg-primary, #ffffff)',
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    name: {
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      margin: 0,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    privateBadge: {
      display: 'flex',
      alignItems: 'center',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    status: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      margin: 0,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    typingStatus: {
      color: 'var(--chatsdk-accent-color, #6366f1)',
      fontStyle: 'italic',
    },
    right: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    memberAvatars: {
      display: 'flex',
      alignItems: 'center',
      marginRight: '8px',
      cursor: 'pointer',
    },
    memberAvatar: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '10px',
      fontWeight: 600,
      border: '2px solid var(--chatsdk-bg-primary, #ffffff)',
      marginLeft: '-8px',
    },
    moreMembers: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      fontSize: '10px',
      fontWeight: 600,
      border: '2px solid var(--chatsdk-bg-primary, #ffffff)',
      marginLeft: '-8px',
    },
    actionButton: {
      padding: '8px',
      background: 'none',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.15s ease',
    },
    actionButtonActive: {
      color: 'var(--chatsdk-accent-color, #6366f1)',
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
    },
    menuContainer: {
      position: 'relative' as const,
    },
    menu: {
      position: 'absolute' as const,
      top: '100%',
      right: '0',
      marginTop: '4px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      zIndex: 50,
      minWidth: '180px',
      overflow: 'hidden',
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 14px',
      fontSize: '14px',
      color: 'var(--chatsdk-text-primary, #111827)',
      cursor: 'pointer',
      border: 'none',
      background: 'none',
      width: '100%',
      textAlign: 'left' as const,
    },
  };

  const isTyping = typingUsers.length > 0;
  const showOnlineIndicator = channel.type === 'messaging' && members.length === 2 && members.some(m => m.online);

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        {showBackButton && (
          <button style={styles.backButton} onClick={onBackClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <div style={styles.avatar}>
          {channel.imageUrl ? (
            <img src={channel.imageUrl} alt={channel.name} style={styles.avatarImage} />
          ) : (
            getInitials(channel.name)
          )}
          {showOnlineIndicator && <div style={styles.onlineIndicator} />}
        </div>

        <div style={styles.info}>
          <div style={styles.nameRow}>
            <h3 style={styles.name}>{channel.name}</h3>
            {channel.isPrivate && (
              <span style={styles.privateBadge}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
            )}
          </div>
          <p style={{ ...styles.status, ...(isTyping ? styles.typingStatus : {}) }}>
            {getStatusText()}
          </p>
        </div>
      </div>

      <div style={styles.right}>
        {members.length > 0 && (
          <div style={styles.memberAvatars} onClick={onMembersClick}>
            {members.slice(0, 3).map((member, i) => (
              <div
                key={member.id}
                style={{ ...styles.memberAvatar, zIndex: 3 - i, marginLeft: i > 0 ? '-8px' : '0' }}
              >
                {member.imageUrl ? (
                  <img
                    src={member.imageUrl}
                    alt={member.name}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(member.name)
                )}
              </div>
            ))}
            {members.length > 3 && (
              <div style={styles.moreMembers}>+{members.length - 3}</div>
            )}
          </div>
        )}

        {onCallClick && (
          <button style={styles.actionButton} onClick={onCallClick} title="Voice call">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
        )}

        {onVideoCallClick && (
          <button style={styles.actionButton} onClick={onVideoCallClick} title="Video call">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
        )}

        <button style={styles.actionButton} onClick={onSearchClick} title="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        <button
          style={{
            ...styles.actionButton,
            ...(channel.isPinned ? styles.actionButtonActive : {}),
          }}
          onClick={onPinClick}
          title={channel.isPinned ? 'Unpin' : 'Pin'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="17" x2="12" y2="22" />
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
          </svg>
        </button>

        <div style={styles.menuContainer} data-menu>
          <button
            style={styles.actionButton}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            title="More options"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {showMenu && (
            <div style={styles.menu}>
              <button style={styles.menuItem} onClick={() => { onMuteClick?.(); setShowMenu(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {channel.isMuted ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </>
                  )}
                </svg>
                {channel.isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button style={styles.menuItem} onClick={() => { onMembersClick?.(); setShowMenu(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                View members
              </button>
              <button style={styles.menuItem} onClick={() => { onSettingsClick?.(); setShowMenu(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Channel settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
