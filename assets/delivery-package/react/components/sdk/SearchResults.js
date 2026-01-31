import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import clsx from 'clsx';
// =============================================================================
// ICONS
// =============================================================================
const SearchIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("path", { d: "m21 21-4.35-4.35" })] }));
const MessageSquareIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }));
const HashIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "4", x2: "20", y1: "9", y2: "9" }), _jsx("line", { x1: "4", x2: "20", y1: "15", y2: "15" }), _jsx("line", { x1: "10", x2: "8", y1: "3", y2: "21" }), _jsx("line", { x1: "16", x2: "14", y1: "3", y2: "21" })] }));
const UserIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" })] }));
const FileIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }), _jsx("polyline", { points: "14 2 14 8 20 8" })] }));
const UsersIcon = () => (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })] }));
const MessageCircleIcon = () => (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z" }) }));
const HeartIcon = () => (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" }) }));
const PaperclipIcon = () => (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" }) }));
const ImageIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }), _jsx("circle", { cx: "9", cy: "9", r: "2" }), _jsx("path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" })] }));
const ArrowRightIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M5 12h14" }), _jsx("path", { d: "m12 5 7 7-7 7" })] }));
const LoaderIcon = () => (_jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", style: { animation: 'spin 1s linear infinite' }, children: _jsx("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }) }));
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
};
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
const getPresenceColor = (presence) => {
    switch (presence) {
        case 'online': return 'var(--chatsdk-success)';
        case 'away': return 'var(--chatsdk-warning)';
        case 'busy': return 'var(--chatsdk-error)';
        case 'offline': return 'var(--chatsdk-text-tertiary)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
const getFileTypeIcon = (mimeType) => {
    if (mimeType.startsWith('image/'))
        return _jsx(ImageIcon, {});
    return _jsx(FileIcon, {});
};
const highlightText = (text, query) => {
    if (!query.trim())
        return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => regex.test(part) ? (_jsx("mark", { style: {
            backgroundColor: 'var(--chatsdk-warning)',
            color: 'inherit',
            padding: '0 2px',
            borderRadius: '2px',
        }, children: part }, i)) : part);
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
        padding: '20px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    queryInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px',
    },
    queryIcon: {
        color: 'var(--chatsdk-text-tertiary)',
    },
    queryText: {
        fontSize: '14px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    queryValue: {
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
    },
    resultCount: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    filters: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
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
    filterCount: {
        padding: '1px 6px',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 600,
    },
    resultsList: {
        flex: 1,
        overflowY: 'auto',
    },
    section: {
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    sectionCount: {
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-tertiary)',
    },
    viewAllButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--chatsdk-primary)',
        cursor: 'pointer',
    },
    resultItem: {
        display: 'flex',
        gap: '12px',
        padding: '14px 20px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    resultItemHover: {
        backgroundColor: 'var(--chatsdk-bg-secondary)',
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        objectFit: 'cover',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        flexShrink: 0,
    },
    userAvatar: {
        borderRadius: '50%',
        position: 'relative',
    },
    presenceIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        border: '2px solid var(--chatsdk-bg-primary)',
    },
    iconPlaceholder: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '10px',
        color: 'var(--chatsdk-text-secondary)',
        flexShrink: 0,
    },
    resultContent: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    resultTitle: {
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    resultSubtitle: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-secondary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        lineHeight: 1.4,
    },
    resultMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '4px',
        flexWrap: 'wrap',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    channelBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '4px',
        fontSize: '12px',
        color: 'var(--chatsdk-text-secondary)',
    },
    loadMore: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        borderTop: '1px solid var(--chatsdk-border-light)',
    },
    loadMoreButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        border: '1px solid var(--chatsdk-border-light)',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
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
        borderRadius: '4px',
        animation: 'pulse 1.5s ease-in-out infinite',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '16px',
    },
    loadingText: {
        fontSize: '14px',
        color: 'var(--chatsdk-text-tertiary)',
    },
};
// =============================================================================
// COMPONENT
// =============================================================================
export const SearchResults = ({ query, results, loading = false, totalCount, activeFilter = 'all', onFilterChange, onResultClick, onLoadMore, hasMore = false, className, }) => {
    const [hoveredItem, setHoveredItem] = useState(null);
    const groupedResults = useMemo(() => {
        const groups = {
            message: [],
            channel: [],
            user: [],
            file: [],
        };
        results.forEach(result => {
            groups[result.type].push(result);
        });
        return groups;
    }, [results]);
    const filterCounts = useMemo(() => ({
        all: results.length,
        message: groupedResults.message.length,
        channel: groupedResults.channel.length,
        user: groupedResults.user.length,
        file: groupedResults.file.length,
    }), [results, groupedResults]);
    const filteredResults = useMemo(() => {
        if (activeFilter === 'all')
            return results;
        return results.filter(r => r.type === activeFilter);
    }, [results, activeFilter]);
    const renderMessageResult = (result) => (_jsxs("div", { style: {
            ...styles.resultItem,
            ...(hoveredItem === result.id ? styles.resultItemHover : {}),
        }, onMouseEnter: () => setHoveredItem(result.id), onMouseLeave: () => setHoveredItem(null), onClick: () => onResultClick?.(result), children: [result.user.imageUrl ? (_jsx("img", { src: result.user.imageUrl, alt: "", style: styles.avatar })) : (_jsx("div", { style: styles.iconPlaceholder, children: _jsx(UserIcon, {}) })), _jsxs("div", { style: styles.resultContent, children: [_jsx("div", { style: styles.resultTitle, children: result.user.name }), _jsx("div", { style: styles.resultSubtitle, children: highlightText(result.text, query) }), _jsxs("div", { style: styles.resultMeta, children: [_jsxs("span", { style: styles.channelBadge, children: [_jsx(HashIcon, {}), result.channel.name] }), _jsx("span", { style: styles.metaItem, children: formatDate(result.createdAt) }), result.replyCount && result.replyCount > 0 && (_jsxs("span", { style: styles.metaItem, children: [_jsx(MessageCircleIcon, {}), result.replyCount] })), result.reactionCount && result.reactionCount > 0 && (_jsxs("span", { style: styles.metaItem, children: [_jsx(HeartIcon, {}), result.reactionCount] })), result.attachmentCount && result.attachmentCount > 0 && (_jsxs("span", { style: styles.metaItem, children: [_jsx(PaperclipIcon, {}), result.attachmentCount] }))] })] })] }, result.id));
    const renderChannelResult = (result) => (_jsxs("div", { style: {
            ...styles.resultItem,
            ...(hoveredItem === result.id ? styles.resultItemHover : {}),
        }, onMouseEnter: () => setHoveredItem(result.id), onMouseLeave: () => setHoveredItem(null), onClick: () => onResultClick?.(result), children: [result.imageUrl ? (_jsx("img", { src: result.imageUrl, alt: "", style: styles.avatar })) : (_jsx("div", { style: styles.iconPlaceholder, children: _jsx(HashIcon, {}) })), _jsxs("div", { style: styles.resultContent, children: [_jsx("div", { style: styles.resultTitle, children: highlightText(result.name, query) }), result.description && (_jsx("div", { style: styles.resultSubtitle, children: highlightText(result.description, query) })), _jsxs("div", { style: styles.resultMeta, children: [_jsxs("span", { style: styles.metaItem, children: [_jsx(UsersIcon, {}), result.memberCount, " members"] }), result.lastMessageAt && (_jsxs("span", { style: styles.metaItem, children: ["Last active ", formatDate(result.lastMessageAt)] }))] })] })] }, result.id));
    const renderUserResult = (result) => (_jsxs("div", { style: {
            ...styles.resultItem,
            ...(hoveredItem === result.id ? styles.resultItemHover : {}),
        }, onMouseEnter: () => setHoveredItem(result.id), onMouseLeave: () => setHoveredItem(null), onClick: () => onResultClick?.(result), children: [_jsxs("div", { style: { position: 'relative' }, children: [result.imageUrl ? (_jsx("img", { src: result.imageUrl, alt: "", style: { ...styles.avatar, ...styles.userAvatar } })) : (_jsx("div", { style: { ...styles.iconPlaceholder, borderRadius: '50%' }, children: _jsx(UserIcon, {}) })), _jsx("div", { style: {
                            ...styles.presenceIndicator,
                            backgroundColor: getPresenceColor(result.presence),
                        } })] }), _jsxs("div", { style: styles.resultContent, children: [_jsx("div", { style: styles.resultTitle, children: highlightText(result.name, query) }), result.bio && (_jsx("div", { style: styles.resultSubtitle, children: highlightText(result.bio, query) })), _jsxs("div", { style: styles.resultMeta, children: [result.role && (_jsx("span", { style: styles.metaItem, children: result.role })), _jsx("span", { style: styles.metaItem, children: result.presence === 'online' ? 'Online' :
                                    result.presence === 'away' ? 'Away' :
                                        result.presence === 'busy' ? 'Busy' : 'Offline' })] })] })] }, result.id));
    const renderFileResult = (result) => (_jsxs("div", { style: {
            ...styles.resultItem,
            ...(hoveredItem === result.id ? styles.resultItemHover : {}),
        }, onMouseEnter: () => setHoveredItem(result.id), onMouseLeave: () => setHoveredItem(null), onClick: () => onResultClick?.(result), children: [result.thumbnailUrl ? (_jsx("img", { src: result.thumbnailUrl, alt: "", style: styles.avatar })) : (_jsx("div", { style: styles.iconPlaceholder, children: getFileTypeIcon(result.mimeType) })), _jsxs("div", { style: styles.resultContent, children: [_jsx("div", { style: styles.resultTitle, children: highlightText(result.name, query) }), _jsxs("div", { style: styles.resultMeta, children: [_jsx("span", { style: styles.metaItem, children: formatFileSize(result.size) }), _jsxs("span", { style: styles.channelBadge, children: [_jsx(HashIcon, {}), result.channel.name] }), _jsx("span", { style: styles.metaItem, children: formatDate(result.uploadedAt) }), _jsxs("span", { style: styles.metaItem, children: ["by ", result.uploadedBy.name] })] })] })] }, result.id));
    const renderResult = (result) => {
        switch (result.type) {
            case 'message': return renderMessageResult(result);
            case 'channel': return renderChannelResult(result);
            case 'user': return renderUserResult(result);
            case 'file': return renderFileResult(result);
            default: return null;
        }
    };
    const renderSection = (type, items) => {
        if (items.length === 0)
            return null;
        const icons = {
            message: _jsx(MessageSquareIcon, {}),
            channel: _jsx(HashIcon, {}),
            user: _jsx(UserIcon, {}),
            file: _jsx(FileIcon, {}),
        };
        const titles = {
            message: 'Messages',
            channel: 'Channels',
            user: 'People',
            file: 'Files',
        };
        return (_jsxs("div", { style: styles.section, children: [_jsxs("div", { style: styles.sectionHeader, children: [_jsxs("div", { style: styles.sectionTitle, children: [icons[type], titles[type]] }), _jsxs("span", { style: styles.sectionCount, children: [items.length, " results"] })] }), items.map(renderResult)] }, type));
    };
    const renderSkeletonItem = (index) => (_jsxs("div", { style: styles.resultItem, children: [_jsx("div", { style: { ...styles.skeleton, width: 40, height: 40, borderRadius: 10 } }), _jsxs("div", { style: styles.resultContent, children: [_jsx("div", { style: { ...styles.skeleton, width: 120, height: 14, marginBottom: 8 } }), _jsx("div", { style: { ...styles.skeleton, width: '100%', height: 16 } }), _jsx("div", { style: { ...styles.skeleton, width: 200, height: 12, marginTop: 8 } })] })] }, `skeleton-${index}`));
    return (_jsxs("div", { style: styles.container, className: clsx('chatsdk-search-results', className), children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.queryInfo, children: [_jsx("div", { style: styles.queryIcon, children: _jsx(SearchIcon, {}) }), _jsxs("span", { style: styles.queryText, children: ["Results for ", _jsxs("span", { style: styles.queryValue, children: ["\"", query, "\""] })] })] }), _jsx("div", { style: styles.resultCount, children: loading ? 'Searching...' : `${totalCount || results.length} results found` })] }), _jsx("div", { style: styles.filters, children: ['all', 'message', 'channel', 'user', 'file'].map(filter => {
                    const icons = {
                        all: null,
                        message: _jsx(MessageSquareIcon, {}),
                        channel: _jsx(HashIcon, {}),
                        user: _jsx(UserIcon, {}),
                        file: _jsx(FileIcon, {}),
                    };
                    const labels = {
                        all: 'All',
                        message: 'Messages',
                        channel: 'Channels',
                        user: 'People',
                        file: 'Files',
                    };
                    return (_jsxs("button", { style: {
                            ...styles.filterChip,
                            ...(activeFilter === filter ? styles.filterChipActive : {}),
                        }, onClick: () => onFilterChange?.(filter), children: [icons[filter], labels[filter], _jsx("span", { style: styles.filterCount, children: filterCounts[filter] })] }, filter));
                }) }), _jsxs("div", { style: styles.resultsList, children: [loading ? (_jsx("div", { children: Array.from({ length: 5 }).map((_, i) => renderSkeletonItem(i)) })) : filteredResults.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsx(SearchIcon, {}) }), _jsx("div", { style: styles.emptyTitle, children: "No results found" }), _jsxs("div", { style: styles.emptyDescription, children: ["We couldn't find anything matching \"", query, "\". Try different keywords or check your spelling."] })] })) : activeFilter === 'all' ? (
                    // Show grouped results
                    _jsxs(_Fragment, { children: [renderSection('message', groupedResults.message.slice(0, 5)), renderSection('channel', groupedResults.channel.slice(0, 3)), renderSection('user', groupedResults.user.slice(0, 3)), renderSection('file', groupedResults.file.slice(0, 3))] })) : (
                    // Show filtered results
                    _jsx("div", { style: styles.section, children: filteredResults.map(renderResult) })), hasMore && !loading && (_jsx("div", { style: styles.loadMore, children: _jsxs("button", { style: styles.loadMoreButton, onClick: onLoadMore, children: ["Load more results", _jsx(ArrowRightIcon, {})] }) }))] })] }));
};
export default SearchResults;
