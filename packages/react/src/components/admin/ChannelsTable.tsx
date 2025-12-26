import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

// =============================================================================
// TYPES
// =============================================================================

export interface Channel {
  id: string;
  cid: string;
  type: 'messaging' | 'livestream' | 'team' | 'commerce' | 'support' | 'custom';
  name: string;
  description?: string;
  imageUrl?: string;
  memberCount: number;
  messageCount: number;
  createdBy: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  status: 'active' | 'frozen' | 'archived' | 'deleted';
  config: {
    readEvents: boolean;
    typingEvents: boolean;
    reactions: boolean;
    replies: boolean;
    uploads: boolean;
    urlEnrichment: boolean;
    maxMessageLength?: number;
    slowModeInterval?: number;
  };
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelsTableProps {
  channels: Channel[];
  loading?: boolean;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onChannelClick?: (channel: Channel) => void;
  onEditChannel?: (channel: Channel) => void;
  onFreezeChannel?: (channel: Channel) => void;
  onArchiveChannel?: (channel: Channel) => void;
  onDeleteChannel?: (channel: Channel) => void;
  onExportChannels?: (channelIds: string[]) => void;
  onBulkAction?: (action: string, channelIds: string[]) => void;
  className?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
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

const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const MessageSquareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const MoreVerticalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const SnowflakeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" x2="22" y1="12" y2="12" />
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="m20 16-4-4 4-4" />
    <path d="m4 8 4 4-4 4" />
    <path d="m16 4-4 4-4-4" />
    <path d="m8 20 4-4 4 4" />
  </svg>
);

const ArchiveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="5" x="2" y="3" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  </svg>
);

const VideoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
  </svg>
);

const ShoppingCartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </svg>
);

const HeadphonesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

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
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const getChannelTypeIcon = (type: Channel['type']) => {
  switch (type) {
    case 'messaging': return <HashIcon />;
    case 'livestream': return <VideoIcon />;
    case 'team': return <UsersIcon />;
    case 'commerce': return <ShoppingCartIcon />;
    case 'support': return <HeadphonesIcon />;
    default: return <SettingsIcon />;
  }
};

const getChannelTypeLabel = (type: Channel['type']): string => {
  const labels: Record<Channel['type'], string> = {
    messaging: 'Messaging',
    livestream: 'Livestream',
    team: 'Team',
    commerce: 'Commerce',
    support: 'Support',
    custom: 'Custom',
  };
  return labels[type];
};

