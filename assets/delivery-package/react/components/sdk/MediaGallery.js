import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useCallback, useEffect } from 'react';
import clsx from 'clsx';
// =============================================================================
// ICONS
// =============================================================================
const ImageIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }), _jsx("circle", { cx: "9", cy: "9", r: "2" }), _jsx("path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" })] }));
const VideoIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "m22 8-6 4 6 4V8Z" }), _jsx("rect", { width: "14", height: "12", x: "2", y: "6", rx: "2", ry: "2" })] }));
const MusicIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M9 18V5l12-2v13" }), _jsx("circle", { cx: "6", cy: "18", r: "3" }), _jsx("circle", { cx: "18", cy: "16", r: "3" })] }));
const FileIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }), _jsx("polyline", { points: "14 2 14 8 20 8" })] }));
const DownloadIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", x2: "12", y1: "15", y2: "3" })] }));
const TrashIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 6h18" }), _jsx("path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }), _jsx("path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" })] }));
const XIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }));
const ChevronLeftIcon = () => (_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m15 18-6-6 6-6" }) }));
const ChevronRightIcon = () => (_jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m9 18 6-6-6-6" }) }));
const PlayIcon = () => (_jsx("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "currentColor", stroke: "none", children: _jsx("polygon", { points: "5 3 19 12 5 21 5 3" }) }));
const ExternalLinkIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }), _jsx("polyline", { points: "15 3 21 3 21 9" }), _jsx("line", { x1: "10", x2: "21", y1: "14", y2: "3" })] }));
const GridIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "7", height: "7", x: "3", y: "3", rx: "1" }), _jsx("rect", { width: "7", height: "7", x: "14", y: "3", rx: "1" }), _jsx("rect", { width: "7", height: "7", x: "14", y: "14", rx: "1" }), _jsx("rect", { width: "7", height: "7", x: "3", y: "14", rx: "1" })] }));
const FilterIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }) }));
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
const formatDuration = (seconds) => {
    if (!seconds)
        return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};
