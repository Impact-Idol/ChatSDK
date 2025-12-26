import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

// =============================================================================
// TYPES
// =============================================================================

export type SearchResultType = 'message' | 'channel' | 'user' | 'file';

export interface MessageResult {
  id: string;
  type: 'message';
  text: string;
  highlightedText?: string;
  user: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  channel: {
    id: string;
    name: string;
    cid: string;
  };
  createdAt: string;
  attachmentCount?: number;
  reactionCount?: number;
  replyCount?: number;
}

export interface ChannelResult {
  id: string;
  type: 'channel';
  name: string;
  description?: string;
  imageUrl?: string;
  cid: string;
  memberCount: number;
  lastMessageAt?: string;
}

export interface UserResult {
  id: string;
  type: 'user';
  name: string;
  imageUrl?: string;
  presence: 'online' | 'away' | 'busy' | 'offline';
  role?: string;
  bio?: string;
}

export interface FileResult {
  id: string;
  type: 'file';
  name: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: {
    id: string;
    name: string;
  };
  channel: {
    id: string;
    name: string;
  };
  uploadedAt: string;
}

export type SearchResult = MessageResult | ChannelResult | UserResult | FileResult;

export interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  loading?: boolean;
  totalCount?: number;
  activeFilter?: SearchResultType | 'all';
  onFilterChange?: (filter: SearchResultType | 'all') => void;
  onResultClick?: (result: SearchResult) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const MessageSquareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const HashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const UsersIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const MessageCircleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

const HeartIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const PaperclipIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const ImageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const LoaderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getPresenceColor = (presence: UserResult['presence']): string => {
  switch (presence) {
    case 'online': return 'var(--chatsdk-success)';
    case 'away': return 'var(--chatsdk-warning)';
    case 'busy': return 'var(--chatsdk-error)';
    case 'offline': return 'var(--chatsdk-text-tertiary)';
    default: return 'var(--chatsdk-text-tertiary)';
  }
};

const getFileTypeIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon />;
  return <FileIcon />;
};