const getStatusColor = (status: Channel['status']): string => {
  switch (status) {
    case 'active': return 'var(--chatsdk-success)';
    case 'frozen': return 'var(--chatsdk-info)';
    case 'archived': return 'var(--chatsdk-warning)';
    case 'deleted': return 'var(--chatsdk-error)';
    default: return 'var(--chatsdk-text-tertiary)';
  }
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
    borderRadius: '12px',
    border: '1px solid var(--chatsdk-border-light)',
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
    minWidth: '300px',
  },

  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
    margin: 0,
  },

  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    borderRadius: '8px',
    border: '1px solid var(--chatsdk-border-light)',
    flex: 1,
    maxWidth: '320px',
  },

  searchInput: {
    flex: 1,
    border: 'none',
    background: 'none',
    fontSize: '14px',
    color: 'var(--chatsdk-text-primary)',
    outline: 'none',
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    border: '1px solid var(--chatsdk-border-light)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: 'var(--chatsdk-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    overflowX: 'auto' as const,
  },

  filterChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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

  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 24px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
    backgroundColor: 'var(--chatsdk-primary-light)',
  },

  bulkActionsText: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-primary)',
  },

  bulkActionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: 'white',
    border: '1px solid var(--chatsdk-border-light)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  tableContainer: {
    flex: 1,
    overflowX: 'auto' as const,
    overflowY: 'auto' as const,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    minWidth: '900px',
  },

  tableHeader: {
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },

  th: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--chatsdk-border-light)',
    whiteSpace: 'nowrap' as const,
  },

  thCheckbox: {
    width: '40px',
    padding: '12px 16px',
  },

  tr: {
    borderBottom: '1px solid var(--chatsdk-border-light)',
    transition: 'background-color 0.15s ease',
    cursor: 'pointer',
  },

  trHover: {
    backgroundColor: 'var(--chatsdk-bg-secondary)',
  },

  td: {
    padding: '16px',
    fontSize: '14px',
    color: 'var(--chatsdk-text-primary)',
    verticalAlign: 'middle' as const,
  },

  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: 'var(--chatsdk-primary)',
    cursor: 'pointer',
  },

  channelCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  channelIcon: {
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

  channelImage: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    objectFit: 'cover' as const,
  },

  channelInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    minWidth: 0,
  },

  channelName: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  channelCid: {
    fontSize: '12px',
    color: 'var(--chatsdk-text-tertiary)',
    fontFamily: 'var(--chatsdk-font-mono)',
  },

  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
  },

  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize' as const,
  },

  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },

  statsCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: 'var(--chatsdk-text-secondary)',
    fontSize: '13px',
  },

  creatorCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  creatorAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
  },

  creatorName: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-secondary)',
  },

  dateCell: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-secondary)',
    whiteSpace: 'nowrap' as const,
  },

  actionsCell: {
    position: 'relative' as const,
  },

  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: 'var(--chatsdk-text-tertiary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  actionMenu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: '4px',
    backgroundColor: 'var(--chatsdk-bg-primary)',
    borderRadius: '8px',
    border: '1px solid var(--chatsdk-border-light)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    minWidth: '160px',
    zIndex: 100,
    overflow: 'hidden',
  },

  actionMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-primary)',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background-color 0.15s ease',
  },

  actionMenuItemDanger: {
    color: 'var(--chatsdk-error)',
  },

  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderTop: '1px solid var(--chatsdk-border-light)',
    backgroundColor: 'var(--chatsdk-bg-primary)',
  },

  paginationInfo: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-secondary)',
  },

  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  paginationButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    border: '1px solid var(--chatsdk-border-light)',
    borderRadius: '6px',
    color: 'var(--chatsdk-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  pageNumber: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px',
    padding: '0 8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  pageNumberActive: {
    backgroundColor: 'var(--chatsdk-primary)',
    color: 'white',
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

  configBadges: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap' as const,
  },

  configBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-tertiary)',
    textTransform: 'uppercase' as const,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const ChannelsTable: React.FC<ChannelsTableProps> = ({
  channels,
  loading = false,
  totalCount = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  onChannelClick,
  onEditChannel,
  onFreezeChannel,
  onArchiveChannel,
  onDeleteChannel,
  onExportChannels,
  onBulkAction,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');

  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      const matchesSearch = !searchQuery ||
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.cid.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = activeTypeFilter === 'all' || channel.type === activeTypeFilter;
      const matchesStatus = activeStatusFilter === 'all' || channel.status === activeStatusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [channels, searchQuery, activeTypeFilter, activeStatusFilter]);

  const totalPages = Math.ceil((totalCount || filteredChannels.length) / pageSize);
  const allSelected = filteredChannels.length > 0 && selectedIds.size === filteredChannels.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredChannels.map(c => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleRowClick = (channel: Channel, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input, button')) return;
    onChannelClick?.(channel);
  };

  const renderSkeletonRow = (index: number) => (
    <tr key={`skeleton-${index}`} style={styles.tr}>
      <td style={{ ...styles.td, ...styles.thCheckbox }}>
        <div style={{ ...styles.skeleton, width: 16, height: 16 }} />
      </td>
      <td style={styles.td}>
        <div style={styles.channelCell}>
          <div style={{ ...styles.skeleton, width: 40, height: 40, borderRadius: 10 }} />
          <div style={styles.channelInfo}>
            <div style={{ ...styles.skeleton, width: 140, height: 16, marginBottom: 4 }} />
            <div style={{ ...styles.skeleton, width: 100, height: 12 }} />
          </div>
        </div>
      </td>
      <td style={styles.td}><div style={{ ...styles.skeleton, width: 80, height: 24 }} /></td>
      <td style={styles.td}><div style={{ ...styles.skeleton, width: 70, height: 24 }} /></td>
      <td style={styles.td}><div style={{ ...styles.skeleton, width: 60, height: 16 }} /></td>
      <td style={styles.td}><div style={{ ...styles.skeleton, width: 60, height: 16 }} /></td>
      <td style={styles.td}>
        <div style={styles.creatorCell}>
          <div style={{ ...styles.skeleton, width: 24, height: 24, borderRadius: '50%' }} />
          <div style={{ ...styles.skeleton, width: 80, height: 14 }} />
        </div>
      </td>
      <td style={styles.td}><div style={{ ...styles.skeleton, width: 70, height: 14 }} /></td>
      <td style={styles.td}><div style={{ ...styles.skeleton, width: 32, height: 32, borderRadius: 6 }} /></td>
    </tr>
  );

  return (
    <div style={styles.container} className={clsx('chatsdk-channels-table', className)}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>Channels</h2>
          <div style={styles.searchContainer}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>
        <div style={styles.headerRight}>
          <button
            style={styles.filterButton}
            onClick={() => onExportChannels?.(Array.from(selectedIds))}
          >
            <DownloadIcon />
            Export
          </button>
          <button style={styles.primaryButton}>
            <PlusIcon />
            Create Channel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <span style={{ fontSize: '13px', color: 'var(--chatsdk-text-tertiary)', marginRight: '8px' }}>
          <FilterIcon /> Type:
        </span>
        {['all', 'messaging', 'livestream', 'team', 'commerce', 'support'].map(type => (
          <button
            key={type}
            style={{
              ...styles.filterChip,
              ...(activeTypeFilter === type ? styles.filterChipActive : {}),
            }}
            onClick={() => setActiveTypeFilter(type)}
          >
            {type === 'all' ? 'All Types' : getChannelTypeLabel(type as Channel['type'])}
          </button>
        ))}
        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--chatsdk-border-light)', margin: '0 8px' }} />
        <span style={{ fontSize: '13px', color: 'var(--chatsdk-text-tertiary)', marginRight: '8px' }}>
          Status:
        </span>
        {['all', 'active', 'frozen', 'archived'].map(status => (
          <button
            key={status}
            style={{
              ...styles.filterChip,
              ...(activeStatusFilter === status ? styles.filterChipActive : {}),
            }}
            onClick={() => setActiveStatusFilter(status)}
          >
            {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div style={styles.bulkActions}>
          <span style={styles.bulkActionsText}>
            {selectedIds.size} channel{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            style={styles.bulkActionButton}
            onClick={() => onBulkAction?.('freeze', Array.from(selectedIds))}
          >
            <SnowflakeIcon />
            Freeze
          </button>
          <button
            style={styles.bulkActionButton}
            onClick={() => onBulkAction?.('archive', Array.from(selectedIds))}
          >
            <ArchiveIcon />
            Archive
          </button>
          <button
            style={{ ...styles.bulkActionButton, color: 'var(--chatsdk-error)' }}
            onClick={() => onBulkAction?.('delete', Array.from(selectedIds))}
          >
            <TrashIcon />
            Delete
          </button>
        </div>
      )}

      {/* Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={{ ...styles.th, ...styles.thCheckbox }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  style={styles.checkbox}
                />
              </th>
              <th style={styles.th}>Channel</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Members</th>
              <th style={styles.th}>Messages</th>
              <th style={styles.th}>Created By</th>
              <th style={styles.th}>Last Activity</th>
              <th style={{ ...styles.th, width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => renderSkeletonRow(i))
            ) : filteredChannels.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>
                      <HashIcon />
                    </div>
                    <div style={styles.emptyTitle}>No channels found</div>
                    <div style={styles.emptyDescription}>
                      {searchQuery
                        ? 'Try adjusting your search or filter criteria'
                        : 'Create your first channel to get started'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredChannels.map(channel => (
                <tr
                  key={channel.id}
                  style={{
                    ...styles.tr,
                    ...(hoveredRow === channel.id || selectedIds.has(channel.id) ? styles.trHover : {}),
                  }}
                  onMouseEnter={() => setHoveredRow(channel.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={(e) => handleRowClick(channel, e)}
                >
                  <td style={{ ...styles.td, ...styles.thCheckbox }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(channel.id)}
                      onChange={() => handleSelectOne(channel.id)}
                      style={styles.checkbox}
                    />
                  </td>
                  <td style={styles.td}>
                    <div style={styles.channelCell}>
                      {channel.imageUrl ? (
                        <img src={channel.imageUrl} alt="" style={styles.channelImage} />
                      ) : (
                        <div style={styles.channelIcon}>
                          {getChannelTypeIcon(channel.type)}
                        </div>
                      )}
                      <div style={styles.channelInfo}>
                        <div style={styles.channelName}>{channel.name}</div>
                        <div style={styles.channelCid}>{channel.cid}</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.typeBadge}>
                      {getChannelTypeIcon(channel.type)}
                      {getChannelTypeLabel(channel.type)}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: `${getStatusColor(channel.status)}15`,
                        color: getStatusColor(channel.status),
                      }}
                    >
                      <div style={{ ...styles.statusDot, backgroundColor: getStatusColor(channel.status) }} />
                      {channel.status}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.statsCell}>
                      <UsersIcon />
                      {formatNumber(channel.memberCount)}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.statsCell}>
                      <MessageSquareIcon />
                      {formatNumber(channel.messageCount)}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.creatorCell}>
                      {channel.createdBy.imageUrl ? (
                        <img
                          src={channel.createdBy.imageUrl}
                          alt=""
                          style={styles.creatorAvatar}
                        />
                      ) : (
                        <div style={{ ...styles.creatorAvatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--chatsdk-text-tertiary)' }}>
                          {channel.createdBy.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={styles.creatorName}>{channel.createdBy.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.dateCell}>
                      {channel.lastMessageAt ? formatDate(channel.lastMessageAt) : 'Never'}
                    </div>
                  </td>
                  <td style={{ ...styles.td, ...styles.actionsCell }}>
                    <button
                      style={{
                        ...styles.actionButton,
                        backgroundColor: openMenuId === channel.id ? 'var(--chatsdk-bg-tertiary)' : undefined,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === channel.id ? null : channel.id);
                      }}
                    >
                      <MoreVerticalIcon />
                    </button>
                    {openMenuId === channel.id && (
                      <div style={styles.actionMenu}>
                        <button
                          style={styles.actionMenuItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditChannel?.(channel);
                            setOpenMenuId(null);
                          }}
                        >
                          <EditIcon />
                          Edit Channel
                        </button>
                        <button
                          style={styles.actionMenuItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            onFreezeChannel?.(channel);
                            setOpenMenuId(null);
                          }}
                        >
                          <SnowflakeIcon />
                          {channel.status === 'frozen' ? 'Unfreeze' : 'Freeze'} Channel
                        </button>
                        <button
                          style={styles.actionMenuItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchiveChannel?.(channel);
                            setOpenMenuId(null);
                          }}
                        >
                          <ArchiveIcon />
                          Archive Channel
                        </button>
                        <button
                          style={{ ...styles.actionMenuItem, ...styles.actionMenuItemDanger }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChannel?.(channel);
                            setOpenMenuId(null);
                          }}
                        >
                          <TrashIcon />
                          Delete Channel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filteredChannels.length > 0 && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount || filteredChannels.length)} of {totalCount || filteredChannels.length} channels
          </div>
          <div style={styles.paginationControls}>
            <button
              style={{
                ...styles.paginationButton,
                ...(page <= 1 ? styles.paginationButtonDisabled : {}),
              }}
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeftIcon />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  style={{
                    ...styles.pageNumber,
                    ...(page === pageNum ? styles.pageNumberActive : {}),
                  }}
                  onClick={() => onPageChange?.(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              style={{
                ...styles.paginationButton,
                ...(page >= totalPages ? styles.paginationButtonDisabled : {}),
              }}
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}

      {/* Click outside handler for menu */}
      {openMenuId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
          }}
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
};

export default ChannelsTable;
