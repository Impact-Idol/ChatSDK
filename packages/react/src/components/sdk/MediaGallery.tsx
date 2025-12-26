import React, { useState, useMemo, useCallback, useEffect } from 'react';
import clsx from 'clsx';

// =============================================================================
// TYPES
// =============================================================================

export type MediaType = 'image' | 'video' | 'audio' | 'file';

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  uploadedBy: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  uploadedAt: string;
  messageId?: string;
  channelId?: string;
}

export interface MediaGalleryProps {
  items: MediaItem[];
  loading?: boolean;
  initialFilter?: MediaType | 'all';
  gridColumns?: 2 | 3 | 4 | 5;
  onItemClick?: (item: MediaItem) => void;
  onDownload?: (item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
  onGoToMessage?: (messageId: string, channelId: string) => void;
  canDelete?: boolean;
  className?: string;
}

export interface MediaLightboxProps {
  item: MediaItem;
  items: MediaItem[];
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDownload?: (item: MediaItem) => void;
  onGoToMessage?: (messageId: string, channelId: string) => void;
}

// =============================================================================
// ICONS
// =============================================================================

const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const VideoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
  </svg>
);

const MusicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const PlayIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getTypeIcon = (type: MediaType) => {
  switch (type) {
    case 'image': return <ImageIcon />;
    case 'video': return <VideoIcon />;
    case 'audio': return <MusicIcon />;
    case 'file': return <FileIcon />;
    default: return <FileIcon />;
  }
};

const getTypeLabel = (type: MediaType | 'all'): string => {
  const labels: Record<MediaType | 'all', string> = {
    all: 'All',
    image: 'Images',
    video: 'Videos',
    audio: 'Audio',
    file: 'Files',
  };
  return labels[type];
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
    padding: '16px 20px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
    margin: 0,
  },

  itemCount: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-tertiary)',
    fontWeight: 500,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 20px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    overflowX: 'auto' as const,
  },

  filterChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
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

  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px',
  },

  grid: {
    display: 'grid',
    gap: '12px',
  },

  gridItem: {
    position: 'relative' as const,
    borderRadius: '10px',
    overflow: 'hidden',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    aspectRatio: '1',
  },

  gridItemHover: {
    transform: 'scale(1.02)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },

  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },

  videoOverlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  playButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '50%',
    color: 'var(--chatsdk-text-primary)',
  },

  duration: {
    position: 'absolute' as const,
    bottom: '8px',
    right: '8px',
    padding: '2px 6px',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'white',
  },

  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    borderRadius: '10px',
    border: '1px solid var(--chatsdk-border-light)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  fileIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '8px',
    color: 'var(--chatsdk-text-secondary)',
    flexShrink: 0,
  },

  fileInfo: {
    flex: 1,
    minWidth: 0,
  },

  fileName: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  fileMeta: {
    fontSize: '12px',
    color: 'var(--chatsdk-text-tertiary)',
    marginTop: '2px',
  },

  itemOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-end',
    padding: '12px',
    opacity: 0,
    transition: 'opacity 0.15s ease',
  },

  itemOverlayVisible: {
    opacity: 1,
  },

  overlayText: {
    fontSize: '12px',
    color: 'white',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },

  overlayMeta: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: '2px',
  },

  overlayActions: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    display: 'flex',
    gap: '4px',
  },

  overlayButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
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
    borderRadius: '10px',
    animation: 'pulse 1.5s ease-in-out infinite',
    aspectRatio: '1',
  },

  // Lightbox styles
  lightbox: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column' as const,
  },

  lightboxHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  lightboxInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },

  lightboxTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'white',
  },

  lightboxMeta: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.6)',
  },

  lightboxActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  lightboxButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },

  lightboxContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative' as const,
  },

  lightboxMedia: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain' as const,
    borderRadius: '8px',
  },

  lightboxNav: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '50%',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },

  lightboxNavPrev: {
    left: '24px',
  },

  lightboxNavNext: {
    right: '24px',
  },

  lightboxFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px 24px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  thumbnailStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflowX: 'auto' as const,
    padding: '4px 0',
  },

  thumbnailItem: {
    width: '48px',
    height: '48px',
    borderRadius: '6px',
    overflow: 'hidden',
    cursor: 'pointer',
    opacity: 0.5,
    transition: 'opacity 0.15s ease',
    flexShrink: 0,
    border: '2px solid transparent',
  },

  thumbnailItemActive: {
    opacity: 1,
    border: '2px solid white',
  },

  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
};

// =============================================================================
// LIGHTBOX COMPONENT
// =============================================================================

