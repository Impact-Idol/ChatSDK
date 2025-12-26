import React, { useEffect, useState } from 'react';

export interface ToastProps {
  id: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: (id: string) => void;
}

export interface ToastContainerProps {
  toasts: ToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  onClose?: (id: string) => void;
}

function ToastItem({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  action,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.(id);
    }, 200);
  };

  if (!isVisible) return null;

  const typeConfig = {
    success: {
      bg: 'var(--chatsdk-success-light, #d1fae5)',
      border: 'var(--chatsdk-success-color, #10b981)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    error: {
      bg: 'var(--chatsdk-error-light, #fee2e2)',
      border: 'var(--chatsdk-error-color, #ef4444)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
    warning: {
      bg: 'var(--chatsdk-warning-light, #fef3c7)',
      border: 'var(--chatsdk-warning-color, #f59e0b)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    info: {
      bg: 'var(--chatsdk-accent-light, #eef2ff)',
      border: 'var(--chatsdk-accent-color, #6366f1)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
  };

  const config = typeConfig[type];

  const styles: Record<string, React.CSSProperties> = {
    toast: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '14px 16px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
      borderLeft: `4px solid ${config.border}`,
      minWidth: '320px',
      maxWidth: '400px',
      animation: isExiting ? 'slideOut 0.2s ease forwards' : 'slideIn 0.2s ease',
    },
    iconWrapper: {
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      backgroundColor: config.bg,
      color: config.border,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '4px',
    },
    message: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      lineHeight: 1.5,
    },
    actions: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '10px',
    },
    actionButton: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: config.bg,
      color: config.border,
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    closeButton: {
      width: '28px',
      height: '28px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: 'transparent',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
  };

  return (
    <div style={styles.toast}>
      <div style={styles.iconWrapper}>{config.icon}</div>
      <div style={styles.content}>
        {title && <div style={styles.title}>{title}</div>}
        <div style={styles.message}>{message}</div>
        {action && (
          <div style={styles.actions}>
            <button style={styles.actionButton} onClick={action.onClick}>
              {action.label}
            </button>
          </div>
        )}
      </div>
      <button style={styles.closeButton} onClick={handleClose}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  position = 'top-right',
  onClose,
}: ToastContainerProps) {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
    'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: 'fixed',
      ...positionStyles[position],
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
    },
  };

  return (
    <div style={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}

export { ToastItem as Toast };
