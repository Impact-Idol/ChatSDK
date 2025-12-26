import React from 'react';

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  favicon?: string;
  type?: 'article' | 'video' | 'image' | 'website' | 'rich';
  videoUrl?: string;
  author?: string;
  publishedDate?: string;
}

export interface LinkPreviewProps {
  data: LinkPreviewData;
  loading?: boolean;
  error?: boolean;
  variant?: 'card' | 'compact' | 'minimal';
  showImage?: boolean;
  showFavicon?: boolean;
  maxDescriptionLength?: number;
  onClick?: () => void;
  onRemove?: () => void;
  isOwn?: boolean;
}

export function LinkPreview({
  data,
  loading = false,
  error = false,
  variant = 'card',
  showImage = true,
  showFavicon = true,
  maxDescriptionLength = 150,
  onClick,
  onRemove,
  isOwn = false,
}: LinkPreviewProps) {
  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const styles: Record<string, React.CSSProperties> = {
    // Card variant (default)
    cardContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'var(--chatsdk-bg-secondary, #f9fafb)',
      border: `1px solid ${isOwn ? 'rgba(255,255,255,0.2)' : 'var(--chatsdk-border-color, #e5e7eb)'}`,
      maxWidth: '400px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.15s ease',
      position: 'relative' as const,
    },
    cardImage: {
      width: '100%',
      height: '180px',
      objectFit: 'cover' as const,
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
    },
    cardContent: {
      padding: '12px 14px',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px',
    },
    favicon: {
      width: '16px',
      height: '16px',
      borderRadius: '4px',
    },
    siteName: {
      fontSize: '12px',
      color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--chatsdk-text-tertiary, #9ca3af)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.02em',
    },
    cardTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: isOwn ? '#ffffff' : 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '4px',
      lineHeight: 1.4,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
    },
    cardDescription: {
      fontSize: '13px',
      color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--chatsdk-text-secondary, #6b7280)',
      lineHeight: 1.5,
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
    },
    cardMeta: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '8px',
      fontSize: '11px',
      color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--chatsdk-text-tertiary, #9ca3af)',
    },

    // Compact variant
    compactContainer: {
      display: 'flex',
      gap: '12px',
      padding: '10px 12px',
      borderRadius: '10px',
      backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'var(--chatsdk-bg-secondary, #f9fafb)',
      border: `1px solid ${isOwn ? 'rgba(255,255,255,0.2)' : 'var(--chatsdk-border-color, #e5e7eb)'}`,
      maxWidth: '360px',
      cursor: onClick ? 'pointer' : 'default',
      position: 'relative' as const,
    },
    compactImage: {
      width: '80px',
      height: '80px',
      borderRadius: '8px',
      objectFit: 'cover' as const,
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      flexShrink: 0,
    },
    compactContent: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
    },
    compactTitle: {
      fontSize: '13px',
      fontWeight: 600,
      color: isOwn ? '#ffffff' : 'var(--chatsdk-text-primary, #111827)',
      marginBottom: '4px',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    compactDescription: {
      fontSize: '12px',
      color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--chatsdk-text-secondary, #6b7280)',
      lineHeight: 1.4,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
    },
    compactDomain: {
      fontSize: '11px',
      color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--chatsdk-text-tertiary, #9ca3af)',
      marginTop: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },

    // Minimal variant
    minimalContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      borderRadius: '8px',
      backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'var(--chatsdk-bg-secondary, #f9fafb)',
      borderLeft: `3px solid ${isOwn ? 'rgba(255,255,255,0.5)' : 'var(--chatsdk-accent-color, #6366f1)'}`,
      maxWidth: '320px',
      cursor: onClick ? 'pointer' : 'default',
      position: 'relative' as const,
    },
    minimalFavicon: {
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      flexShrink: 0,
    },
    minimalContent: {
      flex: 1,
      minWidth: 0,
    },
    minimalTitle: {
      fontSize: '13px',
      fontWeight: 500,
      color: isOwn ? '#ffffff' : 'var(--chatsdk-text-primary, #111827)',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    minimalDomain: {
      fontSize: '11px',
      color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--chatsdk-text-tertiary, #9ca3af)',
    },

    // Remove button
    removeButton: {
      position: 'absolute' as const,
      top: '8px',
      right: '8px',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: '#ffffff',
      opacity: 0,
      transition: 'opacity 0.15s ease',
    },

    // Video play button
    playButton: {
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
    },

    // Loading state
    loadingSkeleton: {
      backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
      animation: 'pulse 1.5s ease-in-out infinite',
    },
    loadingTitle: {
      height: '14px',
      width: '80%',
      borderRadius: '4px',
      marginBottom: '8px',
    },
    loadingDescription: {
      height: '12px',
      width: '100%',
      borderRadius: '4px',
      marginBottom: '4px',
    },

    // Error state
    errorContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 14px',
      borderRadius: '10px',
      backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'var(--chatsdk-bg-secondary, #f9fafb)',
      border: `1px dashed ${isOwn ? 'rgba(255,255,255,0.3)' : 'var(--chatsdk-border-color, #e5e7eb)'}`,
      color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--chatsdk-text-tertiary, #9ca3af)',
      fontSize: '13px',
    },
  };

  if (loading) {
    return (
      <div style={variant === 'card' ? styles.cardContainer : styles.compactContainer}>
        {variant === 'card' && showImage && (
          <div style={{ ...styles.cardImage, ...styles.loadingSkeleton }} />
        )}
        <div style={variant === 'card' ? styles.cardContent : styles.compactContent}>
          <div style={{ ...styles.loadingTitle, ...styles.loadingSkeleton }} />
          <div style={{ ...styles.loadingDescription, ...styles.loadingSkeleton }} />
          <div style={{ ...styles.loadingDescription, ...styles.loadingSkeleton, width: '60%' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span>{getDomain(data.url)}</span>
      </div>
    );
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (variant === 'minimal') {
    return (
      <div
        style={styles.minimalContainer}
        onClick={handleClick}
        onMouseEnter={(e) => {
          const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
          if (btn) btn.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
          if (btn) btn.style.opacity = '0';
        }}
      >
        {showFavicon && data.favicon && (
          <img src={data.favicon} alt="" style={styles.minimalFavicon} />
        )}
        <div style={styles.minimalContent}>
          <div style={styles.minimalTitle}>{data.title || getDomain(data.url)}</div>
          <div style={styles.minimalDomain}>{getDomain(data.url)}</div>
        </div>
        {onRemove && (
          <button style={styles.removeButton} onClick={(e) => { e.stopPropagation(); onRemove(); }} data-remove>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        style={styles.compactContainer}
        onClick={handleClick}
        onMouseEnter={(e) => {
          const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
          if (btn) btn.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
          if (btn) btn.style.opacity = '0';
        }}
      >
        {showImage && data.imageUrl && (
          <img src={data.imageUrl} alt="" style={styles.compactImage} />
        )}
        <div style={styles.compactContent}>
          <div style={styles.compactTitle}>{data.title || getDomain(data.url)}</div>
          {data.description && (
            <div style={styles.compactDescription}>
              {truncateText(data.description, maxDescriptionLength)}
            </div>
          )}
          <div style={styles.compactDomain}>
            {showFavicon && data.favicon && (
              <img src={data.favicon} alt="" style={{ width: '12px', height: '12px', borderRadius: '2px' }} />
            )}
            {data.siteName || getDomain(data.url)}
          </div>
        </div>
        {onRemove && (
          <button style={styles.removeButton} onClick={(e) => { e.stopPropagation(); onRemove(); }} data-remove>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      style={styles.cardContainer}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
        if (btn) btn.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        const btn = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
        if (btn) btn.style.opacity = '0';
      }}
    >
      {showImage && data.imageUrl && (
        <div style={{ position: 'relative' }}>
          <img src={data.imageUrl} alt="" style={styles.cardImage} />
          {data.type === 'video' && (
            <div style={styles.playButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          )}
        </div>
      )}
      <div style={styles.cardContent}>
        <div style={styles.cardHeader}>
          {showFavicon && data.favicon && (
            <img src={data.favicon} alt="" style={styles.favicon} />
          )}
          <span style={styles.siteName}>{data.siteName || getDomain(data.url)}</span>
        </div>
        <div style={styles.cardTitle}>{data.title || getDomain(data.url)}</div>
        {data.description && (
          <div style={styles.cardDescription}>
            {truncateText(data.description, maxDescriptionLength)}
          </div>
        )}
        {(data.author || data.publishedDate) && (
          <div style={styles.cardMeta}>
            {data.author && <span>{data.author}</span>}
            {data.author && data.publishedDate && <span>•</span>}
            {data.publishedDate && <span>{formatDate(data.publishedDate)}</span>}
          </div>
        )}
      </div>
      {onRemove && (
        <button style={styles.removeButton} onClick={(e) => { e.stopPropagation(); onRemove(); }} data-remove>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
