import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

// =============================================================================
// TYPES
// =============================================================================

export type WebhookEvent =
  | 'message.new'
  | 'message.updated'
  | 'message.deleted'
  | 'message.reaction'
  | 'channel.created'
  | 'channel.updated'
  | 'channel.deleted'
  | 'member.added'
  | 'member.removed'
  | 'user.updated'
  | 'user.banned'
  | 'moderation.flagged';

export type WebhookStatus = 'active' | 'paused' | 'failing' | 'disabled';

export interface WebhookDelivery {
  id: string;
  event: WebhookEvent;
  status: 'success' | 'failed' | 'pending';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  timestamp: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  secret?: string;
  retryEnabled: boolean;
  maxRetries: number;
  headers?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  lastDeliveryAt?: string;
  successRate: number;
  totalDeliveries: number;
  failedDeliveries: number;
  recentDeliveries?: WebhookDelivery[];
}

export interface WebhooksManagerProps {
  webhooks: Webhook[];
  loading?: boolean;
  onCreateWebhook?: () => void;
  onEditWebhook?: (webhook: Webhook) => void;
  onDeleteWebhook?: (webhook: Webhook) => void;
  onToggleWebhook?: (webhook: Webhook, enabled: boolean) => void;
  onTestWebhook?: (webhook: Webhook) => void;
  onViewDeliveries?: (webhook: Webhook) => void;
  onRetryDelivery?: (webhook: Webhook, delivery: WebhookDelivery) => void;
  className?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const WebhookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
    <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
    <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="4" height="16" x="6" y="4" />
    <rect width="4" height="16" x="14" y="4" />
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

const MoreVerticalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

const RefreshCwIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRelativeTime = (dateString?: string): string => {
  if (!dateString) return 'Never';

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

  return formatDate(dateString);
};

const getEventLabel = (event: WebhookEvent): string => {
  const labels: Record<WebhookEvent, string> = {
    'message.new': 'New Message',
    'message.updated': 'Message Updated',
    'message.deleted': 'Message Deleted',
    'message.reaction': 'Reaction Added',
    'channel.created': 'Channel Created',
    'channel.updated': 'Channel Updated',
    'channel.deleted': 'Channel Deleted',
    'member.added': 'Member Added',
    'member.removed': 'Member Removed',
    'user.updated': 'User Updated',
    'user.banned': 'User Banned',
    'moderation.flagged': 'Content Flagged',
  };
  return labels[event];
};

const getEventCategory = (event: WebhookEvent): string => {
  if (event.startsWith('message.')) return 'message';
  if (event.startsWith('channel.')) return 'channel';
  if (event.startsWith('member.')) return 'member';
  if (event.startsWith('user.')) return 'user';
  if (event.startsWith('moderation.')) return 'moderation';
  return 'other';
};

const getEventColor = (event: WebhookEvent): string => {
  const category = getEventCategory(event);
  switch (category) {
    case 'message': return 'var(--chatsdk-primary)';
    case 'channel': return 'var(--chatsdk-info)';
    case 'member': return 'var(--chatsdk-success)';
    case 'user': return 'var(--chatsdk-warning)';
    case 'moderation': return 'var(--chatsdk-error)';
    default: return 'var(--chatsdk-text-tertiary)';
  }
};

const getStatusColor = (status: WebhookStatus): string => {
  switch (status) {
    case 'active': return 'var(--chatsdk-success)';
    case 'paused': return 'var(--chatsdk-warning)';
    case 'failing': return 'var(--chatsdk-error)';
    case 'disabled': return 'var(--chatsdk-text-tertiary)';
    default: return 'var(--chatsdk-text-tertiary)';
  }
};

const getStatusIcon = (status: WebhookStatus) => {
  switch (status) {
    case 'active': return <CheckCircleIcon />;
    case 'paused': return <PauseIcon />;
    case 'failing': return <AlertCircleIcon />;
    case 'disabled': return <XCircleIcon />;
    default: return null;
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
    backgroundColor: 'var(--chatsdk-info)',
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

  webhooksList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },

  webhookCard: {
    backgroundColor: 'var(--chatsdk-bg-primary)',
    borderRadius: '12px',
    border: '1px solid var(--chatsdk-border-light)',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s ease',
  },

  webhookCardHover: {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },

  webhookCardFailing: {
    borderColor: 'var(--chatsdk-error)',
    borderWidth: '2px',
  },

  webhookHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px 20px',
    gap: '12px',
  },

