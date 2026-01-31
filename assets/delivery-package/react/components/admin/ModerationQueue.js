import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import clsx from 'clsx';
// =============================================================================
// ICONS
// =============================================================================
const AlertTriangleIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }), _jsx("path", { d: "M12 9v4" }), _jsx("path", { d: "M12 17h.01" })] }));
const ShieldIcon = () => (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" }) }));
const CheckIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }));
const XIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }));
const EyeIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
const TrashIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 6h18" }), _jsx("path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }), _jsx("path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" })] }));
const BanIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "m4.9 4.9 14.2 14.2" })] }));
const VolumeXIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }), _jsx("line", { x1: "22", x2: "16", y1: "9", y2: "15" }), _jsx("line", { x1: "16", x2: "22", y1: "9", y2: "15" })] }));
const AlertCircleIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", x2: "12", y1: "8", y2: "12" }), _jsx("line", { x1: "12", x2: "12.01", y1: "16", y2: "16" })] }));
const GhostIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M9 10h.01" }), _jsx("path", { d: "M15 10h.01" }), _jsx("path", { d: "M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" })] }));
const MessageSquareIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }));
const UserIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" })] }));
const HashIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "4", x2: "20", y1: "9", y2: "9" }), _jsx("line", { x1: "4", x2: "20", y1: "15", y2: "15" }), _jsx("line", { x1: "10", x2: "8", y1: "3", y2: "21" }), _jsx("line", { x1: "16", x2: "14", y1: "3", y2: "21" })] }));
const ClockIcon = () => (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }));
const FlagIcon = () => (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" }), _jsx("line", { x1: "4", x2: "4", y1: "22", y2: "15" })] }));
const SparklesIcon = () => (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" }), _jsx("path", { d: "M5 3v4" }), _jsx("path", { d: "M19 17v4" }), _jsx("path", { d: "M3 5h4" }), _jsx("path", { d: "M17 19h4" })] }));
const ChevronDownIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m6 9 6 6 6-6" }) }));
const FilterIcon = () => (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }) }));
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
    });
};
const getReasonLabel = (reason) => {
    const labels = {
        spam: 'Spam',
        harassment: 'Harassment',
        hate_speech: 'Hate Speech',
        violence: 'Violence',
        adult_content: 'Adult Content',
        misinformation: 'Misinformation',
        impersonation: 'Impersonation',
        copyright: 'Copyright',
        other: 'Other',
    };
    return labels[reason];
};
const getReasonColor = (reason) => {
    const colors = {
        spam: '#6b7280',
        harassment: '#ef4444',
        hate_speech: '#dc2626',
        violence: '#b91c1c',
        adult_content: '#9333ea',
        misinformation: '#f59e0b',
        impersonation: '#3b82f6',
        copyright: '#6366f1',
        other: '#6b7280',
    };
    return colors[reason];
};
const getPriorityColor = (priority) => {
    switch (priority) {
        case 'critical': return 'var(--chatsdk-error)';
        case 'high': return '#f97316';
        case 'medium': return 'var(--chatsdk-warning)';
        case 'low': return 'var(--chatsdk-success)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return 'var(--chatsdk-warning)';
        case 'reviewed': return 'var(--chatsdk-info)';
        case 'actioned': return 'var(--chatsdk-success)';
        case 'dismissed': return 'var(--chatsdk-text-tertiary)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
const getTypeIcon = (type) => {
    switch (type) {
        case 'message': return _jsx(MessageSquareIcon, {});
        case 'user': return _jsx(UserIcon, {});
        case 'channel': return _jsx(HashIcon, {});
        default: return _jsx(AlertTriangleIcon, {});
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
        backgroundColor: 'var(--chatsdk-error)',
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
    statsBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '16px 24px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        overflowX: 'auto',
    },
    statItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    statDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
    },
    statLabel: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    statValue: {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
    },
    filters: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
        overflowX: 'auto',
    },
    filterChip: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
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
    queueList: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    reportCard: {
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '12px',
        border: '1px solid var(--chatsdk-border-light)',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease',
    },
    reportCardHover: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    },
    reportHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '16px',
        gap: '12px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    reportHeaderLeft: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        flex: 1,
        minWidth: 0,
    },
    priorityStrip: {
        width: '4px',
        height: '100%',
        borderRadius: '2px',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    reportAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        objectFit: 'cover',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        flexShrink: 0,
    },
    reportInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1,
        minWidth: 0,
    },
    reportUser: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    userName: {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
    },
    typeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-tertiary)',
        textTransform: 'uppercase',
    },
    reportMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    reportHeaderRight: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        flexShrink: 0,
    },
    badges: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    reasonBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 500,
    },
    priorityBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        textTransform: 'capitalize',
    },
    reportContent: {
        padding: '16px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
    },
    contentText: {
        fontSize: '14px',
        color: 'var(--chatsdk-text-primary)',
        lineHeight: 1.5,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    contentImage: {
        maxWidth: '300px',
        maxHeight: '200px',
        borderRadius: '8px',
        objectFit: 'cover',
        marginTop: '8px',
    },
    aiInsights: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '12px',
        padding: '12px',
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '8px',
        border: '1px solid var(--chatsdk-border-light)',
    },
    aiLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--chatsdk-primary)',
    },
    aiScore: {
        fontSize: '12px',
        color: 'var(--chatsdk-text-secondary)',
    },
    aiCategories: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'wrap',
    },
    aiCategory: {
        padding: '2px 6px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '4px',
        fontSize: '11px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    reportDetails: {
        marginTop: '12px',
        padding: '12px',
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '8px',
        border: '1px solid var(--chatsdk-border-light)',
    },
    detailsLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-tertiary)',
        marginBottom: '4px',
    },
    detailsText: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-secondary)',
        lineHeight: 1.5,
        margin: 0,
    },
    reportActions: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderTop: '1px solid var(--chatsdk-border-light)',
        gap: '12px',
    },
    actionsLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    actionsRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        border: '1px solid var(--chatsdk-border-light)',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    actionButtonPrimary: {
        backgroundColor: 'var(--chatsdk-primary)',
        borderColor: 'var(--chatsdk-primary)',
        color: 'white',
    },
    actionButtonSuccess: {
        backgroundColor: 'var(--chatsdk-success)',
        borderColor: 'var(--chatsdk-success)',
        color: 'white',
    },
    actionButtonDanger: {
        backgroundColor: 'var(--chatsdk-error)',
        borderColor: 'var(--chatsdk-error)',
        color: 'white',
    },
    actionDropdown: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-error)',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    dropdown: {
        position: 'absolute',
        bottom: '100%',
        right: 0,
        marginBottom: '4px',
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '8px',
        border: '1px solid var(--chatsdk-border-light)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        minWidth: '180px',
        zIndex: 100,
        overflow: 'hidden',
    },
    dropdownItem: {
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
        width: '80px',
        height: '80px',
        backgroundColor: 'var(--chatsdk-success)',
        borderRadius: '50%',
        marginBottom: '24px',
        color: 'white',
    },
    emptyTitle: {
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        marginBottom: '8px',
    },
    emptyDescription: {
        fontSize: '14px',
        color: 'var(--chatsdk-text-tertiary)',
        maxWidth: '360px',
    },
    skeleton: {
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '4px',
        animation: 'pulse 1.5s ease-in-out infinite',
    },
    reporterInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 16px',
        borderTop: '1px solid var(--chatsdk-border-light)',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
    },
    reporterLabel: {
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    reporterAvatar: {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        objectFit: 'cover',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
    },
    reporterName: {
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-secondary)',
    },
};
// =============================================================================
// COMPONENT
// =============================================================================
export const ModerationQueue = ({ reports, loading = false, onReviewReport, onTakeAction, onDismissReport, onViewUser, onViewChannel, onViewMessage, className, }) => {
    const [hoveredCard, setHoveredCard] = useState(null);
    const [expandedCard, setExpandedCard] = useState(null);
    const [openActionMenu, setOpenActionMenu] = useState(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState('pending');
    const [activePriorityFilter, setActivePriorityFilter] = useState('all');
    const [activeReasonFilter, setActiveReasonFilter] = useState('all');
    const filteredReports = useMemo(() => {
        return reports.filter(report => {
            const matchesStatus = activeStatusFilter === 'all' || report.status === activeStatusFilter;
            const matchesPriority = activePriorityFilter === 'all' || report.priority === activePriorityFilter;
            const matchesReason = activeReasonFilter === 'all' || report.reason === activeReasonFilter;
            return matchesStatus && matchesPriority && matchesReason;
        });
    }, [reports, activeStatusFilter, activePriorityFilter, activeReasonFilter]);
    const stats = useMemo(() => {
        return {
            pending: reports.filter(r => r.status === 'pending').length,
            critical: reports.filter(r => r.priority === 'critical' && r.status === 'pending').length,
            high: reports.filter(r => r.priority === 'high' && r.status === 'pending').length,
            reviewed: reports.filter(r => r.status === 'reviewed').length,
        };
    }, [reports]);
    const handleActionClick = (report, action) => {
        onTakeAction?.(report, action);
        setOpenActionMenu(null);
    };
    const renderReportCard = (report) => (_jsxs("div", { style: {
            ...styles.reportCard,
            ...(hoveredCard === report.id ? styles.reportCardHover : {}),
            position: 'relative',
        }, onMouseEnter: () => setHoveredCard(report.id), onMouseLeave: () => setHoveredCard(null), children: [_jsx("div", { style: {
                    ...styles.priorityStrip,
                    backgroundColor: getPriorityColor(report.priority)
                } }), _jsxs("div", { style: { ...styles.reportHeader, paddingLeft: '20px' }, children: [_jsxs("div", { style: styles.reportHeaderLeft, children: [report.reportedUser.imageUrl ? (_jsx("img", { src: report.reportedUser.imageUrl, alt: "", style: styles.reportAvatar })) : (_jsx("div", { style: {
                                    ...styles.reportAvatar,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: 'var(--chatsdk-text-tertiary)',
                                }, children: report.reportedUser.name.charAt(0).toUpperCase() })), _jsxs("div", { style: styles.reportInfo, children: [_jsxs("div", { style: styles.reportUser, children: [_jsx("span", { style: { ...styles.userName, cursor: 'pointer' }, onClick: () => onViewUser?.(report.reportedUser.id), children: report.reportedUser.name }), _jsxs("span", { style: styles.typeBadge, children: [getTypeIcon(report.type), report.type] })] }), _jsxs("div", { style: styles.reportMeta, children: [_jsxs("span", { style: styles.metaItem, children: [_jsx(ClockIcon, {}), formatDate(report.createdAt)] }), report.reportCount > 1 && (_jsxs("span", { style: { ...styles.metaItem, color: 'var(--chatsdk-error)' }, children: [_jsx(FlagIcon, {}), report.reportCount, " reports"] })), report.channel && (_jsxs("span", { style: { ...styles.metaItem, cursor: 'pointer' }, onClick: () => onViewChannel?.(report.channel.id), children: [_jsx(HashIcon, {}), report.channel.name] }))] })] })] }), _jsxs("div", { style: styles.reportHeaderRight, children: [_jsxs("div", { style: styles.badges, children: [_jsxs("span", { style: {
                                            ...styles.reasonBadge,
                                            backgroundColor: `${getReasonColor(report.reason)}15`,
                                            color: getReasonColor(report.reason),
                                        }, children: [_jsx(AlertTriangleIcon, {}), getReasonLabel(report.reason)] }), _jsx("span", { style: {
                                            ...styles.priorityBadge,
                                            backgroundColor: `${getPriorityColor(report.priority)}15`,
                                            color: getPriorityColor(report.priority),
                                        }, children: report.priority })] }), _jsxs("span", { style: {
                                    ...styles.statusBadge,
                                    backgroundColor: `${getStatusColor(report.status)}15`,
                                    color: getStatusColor(report.status),
                                }, children: [report.status === 'pending' && _jsx(ClockIcon, {}), report.status === 'actioned' && _jsx(CheckIcon, {}), report.status] })] })] }), _jsxs("div", { style: styles.reportContent, children: [report.content.text && (_jsx("p", { style: styles.contentText, children: report.content.text })), report.content.imageUrl && (_jsx("img", { src: report.content.imageUrl, alt: "Reported content", style: styles.contentImage })), report.aiScore !== undefined && (_jsxs("div", { style: styles.aiInsights, children: [_jsxs("span", { style: styles.aiLabel, children: [_jsx(SparklesIcon, {}), "AI Analysis"] }), _jsxs("span", { style: styles.aiScore, children: ["Severity: ", _jsxs("strong", { children: [Math.round(report.aiScore * 100), "%"] })] }), report.aiCategories && report.aiCategories.length > 0 && (_jsx("div", { style: styles.aiCategories, children: report.aiCategories.map((category, i) => (_jsx("span", { style: styles.aiCategory, children: category }, i))) }))] })), report.details && (_jsxs("div", { style: styles.reportDetails, children: [_jsx("div", { style: styles.detailsLabel, children: "Reporter's Note" }), _jsx("p", { style: styles.detailsText, children: report.details })] }))] }), _jsxs("div", { style: styles.reporterInfo, children: [_jsx("span", { style: styles.reporterLabel, children: "Reported by" }), report.reporter.imageUrl ? (_jsx("img", { src: report.reporter.imageUrl, alt: "", style: styles.reporterAvatar })) : (_jsx("div", { style: {
                            ...styles.reporterAvatar,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: 'var(--chatsdk-text-tertiary)',
                        }, children: report.reporter.name.charAt(0).toUpperCase() })), _jsx("span", { style: styles.reporterName, children: report.reporter.name })] }), report.status === 'pending' && (_jsxs("div", { style: styles.reportActions, children: [_jsxs("div", { style: styles.actionsLeft, children: [_jsxs("button", { style: styles.actionButton, onClick: () => onReviewReport?.(report), children: [_jsx(EyeIcon, {}), "View Context"] }), report.type === 'message' && report.channel && (_jsxs("button", { style: styles.actionButton, onClick: () => onViewMessage?.(report.content.id, report.channel.id), children: [_jsx(MessageSquareIcon, {}), "Go to Message"] }))] }), _jsxs("div", { style: styles.actionsRight, children: [_jsxs("button", { style: styles.actionButton, onClick: () => onDismissReport?.(report), children: [_jsx(XIcon, {}), "Dismiss"] }), _jsxs("div", { style: { position: 'relative' }, children: [_jsxs("button", { style: styles.actionDropdown, onClick: () => setOpenActionMenu(openActionMenu === report.id ? null : report.id), children: ["Take Action", _jsx(ChevronDownIcon, {})] }), openActionMenu === report.id && (_jsxs("div", { style: styles.dropdown, children: [_jsxs("button", { style: styles.dropdownItem, onClick: () => handleActionClick(report, 'warn'), children: [_jsx(AlertCircleIcon, {}), "Warn User"] }), _jsxs("button", { style: styles.dropdownItem, onClick: () => handleActionClick(report, 'mute'), children: [_jsx(VolumeXIcon, {}), "Mute User"] }), _jsxs("button", { style: styles.dropdownItem, onClick: () => handleActionClick(report, 'shadow_ban'), children: [_jsx(GhostIcon, {}), "Shadow Ban"] }), _jsxs("button", { style: styles.dropdownItem, onClick: () => handleActionClick(report, 'delete_message'), children: [_jsx(TrashIcon, {}), "Delete Content"] }), _jsxs("button", { style: { ...styles.dropdownItem, color: 'var(--chatsdk-error)' }, onClick: () => handleActionClick(report, 'ban'), children: [_jsx(BanIcon, {}), "Ban User"] })] }))] })] })] })), report.status !== 'pending' && report.reviewedBy && (_jsx("div", { style: { ...styles.reportActions, backgroundColor: 'var(--chatsdk-bg-secondary)' }, children: _jsxs("span", { style: { fontSize: '13px', color: 'var(--chatsdk-text-tertiary)' }, children: [report.status === 'actioned' ? 'Action taken' : 'Reviewed', " by", ' ', _jsx("strong", { style: { color: 'var(--chatsdk-text-secondary)' }, children: report.reviewedBy.name }), report.reviewedAt && (_jsxs(_Fragment, { children: [" \u2022 ", formatDate(report.reviewedAt)] })), report.action && report.action !== 'none' && (_jsxs(_Fragment, { children: [" \u2022 ", _jsx("span", { style: { color: 'var(--chatsdk-error)', textTransform: 'capitalize' }, children: report.action.replace('_', ' ') })] }))] }) }))] }, report.id));
    const renderSkeletonCard = (index) => (_jsxs("div", { style: styles.reportCard, children: [_jsxs("div", { style: styles.reportHeader, children: [_jsxs("div", { style: styles.reportHeaderLeft, children: [_jsx("div", { style: { ...styles.skeleton, width: 40, height: 40, borderRadius: 10 } }), _jsxs("div", { style: styles.reportInfo, children: [_jsx("div", { style: { ...styles.skeleton, width: 120, height: 16, marginBottom: 8 } }), _jsx("div", { style: { ...styles.skeleton, width: 200, height: 12 } })] })] }), _jsx("div", { style: styles.reportHeaderRight, children: _jsx("div", { style: { ...styles.skeleton, width: 100, height: 24 } }) })] }), _jsx("div", { style: styles.reportContent, children: _jsx("div", { style: { ...styles.skeleton, width: '100%', height: 60 } }) })] }, `skeleton-${index}`));
    return (_jsxs("div", { style: styles.container, className: clsx('chatsdk-moderation-queue', className), children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("div", { style: styles.headerIcon, children: _jsx(ShieldIcon, {}) }), _jsxs("div", { style: styles.headerInfo, children: [_jsx("h2", { style: styles.title, children: "Moderation Queue" }), _jsx("div", { style: styles.subtitle, children: "Review and take action on reported content" })] })] }), _jsx("div", { style: styles.headerRight, children: _jsxs("button", { style: styles.filterButton, children: [_jsx(FilterIcon, {}), "More Filters"] }) })] }), _jsxs("div", { style: styles.statsBar, children: [_jsxs("div", { style: styles.statItem, children: [_jsx("div", { style: { ...styles.statDot, backgroundColor: 'var(--chatsdk-warning)' } }), _jsx("span", { style: styles.statLabel, children: "Pending:" }), _jsx("span", { style: styles.statValue, children: stats.pending })] }), _jsxs("div", { style: styles.statItem, children: [_jsx("div", { style: { ...styles.statDot, backgroundColor: 'var(--chatsdk-error)' } }), _jsx("span", { style: styles.statLabel, children: "Critical:" }), _jsx("span", { style: styles.statValue, children: stats.critical })] }), _jsxs("div", { style: styles.statItem, children: [_jsx("div", { style: { ...styles.statDot, backgroundColor: '#f97316' } }), _jsx("span", { style: styles.statLabel, children: "High Priority:" }), _jsx("span", { style: styles.statValue, children: stats.high })] }), _jsxs("div", { style: styles.statItem, children: [_jsx("div", { style: { ...styles.statDot, backgroundColor: 'var(--chatsdk-info)' } }), _jsx("span", { style: styles.statLabel, children: "In Review:" }), _jsx("span", { style: styles.statValue, children: stats.reviewed })] })] }), _jsxs("div", { style: styles.filters, children: [_jsx("span", { style: { fontSize: '13px', color: 'var(--chatsdk-text-tertiary)', marginRight: '8px' }, children: "Status:" }), ['all', 'pending', 'reviewed', 'actioned', 'dismissed'].map(status => (_jsx("button", { style: {
                            ...styles.filterChip,
                            ...(activeStatusFilter === status ? styles.filterChipActive : {}),
                        }, onClick: () => setActiveStatusFilter(status), children: status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1) }, status))), _jsx("div", { style: { width: '1px', height: '20px', backgroundColor: 'var(--chatsdk-border-light)', margin: '0 8px' } }), _jsx("span", { style: { fontSize: '13px', color: 'var(--chatsdk-text-tertiary)', marginRight: '8px' }, children: "Priority:" }), ['all', 'critical', 'high', 'medium', 'low'].map(priority => (_jsx("button", { style: {
                            ...styles.filterChip,
                            ...(activePriorityFilter === priority ? styles.filterChipActive : {}),
                        }, onClick: () => setActivePriorityFilter(priority), children: priority === 'all' ? 'All' : priority.charAt(0).toUpperCase() + priority.slice(1) }, priority)))] }), _jsx("div", { style: styles.queueList, children: loading ? (Array.from({ length: 3 }).map((_, i) => renderSkeletonCard(i))) : filteredReports.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsx(CheckIcon, {}) }), _jsx("div", { style: styles.emptyTitle, children: "Queue is clear!" }), _jsx("div", { style: styles.emptyDescription, children: activeStatusFilter !== 'all' || activePriorityFilter !== 'all'
                                ? 'No reports match your current filters. Try adjusting the filters to see more.'
                                : 'No pending reports to review. Great job keeping the community safe!' })] })) : (filteredReports.map(report => renderReportCard(report))) }), openActionMenu && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 50,
                }, onClick: () => setOpenActionMenu(null) }))] }));
};
export default ModerationQueue;