const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} style={{
        backgroundColor: 'var(--chatsdk-warning)',
        color: 'inherit',
        padding: '0 2px',
        borderRadius: '2px',
      }}>
        {part}
      </mark>
    ) : part
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: 'var(--chatsdk-bg-primary)',
  },

  header: {
    padding: '20px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
  },

  queryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },

  queryIcon: {
    color: 'var(--chatsdk-text-tertiary)',
  },

  queryText: {
    fontSize: '14px',
    color: 'var(--chatsdk-text-tertiary)',
  },

  queryValue: {
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
  },

  resultCount: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-tertiary)',
  },

  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    overflowX: 'auto' as const,
  },

  filterChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'var(--chatsdk-bg-primary)',
    border: '1px solid var(--chatsdk-border-light)',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s ease',
  },

  filterChipActive: {
    backgroundColor: 'var(--chatsdk-primary)',
    borderColor: 'var(--chatsdk-primary)',
    color: 'white',
  },

  filterCount: {
    padding: '1px 6px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
  },

  resultsList: {
    flex: 1,
    overflowY: 'auto' as const,
  },

  section: {
    borderBottom: '1px solid var(--chatsdk-border-light)',
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 5,
  },

  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },

  sectionCount: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-tertiary)',
  },

  viewAllButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--chatsdk-primary)',
    cursor: 'pointer',
  },

  resultItem: {
    display: 'flex',
    gap: '12px',
    padding: '14px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    borderBottom: '1px solid var(--chatsdk-border-light)',
  },

  resultItemHover: {
    backgroundColor: 'var(--chatsdk-bg-secondary)',
  },

  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    objectFit: 'cover' as const,
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    flexShrink: 0,
  },

  userAvatar: {
    borderRadius: '50%',
    position: 'relative' as const,
  },

  presenceIndicator: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '2px solid var(--chatsdk-bg-primary)',
  },

  iconPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '10px',
    color: 'var(--chatsdk-text-secondary)',
    flexShrink: 0,
  },

  resultContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },

  resultTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  resultSubtitle: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    lineHeight: 1.4,
  },

  resultMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '4px',
    flexWrap: 'wrap' as const,
  },

  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--chatsdk-text-tertiary)',
  },

  channelBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'var(--chatsdk-text-secondary)',
  },

  loadMore: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    borderTop: '1px solid var(--chatsdk-border-light)',
  },

  loadMoreButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    border: '1px solid var(--chatsdk-border-light)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    textAlign: 'center' as const,
  },

  emptyIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '50%',
    marginBottom: '16px',
    color: 'var(--chatsdk-text-tertiary)',
  },

  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
    marginBottom: '8px',
  },

  emptyDescription: {
    fontSize: '14px',
    color: 'var(--chatsdk-text-tertiary)',
    maxWidth: '300px',
  },

  skeleton: {
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: '16px',
  },

  loadingText: {
    fontSize: '14px',
    color: 'var(--chatsdk-text-tertiary)',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  results,
  loading = false,
  totalCount,
  activeFilter = 'all',
  onFilterChange,
  onResultClick,
  onLoadMore,
  hasMore = false,
  className,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const groupedResults = useMemo(() => {
    const groups: Record<SearchResultType, SearchResult[]> = {
      message: [],
      channel: [],
      user: [],
      file: [],
    };

    results.forEach(result => {
      groups[result.type].push(result);
    });

    return groups;
  }, [results]);

  const filterCounts = useMemo(() => ({
    all: results.length,
    message: groupedResults.message.length,
    channel: groupedResults.channel.length,
    user: groupedResults.user.length,
    file: groupedResults.file.length,
  }), [results, groupedResults]);

  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return results.filter(r => r.type === activeFilter);
  }, [results, activeFilter]);

  const renderMessageResult = (result: MessageResult) => (
    <div
      key={result.id}
      style={{
        ...styles.resultItem,
        ...(hoveredItem === result.id ? styles.resultItemHover : {}),
      }}
      onMouseEnter={() => setHoveredItem(result.id)}
      onMouseLeave={() => setHoveredItem(null)}
      onClick={() => onResultClick?.(result)}
    >
      {result.user.imageUrl ? (
        <img src={result.user.imageUrl} alt="" style={styles.avatar} />
      ) : (
        <div style={styles.iconPlaceholder}>
          <UserIcon />
        </div>
      )}
      <div style={styles.resultContent}>
        <div style={styles.resultTitle}>{result.user.name}</div>
        <div style={styles.resultSubtitle}>
          {highlightText(result.text, query)}
        </div>
        <div style={styles.resultMeta}>
          <span style={styles.channelBadge}>
            <HashIcon />
            {result.channel.name}
          </span>
          <span style={styles.metaItem}>
            {formatDate(result.createdAt)}
          </span>
          {result.replyCount && result.replyCount > 0 && (
            <span style={styles.metaItem}>
              <MessageCircleIcon />
              {result.replyCount}
            </span>
          )}
          {result.reactionCount && result.reactionCount > 0 && (
            <span style={styles.metaItem}>
              <HeartIcon />
              {result.reactionCount}
            </span>
          )}
          {result.attachmentCount && result.attachmentCount > 0 && (
            <span style={styles.metaItem}>
              <PaperclipIcon />
              {result.attachmentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderChannelResult = (result: ChannelResult) => (
    <div
      key={result.id}
      style={{
        ...styles.resultItem,
        ...(hoveredItem === result.id ? styles.resultItemHover : {}),
      }}
      onMouseEnter={() => setHoveredItem(result.id)}
      onMouseLeave={() => setHoveredItem(null)}
      onClick={() => onResultClick?.(result)}
    >
      {result.imageUrl ? (
        <img src={result.imageUrl} alt="" style={styles.avatar} />
      ) : (
        <div style={styles.iconPlaceholder}>
          <HashIcon />
        </div>
      )}
      <div style={styles.resultContent}>
        <div style={styles.resultTitle}>
          {highlightText(result.name, query)}
        </div>
        {result.description && (
          <div style={styles.resultSubtitle}>
            {highlightText(result.description, query)}
          </div>
        )}
        <div style={styles.resultMeta}>
          <span style={styles.metaItem}>
            <UsersIcon />
            {result.memberCount} members
          </span>
          {result.lastMessageAt && (
            <span style={styles.metaItem}>
              Last active {formatDate(result.lastMessageAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderUserResult = (result: UserResult) => (
    <div
      key={result.id}
      style={{
        ...styles.resultItem,
        ...(hoveredItem === result.id ? styles.resultItemHover : {}),
      }}
      onMouseEnter={() => setHoveredItem(result.id)}
      onMouseLeave={() => setHoveredItem(null)}
      onClick={() => onResultClick?.(result)}
    >
      <div style={{ position: 'relative' as const }}>
        {result.imageUrl ? (
          <img src={result.imageUrl} alt="" style={{ ...styles.avatar, ...styles.userAvatar }} />
        ) : (
          <div style={{ ...styles.iconPlaceholder, borderRadius: '50%' }}>
            <UserIcon />
          </div>
        )}
        <div
          style={{
            ...styles.presenceIndicator,
            backgroundColor: getPresenceColor(result.presence),
          }}
        />
      </div>
      <div style={styles.resultContent}>
        <div style={styles.resultTitle}>
          {highlightText(result.name, query)}
        </div>
        {result.bio && (
          <div style={styles.resultSubtitle}>
            {highlightText(result.bio, query)}
          </div>
        )}
        <div style={styles.resultMeta}>
          {result.role && (
            <span style={styles.metaItem}>
              {result.role}
            </span>
          )}
          <span style={styles.metaItem}>
            {result.presence === 'online' ? 'Online' :
             result.presence === 'away' ? 'Away' :
             result.presence === 'busy' ? 'Busy' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderFileResult = (result: FileResult) => (
    <div
      key={result.id}
      style={{
        ...styles.resultItem,
        ...(hoveredItem === result.id ? styles.resultItemHover : {}),
      }}
      onMouseEnter={() => setHoveredItem(result.id)}
      onMouseLeave={() => setHoveredItem(null)}
      onClick={() => onResultClick?.(result)}
    >
      {result.thumbnailUrl ? (
        <img src={result.thumbnailUrl} alt="" style={styles.avatar} />
      ) : (
        <div style={styles.iconPlaceholder}>
          {getFileTypeIcon(result.mimeType)}
        </div>
      )}
      <div style={styles.resultContent}>
        <div style={styles.resultTitle}>
          {highlightText(result.name, query)}
        </div>
        <div style={styles.resultMeta}>
          <span style={styles.metaItem}>
            {formatFileSize(result.size)}
          </span>
          <span style={styles.channelBadge}>
            <HashIcon />
            {result.channel.name}
          </span>
          <span style={styles.metaItem}>
            {formatDate(result.uploadedAt)}
          </span>
          <span style={styles.metaItem}>
            by {result.uploadedBy.name}
          </span>
        </div>
      </div>
    </div>
  );

  const renderResult = (result: SearchResult) => {
    switch (result.type) {
      case 'message': return renderMessageResult(result);
      case 'channel': return renderChannelResult(result);
      case 'user': return renderUserResult(result);
      case 'file': return renderFileResult(result);
      default: return null;
    }
  };

  const renderSection = (type: SearchResultType, items: SearchResult[]) => {
    if (items.length === 0) return null;

    const icons: Record<SearchResultType, React.ReactNode> = {
      message: <MessageSquareIcon />,
      channel: <HashIcon />,
      user: <UserIcon />,
      file: <FileIcon />,
    };

    const titles: Record<SearchResultType, string> = {
      message: 'Messages',
      channel: 'Channels',
      user: 'People',
      file: 'Files',
    };

    return (
      <div key={type} style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>
            {icons[type]}
            {titles[type]}
          </div>
          <span style={styles.sectionCount}>{items.length} results</span>
        </div>
        {items.map(renderResult)}
      </div>
    );
  };

  const renderSkeletonItem = (index: number) => (
    <div key={`skeleton-${index}`} style={styles.resultItem}>
      <div style={{ ...styles.skeleton, width: 40, height: 40, borderRadius: 10 }} />
      <div style={styles.resultContent}>
        <div style={{ ...styles.skeleton, width: 120, height: 14, marginBottom: 8 }} />
        <div style={{ ...styles.skeleton, width: '100%', height: 16 }} />
        <div style={{ ...styles.skeleton, width: 200, height: 12, marginTop: 8 }} />
      </div>
    </div>
  );

  return (
    <div style={styles.container} className={clsx('chatsdk-search-results', className)}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.queryInfo}>
          <div style={styles.queryIcon}>
            <SearchIcon />
          </div>
          <span style={styles.queryText}>
            Results for <span style={styles.queryValue}>"{query}"</span>
          </span>
        </div>
        <div style={styles.resultCount}>
          {loading ? 'Searching...' : `${totalCount || results.length} results found`}
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {(['all', 'message', 'channel', 'user', 'file'] as const).map(filter => {
          const icons: Record<typeof filter, React.ReactNode> = {
            all: null,
            message: <MessageSquareIcon />,
            channel: <HashIcon />,
            user: <UserIcon />,
            file: <FileIcon />,
          };
          const labels: Record<typeof filter, string> = {
            all: 'All',
            message: 'Messages',
            channel: 'Channels',
            user: 'People',
            file: 'Files',
          };

          return (
            <button
              key={filter}
              style={{
                ...styles.filterChip,
                ...(activeFilter === filter ? styles.filterChipActive : {}),
              }}
              onClick={() => onFilterChange?.(filter)}
            >
              {icons[filter]}
              {labels[filter]}
              <span style={styles.filterCount}>{filterCounts[filter]}</span>
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div style={styles.resultsList}>
        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => renderSkeletonItem(i))}
          </div>
        ) : filteredResults.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <SearchIcon />
            </div>
            <div style={styles.emptyTitle}>No results found</div>
            <div style={styles.emptyDescription}>
              We couldn't find anything matching "{query}". Try different keywords or check your spelling.
            </div>
          </div>
        ) : activeFilter === 'all' ? (
          // Show grouped results
          <>
            {renderSection('message', groupedResults.message.slice(0, 5))}
            {renderSection('channel', groupedResults.channel.slice(0, 3))}
            {renderSection('user', groupedResults.user.slice(0, 3))}
            {renderSection('file', groupedResults.file.slice(0, 3))}
          </>
        ) : (
          // Show filtered results
          <div style={styles.section}>
            {filteredResults.map(renderResult)}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div style={styles.loadMore}>
            <button style={styles.loadMoreButton} onClick={onLoadMore}>
              Load more results
              <ArrowRightIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
