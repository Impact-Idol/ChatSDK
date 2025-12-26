import React from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'warning';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantConfig = {
    default: {
      iconBg: 'var(--chatsdk-accent-light, #eef2ff)',
      iconColor: 'var(--chatsdk-accent-color, #6366f1)',
      buttonBg: 'var(--chatsdk-accent-color, #6366f1)',
      defaultIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
    danger: {
      iconBg: 'var(--chatsdk-error-light, #fee2e2)',
      iconColor: 'var(--chatsdk-error-color, #ef4444)',
      buttonBg: 'var(--chatsdk-error-color, #ef4444)',
      defaultIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    warning: {
      iconBg: 'var(--chatsdk-warning-light, #fef3c7)',
      iconColor: 'var(--chatsdk-warning-color, #f59e0b)',
      buttonBg: 'var(--chatsdk-warning-color, #f59e0b)',
      defaultIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  };

  const config = variantConfig[variant];

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
      animation: 'fadeIn 0.15s ease',
    },
    dialog: {
      width: '100%',
      maxWidth: '400px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
      overflow: 'hidden',
      animation: 'slideUp 0.2s ease',
    },
    content: {
      padding: '24px',
      textAlign: 'center' as const,
    },
    iconWrapper: {
      width: '56px',
      height: '56px',
      borderRadius: '14px',
      backgroundColor: config.iconBg,
      color: config.iconColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px',
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      margin: 0,
      marginBottom: '8px',
    },
    message: {
      fontSize: '14px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      margin: 0,
      lineHeight: 1.6,
    },
    actions: {
      padding: '16px 24px',
      borderTop: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      display: 'flex',
      gap: '12px',
    },
    button: {
      flex: 1,
      padding: '12px 20px',
      borderRadius: '10px',
      border: 'none',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    cancelButton: {
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
    },
    confirmButton: {
      backgroundColor: config.buttonBg,
      color: '#ffffff',
    },
    confirmButtonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    spinner: {
      width: '16px',
      height: '16px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTopColor: '#ffffff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.content}>
          <div style={styles.iconWrapper}>
            {icon || config.defaultIcon}
          </div>
          <h2 style={styles.title}>{title}</h2>
          <p style={styles.message}>{message}</p>
        </div>
        <div style={styles.actions}>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.confirmButton,
              ...(loading ? styles.confirmButtonDisabled : {}),
            }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <div style={styles.spinner} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
