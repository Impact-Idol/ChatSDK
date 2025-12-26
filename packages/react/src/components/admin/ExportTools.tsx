import React, { useState } from 'react';

export interface ExportJob {
  id: string;
  type: 'messages' | 'users' | 'channels' | 'analytics' | 'full_backup';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  format: 'json' | 'csv' | 'xlsx';
  filters?: {
    dateRange?: { start: string; end: string };
    channelIds?: string[];
    userIds?: string[];
  };
  fileSize?: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface ExportToolsProps {
  jobs: ExportJob[];
  onCreateExport?: (config: {
    type: ExportJob['type'];
    format: ExportJob['format'];
    filters?: ExportJob['filters'];
  }) => void;
  onDownload?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  loading?: boolean;
}

export function ExportTools({
  jobs,
  onCreateExport,
  onDownload,
  onDelete,
  loading = false,
}: ExportToolsProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExport, setNewExport] = useState({
    type: 'messages' as ExportJob['type'],
    format: 'json' as ExportJob['format'],
    dateStart: '',
    dateEnd: '',
  });

  const exportTypes = [
    {
      value: 'messages',
      label: 'Messages',
      description: 'Export all messages with metadata',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      value: 'users',
      label: 'Users',
      description: 'Export user profiles and settings',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      value: 'channels',
      label: 'Channels',
      description: 'Export channel configurations',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="4" y1="15" x2="20" y2="15" />
          <line x1="10" y1="3" x2="8" y2="21" />
          <line x1="16" y1="3" x2="14" y2="21" />
        </svg>
      ),
    },
    {
      value: 'analytics',
      label: 'Analytics',
      description: 'Export usage metrics and stats',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      value: 'full_backup',
      label: 'Full Backup',
      description: 'Complete data export for backup',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
  ];

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return { bg: 'var(--chatsdk-success-light, #d1fae5)', text: 'var(--chatsdk-success-color, #10b981)' };
      case 'processing':
      case 'pending':
        return { bg: 'var(--chatsdk-accent-light, #eef2ff)', text: 'var(--chatsdk-accent-color, #6366f1)' };
      case 'failed':
        return { bg: 'var(--chatsdk-error-light, #fee2e2)', text: 'var(--chatsdk-error-color, #ef4444)' };
      default:
        return { bg: 'var(--chatsdk-bg-tertiary, #e5e7eb)', text: 'var(--chatsdk-text-secondary, #6b7280)' };
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
    createButton: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    quickExports: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '32px',
    },
    quickCard: {
      padding: '20px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    quickCardIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
      color: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px',
    },
    quickCardTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '4px',
    },
    quickCardDesc: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    section: {
      marginBottom: '24px',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '16px',
    },
    jobsList: {},
    jobCard: {
      padding: '16px 20px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    jobIcon: {
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    jobInfo: {
      flex: 1,
    },
    jobTitle: {
      fontSize: '15px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    jobMeta: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
    },
    progressBar: {
      width: '200px',
      height: '8px',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      borderRadius: '4px',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      borderRadius: '4px',
      transition: 'width 0.3s ease',
    },
    jobActions: {
      display: 'flex',
      gap: '8px',
    },
    iconButton: {
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    },
    downloadButton: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    emptyState: {
      padding: '60px 24px',
      textAlign: 'center' as const,
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '12px',
    },
    emptyIcon: {
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
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
      width: '560px',
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
    typeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
    },
    typeOption: {
      padding: '16px',
      borderRadius: '10px',
      border: '2px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      cursor: 'pointer',
      textAlign: 'center' as const,
      transition: 'all 0.15s ease',
    },
    typeOptionActive: {
      borderColor: 'var(--chatsdk-accent-color, #6366f1)',
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
    },
    typeOptionIcon: {
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      marginBottom: '8px',
    },
    typeOptionLabel: {
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    formatGrid: {
      display: 'flex',
      gap: '12px',
    },
    formatOption: {
      flex: 1,
      padding: '12px',
      borderRadius: '8px',
      border: '2px solid var(--chatsdk-border-color, #e5e7eb)',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      cursor: 'pointer',
      textAlign: 'center' as const,
      transition: 'all 0.15s ease',
    },
    formatOptionActive: {
      borderColor: 'var(--chatsdk-accent-color, #6366f1)',
      backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
    },
    formatLabel: {
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
    },
    dateRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
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
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      color: '#ffffff',
    },
    buttonSecondary: {
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
  };

  const getTypeIcon = (type: ExportJob['type']) => {
    return exportTypes.find((t) => t.value === type)?.icon;
  };

  const handleQuickExport = (type: ExportJob['type']) => {
    setNewExport({ ...newExport, type });
    setShowCreateModal(true);
  };

  const handleCreateExport = () => {
    onCreateExport?.({
      type: newExport.type,
      format: newExport.format,
      filters: newExport.dateStart || newExport.dateEnd
        ? {
            dateRange: {
              start: newExport.dateStart,
              end: newExport.dateEnd,
            },
          }
        : undefined,
    });
    setShowCreateModal(false);
    setNewExport({ type: 'messages', format: 'json', dateStart: '', dateEnd: '' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Export Tools</h1>
          <p style={styles.subtitle}>Export your data in various formats</p>
        </div>
        <button style={styles.createButton} onClick={() => setShowCreateModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          New Export
        </button>
      </div>

      <div style={styles.quickExports}>
        {exportTypes.map((type) => (
          <div
            key={type.value}
            style={styles.quickCard}
            onClick={() => handleQuickExport(type.value as ExportJob['type'])}
          >
            <div style={styles.quickCardIcon}>{type.icon}</div>
            <div style={styles.quickCardTitle}>{type.label}</div>
            <div style={styles.quickCardDesc}>{type.description}</div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Recent Exports</div>
        <div style={styles.jobsList}>
          {jobs.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div style={styles.emptyTitle}>No exports yet</div>
              <div style={styles.emptyText}>Create your first export using the options above</div>
            </div>
          ) : (
            jobs.map((job) => {
              const statusColor = getStatusColor(job.status);
              return (
                <div key={job.id} style={styles.jobCard}>
                  <div style={styles.jobIcon}>{getTypeIcon(job.type)}</div>
                  <div style={styles.jobInfo}>
                    <div style={styles.jobTitle}>
                      {exportTypes.find((t) => t.value === job.type)?.label} Export
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: statusColor.bg,
                          color: statusColor.text,
                        }}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div style={styles.jobMeta}>
                      <span>{job.format.toUpperCase()}</span>
                      {job.fileSize && <span>{formatSize(job.fileSize)}</span>}
                      <span>{formatDate(job.createdAt)}</span>
                    </div>
                  </div>
                  {job.status === 'processing' && (
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${job.progress}%` }} />
                    </div>
                  )}
                  <div style={styles.jobActions}>
                    {job.status === 'completed' && (
                      <button style={styles.downloadButton} onClick={() => onDownload?.(job.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                      </button>
                    )}
                    <button style={styles.iconButton} onClick={() => onDelete?.(job.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create Export</h2>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Data Type</label>
                <div style={styles.typeGrid}>
                  {exportTypes.slice(0, 3).map((type) => (
                    <div
                      key={type.value}
                      style={{
                        ...styles.typeOption,
                        ...(newExport.type === type.value ? styles.typeOptionActive : {}),
                      }}
                      onClick={() => setNewExport({ ...newExport, type: type.value as any })}
                    >
                      <div style={styles.typeOptionIcon}>{type.icon}</div>
                      <div style={styles.typeOptionLabel}>{type.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Format</label>
                <div style={styles.formatGrid}>
                  {(['json', 'csv', 'xlsx'] as const).map((format) => (
                    <div
                      key={format}
                      style={{
                        ...styles.formatOption,
                        ...(newExport.format === format ? styles.formatOptionActive : {}),
                      }}
                      onClick={() => setNewExport({ ...newExport, format })}
                    >
                      <div style={styles.formatLabel}>{format.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Date Range (optional)</label>
                <div style={styles.dateRow}>
                  <input
                    type="date"
                    style={styles.input}
                    value={newExport.dateStart}
                    onChange={(e) => setNewExport({ ...newExport, dateStart: e.target.value })}
                  />
                  <input
                    type="date"
                    style={styles.input}
                    value={newExport.dateEnd}
                    onChange={(e) => setNewExport({ ...newExport, dateEnd: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={handleCreateExport}
              >
                Start Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
