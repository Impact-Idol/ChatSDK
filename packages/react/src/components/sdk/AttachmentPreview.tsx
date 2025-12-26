import React from 'react';

export interface AttachmentFile {
  id: string;
  file: File;
  type: 'image' | 'video' | 'audio' | 'file';
  preview?: string;
  progress?: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface AttachmentPreviewProps {
  attachments: AttachmentFile[];
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  maxPreviewSize?: number;
  showProgress?: boolean;
  layout?: 'horizontal' | 'grid';
}

export function AttachmentPreview({
  attachments,
  onRemove,
  onRetry,
  maxPreviewSize = 80,
  showProgress = true,
  layout = 'horizontal',
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('word') || type.includes('document')) return 'doc';
    if (type.includes('sheet') || type.includes('excel')) return 'sheet';
    if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return 'archive';
    return 'file';
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: layout === 'horizontal' ? 'flex' : 'grid',
      gap: '8px',
      padding: '12px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderRadius: '12px',
      overflowX: layout === 'horizontal' ? 'auto' : 'visible',
      gridTemplateColumns: layout === 'grid' ? `repeat(auto-fill, minmax(${maxPreviewSize}px, 1fr))` : undefined,
    },
    item: {
      position: 'relative' as const,
      flexShrink: 0,
    },
    imagePreview: {
      width: `${maxPreviewSize}px`,
      height: `${maxPreviewSize}px`,
      borderRadius: '8px',
      objectFit: 'cover' as const,
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
    },
    videoPreview: {
      position: 'relative' as const,
      width: `${maxPreviewSize}px`,
      height: `${maxPreviewSize}px`,
      borderRadius: '8px',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    videoThumbnail: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
    },
    playIcon: {
      position: 'absolute' as const,
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
    },
    filePreview: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      minWidth: '180px',
      maxWidth: '240px',
    },
    fileIcon: {
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      flexShrink: 0,
    },
    fileIconPdf: {
      backgroundColor: '#ef4444',
    },
    fileIconDoc: {
      backgroundColor: '#3b82f6',
    },
    fileIconSheet: {
      backgroundColor: '#10b981',
    },
    fileIconArchive: {
      backgroundColor: '#f59e0b',
    },
    fileInfo: {
      flex: 1,
      minWidth: 0,
    },
    fileName: {
      fontSize: '13px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    fileMeta: {
      fontSize: '11px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    removeButton: {
      position: 'absolute' as const,
      top: '-6px',
      right: '-6px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      zIndex: 1,
    },
    progressOverlay: {
      position: 'absolute' as const,
      inset: 0,
      borderRadius: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressRing: {
      width: '32px',
      height: '32px',
    },
    errorOverlay: {
      position: 'absolute' as const,
      inset: 0,
      borderRadius: '8px',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid var(--chatsdk-error-color, #ef4444)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
    },
    retryButton: {
      padding: '4px 8px',
      backgroundColor: 'var(--chatsdk-error-color, #ef4444)',
      color: '#ffffff',
      border: 'none',
      borderRadius: '4px',
      fontSize: '10px',
      cursor: 'pointer',
    },
    audioPreview: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '8px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      minWidth: '200px',
    },
    waveform: {
      flex: 1,
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
    },
    waveformBar: {
      width: '3px',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      borderRadius: '2px',
    },
  };

  const renderProgressRing = (progress: number) => {
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <svg style={styles.progressRing} viewBox="0 0 32 32">
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="3"
        />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 16 16)"
        />
        <text
          x="16"
          y="16"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize="8"
          fontWeight="600"
        >
          {Math.round(progress)}%
        </text>
      </svg>
    );
  };

  const renderAttachment = (attachment: AttachmentFile) => {
    const { id, file, type, preview, progress = 0, status, error } = attachment;
    const fileType = getFileIcon(file.type);

    const removeBtn = (
      <button
        style={styles.removeButton}
        onClick={() => onRemove?.(id)}
        title="Remove"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    );

    if (type === 'image') {
      return (
        <div key={id} style={styles.item}>
          {removeBtn}
          <img
            src={preview || URL.createObjectURL(file)}
            alt={file.name}
            style={styles.imagePreview}
          />
          {status === 'uploading' && showProgress && (
            <div style={styles.progressOverlay}>
              {renderProgressRing(progress)}
            </div>
          )}
          {status === 'error' && (
            <div style={styles.errorOverlay}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--chatsdk-error-color, #ef4444)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <button style={styles.retryButton} onClick={() => onRetry?.(id)}>
                Retry
              </button>
            </div>
          )}
        </div>
      );
    }

    if (type === 'video') {
      return (
        <div key={id} style={styles.item}>
          {removeBtn}
          <div style={styles.videoPreview}>
            {preview && (
              <video src={preview} style={styles.videoThumbnail} />
            )}
            <div style={styles.playIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
          {status === 'uploading' && showProgress && (
            <div style={styles.progressOverlay}>
              {renderProgressRing(progress)}
            </div>
          )}
        </div>
      );
    }

    if (type === 'audio') {
      return (
        <div key={id} style={styles.item}>
          <div style={styles.audioPreview}>
            <div style={{ ...styles.fileIcon, backgroundColor: '#8b5cf6' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div style={styles.fileInfo}>
              <div style={styles.fileName}>{file.name}</div>
              <div style={styles.fileMeta}>
                {formatFileSize(file.size)}
                {status === 'uploading' && ` • ${progress}%`}
              </div>
            </div>
            <button
              style={{ ...styles.removeButton, position: 'static' }}
              onClick={() => onRemove?.(id)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      );
    }

    // File type
    const iconStyle = {
      ...styles.fileIcon,
      ...(fileType === 'pdf' ? styles.fileIconPdf : {}),
      ...(fileType === 'doc' ? styles.fileIconDoc : {}),
      ...(fileType === 'sheet' ? styles.fileIconSheet : {}),
      ...(fileType === 'archive' ? styles.fileIconArchive : {}),
    };

    return (
      <div key={id} style={styles.item}>
        <div style={styles.filePreview}>
          <div style={iconStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div style={styles.fileInfo}>
            <div style={styles.fileName}>{file.name}</div>
            <div style={styles.fileMeta}>
              {formatFileSize(file.size)}
              {status === 'uploading' && (
                <span style={{ color: 'var(--chatsdk-accent-color, #6366f1)' }}>
                  {progress}%
                </span>
              )}
              {status === 'error' && (
                <span style={{ color: 'var(--chatsdk-error-color, #ef4444)' }}>
                  Failed
                </span>
              )}
            </div>
          </div>
          <button
            style={{ ...styles.removeButton, position: 'static' }}
            onClick={() => onRemove?.(id)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {attachments.map(renderAttachment)}
    </div>
  );
}
