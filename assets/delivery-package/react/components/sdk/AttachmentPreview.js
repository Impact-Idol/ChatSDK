import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function AttachmentPreview({ attachments, onRemove, onRetry, maxPreviewSize = 80, showProgress = true, layout = 'horizontal', }) {
    if (attachments.length === 0)
        return null;
    const formatFileSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    const getFileIcon = (type) => {
        if (type.startsWith('image/'))
            return 'image';
        if (type.startsWith('video/'))
            return 'video';
        if (type.startsWith('audio/'))
            return 'audio';
        if (type.includes('pdf'))
            return 'pdf';
        if (type.includes('word') || type.includes('document'))
            return 'doc';
        if (type.includes('sheet') || type.includes('excel'))
            return 'sheet';
        if (type.includes('zip') || type.includes('rar') || type.includes('archive'))
            return 'archive';
        return 'file';
    };
    const styles = {
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
            position: 'relative',
            flexShrink: 0,
        },
        imagePreview: {
            width: `${maxPreviewSize}px`,
            height: `${maxPreviewSize}px`,
            borderRadius: '8px',
            objectFit: 'cover',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
        },
        videoPreview: {
            position: 'relative',
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
            objectFit: 'cover',
        },
        playIcon: {
            position: 'absolute',
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
            whiteSpace: 'nowrap',
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
            position: 'absolute',
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
            position: 'absolute',
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
            position: 'absolute',
            inset: 0,
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--chatsdk-error-color, #ef4444)',
            display: 'flex',
            flexDirection: 'column',
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
    const renderProgressRing = (progress) => {
        const radius = 14;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (progress / 100) * circumference;
        return (_jsxs("svg", { style: styles.progressRing, viewBox: "0 0 32 32", children: [_jsx("circle", { cx: "16", cy: "16", r: radius, fill: "none", stroke: "rgba(255, 255, 255, 0.3)", strokeWidth: "3" }), _jsx("circle", { cx: "16", cy: "16", r: radius, fill: "none", stroke: "#ffffff", strokeWidth: "3", strokeLinecap: "round", strokeDasharray: circumference, strokeDashoffset: offset, transform: "rotate(-90 16 16)" }), _jsxs("text", { x: "16", y: "16", textAnchor: "middle", dominantBaseline: "central", fill: "#ffffff", fontSize: "8", fontWeight: "600", children: [Math.round(progress), "%"] })] }));
    };
    const renderAttachment = (attachment) => {
        const { id, file, type, preview, progress = 0, status, error } = attachment;
        const fileType = getFileIcon(file.type);
        const removeBtn = (_jsx("button", { style: styles.removeButton, onClick: () => onRemove?.(id), title: "Remove", children: _jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }));
        if (type === 'image') {
            return (_jsxs("div", { style: styles.item, children: [removeBtn, _jsx("img", { src: preview || URL.createObjectURL(file), alt: file.name, style: styles.imagePreview }), status === 'uploading' && showProgress && (_jsx("div", { style: styles.progressOverlay, children: renderProgressRing(progress) })), status === 'error' && (_jsxs("div", { style: styles.errorOverlay, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "var(--chatsdk-error-color, #ef4444)", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }), _jsx("button", { style: styles.retryButton, onClick: () => onRetry?.(id), children: "Retry" })] }))] }, id));
        }
        if (type === 'video') {
            return (_jsxs("div", { style: styles.item, children: [removeBtn, _jsxs("div", { style: styles.videoPreview, children: [preview && (_jsx("video", { src: preview, style: styles.videoThumbnail })), _jsx("div", { style: styles.playIcon, children: _jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("polygon", { points: "5 3 19 12 5 21 5 3" }) }) })] }), status === 'uploading' && showProgress && (_jsx("div", { style: styles.progressOverlay, children: renderProgressRing(progress) }))] }, id));
        }
        if (type === 'audio') {
            return (_jsx("div", { style: styles.item, children: _jsxs("div", { style: styles.audioPreview, children: [_jsx("div", { style: { ...styles.fileIcon, backgroundColor: '#8b5cf6' }, children: _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M9 18V5l12-2v13" }), _jsx("circle", { cx: "6", cy: "18", r: "3" }), _jsx("circle", { cx: "18", cy: "16", r: "3" })] }) }), _jsxs("div", { style: styles.fileInfo, children: [_jsx("div", { style: styles.fileName, children: file.name }), _jsxs("div", { style: styles.fileMeta, children: [formatFileSize(file.size), status === 'uploading' && ` • ${progress}%`] })] }), _jsx("button", { style: { ...styles.removeButton, position: 'static' }, onClick: () => onRemove?.(id), children: _jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }) }, id));
        }
        // File type
        const iconStyle = {
            ...styles.fileIcon,
            ...(fileType === 'pdf' ? styles.fileIconPdf : {}),
            ...(fileType === 'doc' ? styles.fileIconDoc : {}),
            ...(fileType === 'sheet' ? styles.fileIconSheet : {}),
            ...(fileType === 'archive' ? styles.fileIconArchive : {}),
        };
        return (_jsx("div", { style: styles.item, children: _jsxs("div", { style: styles.filePreview, children: [_jsx("div", { style: iconStyle, children: _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), _jsx("polyline", { points: "14 2 14 8 20 8" })] }) }), _jsxs("div", { style: styles.fileInfo, children: [_jsx("div", { style: styles.fileName, children: file.name }), _jsxs("div", { style: styles.fileMeta, children: [formatFileSize(file.size), status === 'uploading' && (_jsxs("span", { style: { color: 'var(--chatsdk-accent-color, #6366f1)' }, children: [progress, "%"] })), status === 'error' && (_jsx("span", { style: { color: 'var(--chatsdk-error-color, #ef4444)' }, children: "Failed" }))] })] }), _jsx("button", { style: { ...styles.removeButton, position: 'static' }, onClick: () => onRemove?.(id), children: _jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }) }, id));
    };
    return (_jsx("div", { style: styles.container, children: attachments.map(renderAttachment) }));
}
