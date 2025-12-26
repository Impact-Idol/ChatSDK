import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

// =============================================================================
// TYPES
// =============================================================================

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'adult_content'
  | 'misinformation'
  | 'impersonation'
  | 'copyright'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export type ModerationAction =
  | 'none'
  | 'warn'
  | 'mute'
  | 'ban'
  | 'delete_message'
  | 'shadow_ban';

export interface ReportedContent {
  id: string;
  type: 'message' | 'user' | 'channel';
  content: {
    id: string;
    text?: string;
    imageUrl?: string;
    createdAt: string;
  };
  reportedUser: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  channel?: {
    id: string;
    name: string;
    cid: string;
  };
  reporter: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  aiScore?: number;
  aiCategories?: string[];
  reportCount: number;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    id: string;
    name: string;
  };
  action?: ModerationAction;
}

export interface ModerationQueueProps {
  reports: ReportedContent[];
  loading?: boolean;
  onReviewReport?: (report: ReportedContent) => void;
  onTakeAction?: (report: ReportedContent, action: ModerationAction, note?: string) => void;
  onDismissReport?: (report: ReportedContent) => void;
  onViewUser?: (userId: string) => void;
  onViewChannel?: (channelId: string) => void;
  onViewMessage?: (messageId: string, channelId: string) => void;
  className?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const AlertTriangleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const BanIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);

const VolumeXIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="22" x2="16" y1="9" y2="15" />
    <line x1="16" x2="22" y1="9" y2="15" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const GhostIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 10h.01" />
    <path d="M15 10h.01" />
    <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
  </svg>
);

const MessageSquareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const HashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const FlagIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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
  });
};

const getReasonLabel = (reason: ReportReason): string => {
  const labels: Record<ReportReason, string> = {
    spam: 'Spam',
    harassment: 'Harassment',
    hate_speech: 'Hate Speech',
    violence: 'Violence',
    adult_content: 'Adult Content',
    misinformation: 'Misinformation',
    impersonation: 'Impersonation',
    copyright: 'Copyright',
    other: 'Other',
  };
  return labels[reason];
};

const getReasonColor = (reason: ReportReason): string => {
  const colors: Record<ReportReason, string> = {
    spam: '#6b7280',
    harassment: '#ef4444',
    hate_speech: '#dc2626',
    violence: '#b91c1c',
    adult_content: '#9333ea',
    misinformation: '#f59e0b',
    impersonation: '#3b82f6',
    copyright: '#6366f1',
    other: '#6b7280',
  };
  return colors[reason];
};

const getPriorityColor = (priority: ReportedContent['priority']): string => {
  switch (priority) {
    case 'critical': return 'var(--chatsdk-error)';
    case 'high': return '#f97316';
    case 'medium': return 'var(--chatsdk-warning)';
    case 'low': return 'var(--chatsdk-success)';
    default: return 'var(--chatsdk-text-tertiary)';
  }
};

const getStatusColor = (status: ReportStatus): string => {
  switch (status) {
    case 'pending': return 'var(--chatsdk-warning)';
    case 'reviewed': return 'var(--chatsdk-info)';
    case 'actioned': return 'var(--chatsdk-success)';
    case 'dismissed': return 'var(--chatsdk-text-tertiary)';
    default: return 'var(--chatsdk-text-tertiary)';
  }
};

