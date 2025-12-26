import React, { useState, useRef, useCallback } from 'react';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  previewUrl?: string;
  error?: string;
}

export interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  onUpload?: (files: File[]) => void;
  onRemove?: (fileId: string) => void;
  disabled?: boolean;
  showPreview?: boolean;
}

export function FileUploader({
  accept,
  multiple = true,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 10,
  onUpload,
  onRemove,
  disabled = false,
  showPreview = true,
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    }
    if (type.startsWith('video/')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    }
    if (type.startsWith('audio/')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    }
    if (type === 'application/pdf') {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
      </svg>
    );
  };

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList);
    const validFiles: UploadedFile[] = [];

    for (const file of newFiles) {
      if (files.length + validFiles.length >= maxFiles) break;

      if (file.size > maxSize) {
        continue;
      }

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending',
      };

      if (showPreview && file.type.startsWith('image/')) {
        uploadedFile.previewUrl = URL.createObjectURL(file);
      }

      validFiles.push(uploadedFile);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      onUpload?.(validFiles.map((f) => f.file));
    }
  }, [files.length, maxFiles, maxSize, onUpload, showPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  }, [disabled, processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  }, [processFiles]);

  const handleRemove = useCallback((fileId: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter((f) => f.id !== fileId);
    });
    onRemove?.(fileId);
  }, [onRemove]);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      width: '100%',
    },
    dropzone: {
      padding: '32px',
      border: `2px dashed ${isDragging ? 'var(--chatsdk-accent-color, #6366f1)' : 'var(--chatsdk-border-color, #e5e7eb)'}`,
      borderRadius: '12px',
      backgroundColor: isDragging ? 'var(--chatsdk-accent-light, #eef2ff)' : 'var(--chatsdk-bg-secondary, #f9fafb)',
      textAlign: 'center' as const,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s ease',
      opacity: disabled ? 0.6 : 1,
    },
    icon: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      color: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
    },
    title: {
      fontSize: '15px',
      fontWeight: 600,
      color: 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
      marginBottom: '16px',
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    fileList: {
      marginTop: '16px',
    },
    fileItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
      borderRadius: '10px',
      border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
      marginBottom: '8px',
    },
    filePreview: {
      width: '44px',
      height: '44px',
      borderRadius: '8px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
    },
    previewImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
    },
    fileIcon: {
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    fileInfo: {
      flex: 1,
      minWidth: 0,
    },
    fileName: {
      fontSize: '14px',
      fontWeight: 500,
      color: 'var(--chatsdk-text-primary, #111827)',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    fileMeta: {
      fontSize: '12px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },
    progressBar: {
      width: '100%',
      height: '4px',
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      borderRadius: '2px',
      marginTop: '8px',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      borderRadius: '2px',
      transition: 'width 0.3s ease',
    },
    statusBadge: {
      fontSize: '11px',
      fontWeight: 500,
      padding: '4px 8px',
      borderRadius: '4px',
    },
    complete: {
      backgroundColor: 'var(--chatsdk-success-light, #d1fae5)',
      color: 'var(--chatsdk-success-color, #10b981)',
    },
    error: {
      backgroundColor: 'var(--chatsdk-error-light, #fee2e2)',
      color: 'var(--chatsdk-error-color, #ef4444)',
    },
    removeButton: {
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
    hiddenInput: {
      display: 'none',
    },
  };

  return (
    <div style={styles.container}>
      <div
        style={styles.dropzone}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <div style={styles.icon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div style={styles.title}>Drop files here or click to upload</div>
        <div style={styles.subtitle}>
          Maximum file size: {formatSize(maxSize)} • Up to {maxFiles} files
        </div>
        <button style={styles.button} type="button">
          Select Files
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        style={styles.hiddenInput}
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {files.length > 0 && (
        <div style={styles.fileList}>
          {files.map((file) => (
            <div key={file.id} style={styles.fileItem}>
              <div style={styles.filePreview}>
                {file.previewUrl ? (
                  <img src={file.previewUrl} alt={file.name} style={styles.previewImage} />
                ) : (
                  <div style={styles.fileIcon}>{getFileIcon(file.type)}</div>
                )}
              </div>
              <div style={styles.fileInfo}>
                <div style={styles.fileName}>{file.name}</div>
                <div style={styles.fileMeta}>{formatSize(file.size)}</div>
                {file.status === 'uploading' && (
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${file.progress}%` }} />
                  </div>
                )}
              </div>
              {file.status === 'complete' && (
                <span style={{ ...styles.statusBadge, ...styles.complete }}>
                  Complete
                </span>
              )}
              {file.status === 'error' && (
                <span style={{ ...styles.statusBadge, ...styles.error }}>
                  Error
                </span>
              )}
              <button
                style={styles.removeButton}
                onClick={() => handleRemove(file.id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
