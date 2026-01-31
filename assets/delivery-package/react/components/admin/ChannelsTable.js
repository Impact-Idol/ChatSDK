import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import clsx from 'clsx';
// =============================================================================
// ICONS
// =============================================================================
const SearchIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("path", { d: "m21 21-4.35-4.35" })] }));
const HashIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "4", x2: "20", y1: "9", y2: "9" }), _jsx("line", { x1: "4", x2: "20", y1: "15", y2: "15" }), _jsx("line", { x1: "10", x2: "8", y1: "3", y2: "21" }), _jsx("line", { x1: "16", x2: "14", y1: "3", y2: "21" })] }));
const UsersIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })] }));
const MessageSquareIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }));
const MoreVerticalIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "1" }), _jsx("circle", { cx: "12", cy: "5", r: "1" }), _jsx("circle", { cx: "12", cy: "19", r: "1" })] }));
const ChevronLeftIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m15 18-6-6 6-6" }) }));
const ChevronRightIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m9 18 6-6-6-6" }) }));
const SnowflakeIcon = () => (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "2", x2: "22", y1: "12", y2: "12" }), _jsx("line", { x1: "12", x2: "12", y1: "2", y2: "22" }), _jsx("path", { d: "m20 16-4-4 4-4" }), _jsx("path", { d: "m4 8 4 4-4 4" }), _jsx("path", { d: "m16 4-4 4-4-4" }), _jsx("path", { d: "m8 20 4-4 4 4" })] }));
const ArchiveIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "20", height: "5", x: "2", y: "3", rx: "1" }), _jsx("path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }), _jsx("path", { d: "M10 12h4" })] }));
const TrashIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 6h18" }), _jsx("path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }), _jsx("path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" })] }));
const EditIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }) }));
const FilterIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }) }));
const DownloadIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", x2: "12", y1: "15", y2: "3" })] }));
const PlusIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "12", x2: "12", y1: "5", y2: "19" }), _jsx("line", { x1: "5", x2: "19", y1: "12", y2: "12" })] }));
const VideoIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "m22 8-6 4 6 4V8Z" }), _jsx("rect", { width: "14", height: "12", x: "2", y: "6", rx: "2", ry: "2" })] }));
const ShoppingCartIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "8", cy: "21", r: "1" }), _jsx("circle", { cx: "19", cy: "21", r: "1" }), _jsx("path", { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" })] }));
const HeadphonesIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" }) }));
const SettingsIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const formatNumber = (num) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
};
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
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
};
const getChannelTypeIcon = (type) => {
    switch (type) {
        case 'messaging': return _jsx(HashIcon, {});
        case 'livestream': return _jsx(VideoIcon, {});
        case 'team': return _jsx(UsersIcon, {});
        case 'commerce': return _jsx(ShoppingCartIcon, {});
        case 'support': return _jsx(HeadphonesIcon, {});
        default: return _jsx(SettingsIcon, {});
    }
};
const getChannelTypeLabel = (type) => {
    const labels = {
        messaging: 'Messaging',
        livestream: 'Livestream',
        team: 'Team',
        commerce: 'Commerce',
        support: 'Support',
        custom: 'Custom',
    };
    return labels[type];
};
const getStatusColor = (status) => {
    switch (status) {
        case 'active': return 'var(--chatsdk-success)';
        case 'frozen': return 'var(--chatsdk-info)';
        case 'archived': return 'var(--chatsdk-warning)';
        case 'deleted': return 'var(--chatsdk-error)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
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
        borderRadius: '12px',
        border: '1px solid var(--chatsdk-border-light)',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
        gap: '16px',
        flexWrap: 'wrap',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flex: 1,
        minWidth: '300px',
    },
    title: {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        margin: 0,
    },
    searchContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--chatsdk-border-light)',
        flex: 1,
        maxWidth: '320px',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        background: 'none',
        fontSize: '14px',
        color: 'var(--chatsdk-text-primary)',
        outline: 'none',
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    filterButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        border: '1px solid var(--chatsdk-border-light)',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    primaryButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: 'var(--chatsdk-primary)',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    filters: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        overflowX: 'auto',
    },
    filterChip: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
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
    bulkActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 24px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
        backgroundColor: 'var(--chatsdk-primary-light)',
    },
    bulkActionsText: {
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-primary)',
    },
    bulkActionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        backgroundColor: 'white',
        border: '1px solid var(--chatsdk-border-light)',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    tableContainer: {
        flex: 1,
        overflowX: 'auto',
        overflowY: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: '900px',
    },
    tableHeader: {
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
    },
    th: {
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid var(--chatsdk-border-light)',
        whiteSpace: 'nowrap',
    },
    thCheckbox: {
        width: '40px',
        padding: '12px 16px',
    },
    tr: {
        borderBottom: '1px solid var(--chatsdk-border-light)',
        transition: 'background-color 0.15s ease',
        cursor: 'pointer',
    },
    trHover: {
        backgroundColor: 'var(--chatsdk-bg-secondary)',
    },
    td: {
        padding: '16px',
        fontSize: '14px',
        color: 'var(--chatsdk-text-primary)',
        verticalAlign: 'middle',
    },
    checkbox: {
        width: '16px',
        height: '16px',
        accentColor: 'var(--chatsdk-primary)',
        cursor: 'pointer',
    },
    channelCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    channelIcon: {
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
    channelImage: {
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        objectFit: 'cover',
    },
    channelInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: 0,
    },
    channelName: {
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    channelCid: {
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
        fontFamily: 'var(--chatsdk-font-mono)',
    },
    typeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 500,
        textTransform: 'capitalize',
    },
    statusDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
    },
    statsCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        color: 'var(--chatsdk-text-secondary)',
        fontSize: '13px',
    },
    creatorCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    creatorAvatar: {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        objectFit: 'cover',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
    },
    creatorName: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-secondary)',
    },
    dateCell: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-secondary)',
        whiteSpace: 'nowrap',
    },
    actionsCell: {
        position: 'relative',
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '6px',
        color: 'var(--chatsdk-text-tertiary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    actionMenu: {
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: '4px',
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '8px',
        border: '1px solid var(--chatsdk-border-light)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        minWidth: '160px',
        zIndex: 100,
        overflow: 'hidden',
    },
    actionMenuItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '10px 14px',
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.15s ease',
    },
    actionMenuItemDanger: {
        color: 'var(--chatsdk-error)',
    },
    pagination: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderTop: '1px solid var(--chatsdk-border-light)',
        backgroundColor: 'var(--chatsdk-bg-primary)',
    },
    paginationInfo: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-secondary)',
    },
    paginationControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    paginationButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        border: '1px solid var(--chatsdk-border-light)',
        borderRadius: '6px',
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    paginationButtonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    pageNumber: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '32px',
        height: '32px',
        padding: '0 8px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    pageNumberActive: {
        backgroundColor: 'var(--chatsdk-primary)',
        color: 'white',
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
    configBadges: {
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
    },
    configBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-tertiary)',
        textTransform: 'uppercase',
    },
};
// =============================================================================
// COMPONENT
// =============================================================================
export const ChannelsTable = ({ channels, loading = false, totalCount = 0, page = 1, pageSize = 10, onPageChange, onChannelClick, onEditChannel, onFreezeChannel, onArchiveChannel, onDeleteChannel, onExportChannels, onBulkAction, className, }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [hoveredRow, setHoveredRow] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [activeTypeFilter, setActiveTypeFilter] = useState('all');
    const [activeStatusFilter, setActiveStatusFilter] = useState('all');
    const filteredChannels = useMemo(() => {
        return channels.filter(channel => {
            const matchesSearch = !searchQuery ||
                channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                channel.cid.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = activeTypeFilter === 'all' || channel.type === activeTypeFilter;
            const matchesStatus = activeStatusFilter === 'all' || channel.status === activeStatusFilter;
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [channels, searchQuery, activeTypeFilter, activeStatusFilter]);
    const totalPages = Math.ceil((totalCount || filteredChannels.length) / pageSize);
    const allSelected = filteredChannels.length > 0 && selectedIds.size === filteredChannels.length;
    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        }
        else {
            setSelectedIds(new Set(filteredChannels.map(c => c.id)));
        }
    };
    const handleSelectOne = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        }
        else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };
    const handleRowClick = (channel, e) => {
        if (e.target.closest('input, button'))
            return;
        onChannelClick?.(channel);
    };
    const renderSkeletonRow = (index) => (_jsxs("tr", { style: styles.tr, children: [_jsx("td", { style: { ...styles.td, ...styles.thCheckbox }, children: _jsx("div", { style: { ...styles.skeleton, width: 16, height: 16 } }) }), _jsx("td", { style: styles.td, children: _jsxs("div", { style: styles.channelCell, children: [_jsx("div", { style: { ...styles.skeleton, width: 40, height: 40, borderRadius: 10 } }), _jsxs("div", { style: styles.channelInfo, children: [_jsx("div", { style: { ...styles.skeleton, width: 140, height: 16, marginBottom: 4 } }), _jsx("div", { style: { ...styles.skeleton, width: 100, height: 12 } })] })] }) }), _jsx("td", { style: styles.td, children: _jsx("div", { style: { ...styles.skeleton, width: 80, height: 24 } }) }), _jsx("td", { style: styles.td, children: _jsx("div", { style: { ...styles.skeleton, width: 70, height: 24 } }) }), _jsx("td", { style: styles.td, children: _jsx("div", { style: { ...styles.skeleton, width: 60, height: 16 } }) }), _jsx("td", { style: styles.td, children: _jsx("div", { style: { ...styles.skeleton, width: 60, height: 16 } }) }), _jsx("td", { style: styles.td, children: _jsxs("div", { style: styles.creatorCell, children: [_jsx("div", { style: { ...styles.skeleton, width: 24, height: 24, borderRadius: '50%' } }), _jsx("div", { style: { ...styles.skeleton, width: 80, height: 14 } })] }) }), _jsx("td", { style: styles.td, children: _jsx("div", { style: { ...styles.skeleton, width: 70, height: 14 } }) }), _jsx("td", { style: styles.td, children: _jsx("div", { style: { ...styles.skeleton, width: 32, height: 32, borderRadius: 6 } }) })] }, `skeleton-${index}`));
    return (_jsxs("div", { style: styles.container, className: clsx('chatsdk-channels-table', className), children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("h2", { style: styles.title, children: "Channels" }), _jsxs("div", { style: styles.searchContainer, children: [_jsx(SearchIcon, {}), _jsx("input", { type: "text", placeholder: "Search channels...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), style: styles.searchInput })] })] }), _jsxs("div", { style: styles.headerRight, children: [_jsxs("button", { style: styles.filterButton, onClick: () => onExportChannels?.(Array.from(selectedIds)), children: [_jsx(DownloadIcon, {}), "Export"] }), _jsxs("button", { style: styles.primaryButton, children: [_jsx(PlusIcon, {}), "Create Channel"] })] })] }), _jsxs("div", { style: styles.filters, children: [_jsxs("span", { style: { fontSize: '13px', color: 'var(--chatsdk-text-tertiary)', marginRight: '8px' }, children: [_jsx(FilterIcon, {}), " Type:"] }), ['all', 'messaging', 'livestream', 'team', 'commerce', 'support'].map(type => (_jsx("button", { style: {
                            ...styles.filterChip,
                            ...(activeTypeFilter === type ? styles.filterChipActive : {}),
                        }, onClick: () => setActiveTypeFilter(type), children: type === 'all' ? 'All Types' : getChannelTypeLabel(type) }, type))), _jsx("div", { style: { width: '1px', height: '20px', backgroundColor: 'var(--chatsdk-border-light)', margin: '0 8px' } }), _jsx("span", { style: { fontSize: '13px', color: 'var(--chatsdk-text-tertiary)', marginRight: '8px' }, children: "Status:" }), ['all', 'active', 'frozen', 'archived'].map(status => (_jsx("button", { style: {
                            ...styles.filterChip,
                            ...(activeStatusFilter === status ? styles.filterChipActive : {}),
                        }, onClick: () => setActiveStatusFilter(status), children: status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1) }, status)))] }), selectedIds.size > 0 && (_jsxs("div", { style: styles.bulkActions, children: [_jsxs("span", { style: styles.bulkActionsText, children: [selectedIds.size, " channel", selectedIds.size !== 1 ? 's' : '', " selected"] }), _jsxs("button", { style: styles.bulkActionButton, onClick: () => onBulkAction?.('freeze', Array.from(selectedIds)), children: [_jsx(SnowflakeIcon, {}), "Freeze"] }), _jsxs("button", { style: styles.bulkActionButton, onClick: () => onBulkAction?.('archive', Array.from(selectedIds)), children: [_jsx(ArchiveIcon, {}), "Archive"] }), _jsxs("button", { style: { ...styles.bulkActionButton, color: 'var(--chatsdk-error)' }, onClick: () => onBulkAction?.('delete', Array.from(selectedIds)), children: [_jsx(TrashIcon, {}), "Delete"] })] })), _jsx("div", { style: styles.tableContainer, children: _jsxs("table", { style: styles.table, children: [_jsx("thead", { style: styles.tableHeader, children: _jsxs("tr", { children: [_jsx("th", { style: { ...styles.th, ...styles.thCheckbox }, children: _jsx("input", { type: "checkbox", checked: allSelected, onChange: handleSelectAll, style: styles.checkbox }) }), _jsx("th", { style: styles.th, children: "Channel" }), _jsx("th", { style: styles.th, children: "Type" }), _jsx("th", { style: styles.th, children: "Status" }), _jsx("th", { style: styles.th, children: "Members" }), _jsx("th", { style: styles.th, children: "Messages" }), _jsx("th", { style: styles.th, children: "Created By" }), _jsx("th", { style: styles.th, children: "Last Activity" }), _jsx("th", { style: { ...styles.th, width: '50px' } })] }) }), _jsx("tbody", { children: loading ? (Array.from({ length: 5 }).map((_, i) => renderSkeletonRow(i))) : filteredChannels.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 9, children: _jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsx(HashIcon, {}) }), _jsx("div", { style: styles.emptyTitle, children: "No channels found" }), _jsx("div", { style: styles.emptyDescription, children: searchQuery
                                                    ? 'Try adjusting your search or filter criteria'
                                                    : 'Create your first channel to get started' })] }) }) })) : (filteredChannels.map(channel => (_jsxs("tr", { style: {
                                    ...styles.tr,
                                    ...(hoveredRow === channel.id || selectedIds.has(channel.id) ? styles.trHover : {}),
                                }, onMouseEnter: () => setHoveredRow(channel.id), onMouseLeave: () => setHoveredRow(null), onClick: (e) => handleRowClick(channel, e), children: [_jsx("td", { style: { ...styles.td, ...styles.thCheckbox }, children: _jsx("input", { type: "checkbox", checked: selectedIds.has(channel.id), onChange: () => handleSelectOne(channel.id), style: styles.checkbox }) }), _jsx("td", { style: styles.td, children: _jsxs("div", { style: styles.channelCell, children: [channel.imageUrl ? (_jsx("img", { src: channel.imageUrl, alt: "", style: styles.channelImage })) : (_jsx("div", { style: styles.channelIcon, children: getChannelTypeIcon(channel.type) })), _jsxs("div", { style: styles.channelInfo, children: [_jsx("div", { style: styles.channelName, children: channel.name }), _jsx("div", { style: styles.channelCid, children: channel.cid })] })] }) }), _jsx("td", { style: styles.td, children: _jsxs("div", { style: styles.typeBadge, children: [getChannelTypeIcon(channel.type), getChannelTypeLabel(channel.type)] }) }), _jsx("td", { style: styles.td, children: _jsxs("div", { style: {
                                                ...styles.statusBadge,
                                                backgroundColor: `${getStatusColor(channel.status)}15`,
                                                color: getStatusColor(channel.status),
                                            }, children: [_jsx("div", { style: { ...styles.statusDot, backgroundColor: getStatusColor(channel.status) } }), channel.status] }) }), _jsx("td", { style: styles.td, children: _jsxs("div", { style: styles.statsCell, children: [_jsx(UsersIcon, {}), formatNumber(channel.memberCount)] }) }), _jsx("td", { style: styles.td, children: _jsxs("div", { style: styles.statsCell, children: [_jsx(MessageSquareIcon, {}), formatNumber(channel.messageCount)] }) }), _jsx("td", { style: styles.td, children: _jsxs("div", { style: styles.creatorCell, children: [channel.createdBy.imageUrl ? (_jsx("img", { src: channel.createdBy.imageUrl, alt: "", style: styles.creatorAvatar })) : (_jsx("div", { style: { ...styles.creatorAvatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--chatsdk-text-tertiary)' }, children: channel.createdBy.name.charAt(0).toUpperCase() })), _jsx("span", { style: styles.creatorName, children: channel.createdBy.name })] }) }), _jsx("td", { style: styles.td, children: _jsx("div", { style: styles.dateCell, children: channel.lastMessageAt ? formatDate(channel.lastMessageAt) : 'Never' }) }), _jsxs("td", { style: { ...styles.td, ...styles.actionsCell }, children: [_jsx("button", { style: {
                                                    ...styles.actionButton,
                                                    backgroundColor: openMenuId === channel.id ? 'var(--chatsdk-bg-tertiary)' : undefined,
                                                }, onClick: (e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === channel.id ? null : channel.id);
                                                }, children: _jsx(MoreVerticalIcon, {}) }), openMenuId === channel.id && (_jsxs("div", { style: styles.actionMenu, children: [_jsxs("button", { style: styles.actionMenuItem, onClick: (e) => {
                                                            e.stopPropagation();
                                                            onEditChannel?.(channel);
                                                            setOpenMenuId(null);
                                                        }, children: [_jsx(EditIcon, {}), "Edit Channel"] }), _jsxs("button", { style: styles.actionMenuItem, onClick: (e) => {
                                                            e.stopPropagation();
                                                            onFreezeChannel?.(channel);
                                                            setOpenMenuId(null);
                                                        }, children: [_jsx(SnowflakeIcon, {}), channel.status === 'frozen' ? 'Unfreeze' : 'Freeze', " Channel"] }), _jsxs("button", { style: styles.actionMenuItem, onClick: (e) => {
                                                            e.stopPropagation();
                                                            onArchiveChannel?.(channel);
                                                            setOpenMenuId(null);
                                                        }, children: [_jsx(ArchiveIcon, {}), "Archive Channel"] }), _jsxs("button", { style: { ...styles.actionMenuItem, ...styles.actionMenuItemDanger }, onClick: (e) => {
                                                            e.stopPropagation();
                                                            onDeleteChannel?.(channel);
                                                            setOpenMenuId(null);
                                                        }, children: [_jsx(TrashIcon, {}), "Delete Channel"] })] }))] })] }, channel.id)))) })] }) }), !loading && filteredChannels.length > 0 && (_jsxs("div", { style: styles.pagination, children: [_jsxs("div", { style: styles.paginationInfo, children: ["Showing ", ((page - 1) * pageSize) + 1, " to ", Math.min(page * pageSize, totalCount || filteredChannels.length), " of ", totalCount || filteredChannels.length, " channels"] }), _jsxs("div", { style: styles.paginationControls, children: [_jsx("button", { style: {
                                    ...styles.paginationButton,
                                    ...(page <= 1 ? styles.paginationButtonDisabled : {}),
                                }, onClick: () => onPageChange?.(page - 1), disabled: page <= 1, children: _jsx(ChevronLeftIcon, {}) }), Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                }
                                else if (page <= 3) {
                                    pageNum = i + 1;
                                }
                                else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                }
                                else {
                                    pageNum = page - 2 + i;
                                }
                                return (_jsx("button", { style: {
                                        ...styles.pageNumber,
                                        ...(page === pageNum ? styles.pageNumberActive : {}),
                                    }, onClick: () => onPageChange?.(pageNum), children: pageNum }, pageNum));
                            }), _jsx("button", { style: {
                                    ...styles.paginationButton,
                                    ...(page >= totalPages ? styles.paginationButtonDisabled : {}),
                                }, onClick: () => onPageChange?.(page + 1), disabled: page >= totalPages, children: _jsx(ChevronRightIcon, {}) })] })] })), openMenuId && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 50,
                }, onClick: () => setOpenMenuId(null) }))] }));
};
export default ChannelsTable;