const getTypeIcon = (type) => {
    switch (type) {
        case 'image': return _jsx(ImageIcon, {});
        case 'video': return _jsx(VideoIcon, {});
        case 'audio': return _jsx(MusicIcon, {});
        case 'file': return _jsx(FileIcon, {});
        default: return _jsx(FileIcon, {});
    }
};
const getTypeLabel = (type) => {
    const labels = {
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
        flexDirection: 'column',
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
        flexWrap: 'wrap',
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
        overflowX: 'auto',
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
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
    },
    filterChipActive: {
        backgroundColor: 'var(--chatsdk-primary)',
        borderColor: 'var(--chatsdk-primary)',
        color: 'white',
    },
    content: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
    },
    grid: {
        display: 'grid',
        gap: '12px',
    },
    gridItem: {
        position: 'relative',
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
        objectFit: 'cover',
    },
    videoOverlay: {
        position: 'absolute',
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
        position: 'absolute',
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
        whiteSpace: 'nowrap',
    },
    fileMeta: {
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
        marginTop: '2px',
    },
    itemOverlay: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
        display: 'flex',
        flexDirection: 'column',
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
        whiteSpace: 'nowrap',
    },
    overlayMeta: {
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: '2px',
    },
    overlayActions: {
        position: 'absolute',
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
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
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
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
        flexDirection: 'column',
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
        position: 'relative',
    },
    lightboxMedia: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        borderRadius: '8px',
    },
    lightboxNav: {
        position: 'absolute',
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
        overflowX: 'auto',
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
        objectFit: 'cover',
    },
};
// =============================================================================
// LIGHTBOX COMPONENT
// =============================================================================
const MediaLightbox = ({ item, items, onClose, onPrevious, onNext, onDownload, onGoToMessage, }) => {
    const currentIndex = items.findIndex(i => i.id === item.id);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape')
                onClose();
            if (e.key === 'ArrowLeft')
                onPrevious();
            if (e.key === 'ArrowRight')
                onNext();
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [onClose, onPrevious, onNext]);
    return (_jsxs("div", { style: styles.lightbox, onClick: onClose, children: [_jsxs("div", { style: styles.lightboxHeader, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { style: styles.lightboxInfo, children: [_jsx("div", { style: styles.lightboxTitle, children: item.name }), _jsxs("div", { style: styles.lightboxMeta, children: [formatFileSize(item.size), " \u2022 ", formatDate(item.uploadedAt), " \u2022 by ", item.uploadedBy.name] })] }), _jsxs("div", { style: styles.lightboxActions, children: [item.messageId && item.channelId && (_jsx("button", { style: styles.lightboxButton, onClick: () => onGoToMessage?.(item.messageId, item.channelId), title: "Go to message", children: _jsx(ExternalLinkIcon, {}) })), _jsx("button", { style: styles.lightboxButton, onClick: () => onDownload?.(item), title: "Download", children: _jsx(DownloadIcon, {}) }), _jsx("button", { style: styles.lightboxButton, onClick: onClose, title: "Close", children: _jsx(XIcon, {}) })] })] }), _jsxs("div", { style: styles.lightboxContent, onClick: (e) => e.stopPropagation(), children: [item.type === 'image' && (_jsx("img", { src: item.url, alt: item.name, style: styles.lightboxMedia })), item.type === 'video' && (_jsx("video", { src: item.url, controls: true, autoPlay: true, style: styles.lightboxMedia })), item.type === 'audio' && (_jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: {
                                    ...styles.fileIcon,
                                    width: 80,
                                    height: 80,
                                    margin: '0 auto 16px',
                                }, children: _jsx(MusicIcon, {}) }), _jsx("audio", { src: item.url, controls: true, autoPlay: true, style: { width: '100%', maxWidth: 400 } })] })), currentIndex > 0 && (_jsx("button", { style: { ...styles.lightboxNav, ...styles.lightboxNavPrev }, onClick: onPrevious, children: _jsx(ChevronLeftIcon, {}) })), currentIndex < items.length - 1 && (_jsx("button", { style: { ...styles.lightboxNav, ...styles.lightboxNavNext }, onClick: onNext, children: _jsx(ChevronRightIcon, {}) }))] }), items.length > 1 && (_jsx("div", { style: styles.lightboxFooter, onClick: (e) => e.stopPropagation(), children: _jsx("div", { style: styles.thumbnailStrip, children: items.slice(0, 10).map((thumbItem) => (_jsx("div", { style: {
                            ...styles.thumbnailItem,
                            ...(thumbItem.id === item.id ? styles.thumbnailItemActive : {}),
                        }, onClick: () => {
                            const idx = items.findIndex(i => i.id === thumbItem.id);
                            if (idx < currentIndex) {
                                for (let i = currentIndex; i > idx; i--)
                                    onPrevious();
                            }
                            else {
                                for (let i = currentIndex; i < idx; i++)
                                    onNext();
                            }
                        }, children: thumbItem.type === 'image' || thumbItem.type === 'video' ? (_jsx("img", { src: thumbItem.thumbnailUrl || thumbItem.url, alt: "", style: styles.thumbnailImage })) : (_jsx("div", { style: {
                                ...styles.thumbnailImage,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'var(--chatsdk-bg-tertiary)',
                            }, children: getTypeIcon(thumbItem.type) })) }, thumbItem.id))) }) }))] }));
};
// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const MediaGallery = ({ items, loading = false, initialFilter = 'all', gridColumns = 4, onItemClick, onDownload, onDelete, onGoToMessage, canDelete = false, className, }) => {
    const [activeFilter, setActiveFilter] = useState(initialFilter);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [lightboxItem, setLightboxItem] = useState(null);
    const filteredItems = useMemo(() => {
        if (activeFilter === 'all')
            return items;
        return items.filter(item => item.type === activeFilter);
    }, [items, activeFilter]);
    const mediaItems = useMemo(() => {
        return filteredItems.filter(item => item.type === 'image' || item.type === 'video');
    }, [filteredItems]);
    const fileItems = useMemo(() => {
        return filteredItems.filter(item => item.type === 'audio' || item.type === 'file');
    }, [filteredItems]);
    const handleItemClick = useCallback((item) => {
        if (item.type === 'image' || item.type === 'video') {
            setLightboxItem(item);
        }
        onItemClick?.(item);
    }, [onItemClick]);
    const handleLightboxNavigate = useCallback((direction) => {
        if (!lightboxItem)
            return;
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
    return (_jsxs("div", { style: styles.container, className: clsx('chatsdk-media-gallery', className), children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("h3", { style: styles.title, children: "Shared Media" }), _jsxs("span", { style: styles.itemCount, children: [filteredItems.length, " items"] })] }), _jsx("div", { style: styles.headerRight, children: _jsx("button", { style: {
                                ...styles.filterChip,
                                padding: '6px 10px',
                            }, children: _jsx(GridIcon, {}) }) })] }), _jsx("div", { style: styles.filters, children: ['all', 'image', 'video', 'audio', 'file'].map(type => (_jsxs("button", { style: {
                        ...styles.filterChip,
                        ...(activeFilter === type ? styles.filterChipActive : {}),
                    }, onClick: () => setActiveFilter(type), children: [type !== 'all' && getTypeIcon(type), getTypeLabel(type), _jsxs("span", { style: { opacity: 0.7 }, children: ["(", typeCounts[type], ")"] })] }, type))) }), _jsx("div", { style: styles.content, children: loading ? (_jsx("div", { style: gridStyle, children: Array.from({ length: 12 }).map((_, i) => (_jsx("div", { style: styles.skeleton }, i))) })) : filteredItems.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: activeFilter === 'all' ? _jsx(ImageIcon, {}) : getTypeIcon(activeFilter) }), _jsx("div", { style: styles.emptyTitle, children: "No media found" }), _jsx("div", { style: styles.emptyDescription, children: activeFilter === 'all'
                                ? 'Media shared in this channel will appear here'
                                : `No ${getTypeLabel(activeFilter).toLowerCase()} have been shared yet` })] })) : (_jsxs(_Fragment, { children: [mediaItems.length > 0 && (_jsx("div", { style: gridStyle, children: mediaItems.map(item => (_jsxs("div", { style: {
                                    ...styles.gridItem,
                                    ...(hoveredItem === item.id ? styles.gridItemHover : {}),
                                }, onMouseEnter: () => setHoveredItem(item.id), onMouseLeave: () => setHoveredItem(null), onClick: () => handleItemClick(item), children: [_jsx("img", { src: item.thumbnailUrl || item.url, alt: item.name, style: styles.thumbnail }), item.type === 'video' && (_jsx("div", { style: styles.videoOverlay, children: _jsx("div", { style: styles.playButton, children: _jsx(PlayIcon, {}) }) })), item.duration && (_jsx("div", { style: styles.duration, children: formatDuration(item.duration) })), _jsxs("div", { style: {
                                            ...styles.itemOverlay,
                                            ...(hoveredItem === item.id ? styles.itemOverlayVisible : {}),
                                        }, children: [_jsx("div", { style: styles.overlayText, children: item.name }), _jsxs("div", { style: styles.overlayMeta, children: [formatFileSize(item.size), " \u2022 ", item.uploadedBy.name] }), _jsxs("div", { style: styles.overlayActions, children: [_jsx("button", { style: styles.overlayButton, onClick: (e) => {
                                                            e.stopPropagation();
                                                            onDownload?.(item);
                                                        }, title: "Download", children: _jsx(DownloadIcon, {}) }), canDelete && (_jsx("button", { style: styles.overlayButton, onClick: (e) => {
                                                            e.stopPropagation();
                                                            onDelete?.(item);
                                                        }, title: "Delete", children: _jsx(TrashIcon, {}) }))] })] })] }, item.id))) })), fileItems.length > 0 && (_jsxs("div", { style: { marginTop: mediaItems.length > 0 ? '24px' : 0 }, children: [mediaItems.length > 0 && (_jsx("div", { style: {
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: 'var(--chatsdk-text-tertiary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '12px',
                                    }, children: "Files & Audio" })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: fileItems.map(item => (_jsxs("div", { style: styles.fileItem, onClick: () => handleItemClick(item), children: [_jsx("div", { style: styles.fileIcon, children: getTypeIcon(item.type) }), _jsxs("div", { style: styles.fileInfo, children: [_jsx("div", { style: styles.fileName, children: item.name }), _jsxs("div", { style: styles.fileMeta, children: [formatFileSize(item.size), item.duration && ` • ${formatDuration(item.duration)}`, ' • ', item.uploadedBy.name] })] }), _jsx("button", { style: {
                                                    ...styles.overlayButton,
                                                    backgroundColor: 'var(--chatsdk-bg-tertiary)',
                                                    color: 'var(--chatsdk-text-secondary)',
                                                }, onClick: (e) => {
                                                    e.stopPropagation();
                                                    onDownload?.(item);
                                                }, title: "Download", children: _jsx(DownloadIcon, {}) })] }, item.id))) })] }))] })) }), lightboxItem && (_jsx(MediaLightbox, { item: lightboxItem, items: mediaItems, onClose: () => setLightboxItem(null), onPrevious: () => handleLightboxNavigate('prev'), onNext: () => handleLightboxNavigate('next'), onDownload: onDownload, onGoToMessage: onGoToMessage }))] }));
};
export default MediaGallery;