  webhookInfo: {
    flex: 1,
    minWidth: 0,
  },

  webhookNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },

  webhookName: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
  },

  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },

  webhookUrl: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    borderRadius: '6px',
    fontFamily: 'var(--chatsdk-font-mono)',
    fontSize: '13px',
    color: 'var(--chatsdk-text-secondary)',
    maxWidth: 'fit-content',
  },

  webhookMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '12px',
    flexWrap: 'wrap' as const,
  },

  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--chatsdk-text-tertiary)',
  },

  successRate: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  successRateBar: {
    width: '60px',
    height: '4px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '2px',
    overflow: 'hidden',
  },

  successRateFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },

  webhookActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
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

  dropdown: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: '4px',
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

  dropdownItemDanger: {
    color: 'var(--chatsdk-error)',
  },

  dropdownDivider: {
    height: '1px',
    backgroundColor: 'var(--chatsdk-border-light)',
    margin: '4px 0',
  },

  eventsSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 20px',
    borderTop: '1px solid var(--chatsdk-border-light)',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
  },

  eventsLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-tertiary)',
  },

  events: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },

  eventBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },

  moreEvents: {
    padding: '3px 8px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-tertiary)',
  },

  deliveriesSection: {
    padding: '12px 20px',
    borderTop: '1px solid var(--chatsdk-border-light)',
  },

  deliveriesHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },

  deliveriesTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-tertiary)',
    textTransform: 'uppercase' as const,
  },

  viewAllLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--chatsdk-primary)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
  },

  deliveriesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },

  deliveryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    borderRadius: '6px',
  },

  deliveryStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
  },

  deliveryInfo: {
    flex: 1,
    minWidth: 0,
  },

  deliveryEvent: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-primary)',
  },

  deliveryMeta: {
    fontSize: '11px',
    color: 'var(--chatsdk-text-tertiary)',
    marginTop: '2px',
  },

  deliveryActions: {
    display: 'flex',
    gap: '4px',
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
    marginBottom: '20px',
  },

  skeleton: {
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const WebhooksManager: React.FC<WebhooksManagerProps> = ({
  webhooks,
  loading = false,
  onCreateWebhook,
  onEditWebhook,
  onDeleteWebhook,
  onToggleWebhook,
  onTestWebhook,
  onViewDeliveries,
  onRetryDelivery,
  className,
}) => {
  const [hoveredWebhook, setHoveredWebhook] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);

  const stats = useMemo(() => ({
    active: webhooks.filter(w => w.status === 'active').length,
    failing: webhooks.filter(w => w.status === 'failing').length,
    totalDeliveries: webhooks.reduce((sum, w) => sum + w.totalDeliveries, 0),
  }), [webhooks]);

  const renderWebhookCard = (webhook: Webhook) => {
    const isExpanded = expandedWebhook === webhook.id;
    const maxEventsToShow = 4;

    return (
      <div
        key={webhook.id}
        style={{
          ...styles.webhookCard,
          ...(hoveredWebhook === webhook.id ? styles.webhookCardHover : {}),
          ...(webhook.status === 'failing' ? styles.webhookCardFailing : {}),
        }}
        onMouseEnter={() => setHoveredWebhook(webhook.id)}
        onMouseLeave={() => setHoveredWebhook(null)}
      >
        <div style={styles.webhookHeader}>
          <div style={styles.webhookInfo}>
            <div style={styles.webhookNameRow}>
              <span style={styles.webhookName}>{webhook.name}</span>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: `${getStatusColor(webhook.status)}15`,
                color: getStatusColor(webhook.status),
              }}>
                {getStatusIcon(webhook.status)}
                {webhook.status}
              </span>
            </div>

            <div style={styles.webhookUrl}>
              <LinkIcon />
              {webhook.url}
            </div>

            <div style={styles.webhookMeta}>
              <div style={styles.successRate}>
                <span style={styles.metaItem}>
                  {webhook.successRate.toFixed(1)}% success
                </span>
                <div style={styles.successRateBar}>
                  <div
                    style={{
                      ...styles.successRateFill,
                      width: `${webhook.successRate}%`,
                      backgroundColor: webhook.successRate > 90
                        ? 'var(--chatsdk-success)'
                        : webhook.successRate > 70
                        ? 'var(--chatsdk-warning)'
                        : 'var(--chatsdk-error)',
                    }}
                  />
                </div>
              </div>
              <span style={styles.metaItem}>
                <SendIcon />
                {webhook.totalDeliveries.toLocaleString()} deliveries
              </span>
              <span style={styles.metaItem}>
                <ClockIcon />
                Last delivery {formatRelativeTime(webhook.lastDeliveryAt)}
              </span>
            </div>
          </div>

          <div style={{ ...styles.webhookActions, position: 'relative' as const }}>
            <button
              style={styles.actionButton}
              onClick={() => onTestWebhook?.(webhook)}
              title="Send test event"
            >
              <ZapIcon />
            </button>
            <button
              style={{
                ...styles.actionButton,
                backgroundColor: openMenuId === webhook.id ? 'var(--chatsdk-bg-tertiary)' : undefined,
              }}
              onClick={() => setOpenMenuId(openMenuId === webhook.id ? null : webhook.id)}
            >
              <MoreVerticalIcon />
            </button>

            {openMenuId === webhook.id && (
              <div style={styles.dropdown}>
                <button
                  style={styles.dropdownItem}
                  onClick={() => {
                    onEditWebhook?.(webhook);
                    setOpenMenuId(null);
                  }}
                >
                  <EditIcon />
                  Edit Webhook
                </button>
                <button
                  style={styles.dropdownItem}
                  onClick={() => {
                    onViewDeliveries?.(webhook);
                    setOpenMenuId(null);
                  }}
                >
                  <HistoryIcon />
                  View Deliveries
                </button>
                <button
                  style={styles.dropdownItem}
                  onClick={() => {
                    onTestWebhook?.(webhook);
                    setOpenMenuId(null);
                  }}
                >
                  <ZapIcon />
                  Send Test Event
                </button>
                <div style={styles.dropdownDivider} />
                <button
                  style={styles.dropdownItem}
                  onClick={() => {
                    onToggleWebhook?.(webhook, webhook.status !== 'active');
                    setOpenMenuId(null);
                  }}
                >
                  {webhook.status === 'active' ? <PauseIcon /> : <PlayIcon />}
                  {webhook.status === 'active' ? 'Pause Webhook' : 'Enable Webhook'}
                </button>
                <button
                  style={{ ...styles.dropdownItem, ...styles.dropdownItemDanger }}
                  onClick={() => {
                    onDeleteWebhook?.(webhook);
                    setOpenMenuId(null);
                  }}
                >
                  <TrashIcon />
                  Delete Webhook
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Events */}
        <div style={styles.eventsSection}>
          <span style={styles.eventsLabel}>
            <ZapIcon /> Events:
          </span>
          <div style={styles.events}>
            {webhook.events.slice(0, maxEventsToShow).map(event => (
              <span
                key={event}
                style={{
                  ...styles.eventBadge,
                  backgroundColor: `${getEventColor(event)}15`,
                  color: getEventColor(event),
                }}
              >
                {getEventLabel(event)}
              </span>
            ))}
            {webhook.events.length > maxEventsToShow && (
              <span style={styles.moreEvents}>
                +{webhook.events.length - maxEventsToShow} more
              </span>
            )}
          </div>
        </div>

        {/* Recent Deliveries */}
        {webhook.recentDeliveries && webhook.recentDeliveries.length > 0 && isExpanded && (
          <div style={styles.deliveriesSection}>
            <div style={styles.deliveriesHeader}>
              <span style={styles.deliveriesTitle}>Recent Deliveries</span>
              <button
                style={styles.viewAllLink}
                onClick={() => onViewDeliveries?.(webhook)}
              >
                View all
                <HistoryIcon />
              </button>
            </div>
            <div style={styles.deliveriesList}>
              {webhook.recentDeliveries.slice(0, 3).map(delivery => (
                <div key={delivery.id} style={styles.deliveryItem}>
                  <div style={{
                    ...styles.deliveryStatus,
                    backgroundColor: delivery.status === 'success'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : delivery.status === 'failed'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(245, 158, 11, 0.1)',
                    color: delivery.status === 'success'
                      ? 'var(--chatsdk-success)'
                      : delivery.status === 'failed'
                      ? 'var(--chatsdk-error)'
                      : 'var(--chatsdk-warning)',
                  }}>
                    {delivery.status === 'success' ? <CheckCircleIcon /> :
                     delivery.status === 'failed' ? <XCircleIcon /> :
                     <ClockIcon />}
                  </div>
                  <div style={styles.deliveryInfo}>
                    <div style={styles.deliveryEvent}>{getEventLabel(delivery.event)}</div>
                    <div style={styles.deliveryMeta}>
                      {formatRelativeTime(delivery.timestamp)}
                      {delivery.statusCode && ` • ${delivery.statusCode}`}
                      {delivery.responseTime && ` • ${delivery.responseTime}ms`}
                    </div>
                  </div>
                  {delivery.status === 'failed' && (
                    <div style={styles.deliveryActions}>
                      <button
                        style={styles.actionButton}
                        onClick={() => onRetryDelivery?.(webhook, delivery)}
                        title="Retry delivery"
                      >
                        <RefreshCwIcon />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSkeletonCard = (index: number) => (
    <div key={`skeleton-${index}`} style={styles.webhookCard}>
      <div style={styles.webhookHeader}>
        <div style={styles.webhookInfo}>
          <div style={{ ...styles.skeleton, width: 180, height: 18, marginBottom: 12 }} />
          <div style={{ ...styles.skeleton, width: 320, height: 32, marginBottom: 12 }} />
          <div style={{ ...styles.skeleton, width: 280, height: 14 }} />
        </div>
      </div>
      <div style={styles.eventsSection}>
        <div style={{ ...styles.skeleton, width: 200, height: 20 }} />
      </div>
    </div>
  );

  return (
    <div style={styles.container} className={clsx('chatsdk-webhooks-manager', className)}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <WebhookIcon />
          </div>
          <div style={styles.headerInfo}>
            <h2 style={styles.title}>Webhooks</h2>
            <div style={styles.subtitle}>
              {stats.active} active • {stats.failing > 0 && <span style={{ color: 'var(--chatsdk-error)' }}>{stats.failing} failing • </span>}
              {stats.totalDeliveries.toLocaleString()} total deliveries
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.primaryButton} onClick={onCreateWebhook}>
            <PlusIcon />
            Create Webhook
          </button>
        </div>
      </div>

      {/* Webhooks List */}
      <div style={styles.webhooksList}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => renderSkeletonCard(i))
        ) : webhooks.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <WebhookIcon />
            </div>
            <div style={styles.emptyTitle}>No webhooks configured</div>
            <div style={styles.emptyDescription}>
              Webhooks allow you to receive real-time notifications when events happen in your app
            </div>
            <button style={styles.primaryButton} onClick={onCreateWebhook}>
              <PlusIcon />
              Create your first webhook
            </button>
          </div>
        ) : (
          webhooks.map(renderWebhookCard)
        )}
      </div>

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

export default WebhooksManager;
