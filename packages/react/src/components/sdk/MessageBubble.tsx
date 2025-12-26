import React, { useState, useEffect } from 'react';

export interface MessageAttachment {
  type: 'image' | 'video' | 'file' | 'audio' | 'link';
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
  users?: { id: string; name: string }[];
}

export interface MessageBubbleProps {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  createdAt: string;
  isOwn?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  replyTo?: {
    id: string;
    text: string;
    user: { name: string };
  };
  edited?: boolean;
  deleted?: boolean;
  pinned?: boolean;
  highlighted?: boolean;
  showAvatar?: boolean;
  showName?: boolean;
  showTimestamp?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onRemoveReaction?: (emoji: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onUserClick?: (userId: string) => void;
  onAttachmentClick?: (attachment: MessageAttachment) => void;
  onRetry?: () => void;
}

export function MessageBubble({
  id,
  text,
  user,
  createdAt,
  isOwn = false,
  status = 'sent',
  attachments = [],
  reactions = [],
  replyTo,
  edited = false,
  deleted = false,
  pinned = false,
  highlighted = false,
  showAvatar = true,
  showName = true,
  showTimestamp = true,
  isFirstInGroup = true,
  isLastInGroup = true,
  onReply,
  onReact,
  onRemoveReaction,
  onEdit,
  onDelete,
  onPin,
  onCopy,
  onForward,
  onUserClick,
  onAttachmentClick,
  onRetry,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-menu]')) {
        setShowMenu(false);
        setShowReactions(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: '8px',
      padding: '2px 16px',
      marginTop: isFirstInGroup ? '8px' : '2px',
      backgroundColor: highlighted ? 'var(--chatsdk-accent-light, #eef2ff)' : 'transparent',
      position: 'relative' as const,
    },
    avatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: 600,
      flexShrink: 0,
      cursor: 'pointer',
      visibility: (showAvatar && isLastInGroup) ? 'visible' : 'hidden' as 'visible' | 'hidden',
    },
    bubbleWrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: isOwn ? 'flex-end' : 'flex-start',
      maxWidth: '70%',
    },
    name: {
      fontSize: '12px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      marginBottom: '4px',
      marginLeft: isOwn ? '0' : '12px',
      marginRight: isOwn ? '12px' : '0',
      cursor: 'pointer',
    },
    bubble: {
      position: 'relative' as const,
      padding: '10px 14px',
      borderRadius: '18px',
      backgroundColor: isOwn
        ? 'var(--chatsdk-message-own-bg, #6366f1)'
        : 'var(--chatsdk-message-other-bg, #f3f4f6)',
      color: isOwn
        ? 'var(--chatsdk-message-own-text, #ffffff)'
        : 'var(--chatsdk-message-other-text, #111827)',
      borderTopLeftRadius: !isOwn && !isFirstInGroup ? '6px' : '18px',
      borderTopRightRadius: isOwn && !isFirstInGroup ? '6px' : '18px',
      borderBottomLeftRadius: !isOwn && !isLastInGroup ? '6px' : '18px',
      borderBottomRightRadius: isOwn && !isLastInGroup ? '6px' : '18px',
    },
    deletedBubble: {
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      fontStyle: 'italic',
      border: '1px dashed var(--chatsdk-border-color, #e5e7eb)',
    },
    pinnedIndicator: {
      position: 'absolute' as const,
      top: '-8px',
      right: isOwn ? 'auto' : '-8px',
      left: isOwn ? '-8px' : 'auto',
      backgroundColor: 'var(--chatsdk-warning-color, #f59e0b)',
      borderRadius: '50%',
      padding: '2px',
      display: 'flex',
    },
    replyPreview: {
      padding: '8px 12px',
      marginBottom: '6px',
      borderRadius: '8px',
      backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      borderLeft: `3px solid ${isOwn ? 'rgba(255,255,255,0.5)' : 'var(--chatsdk-accent-color, #6366f1)'}`,
      fontSize: '12px',
    },
    replyName: {
      fontWeight: 600,
      marginBottom: '2px',
    },
    replyText: {
      opacity: 0.8,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '200px',
    },
    text: {
      fontSize: '14px',
      lineHeight: 1.5,
      wordBreak: 'break-word' as const,
      whiteSpace: 'pre-wrap' as const,
    },
    attachments: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      marginTop: text ? '8px' : '0',
    },
    imageAttachment: {
      maxWidth: '280px',
      maxHeight: '200px',
      borderRadius: '12px',
      cursor: 'pointer',
      objectFit: 'cover' as const,
    },
    fileAttachment: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 14px',
      backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      borderRadius: '10px',
      cursor: 'pointer',
    },
    fileIcon: {
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
    },
    fileInfo: {
      flex: 1,
      minWidth: 0,
    },
    fileName: {
      fontSize: '13px',
      fontWeight: 500,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    fileSize: {
      fontSize: '11px',
      opacity: 0.7,
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: '4px',
      justifyContent: isOwn ? 'flex-end' : 'flex-start',
    },
    timestamp: {
      fontSize: '11px',
      color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    editedBadge: {
      fontSize: '11px',
      opacity: 0.7,
    },
    statusIcon: {
      display: 'flex',
      alignItems: 'center',
    },
    reactions: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '4px',
      marginTop: '6px',
    },
    reaction: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      borderRadius: '12px',
      fontSize: '13px',
      cursor: 'pointer',
    },
    reactionActive: {
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
      borderColor: 'var(--chatsdk-accent-color, #6366f1)',
    },
    actionsBar: {
      position: 'absolute' as const,
      top: '50%',
      transform: 'translateY(-50%)',
      left: isOwn ? '-80px' : 'auto',
      right: isOwn ? 'auto' : '-80px',
      display: 'flex',
      gap: '4px',
      opacity: 0,
      transition: 'opacity 0.15s ease',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      padding: '4px',
    },
    actionButton: {
      padding: '6px',
      background: 'none',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    reactionPicker: {
      position: 'absolute' as const,
      top: '-44px',
      left: isOwn ? 'auto' : '0',
      right: isOwn ? '0' : 'auto',
      display: 'flex',
      gap: '4px',
      padding: '6px 10px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '20px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    emojiButton: {
      padding: '4px 6px',
      background: 'none',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '18px',
      transition: 'transform 0.1s ease',
    },
    menu: {
      position: 'absolute' as const,
      top: '100%',
      left: isOwn ? 'auto' : '0',
      right: isOwn ? '0' : 'auto',
      marginTop: '4px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      zIndex: 50,
      minWidth: '160px',
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
    menuItemDanger: {
      color: 'var(--chatsdk-error-color, #ef4444)',
    },
    failedOverlay: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '4px',
      color: 'var(--chatsdk-error-color, #ef4444)',
      fontSize: '12px',
    },
    retryButton: {
      padding: '4px 8px',
      backgroundColor: 'var(--chatsdk-error-color, #ef4444)',
      color: '#ffffff',
      border: 'none',
      borderRadius: '4px',
      fontSize: '11px',
      cursor: 'pointer',
    },
  };

  const renderStatusIcon = () => {
    if (!isOwn || deleted) return null;

    const iconStyle = { width: '14px', height: '14px' };
    const color = status === 'read' ? 'var(--chatsdk-accent-color, #6366f1)' : 'rgba(255,255,255,0.5)';

    switch (status) {
      case 'sending':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
        );
      case 'sent':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'delivered':
      case 'read':
        return (
          <div style={{ display: 'flex', marginLeft: '-6px' }}>
            <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <svg style={{ ...iconStyle, marginLeft: '-8px' }} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  if (deleted) {
    return (
      <div style={styles.container}>
        {showAvatar && !isOwn && (
          <div style={styles.avatar} onClick={() => onUserClick?.(user.id)}>
            {user.imageUrl ? (
              <img src={user.imageUrl} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              getInitials(user.name)
            )}
          </div>
        )}
        <div style={styles.bubbleWrapper}>
          <div style={{ ...styles.bubble, ...styles.deletedBubble }}>
            <p style={styles.text}>This message was deleted</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={styles.container}
      onMouseEnter={(e) => {
        const actions = e.currentTarget.querySelector('[data-actions]') as HTMLElement;
        if (actions) actions.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        const actions = e.currentTarget.querySelector('[data-actions]') as HTMLElement;
        if (actions) actions.style.opacity = '0';
      }}
    >
      {showAvatar && !isOwn && (
        <div style={styles.avatar} onClick={() => onUserClick?.(user.id)}>
          {user.imageUrl ? (
            <img src={user.imageUrl} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            getInitials(user.name)
          )}
        </div>
      )}

      <div style={styles.bubbleWrapper}>
        {showName && !isOwn && isFirstInGroup && (
          <span style={styles.name} onClick={() => onUserClick?.(user.id)}>
            {user.name}
          </span>
        )}

        <div style={styles.bubble} data-menu>
          {pinned && (
            <div style={styles.pinnedIndicator}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#ffffff">
                <line x1="12" y1="17" x2="12" y2="22" stroke="#ffffff" strokeWidth="2" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" fill="#ffffff" />
              </svg>
            </div>
          )}

          {replyTo && (
            <div style={styles.replyPreview}>
              <div style={styles.replyName}>{replyTo.user.name}</div>
              <div style={styles.replyText}>{replyTo.text}</div>
            </div>
          )}

          {text && <p style={styles.text}>{text}</p>}

          {attachments.length > 0 && (
            <div style={styles.attachments}>
              {attachments.map((att, i) => (
                att.type === 'image' ? (
                  <img
                    key={i}
                    src={att.thumbnailUrl || att.url}
                    alt={att.name}
                    style={styles.imageAttachment}
                    onClick={() => onAttachmentClick?.(att)}
                  />
                ) : att.type === 'video' ? (
                  <video
                    key={i}
                    src={att.url}
                    poster={att.thumbnailUrl}
                    style={styles.imageAttachment}
                    controls
                  />
                ) : (
                  <div key={i} style={styles.fileAttachment} onClick={() => onAttachmentClick?.(att)}>
                    <div style={styles.fileIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div style={styles.fileInfo}>
                      <div style={styles.fileName}>{att.name}</div>
                      {att.size && <div style={styles.fileSize}>{formatFileSize(att.size)}</div>}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {showTimestamp && (
            <div style={styles.footer}>
              {edited && <span style={styles.editedBadge}>(edited)</span>}
              <span style={styles.timestamp}>{formatTime(createdAt)}</span>
              <span style={styles.statusIcon}>{renderStatusIcon()}</span>
            </div>
          )}

          {showReactions && (
            <div style={styles.reactionPicker}>
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  style={styles.emojiButton}
                  onClick={() => {
                    onReact?.(emoji);
                    setShowReactions(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {showMenu && (
            <div style={styles.menu}>
              <button style={styles.menuItem} onClick={() => { onReply?.(); setShowMenu(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
                Reply
              </button>
              <button style={styles.menuItem} onClick={() => { onForward?.(); setShowMenu(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 17 20 12 15 7" />
                  <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                </svg>
                Forward
              </button>
              <button style={styles.menuItem} onClick={() => { onCopy?.(); setShowMenu(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </button>
              <button style={styles.menuItem} onClick={() => { onPin?.(); setShowMenu(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="17" x2="12" y2="22" />
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                </svg>
                {pinned ? 'Unpin' : 'Pin'}
              </button>
              {isOwn && (
                <>
                  <button style={styles.menuItem} onClick={() => { onEdit?.(); setShowMenu(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                  <button style={{ ...styles.menuItem, ...styles.menuItemDanger }} onClick={() => { onDelete?.(); setShowMenu(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {reactions.length > 0 && (
          <div style={styles.reactions}>
            {reactions.map((reaction, i) => (
              <button
                key={i}
                style={{
                  ...styles.reaction,
                  ...(reaction.reacted ? styles.reactionActive : {}),
                }}
                onClick={() => {
                  if (reaction.reacted) {
                    onRemoveReaction?.(reaction.emoji);
                  } else {
                    onReact?.(reaction.emoji);
                  }
                }}
              >
                <span>{reaction.emoji}</span>
                <span style={{ color: 'var(--chatsdk-text-secondary, #6b7280)' }}>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {status === 'failed' && (
          <div style={styles.failedOverlay}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Failed to send
            <button style={styles.retryButton} onClick={onRetry}>Retry</button>
          </div>
        )}

        <div style={styles.actionsBar} data-actions>
          <button
            style={styles.actionButton}
            onClick={(e) => { e.stopPropagation(); setShowReactions(!showReactions); }}
            title="React"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          <button style={styles.actionButton} onClick={onReply} title="Reply">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </button>
          <button
            style={styles.actionButton}
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            title="More"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
