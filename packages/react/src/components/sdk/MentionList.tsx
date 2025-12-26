import React, { useState, useEffect, useRef } from 'react';

export interface MentionUser {
  id: string;
  name: string;
  username?: string;
  imageUrl?: string;
  online?: boolean;
  role?: string;
}

export interface MentionChannel {
  id: string;
  name: string;
  type: 'public' | 'private';
  memberCount?: number;
}

export interface MentionCommand {
  name: string;
  description: string;
  args?: string;
}

export type MentionItem =
  | { type: 'user'; data: MentionUser }
  | { type: 'channel'; data: MentionChannel }
  | { type: 'command'; data: MentionCommand };

export interface MentionListProps {
  items: MentionItem[];
  loading?: boolean;
  searchQuery?: string;
  selectedIndex?: number;
  onSelect?: (item: MentionItem) => void;
  onClose?: () => void;
  position?: { top: number; left: number };
  maxHeight?: number;
  showHeader?: boolean;
}

export function MentionList({
  items,
  loading = false,
  searchQuery = '',
  selectedIndex = 0,
  onSelect,
  onClose,
  position,
  maxHeight = 300,
  showHeader = true,
}: MentionListProps) {
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (items[activeIndex]) {
            onSelect?.(items[activeIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, items, onSelect, onClose]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <strong key={i} style={{ color: 'var(--chatsdk-accent-color, #6366f1)' }}>{part}</strong>
      ) : (
        part
      )
    );
  };

  const groupedItems = items.reduce((acc, item) => {
    const type = item.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, MentionItem[]>);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: position ? 'absolute' : 'relative',
      top: position?.top,
      left: position?.left,
      width: '280px',
      maxHeight: `${maxHeight}px`,
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      overflow: 'hidden',
      zIndex: 100,
    },
    header: {
      padding: '10px 14px',
      borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
    },
    headerText: {
      fontSize: '11px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    content: {
      overflowY: 'auto' as const,
      maxHeight: `${maxHeight - 40}px`,
    },
    section: {
      padding: '6px 0',
    },
    sectionTitle: {
      padding: '6px 14px',
      fontSize: '11px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    item: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 14px',
      cursor: 'pointer',
      transition: 'background-color 0.1s ease',
    },
    itemActive: {
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
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
      position: 'relative' as const,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      objectFit: 'cover' as const,
    },
    onlineIndicator: {
      position: 'absolute' as const,
      bottom: '0',
      right: '0',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-success-color, #10b981)',
      border: '2px solid var(--chatsdk-bg-primary, #ffffff)',
    },
    channelIcon: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      flexShrink: 0,
    },
    commandIcon: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--chatsdk-accent-color, #6366f1)',
      flexShrink: 0,
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    username: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    meta: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    roleBadge: {
      fontSize: '10px',
      fontWeight: 500,
      padding: '2px 6px',
      borderRadius: '4px',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    loading: {
      padding: '20px',
      textAlign: 'center' as const,
    },
    loadingDots: {
      display: 'flex',
      justifyContent: 'center',
      gap: '4px',
    },
    loadingDot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-text-tertiary, #9ca3af)',
      animation: 'pulse 1.5s ease-in-out infinite',
    },
    empty: {
      padding: '24px',
      textAlign: 'center' as const,
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      fontSize: '13px',
    },
  };

  let flatIndex = -1;

  const renderUserItem = (item: MentionItem, index: number) => {
    if (item.type !== 'user') return null;
    const { data } = item;
    flatIndex++;
    const currentIndex = flatIndex;

    return (
      <div
        key={`user-${data.id}`}
        ref={(el) => { itemRefs.current[currentIndex] = el; }}
        style={{
          ...styles.item,
          ...(currentIndex === activeIndex ? styles.itemActive : {}),
        }}
        onClick={() => onSelect?.(item)}
        onMouseEnter={() => setActiveIndex(currentIndex)}
      >
        <div style={styles.avatar}>
          {data.imageUrl ? (
            <img src={data.imageUrl} alt={data.name} style={styles.avatarImage} />
          ) : (
            getInitials(data.name)
          )}
          {data.online && <div style={styles.onlineIndicator} />}
        </div>
        <div style={styles.info}>
          <div style={styles.name}>{highlightMatch(data.name, searchQuery)}</div>
          {data.username && (
            <div style={styles.username}>@{highlightMatch(data.username, searchQuery)}</div>
          )}
        </div>
        {data.role && (
          <span style={styles.roleBadge}>{data.role}</span>
        )}
      </div>
    );
  };

  const renderChannelItem = (item: MentionItem) => {
    if (item.type !== 'channel') return null;
    const { data } = item;
    flatIndex++;
    const currentIndex = flatIndex;

    return (
      <div
        key={`channel-${data.id}`}
        ref={(el) => { itemRefs.current[currentIndex] = el; }}
        style={{
          ...styles.item,
          ...(currentIndex === activeIndex ? styles.itemActive : {}),
        }}
        onClick={() => onSelect?.(item)}
        onMouseEnter={() => setActiveIndex(currentIndex)}
      >
        <div style={styles.channelIcon}>
          {data.type === 'private' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
              <line x1="10" y1="3" x2="8" y2="21" />
              <line x1="16" y1="3" x2="14" y2="21" />
            </svg>
          )}
        </div>
        <div style={styles.info}>
          <div style={styles.name}>#{highlightMatch(data.name, searchQuery)}</div>
          {data.memberCount !== undefined && (
            <div style={styles.meta}>{data.memberCount} members</div>
          )}
        </div>
      </div>
    );
  };

  const renderCommandItem = (item: MentionItem) => {
    if (item.type !== 'command') return null;
    const { data } = item;
    flatIndex++;
    const currentIndex = flatIndex;

    return (
      <div
        key={`command-${data.name}`}
        ref={(el) => { itemRefs.current[currentIndex] = el; }}
        style={{
          ...styles.item,
          ...(currentIndex === activeIndex ? styles.itemActive : {}),
        }}
        onClick={() => onSelect?.(item)}
        onMouseEnter={() => setActiveIndex(currentIndex)}
      >
        <div style={styles.commandIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
        <div style={styles.info}>
          <div style={styles.name}>
            /{highlightMatch(data.name, searchQuery)}
            {data.args && (
              <span style={{ color: 'var(--chatsdk-text-tertiary, #9ca3af)', fontWeight: 400 }}>
                {' '}{data.args}
              </span>
            )}
          </div>
          <div style={styles.meta}>{data.description}</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div ref={containerRef} style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ ...styles.loadingDot, animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div ref={containerRef} style={styles.container}>
        <div style={styles.empty}>
          No results found
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={styles.container}>
      {showHeader && (
        <div style={styles.header}>
          <span style={styles.headerText}>
            {searchQuery ? `Results for "${searchQuery}"` : 'Suggestions'}
          </span>
        </div>
      )}
      <div style={styles.content}>
        {groupedItems.user && groupedItems.user.length > 0 && (
          <div style={styles.section}>
            {Object.keys(groupedItems).length > 1 && (
              <div style={styles.sectionTitle}>People</div>
            )}
            {groupedItems.user.map((item, i) => renderUserItem(item, i))}
          </div>
        )}
        {groupedItems.channel && groupedItems.channel.length > 0 && (
          <div style={styles.section}>
            {Object.keys(groupedItems).length > 1 && (
              <div style={styles.sectionTitle}>Channels</div>
            )}
            {groupedItems.channel.map(renderChannelItem)}
          </div>
        )}
        {groupedItems.command && groupedItems.command.length > 0 && (
          <div style={styles.section}>
            {Object.keys(groupedItems).length > 1 && (
              <div style={styles.sectionTitle}>Commands</div>
            )}
            {groupedItems.command.map(renderCommandItem)}
          </div>
        )}
      </div>
    </div>
  );
}
