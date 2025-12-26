import React, { useState, useEffect } from 'react';

export interface ReadReceiptUser {
  id: string;
  name: string;
  imageUrl?: string;
  readAt: string;
}

export interface ReadReceiptsProps {
  readers: ReadReceiptUser[];
  variant?: 'avatars' | 'checkmarks' | 'list' | 'tooltip';
  maxDisplayUsers?: number;
  size?: 'small' | 'medium' | 'large';
  showNames?: boolean;
  showTimestamp?: boolean;
  position?: 'left' | 'right';
  status?: 'sent' | 'delivered' | 'read';
  onUserClick?: (userId: string) => void;
}

export function ReadReceipts({
  readers,
  variant = 'avatars',
  maxDisplayUsers = 5,
  size = 'small',
  showNames = false,
  showTimestamp = false,
  position = 'right',
  status = 'read',
  onUserClick,
}: ReadReceiptsProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const displayReaders = readers.slice(0, maxDisplayUsers);
  const remainingCount = readers.length - maxDisplayUsers;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sizeConfig = {
    small: { avatar: 16, font: 10, checkmark: 14 },
    medium: { avatar: 20, font: 11, checkmark: 16 },
    large: { avatar: 24, font: 12, checkmark: 20 },
  }[size];

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: position === 'right' ? 'flex-end' : 'flex-start',
      gap: '4px',
      position: 'relative' as const,
    },

    // Avatars variant
    avatarGroup: {
      display: 'flex',
      alignItems: 'center',
    },
    avatar: {
      width: `${sizeConfig.avatar}px`,
      height: `${sizeConfig.avatar}px`,
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: `${sizeConfig.font}px`,
      fontWeight: 600,
      border: '1.5px solid var(--chatsdk-bg-primary, #ffffff)',
      marginLeft: '-6px',
      cursor: onUserClick ? 'pointer' : 'default',
    },
    avatarFirst: {
      marginLeft: '0',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      objectFit: 'cover' as const,
    },
    remainingBadge: {
      width: `${sizeConfig.avatar}px`,
      height: `${sizeConfig.avatar}px`,
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      fontSize: `${sizeConfig.font - 1}px`,
      fontWeight: 600,
      border: '1.5px solid var(--chatsdk-bg-primary, #ffffff)',
      marginLeft: '-6px',
    },

    // Checkmarks variant
    checkmarksContainer: {
      display: 'flex',
      alignItems: 'center',
    },
    checkmark: {
      color: status === 'read'
        ? 'var(--chatsdk-accent-color, #6366f1)'
        : status === 'delivered'
          ? 'var(--chatsdk-text-tertiary, #9ca3af)'
          : 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    checkmarkSingle: {
      marginLeft: '-8px',
    },

    // List variant
    listContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      padding: '8px 0',
    },
    listItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '4px 0',
      cursor: onUserClick ? 'pointer' : 'default',
    },
    listAvatar: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '11px',
      fontWeight: 600,
      flexShrink: 0,
    },
    listInfo: {
      flex: 1,
      minWidth: 0,
    },
    listName: {
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    listTime: {
      fontSize: '11px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    listCheck: {
      color: 'var(--chatsdk-accent-color, #6366f1)',
      flexShrink: 0,
    },

    // Tooltip
    tooltip: {
      position: 'absolute' as const,
      bottom: '100%',
      right: position === 'right' ? '0' : 'auto',
      left: position === 'left' ? '0' : 'auto',
      marginBottom: '8px',
      padding: '8px 12px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      minWidth: '160px',
      maxWidth: '240px',
      zIndex: 50,
    },
    tooltipHeader: {
      fontSize: '11px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      marginBottom: '8px',
    },
    tooltipList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
    },
    tooltipItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    tooltipAvatar: {
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '9px',
      fontWeight: 600,
    },
    tooltipName: {
      flex: 1,
      fontSize: '12px',
      color: 'var(--chatsdk-text-primary, #111827)',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    tooltipTime: {
      fontSize: '11px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      flexShrink: 0,
    },

    // Names display
    namesText: {
      fontSize: `${sizeConfig.font + 1}px`,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      whiteSpace: 'nowrap' as const,
    },
  };

  const renderAvatar = (user: ReadReceiptUser, index: number) => {
    const style = {
      ...styles.avatar,
      ...(index === 0 ? styles.avatarFirst : {}),
      zIndex: displayReaders.length - index,
    };

    return (
      <div
        key={user.id}
        style={style}
        onClick={() => onUserClick?.(user.id)}
        title={`${user.name} - Read ${formatTime(user.readAt)}`}
      >
        {user.imageUrl ? (
          <img src={user.imageUrl} alt={user.name} style={styles.avatarImage} />
        ) : (
          getInitials(user.name)
        )}
      </div>
    );
  };

  const renderCheckmarks = () => {
    const checkmarkSize = sizeConfig.checkmark;

    if (status === 'sent') {
      return (
        <svg
          width={checkmarkSize}
          height={checkmarkSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={styles.checkmark}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }

    // Double checkmarks for delivered/read
    return (
      <div style={styles.checkmarksContainer}>
        <svg
          width={checkmarkSize}
          height={checkmarkSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={styles.checkmark}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg
          width={checkmarkSize}
          height={checkmarkSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ ...styles.checkmark, ...styles.checkmarkSingle }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  };

  if (variant === 'checkmarks') {
    return (
      <div style={styles.container}>
        {renderCheckmarks()}
        {showNames && readers.length > 0 && (
          <span style={styles.namesText}>
            {readers.length === 1
              ? `Read by ${readers[0].name}`
              : `Read by ${readers.length}`}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'list') {
    if (readers.length === 0) {
      return (
        <div style={{ ...styles.listContainer, padding: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--chatsdk-text-tertiary, #9ca3af)' }}>
            No one has read this message yet
          </span>
        </div>
      );
    }

    return (
      <div style={styles.listContainer}>
        {readers.map((reader) => (
          <div
            key={reader.id}
            style={styles.listItem}
            onClick={() => onUserClick?.(reader.id)}
          >
            <div style={styles.listAvatar}>
              {reader.imageUrl ? (
                <img src={reader.imageUrl} alt={reader.name} style={styles.avatarImage} />
              ) : (
                getInitials(reader.name)
              )}
            </div>
            <div style={styles.listInfo}>
              <div style={styles.listName}>{reader.name}</div>
              {showTimestamp && (
                <div style={styles.listTime}>{formatTime(reader.readAt)}</div>
              )}
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={styles.listCheck}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'tooltip') {
    return (
      <div
        style={styles.container}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div style={styles.avatarGroup}>
          {displayReaders.map((reader, i) => renderAvatar(reader, i))}
          {remainingCount > 0 && (
            <div style={styles.remainingBadge}>+{remainingCount}</div>
          )}
        </div>

        {showTooltip && readers.length > 0 && (
          <div style={styles.tooltip}>
            <div style={styles.tooltipHeader}>
              Read by {readers.length}
            </div>
            <div style={styles.tooltipList}>
              {readers.slice(0, 8).map((reader) => (
                <div key={reader.id} style={styles.tooltipItem}>
                  <div style={styles.tooltipAvatar}>
                    {reader.imageUrl ? (
                      <img src={reader.imageUrl} alt={reader.name} style={styles.avatarImage} />
                    ) : (
                      getInitials(reader.name)
                    )}
                  </div>
                  <span style={styles.tooltipName}>{reader.name}</span>
                  <span style={styles.tooltipTime}>{formatTime(reader.readAt)}</span>
                </div>
              ))}
              {readers.length > 8 && (
                <div style={{ fontSize: '11px', color: 'var(--chatsdk-text-tertiary, #9ca3af)', textAlign: 'center', paddingTop: '4px' }}>
                  and {readers.length - 8} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default avatars variant
  if (readers.length === 0) {
    return (
      <div style={styles.container}>
        {renderCheckmarks()}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.avatarGroup}>
        {displayReaders.map((reader, i) => renderAvatar(reader, i))}
        {remainingCount > 0 && (
          <div style={styles.remainingBadge}>+{remainingCount}</div>
        )}
      </div>
      {showNames && (
        <span style={styles.namesText}>
          {readers.length === 1 ? readers[0].name : `${readers.length} read`}
        </span>
      )}
    </div>
  );
}