const getTypeIcon = (type: ReportedContent['type']) => {
  switch (type) {
    case 'message': return <MessageSquareIcon />;
    case 'user': return <UserIcon />;
    case 'channel': return <HashIcon />;
    default: return <AlertTriangleIcon />;
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
    gap: '12px',
  },

  headerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: 'var(--chatsdk-error)',
    borderRadius: '10px',
    color: 'white',
  },

  headerInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },

  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
    margin: 0,
  },

  subtitle: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-tertiary)',
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

  statsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '16px 24px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    overflowX: 'auto' as const,
  },

  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  statDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },

  statLabel: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-tertiary)',
  },

  statValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
  },

  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
    overflowX: 'auto' as const,
  },

  filterChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
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

  queueList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },

  reportCard: {
    backgroundColor: 'var(--chatsdk-bg-primary)',
    borderRadius: '12px',
    border: '1px solid var(--chatsdk-border-light)',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s ease',
  },

  reportCardHover: {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },

  reportHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px',
    gap: '12px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
  },

  reportHeaderLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },

  priorityStrip: {
    width: '4px',
    height: '100%',
    borderRadius: '2px',
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
  },

  reportAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    objectFit: 'cover' as const,
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    flexShrink: 0,
  },

  reportInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },

  reportUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
  },

  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-tertiary)',
    textTransform: 'uppercase' as const,
  },

  reportMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },

  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--chatsdk-text-tertiary)',
  },

  reportHeaderRight: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '8px',
    flexShrink: 0,
  },

  badges: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  reasonBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  },

  priorityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },

  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'capitalize' as const,
  },

  reportContent: {
    padding: '16px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
  },

  contentText: {
    fontSize: '14px',
    color: 'var(--chatsdk-text-primary)',
    lineHeight: 1.5,
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },

  contentImage: {
    maxWidth: '300px',
    maxHeight: '200px',
    borderRadius: '8px',
    objectFit: 'cover' as const,
    marginTop: '8px',
  },

  aiInsights: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'var(--chatsdk-bg-primary)',
    borderRadius: '8px',
    border: '1px solid var(--chatsdk-border-light)',
  },

  aiLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--chatsdk-primary)',
  },

  aiScore: {
    fontSize: '12px',
    color: 'var(--chatsdk-text-secondary)',
  },

  aiCategories: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap' as const,
  },

  aiCategory: {
    padding: '2px 6px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '4px',
    fontSize: '11px',
    color: 'var(--chatsdk-text-tertiary)',
  },

  reportDetails: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'var(--chatsdk-bg-primary)',
    borderRadius: '8px',
    border: '1px solid var(--chatsdk-border-light)',
  },

  detailsLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-tertiary)',
    marginBottom: '4px',
  },

  detailsText: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-secondary)',
    lineHeight: 1.5,
    margin: 0,
  },

  reportActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderTop: '1px solid var(--chatsdk-border-light)',
    gap: '12px',
  },

  actionsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  actionsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    border: '1px solid var(--chatsdk-border-light)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  actionButtonPrimary: {
    backgroundColor: 'var(--chatsdk-primary)',
    borderColor: 'var(--chatsdk-primary)',
    color: 'white',
  },

  actionButtonSuccess: {
    backgroundColor: 'var(--chatsdk-success)',
    borderColor: 'var(--chatsdk-success)',
    color: 'white',
  },

  actionButtonDanger: {
    backgroundColor: 'var(--chatsdk-error)',
    borderColor: 'var(--chatsdk-error)',
    color: 'white',
  },

  actionDropdown: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: 'var(--chatsdk-error)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  dropdown: {
    position: 'absolute' as const,
    bottom: '100%',
    right: 0,
    marginBottom: '4px',
    backgroundColor: 'var(--chatsdk-bg-primary)',
    borderRadius: '8px',
    border: '1px solid var(--chatsdk-border-light)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    minWidth: '180px',
    zIndex: 100,
    overflow: 'hidden',
  },

  dropdownItem: {
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
    width: '80px',
    height: '80px',
    backgroundColor: 'var(--chatsdk-success)',
    borderRadius: '50%',
    marginBottom: '24px',
    color: 'white',
  },

  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
    marginBottom: '8px',
  },

  emptyDescription: {
    fontSize: '14px',
    color: 'var(--chatsdk-text-tertiary)',
    maxWidth: '360px',
  },

  skeleton: {
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },

  reporterInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 16px',
    borderTop: '1px solid var(--chatsdk-border-light)',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
  },

  reporterLabel: {
    fontSize: '12px',
    color: 'var(--chatsdk-text-tertiary)',
  },

  reporterAvatar: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
  },

  reporterName: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const ModerationQueue: React.FC<ModerationQueueProps> = ({
  reports,
  loading = false,
  onReviewReport,
  onTakeAction,
  onDismissReport,
  onViewUser,
  onViewChannel,
  onViewMessage,
  className,
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('pending');
  const [activePriorityFilter, setActivePriorityFilter] = useState<string>('all');
  const [activeReasonFilter, setActiveReasonFilter] = useState<string>('all');

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesStatus = activeStatusFilter === 'all' || report.status === activeStatusFilter;
      const matchesPriority = activePriorityFilter === 'all' || report.priority === activePriorityFilter;
      const matchesReason = activeReasonFilter === 'all' || report.reason === activeReasonFilter;
      return matchesStatus && matchesPriority && matchesReason;
    });
  }, [reports, activeStatusFilter, activePriorityFilter, activeReasonFilter]);

  const stats = useMemo(() => {
    return {
      pending: reports.filter(r => r.status === 'pending').length,
      critical: reports.filter(r => r.priority === 'critical' && r.status === 'pending').length,
      high: reports.filter(r => r.priority === 'high' && r.status === 'pending').length,
      reviewed: reports.filter(r => r.status === 'reviewed').length,
    };
  }, [reports]);

  const handleActionClick = (report: ReportedContent, action: ModerationAction) => {
    onTakeAction?.(report, action);
    setOpenActionMenu(null);
  };

  const renderReportCard = (report: ReportedContent) => (
    <div
      key={report.id}
      style={{
        ...styles.reportCard,
        ...(hoveredCard === report.id ? styles.reportCardHover : {}),
        position: 'relative' as const,
      }}
      onMouseEnter={() => setHoveredCard(report.id)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      {/* Priority Strip */}
      <div
        style={{
          ...styles.priorityStrip,
          backgroundColor: getPriorityColor(report.priority)
        }}
      />

      {/* Header */}
      <div style={{ ...styles.reportHeader, paddingLeft: '20px' }}>
        <div style={styles.reportHeaderLeft}>
          {report.reportedUser.imageUrl ? (
            <img
              src={report.reportedUser.imageUrl}
              alt=""
              style={styles.reportAvatar}
            />
          ) : (
            <div style={{
              ...styles.reportAvatar,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--chatsdk-text-tertiary)',
            }}>
              {report.reportedUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={styles.reportInfo}>
            <div style={styles.reportUser}>
              <span
                style={{ ...styles.userName, cursor: 'pointer' }}
                onClick={() => onViewUser?.(report.reportedUser.id)}
              >
                {report.reportedUser.name}
              </span>
              <span style={styles.typeBadge}>
                {getTypeIcon(report.type)}
                {report.type}
              </span>
            </div>
            <div style={styles.reportMeta}>
              <span style={styles.metaItem}>
                <ClockIcon />
                {formatDate(report.createdAt)}
              </span>
              {report.reportCount > 1 && (
                <span style={{ ...styles.metaItem, color: 'var(--chatsdk-error)' }}>
                  <FlagIcon />
                  {report.reportCount} reports
                </span>
              )}
              {report.channel && (
                <span
                  style={{ ...styles.metaItem, cursor: 'pointer' }}
                  onClick={() => onViewChannel?.(report.channel!.id)}
                >
                  <HashIcon />
                  {report.channel.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={styles.reportHeaderRight}>
          <div style={styles.badges}>
            <span
              style={{
                ...styles.reasonBadge,
                backgroundColor: `${getReasonColor(report.reason)}15`,
                color: getReasonColor(report.reason),
              }}
            >
              <AlertTriangleIcon />
              {getReasonLabel(report.reason)}
            </span>
            <span
              style={{
                ...styles.priorityBadge,
                backgroundColor: `${getPriorityColor(report.priority)}15`,
                color: getPriorityColor(report.priority),
              }}
            >
              {report.priority}
            </span>
          </div>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: `${getStatusColor(report.status)}15`,
              color: getStatusColor(report.status),
            }}
          >
            {report.status === 'pending' && <ClockIcon />}
            {report.status === 'actioned' && <CheckIcon />}
            {report.status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={styles.reportContent}>
        {report.content.text && (
          <p style={styles.contentText}>{report.content.text}</p>
        )}
        {report.content.imageUrl && (
          <img
            src={report.content.imageUrl}
            alt="Reported content"
            style={styles.contentImage}
          />
        )}

        {/* AI Insights */}
        {report.aiScore !== undefined && (
          <div style={styles.aiInsights}>
            <span style={styles.aiLabel}>
              <SparklesIcon />
              AI Analysis
            </span>
            <span style={styles.aiScore}>
              Severity: <strong>{Math.round(report.aiScore * 100)}%</strong>
            </span>
            {report.aiCategories && report.aiCategories.length > 0 && (
              <div style={styles.aiCategories}>
                {report.aiCategories.map((category, i) => (
                  <span key={i} style={styles.aiCategory}>{category}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reporter Details */}
        {report.details && (
          <div style={styles.reportDetails}>
            <div style={styles.detailsLabel}>Reporter's Note</div>
            <p style={styles.detailsText}>{report.details}</p>
          </div>
        )}
      </div>

      {/* Reporter Info */}
      <div style={styles.reporterInfo}>
        <span style={styles.reporterLabel}>Reported by</span>
        {report.reporter.imageUrl ? (
          <img
            src={report.reporter.imageUrl}
            alt=""
            style={styles.reporterAvatar}
          />
        ) : (
          <div style={{
            ...styles.reporterAvatar,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-tertiary)',
          }}>
            {report.reporter.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span style={styles.reporterName}>{report.reporter.name}</span>
      </div>

      {/* Actions */}
      {report.status === 'pending' && (
        <div style={styles.reportActions}>
          <div style={styles.actionsLeft}>
            <button
              style={styles.actionButton}
              onClick={() => onReviewReport?.(report)}
            >
              <EyeIcon />
              View Context
            </button>
            {report.type === 'message' && report.channel && (
              <button
                style={styles.actionButton}
                onClick={() => onViewMessage?.(report.content.id, report.channel!.id)}
              >
                <MessageSquareIcon />
                Go to Message
              </button>
            )}
          </div>
          <div style={styles.actionsRight}>
            <button
              style={styles.actionButton}
              onClick={() => onDismissReport?.(report)}
            >
              <XIcon />
              Dismiss
            </button>
            <div style={{ position: 'relative' as const }}>
              <button
                style={styles.actionDropdown}
                onClick={() => setOpenActionMenu(openActionMenu === report.id ? null : report.id)}
              >
                Take Action
                <ChevronDownIcon />
              </button>
              {openActionMenu === report.id && (
                <div style={styles.dropdown}>
                  <button
                    style={styles.dropdownItem}
                    onClick={() => handleActionClick(report, 'warn')}
                  >
                    <AlertCircleIcon />
                    Warn User
                  </button>
                  <button
                    style={styles.dropdownItem}
                    onClick={() => handleActionClick(report, 'mute')}
                  >
                    <VolumeXIcon />
                    Mute User
                  </button>
                  <button
                    style={styles.dropdownItem}
                    onClick={() => handleActionClick(report, 'shadow_ban')}
                  >
                    <GhostIcon />
                    Shadow Ban
                  </button>
                  <button
                    style={styles.dropdownItem}
                    onClick={() => handleActionClick(report, 'delete_message')}
                  >
                    <TrashIcon />
                    Delete Content
                  </button>
                  <button
                    style={{ ...styles.dropdownItem, color: 'var(--chatsdk-error)' }}
                    onClick={() => handleActionClick(report, 'ban')}
                  >
                    <BanIcon />
                    Ban User
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reviewed Info */}
      {report.status !== 'pending' && report.reviewedBy && (
        <div style={{ ...styles.reportActions, backgroundColor: 'var(--chatsdk-bg-secondary)' }}>
          <span style={{ fontSize: '13px', color: 'var(--chatsdk-text-tertiary)' }}>
            {report.status === 'actioned' ? 'Action taken' : 'Reviewed'} by{' '}
            <strong style={{ color: 'var(--chatsdk-text-secondary)' }}>
              {report.reviewedBy.name}
            </strong>
            {report.reviewedAt && (
              <> • {formatDate(report.reviewedAt)}</>
            )}
            {report.action && report.action !== 'none' && (
              <> • <span style={{ color: 'var(--chatsdk-error)', textTransform: 'capitalize' }}>{report.action.replace('_', ' ')}</span></>
            )}
          </span>
        </div>
      )}
    </div>
  );

  const renderSkeletonCard = (index: number) => (
    <div key={`skeleton-${index}`} style={styles.reportCard}>
      <div style={styles.reportHeader}>
        <div style={styles.reportHeaderLeft}>
          <div style={{ ...styles.skeleton, width: 40, height: 40, borderRadius: 10 }} />
          <div style={styles.reportInfo}>
            <div style={{ ...styles.skeleton, width: 120, height: 16, marginBottom: 8 }} />
            <div style={{ ...styles.skeleton, width: 200, height: 12 }} />
          </div>
        </div>
        <div style={styles.reportHeaderRight}>
          <div style={{ ...styles.skeleton, width: 100, height: 24 }} />
        </div>
      </div>
      <div style={styles.reportContent}>
        <div style={{ ...styles.skeleton, width: '100%', height: 60 }} />
      </div>
    </div>
  );

  return (
    <div style={styles.container} className={clsx('chatsdk-moderation-queue', className)}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <ShieldIcon />
          </div>
          <div style={styles.headerInfo}>
            <h2 style={styles.title}>Moderation Queue</h2>
            <div style={styles.subtitle}>Review and take action on reported content</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.filterButton}>
            <FilterIcon />
            More Filters
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <div style={{ ...styles.statDot, backgroundColor: 'var(--chatsdk-warning)' }} />
          <span style={styles.statLabel}>Pending:</span>
          <span style={styles.statValue}>{stats.pending}</span>
        </div>
        <div style={styles.statItem}>
          <div style={{ ...styles.statDot, backgroundColor: 'var(--chatsdk-error)' }} />
          <span style={styles.statLabel}>Critical:</span>
          <span style={styles.statValue}>{stats.critical}</span>
        </div>
        <div style={styles.statItem}>
          <div style={{ ...styles.statDot, backgroundColor: '#f97316' }} />
          <span style={styles.statLabel}>High Priority:</span>
          <span style={styles.statValue}>{stats.high}</span>
        </div>
        <div style={styles.statItem}>
          <div style={{ ...styles.statDot, backgroundColor: 'var(--chatsdk-info)' }} />
          <span style={styles.statLabel}>In Review:</span>
          <span style={styles.statValue}>{stats.reviewed}</span>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <span style={{ fontSize: '13px', color: 'var(--chatsdk-text-tertiary)', marginRight: '8px' }}>
          Status:
        </span>
        {['all', 'pending', 'reviewed', 'actioned', 'dismissed'].map(status => (
          <button
            key={status}
            style={{
              ...styles.filterChip,
              ...(activeStatusFilter === status ? styles.filterChipActive : {}),
            }}
            onClick={() => setActiveStatusFilter(status)}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--chatsdk-border-light)', margin: '0 8px' }} />
        <span style={{ fontSize: '13px', color: 'var(--chatsdk-text-tertiary)', marginRight: '8px' }}>
          Priority:
        </span>
        {['all', 'critical', 'high', 'medium', 'low'].map(priority => (
          <button
            key={priority}
            style={{
              ...styles.filterChip,
              ...(activePriorityFilter === priority ? styles.filterChipActive : {}),
            }}
            onClick={() => setActivePriorityFilter(priority)}
          >
            {priority === 'all' ? 'All' : priority.charAt(0).toUpperCase() + priority.slice(1)}
          </button>
        ))}
      </div>

      {/* Queue List */}
      <div style={styles.queueList}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => renderSkeletonCard(i))
        ) : filteredReports.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <CheckIcon />
            </div>
            <div style={styles.emptyTitle}>Queue is clear!</div>
            <div style={styles.emptyDescription}>
              {activeStatusFilter !== 'all' || activePriorityFilter !== 'all'
                ? 'No reports match your current filters. Try adjusting the filters to see more.'
                : 'No pending reports to review. Great job keeping the community safe!'}
            </div>
          </div>
        ) : (
          filteredReports.map(report => renderReportCard(report))
        )}
      </div>

      {/* Click outside handler for menus */}
      {openActionMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
          }}
          onClick={() => setOpenActionMenu(null)}
        />
      )}
    </div>
  );
};

export default ModerationQueue;
