import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function LinkPreview({ data, loading = false, error = false, variant = 'card', showImage = true, showFavicon = true, maxDescriptionLength = 150, onClick, onRemove, isOwn = false, }) {
    const getDomain = (url) => {
        try {
            const domain = new URL(url).hostname.replace('www.', '');
            return domain;
        }
        catch {
            return url;
        }
    };
    const truncateText = (text, maxLength) => {
        if (text.length <= maxLength)
            return text;
        return text.slice(0, maxLength).trim() + '...';
    };
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const styles = {
        // Card variant (default)
        cardContainer: {
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'var(--chatsdk-bg-secondary, #f9fafb)',
            border: `1px solid ${isOwn ? 'rgba(255,255,255,0.2)' : 'var(--chatsdk-border-color, #e5e7eb)'}`,
            maxWidth: '400px',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'box-shadow 0.15s ease',
            position: 'relative',
        },
        cardImage: {
            width: '100%',
            height: '180px',
            objectFit: 'cover',
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
            textTransform: 'uppercase',
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
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
        },
        cardDescription: {
            fontSize: '13px',
            color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--chatsdk-text-secondary, #6b7280)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
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
            position: 'relative',
        },
        compactImage: {
            width: '80px',
            height: '80px',
            borderRadius: '8px',
            objectFit: 'cover',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            flexShrink: 0,
        },
        compactContent: {
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
        },
        compactTitle: {
            fontSize: '13px',
            fontWeight: 600,
            color: isOwn ? '#ffffff' : 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '4px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        compactDescription: {
            fontSize: '12px',
            color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--chatsdk-text-secondary, #6b7280)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
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
            position: 'relative',
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
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        minimalDomain: {
            fontSize: '11px',
            color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        // Remove button
        removeButton: {
            position: 'absolute',
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
            position: 'absolute',
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
        return (_jsxs("div", { style: variant === 'card' ? styles.cardContainer : styles.compactContainer, children: [variant === 'card' && showImage && (_jsx("div", { style: { ...styles.cardImage, ...styles.loadingSkeleton } })), _jsxs("div", { style: variant === 'card' ? styles.cardContent : styles.compactContent, children: [_jsx("div", { style: { ...styles.loadingTitle, ...styles.loadingSkeleton } }), _jsx("div", { style: { ...styles.loadingDescription, ...styles.loadingSkeleton } }), _jsx("div", { style: { ...styles.loadingDescription, ...styles.loadingSkeleton, width: '60%' } })] })] }));
    }
    if (error) {
        return (_jsxs("div", { style: styles.errorContainer, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }), _jsx("path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" })] }), _jsx("span", { children: getDomain(data.url) })] }));
    }
    const handleClick = () => {
        if (onClick) {
            onClick();
        }
        else {
            window.open(data.url, '_blank', 'noopener,noreferrer');
        }
    };
    if (variant === 'minimal') {
        return (_jsxs("div", { style: styles.minimalContainer, onClick: handleClick, onMouseEnter: (e) => {
                const btn = e.currentTarget.querySelector('[data-remove]');
                if (btn)
                    btn.style.opacity = '1';
            }, onMouseLeave: (e) => {
                const btn = e.currentTarget.querySelector('[data-remove]');
                if (btn)
                    btn.style.opacity = '0';
            }, children: [showFavicon && data.favicon && (_jsx("img", { src: data.favicon, alt: "", style: styles.minimalFavicon })), _jsxs("div", { style: styles.minimalContent, children: [_jsx("div", { style: styles.minimalTitle, children: data.title || getDomain(data.url) }), _jsx("div", { style: styles.minimalDomain, children: getDomain(data.url) })] }), onRemove && (_jsx("button", { style: styles.removeButton, onClick: (e) => { e.stopPropagation(); onRemove(); }, "data-remove": true, children: _jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }))] }));
    }
    if (variant === 'compact') {
        return (_jsxs("div", { style: styles.compactContainer, onClick: handleClick, onMouseEnter: (e) => {
                const btn = e.currentTarget.querySelector('[data-remove]');
                if (btn)
                    btn.style.opacity = '1';
            }, onMouseLeave: (e) => {
                const btn = e.currentTarget.querySelector('[data-remove]');
                if (btn)
                    btn.style.opacity = '0';
            }, children: [showImage && data.imageUrl && (_jsx("img", { src: data.imageUrl, alt: "", style: styles.compactImage })), _jsxs("div", { style: styles.compactContent, children: [_jsx("div", { style: styles.compactTitle, children: data.title || getDomain(data.url) }), data.description && (_jsx("div", { style: styles.compactDescription, children: truncateText(data.description, maxDescriptionLength) })), _jsxs("div", { style: styles.compactDomain, children: [showFavicon && data.favicon && (_jsx("img", { src: data.favicon, alt: "", style: { width: '12px', height: '12px', borderRadius: '2px' } })), data.siteName || getDomain(data.url)] })] }), onRemove && (_jsx("button", { style: styles.removeButton, onClick: (e) => { e.stopPropagation(); onRemove(); }, "data-remove": true, children: _jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }))] }));
    }
    // Card variant (default)
    return (_jsxs("div", { style: styles.cardContainer, onClick: handleClick, onMouseEnter: (e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            const btn = e.currentTarget.querySelector('[data-remove]');
            if (btn)
                btn.style.opacity = '1';
        }, onMouseLeave: (e) => {
            e.currentTarget.style.boxShadow = 'none';
            const btn = e.currentTarget.querySelector('[data-remove]');
            if (btn)
                btn.style.opacity = '0';
        }, children: [showImage && data.imageUrl && (_jsxs("div", { style: { position: 'relative' }, children: [_jsx("img", { src: data.imageUrl, alt: "", style: styles.cardImage }), data.type === 'video' && (_jsx("div", { style: styles.playButton, children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("polygon", { points: "5 3 19 12 5 21 5 3" }) }) }))] })), _jsxs("div", { style: styles.cardContent, children: [_jsxs("div", { style: styles.cardHeader, children: [showFavicon && data.favicon && (_jsx("img", { src: data.favicon, alt: "", style: styles.favicon })), _jsx("span", { style: styles.siteName, children: data.siteName || getDomain(data.url) })] }), _jsx("div", { style: styles.cardTitle, children: data.title || getDomain(data.url) }), data.description && (_jsx("div", { style: styles.cardDescription, children: truncateText(data.description, maxDescriptionLength) })), (data.author || data.publishedDate) && (_jsxs("div", { style: styles.cardMeta, children: [data.author && _jsx("span", { children: data.author }), data.author && data.publishedDate && _jsx("span", { children: "\u2022" }), data.publishedDate && _jsx("span", { children: formatDate(data.publishedDate) })] }))] }), onRemove && (_jsx("button", { style: styles.removeButton, onClick: (e) => { e.stopPropagation(); onRemove(); }, "data-remove": true, children: _jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }))] }));
}