const MediaLightbox: React.FC<MediaLightboxProps> = ({
  item,
  items,
  onClose,
  onPrevious,
  onNext,
  onDownload,
  onGoToMessage,
}) => {
  const currentIndex = items.findIndex(i => i.id === item.id);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrevious();
      if (e.key === 'ArrowRight') onNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrevious, onNext]);

  return (
    <div style={styles.lightbox} onClick={onClose}>
      {/* Header */}
      <div style={styles.lightboxHeader} onClick={(e) => e.stopPropagation()}>
        <div style={styles.lightboxInfo}>
          <div style={styles.lightboxTitle}>{item.name}</div>
          <div style={styles.lightboxMeta}>
            {formatFileSize(item.size)} • {formatDate(item.uploadedAt)} • by {item.uploadedBy.name}
          </div>
        </div>
        <div style={styles.lightboxActions}>
          {item.messageId && item.channelId && (
            <button
              style={styles.lightboxButton}
              onClick={() => onGoToMessage?.(item.messageId!, item.channelId!)}
              title="Go to message"
            >
              <ExternalLinkIcon />
            </button>
          )}
          <button
            style={styles.lightboxButton}
            onClick={() => onDownload?.(item)}
            title="Download"
          >
            <DownloadIcon />
          </button>
          <button
            style={styles.lightboxButton}
            onClick={onClose}
            title="Close"
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
        {item.type === 'image' && (
          <img src={item.url} alt={item.name} style={styles.lightboxMedia} />
        )}
        {item.type === 'video' && (
          <video
            src={item.url}
            controls
            autoPlay
            style={styles.lightboxMedia}
          />
        )}
        {item.type === 'audio' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              ...styles.fileIcon,
              width: 80,
              height: 80,
              margin: '0 auto 16px',
            }}>
              <MusicIcon />
            </div>
            <audio src={item.url} controls autoPlay style={{ width: '100%', maxWidth: 400 }} />
          </div>
        )}

        {/* Navigation */}
        {currentIndex > 0 && (
          <button
            style={{ ...styles.lightboxNav, ...styles.lightboxNavPrev }}
            onClick={onPrevious}
          >
            <ChevronLeftIcon />
          </button>
        )}
        {currentIndex < items.length - 1 && (
          <button
            style={{ ...styles.lightboxNav, ...styles.lightboxNavNext }}
            onClick={onNext}
          >
            <ChevronRightIcon />
          </button>
        )}
      </div>

      {/* Footer with thumbnails */}
      {items.length > 1 && (
        <div style={styles.lightboxFooter} onClick={(e) => e.stopPropagation()}>
          <div style={styles.thumbnailStrip}>
            {items.slice(0, 10).map((thumbItem) => (
              <div
                key={thumbItem.id}
                style={{
                  ...styles.thumbnailItem,
                  ...(thumbItem.id === item.id ? styles.thumbnailItemActive : {}),
                }}
                onClick={() => {
                  const idx = items.findIndex(i => i.id === thumbItem.id);
                  if (idx < currentIndex) {
                    for (let i = currentIndex; i > idx; i--) onPrevious();
                  } else {
                    for (let i = currentIndex; i < idx; i++) onNext();
                  }
                }}
              >
                {thumbItem.type === 'image' || thumbItem.type === 'video' ? (
                  <img
                    src={thumbItem.thumbnailUrl || thumbItem.url}
                    alt=""
                    style={styles.thumbnailImage}
                  />
                ) : (
                  <div style={{
                    ...styles.thumbnailImage,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--chatsdk-bg-tertiary)',
                  }}>
                    {getTypeIcon(thumbItem.type)}
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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  items,
  loading = false,
  initialFilter = 'all',
  gridColumns = 4,
  onItemClick,
  onDownload,
  onDelete,
  onGoToMessage,
  canDelete = false,
  className,
}) => {
  const [activeFilter, setActiveFilter] = useState<MediaType | 'all'>(initialFilter);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter(item => item.type === activeFilter);
  }, [items, activeFilter]);

  const mediaItems = useMemo(() => {
    return filteredItems.filter(item => item.type === 'image' || item.type === 'video');
  }, [filteredItems]);

  const fileItems = useMemo(() => {
    return filteredItems.filter(item => item.type === 'audio' || item.type === 'file');
  }, [filteredItems]);

  const handleItemClick = useCallback((item: MediaItem) => {
    if (item.type === 'image' || item.type === 'video') {
      setLightboxItem(item);
    }
    onItemClick?.(item);
  }, [onItemClick]);

  const handleLightboxNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!lightboxItem) return;
    const currentIndex = mediaItems.findIndex(i => i.id === lightboxItem.id);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < mediaItems.length) {
      setLightboxItem(mediaItems[newIndex]);
    }
  }, [lightboxItem, mediaItems]);

  const typeCounts = useMemo(() => {
    return {
      all: items.length,
      image: items.filter(i => i.type === 'image').length,
      video: items.filter(i => i.type === 'video').length,
      audio: items.filter(i => i.type === 'audio').length,
      file: items.filter(i => i.type === 'file').length,
    };
  }, [items]);

  const gridStyle = {
    ...styles.grid,
    gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
  };

  return (
    <div style={styles.container} className={clsx('chatsdk-media-gallery', className)}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>Shared Media</h3>
          <span style={styles.itemCount}>{filteredItems.length} items</span>
        </div>
        <div style={styles.headerRight}>
          <button style={{
            ...styles.filterChip,
            padding: '6px 10px',
          }}>
            <GridIcon />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {(['all', 'image', 'video', 'audio', 'file'] as const).map(type => (
          <button
            key={type}
            style={{
              ...styles.filterChip,
              ...(activeFilter === type ? styles.filterChipActive : {}),
            }}
            onClick={() => setActiveFilter(type)}
          >
            {type !== 'all' && getTypeIcon(type)}
            {getTypeLabel(type)}
            <span style={{ opacity: 0.7 }}>({typeCounts[type]})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={gridStyle}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={styles.skeleton} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              {activeFilter === 'all' ? <ImageIcon /> : getTypeIcon(activeFilter)}
            </div>
            <div style={styles.emptyTitle}>No media found</div>
            <div style={styles.emptyDescription}>
              {activeFilter === 'all'
                ? 'Media shared in this channel will appear here'
                : `No ${getTypeLabel(activeFilter).toLowerCase()} have been shared yet`}
            </div>
          </div>
        ) : (
          <>
            {/* Media Grid (Images & Videos) */}
            {mediaItems.length > 0 && (
              <div style={gridStyle}>
                {mediaItems.map(item => (
                  <div
                    key={item.id}
                    style={{
                      ...styles.gridItem,
                      ...(hoveredItem === item.id ? styles.gridItemHover : {}),
                    }}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => handleItemClick(item)}
                  >
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.name}
                      style={styles.thumbnail}
                    />

                    {/* Video overlay */}
                    {item.type === 'video' && (
                      <div style={styles.videoOverlay}>
                        <div style={styles.playButton}>
                          <PlayIcon />
                        </div>
                      </div>
                    )}

                    {/* Duration */}
                    {item.duration && (
                      <div style={styles.duration}>
                        {formatDuration(item.duration)}
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div style={{
                      ...styles.itemOverlay,
                      ...(hoveredItem === item.id ? styles.itemOverlayVisible : {}),
                    }}>
                      <div style={styles.overlayText}>{item.name}</div>
                      <div style={styles.overlayMeta}>
                        {formatFileSize(item.size)} • {item.uploadedBy.name}
                      </div>

                      {/* Actions */}
                      <div style={styles.overlayActions}>
                        <button
                          style={styles.overlayButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload?.(item);
                          }}
                          title="Download"
                        >
                          <DownloadIcon />
                        </button>
                        {canDelete && (
                          <button
                            style={styles.overlayButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete?.(item);
                            }}
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* File List (Audio & Files) */}
            {fileItems.length > 0 && (
              <div style={{ marginTop: mediaItems.length > 0 ? '24px' : 0 }}>
                {mediaItems.length > 0 && (
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--chatsdk-text-tertiary)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                    marginBottom: '12px',
                  }}>
                    Files & Audio
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {fileItems.map(item => (
                    <div
                      key={item.id}
                      style={styles.fileItem}
                      onClick={() => handleItemClick(item)}
                    >
                      <div style={styles.fileIcon}>
                        {getTypeIcon(item.type)}
                      </div>
                      <div style={styles.fileInfo}>
                        <div style={styles.fileName}>{item.name}</div>
                        <div style={styles.fileMeta}>
                          {formatFileSize(item.size)}
                          {item.duration && ` • ${formatDuration(item.duration)}`}
                          {' • '}{item.uploadedBy.name}
                        </div>
                      </div>
                      <button
                        style={{
                          ...styles.overlayButton,
                          backgroundColor: 'var(--chatsdk-bg-tertiary)',
                          color: 'var(--chatsdk-text-secondary)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload?.(item);
                        }}
                        title="Download"
                      >
                        <DownloadIcon />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxItem && (
        <MediaLightbox
          item={lightboxItem}
          items={mediaItems}
          onClose={() => setLightboxItem(null)}
          onPrevious={() => handleLightboxNavigate('prev')}
          onNext={() => handleLightboxNavigate('next')}
          onDownload={onDownload}
          onGoToMessage={onGoToMessage}
        />
      )}
    </div>
  );
};

export default MediaGallery;
