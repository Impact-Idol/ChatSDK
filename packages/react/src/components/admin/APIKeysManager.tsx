import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

// =============================================================================
// TYPES
// =============================================================================

export type APIKeyScope = 'read' | 'write' | 'admin' | 'full';
export type APIKeyStatus = 'active' | 'expired' | 'revoked';

export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHint: string;
  scopes: APIKeyScope[];
  status: APIKeyStatus;
  environment: 'production' | 'development' | 'staging';
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  createdBy: {
    id: string;
    name: string;
  };
  rateLimit?: number;
  allowedOrigins?: string[];
}

export interface APIKeysManagerProps {
  apiKeys: APIKey[];
  loading?: boolean;
  onCreateKey?: () => void;
  onEditKey?: (key: APIKey) => void;
  onRevokeKey?: (key: APIKey) => void;
  onRegenerateKey?: (key: APIKey) => void;
  onCopyKey?: (key: APIKey) => void;
  onViewUsage?: (key: APIKey) => void;
  className?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const KeyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.6 9.6" />
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
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

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const BarChartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="14" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

const ServerIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
    <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
    <line x1="6" x2="6.01" y1="6" y2="6" />
    <line x1="6" x2="6.01" y1="18" y2="18" />
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
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return formatDate(dateString);
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

const getScopeLabel = (scope: APIKeyScope): string => {
  const labels: Record<APIKeyScope, string> = {
    read: 'Read',
    write: 'Write',
    admin: 'Admin',
    full: 'Full Access',
  };
  return labels[scope];
};

const getScopeColor = (scope: APIKeyScope): string => {
  switch (scope) {
    case 'read': return 'var(--chatsdk-success)';
    case 'write': return 'var(--chatsdk-warning)';
    case 'admin': return 'var(--chatsdk-error)';
    case 'full': return 'var(--chatsdk-primary)';
    default: return 'var(--chatsdk-text-tertiary)';
  }
};

const getStatusColor = (status: APIKeyStatus): string => {
  switch (status) {
    case 'active': return 'var(--chatsdk-success)';
    case 'expired': return 'var(--chatsdk-warning)';
    case 'revoked': return 'var(--chatsdk-error)';
    default: return 'var(--chatsdk-text-tertiary)';
  }
};

const getEnvironmentColor = (env: APIKey['environment']): string => {
  switch (env) {
    case 'production': return 'var(--chatsdk-error)';
    case 'staging': return 'var(--chatsdk-warning)';
    case 'development': return 'var(--chatsdk-success)';
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
    backgroundColor: 'var(--chatsdk-primary)',
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

  warning: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 24px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderBottom: '1px solid var(--chatsdk-border-light)',
  },

  warningIcon: {
    color: 'var(--chatsdk-warning)',
  },

  warningText: {
    fontSize: '13px',
    color: 'var(--chatsdk-warning)',
  },

  keysList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },

  keyCard: {
    backgroundColor: 'var(--chatsdk-bg-primary)',
    borderRadius: '12px',
    border: '1px solid var(--chatsdk-border-light)',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s ease',
  },

  keyCardHover: {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },

  keyHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px 20px',
    gap: '12px',
  },

  keyInfo: {
    flex: 1,
    minWidth: 0,
  },

  keyNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },

  keyName: {
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

  envBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
  },

  keyValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
  },

  keyDisplay: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: '6px 10px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    borderRadius: '6px',
    fontFamily: 'var(--chatsdk-font-mono)',
    fontSize: '13px',
    color: 'var(--chatsdk-text-secondary)',
    letterSpacing: '0.02em',
  },

  keyHidden: {
    color: 'var(--chatsdk-text-tertiary)',
    letterSpacing: '0.1em',
  },

  copyButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    border: 'none',
    borderRadius: '6px',
    color: 'var(--chatsdk-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  keyMeta: {
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

  keyActions: {
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

  scopesList: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 20px',
    borderTop: '1px solid var(--chatsdk-border-light)',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
  },

  scopesLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-tertiary)',
  },

  scopes: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },

  scopeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
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

