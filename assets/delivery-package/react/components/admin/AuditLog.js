import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import clsx from 'clsx';
// =============================================================================
// ICONS
// =============================================================================
const ClipboardListIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" }), _jsx("path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }), _jsx("path", { d: "M12 11h4" }), _jsx("path", { d: "M12 16h4" }), _jsx("path", { d: "M8 11h.01" }), _jsx("path", { d: "M8 16h.01" })] }));
const SearchIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("path", { d: "m21 21-4.35-4.35" })] }));
const FilterIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }) }));
const DownloadIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", x2: "12", y1: "15", y2: "3" })] }));
const ChevronLeftIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m15 18-6-6 6-6" }) }));
const ChevronRightIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m9 18 6-6-6-6" }) }));
const UserIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" })] }));
const ShieldIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" }) }));
const ServerIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2" }), _jsx("rect", { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2" }), _jsx("line", { x1: "6", x2: "6.01", y1: "6", y2: "6" }), _jsx("line", { x1: "6", x2: "6.01", y1: "18", y2: "18" })] }));
const KeyIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "7.5", cy: "15.5", r: "5.5" }), _jsx("path", { d: "m21 2-9.6 9.6" }), _jsx("path", { d: "m15.5 7.5 3 3L22 7l-3-3" })] }));
const HashIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "4", x2: "20", y1: "9", y2: "9" }), _jsx("line", { x1: "4", x2: "20", y1: "15", y2: "15" }), _jsx("line", { x1: "10", x2: "8", y1: "3", y2: "21" }), _jsx("line", { x1: "16", x2: "14", y1: "3", y2: "21" })] }));
const MessageSquareIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }));
const WebhookIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" }), _jsx("path", { d: "m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" }), _jsx("path", { d: "m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" })] }));
const SettingsIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
const UserPlusIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("line", { x1: "19", x2: "19", y1: "8", y2: "14" }), _jsx("line", { x1: "22", x2: "16", y1: "11", y2: "11" })] }));
const UserMinusIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("line", { x1: "22", x2: "16", y1: "11", y2: "11" })] }));
const BanIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "m4.9 4.9 14.2 14.2" })] }));
const TrashIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 6h18" }), _jsx("path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }), _jsx("path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" })] }));
const EditIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }) }));
const LogInIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" }), _jsx("polyline", { points: "10 17 15 12 10 7" }), _jsx("line", { x1: "15", x2: "3", y1: "12", y2: "12" })] }));
const LogOutIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), _jsx("polyline", { points: "16 17 21 12 16 7" }), _jsx("line", { x1: "21", x2: "9", y1: "12", y2: "12" })] }));
const SnowflakeIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "2", x2: "22", y1: "12", y2: "12" }), _jsx("line", { x1: "12", x2: "12", y1: "2", y2: "22" }), _jsx("path", { d: "m20 16-4-4 4-4" }), _jsx("path", { d: "m4 8 4 4-4 4" }), _jsx("path", { d: "m16 4-4 4-4-4" }), _jsx("path", { d: "m8 20 4-4 4 4" })] }));
const GlobeIcon = () => (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" }), _jsx("path", { d: "M2 12h20" })] }));
const MapPinIcon = () => (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" }), _jsx("circle", { cx: "12", cy: "10", r: "3" })] }));
const AlertTriangleIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }), _jsx("path", { d: "M12 9v4" }), _jsx("path", { d: "M12 17h.01" })] }));
const InfoIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M12 16v-4" }), _jsx("path", { d: "M12 8h.01" })] }));
const AlertCircleIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", x2: "12", y1: "8", y2: "12" }), _jsx("line", { x1: "12", x2: "12.01", y1: "16", y2: "16" })] }));
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};
const formatRelativeTime = (dateString) => {
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
    return formatDate(dateString);
};
const getActionLabel = (action) => {
    const labels = {
        'user.created': 'User Created',
        'user.updated': 'User Updated',
        'user.deleted': 'User Deleted',
        'user.banned': 'User Banned',
        'user.unbanned': 'User Unbanned',
        'user.login': 'User Login',
        'user.logout': 'User Logout',
        'channel.created': 'Channel Created',
        'channel.updated': 'Channel Updated',
        'channel.deleted': 'Channel Deleted',
        'channel.frozen': 'Channel Frozen',
        'channel.unfrozen': 'Channel Unfrozen',
        'message.deleted': 'Message Deleted',
        'message.moderated': 'Message Moderated',
        'member.added': 'Member Added',
        'member.removed': 'Member Removed',
        'member.role_changed': 'Role Changed',
        'api_key.created': 'API Key Created',
        'api_key.revoked': 'API Key Revoked',
        'webhook.created': 'Webhook Created',
        'webhook.updated': 'Webhook Updated',
        'webhook.deleted': 'Webhook Deleted',
        'settings.updated': 'Settings Updated',
        'export.requested': 'Export Requested',
        'import.completed': 'Import Completed',
    };
    return labels[action];
};
const getActionIcon = (action) => {
    if (action.startsWith('user.')) {
        switch (action) {
            case 'user.created': return _jsx(UserPlusIcon, {});
            case 'user.deleted': return _jsx(UserMinusIcon, {});
            case 'user.banned': return _jsx(BanIcon, {});
            case 'user.unbanned': return _jsx(UserIcon, {});
            case 'user.login': return _jsx(LogInIcon, {});
            case 'user.logout': return _jsx(LogOutIcon, {});
            default: return _jsx(EditIcon, {});
        }
    }
    if (action.startsWith('channel.')) {
        switch (action) {
            case 'channel.frozen': return _jsx(SnowflakeIcon, {});
            case 'channel.deleted': return _jsx(TrashIcon, {});
            default: return _jsx(HashIcon, {});
        }
    }
    if (action.startsWith('message.')) {
        switch (action) {
            case 'message.deleted': return _jsx(TrashIcon, {});
            default: return _jsx(MessageSquareIcon, {});
        }
    }
    if (action.startsWith('member.'))
        return _jsx(UserIcon, {});
    if (action.startsWith('api_key.'))
        return _jsx(KeyIcon, {});
    if (action.startsWith('webhook.'))
        return _jsx(WebhookIcon, {});
    if (action.startsWith('settings.'))
        return _jsx(SettingsIcon, {});
    return _jsx(ClipboardListIcon, {});
};
const getActionColor = (action) => {
    if (action.includes('deleted') || action.includes('banned') || action.includes('revoked')) {
        return 'var(--chatsdk-error)';
    }
    if (action.includes('created')) {
        return 'var(--chatsdk-success)';
    }
    if (action.includes('updated') || action.includes('changed')) {
        return 'var(--chatsdk-warning)';
    }
    return 'var(--chatsdk-primary)';
};
const getSeverityColor = (severity) => {
    switch (severity) {
        case 'critical': return 'var(--chatsdk-error)';
        case 'warning': return 'var(--chatsdk-warning)';
        case 'info': return 'var(--chatsdk-info)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
const getSeverityIcon = (severity) => {
    switch (severity) {
        case 'critical': return _jsx(AlertCircleIcon, {});
        case 'warning': return _jsx(AlertTriangleIcon, {});
        case 'info': return _jsx(InfoIcon, {});
        default: return _jsx(InfoIcon, {});
    }
};
const getActorTypeIcon = (type) => {
    switch (type) {
        case 'admin': return _jsx(ShieldIcon, {});
        case 'system': return _jsx(ServerIcon, {});
        case 'api': return _jsx(KeyIcon, {});
        default: return _jsx(UserIcon, {});
    }
};
const getTargetIcon = (type) => {
    switch (type) {
        case 'user': return _jsx(UserIcon, {});
        case 'channel': return _jsx(HashIcon, {});
        case 'message': return _jsx(MessageSquareIcon, {});
        case 'api_key': return _jsx(KeyIcon, {});
        case 'webhook': return _jsx(WebhookIcon, {});
        case 'settings': return _jsx(SettingsIcon, {});
        default: return null;
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
        gap: '12px',
    },
    headerIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        backgroundColor: 'var(--chatsdk-text-primary)',
        borderRadius: '10px',
        color: 'white',
    },
    headerInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    title: {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        margin: 0,
    },
    subtitle: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    searchContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--chatsdk-border-light)',
        width: '280px',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        background: 'none',
        fontSize: '14px',
        color: 'var(--chatsdk-text-primary)',
        outline: 'none',
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
    exportButton: {
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
    logList: {
        flex: 1,
        overflowY: 'auto',
    },
    logEntry: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        padding: '16px 24px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
    },
    logEntryHover: {
        backgroundColor: 'var(--chatsdk-bg-secondary)',
    },
    timeline: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
    },
    timelineDot: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        flexShrink: 0,
    },
    timelineLine: {
        width: '2px',
        flex: 1,
        backgroundColor: 'var(--chatsdk-border-light)',
        marginTop: '8px',
    },
    logContent: {
        flex: 1,
        minWidth: 0,
    },
    logHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '8px',
    },
    logHeaderLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    actionRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    actionLabel: {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
    },
    severityBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
    },
    actorRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    actorAvatar: {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        objectFit: 'cover',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
    },
    actorAvatarFallback: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-tertiary)',
    },
    actorName: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-secondary)',
    },
    actorTypeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '1px 5px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '3px',
        fontSize: '10px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-tertiary)',
        textTransform: 'uppercase',
    },
    timestamp: {
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
        whiteSpace: 'nowrap',
    },
    logDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    targetInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        borderRadius: '6px',
    },
    targetIcon: {
        color: 'var(--chatsdk-text-tertiary)',
    },
    targetLabel: {
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    targetValue: {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
        fontFamily: 'var(--chatsdk-font-mono)',
    },
    metadata: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
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
};
// =============================================================================
// COMPONENT
// =============================================================================
export const AuditLog = ({ entries, loading = false, totalCount = 0, page = 1, pageSize = 20, onPageChange, onEntryClick, onExport, onFilterChange, className, }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredEntry, setHoveredEntry] = useState(null);
    const filteredEntries = useMemo(() => {
        if (!searchQuery)
            return entries;
        const query = searchQuery.toLowerCase();
        return entries.filter(entry => getActionLabel(entry.action).toLowerCase().includes(query) ||
            entry.actor.name.toLowerCase().includes(query) ||
            entry.target?.name?.toLowerCase().includes(query) ||
            entry.ipAddress?.includes(query));
    }, [entries, searchQuery]);
    const totalPages = Math.ceil((totalCount || filteredEntries.length) / pageSize);
    const renderLogEntry = (entry, index) => (_jsxs("div", { style: {
            ...styles.logEntry,
            ...(hoveredEntry === entry.id ? styles.logEntryHover : {}),
        }, onMouseEnter: () => setHoveredEntry(entry.id), onMouseLeave: () => setHoveredEntry(null), onClick: () => onEntryClick?.(entry), children: [_jsxs("div", { style: styles.timeline, children: [_jsx("div", { style: {
                            ...styles.timelineDot,
                            backgroundColor: `${getActionColor(entry.action)}15`,
                            color: getActionColor(entry.action),
                        }, children: getActionIcon(entry.action) }), index < filteredEntries.length - 1 && (_jsx("div", { style: styles.timelineLine }))] }), _jsxs("div", { style: styles.logContent, children: [_jsxs("div", { style: styles.logHeader, children: [_jsxs("div", { style: styles.logHeaderLeft, children: [_jsxs("div", { style: styles.actionRow, children: [_jsx("span", { style: styles.actionLabel, children: getActionLabel(entry.action) }), entry.severity !== 'info' && (_jsxs("span", { style: {
                                                    ...styles.severityBadge,
                                                    backgroundColor: `${getSeverityColor(entry.severity)}15`,
                                                    color: getSeverityColor(entry.severity),
                                                }, children: [getSeverityIcon(entry.severity), entry.severity] }))] }), _jsxs("div", { style: styles.actorRow, children: [entry.actor.imageUrl ? (_jsx("img", { src: entry.actor.imageUrl, alt: "", style: styles.actorAvatar })) : (_jsx("div", { style: styles.actorAvatarFallback, children: getActorTypeIcon(entry.actor.type) })), _jsx("span", { style: styles.actorName, children: entry.actor.name }), _jsxs("span", { style: styles.actorTypeBadge, children: [getActorTypeIcon(entry.actor.type), entry.actor.type] })] })] }), _jsx("span", { style: styles.timestamp, title: formatDate(entry.timestamp), children: formatRelativeTime(entry.timestamp) })] }), _jsxs("div", { style: styles.logDetails, children: [entry.target && (_jsxs("div", { style: styles.targetInfo, children: [_jsx("span", { style: styles.targetIcon, children: getTargetIcon(entry.target.type) }), _jsxs("span", { style: styles.targetLabel, children: [entry.target.type, ":"] }), _jsx("span", { style: styles.targetValue, children: entry.target.name || entry.target.id })] })), _jsxs("div", { style: styles.metadata, children: [entry.ipAddress && (_jsxs("span", { style: styles.metaItem, children: [_jsx(GlobeIcon, {}), entry.ipAddress] })), entry.location && (_jsxs("span", { style: styles.metaItem, children: [_jsx(MapPinIcon, {}), entry.location] }))] })] })] })] }, entry.id));
    const renderSkeletonEntry = (index) => (_jsxs("div", { style: styles.logEntry, children: [_jsx("div", { style: styles.timeline, children: _jsx("div", { style: { ...styles.skeleton, width: 32, height: 32, borderRadius: '50%' } }) }), _jsxs("div", { style: styles.logContent, children: [_jsx("div", { style: { ...styles.skeleton, width: 200, height: 18, marginBottom: 8 } }), _jsx("div", { style: { ...styles.skeleton, width: 150, height: 14, marginBottom: 12 } }), _jsx("div", { style: { ...styles.skeleton, width: '100%', height: 40 } })] })] }, `skeleton-${index}`));
    return (_jsxs("div", { style: styles.container, className: clsx('chatsdk-audit-log', className), children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("div", { style: styles.headerIcon, children: _jsx(ClipboardListIcon, {}) }), _jsxs("div", { style: styles.headerInfo, children: [_jsx("h2", { style: styles.title, children: "Audit Log" }), _jsxs("div", { style: styles.subtitle, children: [totalCount.toLocaleString(), " events logged"] })] })] }), _jsxs("div", { style: styles.headerRight, children: [_jsxs("div", { style: styles.searchContainer, children: [_jsx(SearchIcon, {}), _jsx("input", { type: "text", placeholder: "Search events...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), style: styles.searchInput })] }), _jsxs("button", { style: styles.filterButton, children: [_jsx(FilterIcon, {}), "Filter"] }), _jsxs("button", { style: styles.exportButton, onClick: onExport, children: [_jsx(DownloadIcon, {}), "Export"] })] })] }), _jsx("div", { style: styles.logList, children: loading ? (Array.from({ length: 5 }).map((_, i) => renderSkeletonEntry(i))) : filteredEntries.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsx(ClipboardListIcon, {}) }), _jsx("div", { style: styles.emptyTitle, children: "No events found" }), _jsx("div", { style: styles.emptyDescription, children: searchQuery
                                ? 'Try adjusting your search or filter criteria'
                                : 'Audit events will appear here as they occur' })] })) : (filteredEntries.map((entry, index) => renderLogEntry(entry, index))) }), !loading && filteredEntries.length > 0 && (_jsxs("div", { style: styles.pagination, children: [_jsxs("div", { style: styles.paginationInfo, children: ["Showing ", ((page - 1) * pageSize) + 1, " to ", Math.min(page * pageSize, totalCount || filteredEntries.length), " of ", totalCount || filteredEntries.length, " events"] }), _jsxs("div", { style: styles.paginationControls, children: [_jsx("button", { style: {
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
                                }, onClick: () => onPageChange?.(page + 1), disabled: page >= totalPages, children: _jsx(ChevronRightIcon, {}) })] })] }))] }));
};
export default AuditLog;