export const APIKeysManager: React.FC<APIKeysManagerProps> = ({
  apiKeys,
  loading = false,
  onCreateKey,
  onEditKey,
  onRevokeKey,
  onRegenerateKey,
  onCopyKey,
  onViewUsage,
  className,
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | APIKeyStatus>('all');
  const [activeEnvFilter, setActiveEnvFilter] = useState<'all' | APIKey['environment']>('all');

  const filteredKeys = useMemo(() => {
    return apiKeys.filter(key => {
      const matchesStatus = activeFilter === 'all' || key.status === activeFilter;
      const matchesEnv = activeEnvFilter === 'all' || key.environment === activeEnvFilter;
      return matchesStatus && matchesEnv;
    });
  }, [apiKeys, activeFilter, activeEnvFilter]);

  const stats = useMemo(() => ({
    active: apiKeys.filter(k => k.status === 'active').length,
    production: apiKeys.filter(k => k.environment === 'production').length,
  }), [apiKeys]);

  const renderKeyCard = (apiKey: APIKey) => (
    <div
      key={apiKey.id}
      style={{
        ...styles.keyCard,
        ...(hoveredKey === apiKey.id ? styles.keyCardHover : {}),
      }}
      onMouseEnter={() => setHoveredKey(apiKey.id)}
      onMouseLeave={() => setHoveredKey(null)}
    >
      <div style={styles.keyHeader}>
        <div style={styles.keyInfo}>
          <div style={styles.keyNameRow}>
            <span style={styles.keyName}>{apiKey.name}</span>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: `${getStatusColor(apiKey.status)}15`,
              color: getStatusColor(apiKey.status),
            }}>
              {apiKey.status}
            </span>
            <span style={{
              ...styles.envBadge,
              backgroundColor: `${getEnvironmentColor(apiKey.environment)}15`,
              color: getEnvironmentColor(apiKey.environment),
            }}>
              <ServerIcon />
              {apiKey.environment}
            </span>
          </div>

          <div style={styles.keyValue}>
            <div style={styles.keyDisplay}>
              <span>{apiKey.keyPrefix}</span>
              <span style={styles.keyHidden}>
                {showKeyId === apiKey.id ? apiKey.keyHint : '••••••••••••••••'}
              </span>
            </div>
            <button
              style={styles.copyButton}
              onClick={() => onCopyKey?.(apiKey)}
              title="Copy API key"
            >
              <CopyIcon />
            </button>
            <button
              style={styles.copyButton}
              onClick={() => setShowKeyId(showKeyId === apiKey.id ? null : apiKey.id)}
              title={showKeyId === apiKey.id ? 'Hide key' : 'Show key hint'}
            >
              <EyeIcon />
            </button>
          </div>

          <div style={styles.keyMeta}>
            <span style={styles.metaItem}>
              <ClockIcon />
              Created {formatDate(apiKey.createdAt)}
            </span>
            {apiKey.expiresAt && (
              <span style={styles.metaItem}>
                Expires {formatDate(apiKey.expiresAt)}
              </span>
            )}
            <span style={styles.metaItem}>
              Last used {formatRelativeTime(apiKey.lastUsedAt)}
            </span>
            <span style={styles.metaItem}>
              <BarChartIcon />
              {formatNumber(apiKey.usageCount)} requests
            </span>
          </div>
        </div>

        <div style={{ ...styles.keyActions, position: 'relative' as const }}>
          <button
            style={{
              ...styles.actionButton,
              backgroundColor: openMenuId === apiKey.id ? 'var(--chatsdk-bg-tertiary)' : undefined,
            }}
            onClick={() => setOpenMenuId(openMenuId === apiKey.id ? null : apiKey.id)}
          >
            <MoreVerticalIcon />
          </button>

          {openMenuId === apiKey.id && (
            <div style={styles.dropdown}>
              <button
                style={styles.dropdownItem}
                onClick={() => {
                  onEditKey?.(apiKey);
                  setOpenMenuId(null);
                }}
              >
                <EditIcon />
                Edit Key
              </button>
              <button
                style={styles.dropdownItem}
                onClick={() => {
                  onViewUsage?.(apiKey);
                  setOpenMenuId(null);
                }}
              >
                <BarChartIcon />
                View Usage
              </button>
              <button
                style={styles.dropdownItem}
                onClick={() => {
                  onCopyKey?.(apiKey);
                  setOpenMenuId(null);
                }}
              >
                <CopyIcon />
                Copy Key
              </button>
              <div style={styles.dropdownDivider} />
              <button
                style={styles.dropdownItem}
                onClick={() => {
                  onRegenerateKey?.(apiKey);
                  setOpenMenuId(null);
                }}
              >
                <RefreshCwIcon />
                Regenerate Key
              </button>
              <button
                style={{ ...styles.dropdownItem, ...styles.dropdownItemDanger }}
                onClick={() => {
                  onRevokeKey?.(apiKey);
                  setOpenMenuId(null);
                }}
              >
                <TrashIcon />
                Revoke Key
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scopes */}
      <div style={styles.scopesList}>
        <span style={styles.scopesLabel}>
          <ShieldIcon /> Scopes:
        </span>
        <div style={styles.scopes}>
          {apiKey.scopes.map(scope => (
            <span
              key={scope}
              style={{
                ...styles.scopeBadge,
                backgroundColor: `${getScopeColor(scope)}15`,
                color: getScopeColor(scope),
              }}
            >
              {getScopeLabel(scope)}
            </span>
          ))}
        </div>
        {apiKey.rateLimit && (
          <span style={styles.metaItem}>
            Rate limit: {formatNumber(apiKey.rateLimit)}/min
          </span>
        )}
      </div>
    </div>
  );

  const renderSkeletonCard = (index: number) => (
    <div key={`skeleton-${index}`} style={styles.keyCard}>
      <div style={styles.keyHeader}>
        <div style={styles.keyInfo}>
          <div style={{ ...styles.skeleton, width: 180, height: 18, marginBottom: 12 }} />
          <div style={{ ...styles.skeleton, width: 280, height: 32, marginBottom: 12 }} />
          <div style={{ ...styles.skeleton, width: 320, height: 14 }} />
        </div>
      </div>
      <div style={styles.scopesList}>
        <div style={{ ...styles.skeleton, width: 200, height: 20 }} />
      </div>
    </div>
  );

  return (
    <div style={styles.container} className={clsx('chatsdk-api-keys-manager', className)}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <KeyIcon />
          </div>
          <div style={styles.headerInfo}>
            <h2 style={styles.title}>API Keys</h2>
            <div style={styles.subtitle}>
              {stats.active} active keys • {stats.production} production
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.filterButton}>
            <FilterIcon />
            Filter
          </button>
          <button style={styles.primaryButton} onClick={onCreateKey}>
            <PlusIcon />
            Create API Key
          </button>
        </div>
      </div>

      {/* Warning */}
      <div style={styles.warning}>
        <div style={styles.warningIcon}>
          <AlertTriangleIcon />
        </div>
        <span style={styles.warningText}>
          API keys provide full access to your account. Keep them secure and never share them publicly.
        </span>
      </div>

      {/* Keys List */}
      <div style={styles.keysList}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => renderSkeletonCard(i))
        ) : filteredKeys.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <KeyIcon />
            </div>
            <div style={styles.emptyTitle}>No API keys</div>
            <div style={styles.emptyDescription}>
              Create an API key to start integrating with the ChatSDK API
            </div>
            <button style={styles.primaryButton} onClick={onCreateKey}>
              <PlusIcon />
              Create your first API key
            </button>
          </div>
        ) : (
          filteredKeys.map(renderKeyCard)
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

export default APIKeysManager;
