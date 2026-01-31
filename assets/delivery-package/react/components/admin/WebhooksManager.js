import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import clsx from 'clsx';
// =============================================================================
// ICONS
// =============================================================================
const WebhookIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" }), _jsx("path", { d: "m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" }), _jsx("path", { d: "m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" })] }));
const PlusIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "12", x2: "12", y1: "5", y2: "19" }), _jsx("line", { x1: "5", x2: "19", y1: "12", y2: "12" })] }));
const LinkIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }), _jsx("path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" })] }));
const PlayIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polygon", { points: "5 3 19 12 5 21 5 3" }) }));
const PauseIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { width: "4", height: "16", x: "6", y: "4" }), _jsx("rect", { width: "4", height: "16", x: "14", y: "4" })] }));
const TrashIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 6h18" }), _jsx("path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }), _jsx("path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" })] }));
const EditIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }) }));
const MoreVerticalIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "1" }), _jsx("circle", { cx: "12", cy: "5", r: "1" }), _jsx("circle", { cx: "12", cy: "19", r: "1" })] }));
const ZapIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }) }));
const CheckCircleIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), _jsx("polyline", { points: "22 4 12 14.01 9 11.01" })] }));
const XCircleIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "m15 9-6 6" }), _jsx("path", { d: "m9 9 6 6" })] }));
const AlertCircleIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", x2: "12", y1: "8", y2: "12" }), _jsx("line", { x1: "12", x2: "12.01", y1: "16", y2: "16" })] }));
const ClockIcon = () => (_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }));
const HistoryIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }), _jsx("path", { d: "M3 3v5h5" }), _jsx("path", { d: "M12 7v5l4 2" })] }));
const RefreshCwIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }), _jsx("path", { d: "M21 3v5h-5" }), _jsx("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }), _jsx("path", { d: "M8 16H3v5" })] }));
const SendIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "m22 2-7 20-4-9-9-4Z" }), _jsx("path", { d: "M22 2 11 13" })] }));
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
    });
};
const formatRelativeTime = (dateString) => {
    if (!dateString)
        return 'Never';
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
const getEventLabel = (event) => {
    const labels = {
        'message.new': 'New Message',
        'message.updated': 'Message Updated',
        'message.deleted': 'Message Deleted',
        'message.reaction': 'Reaction Added',
        'channel.created': 'Channel Created',
        'channel.updated': 'Channel Updated',
        'channel.deleted': 'Channel Deleted',
        'member.added': 'Member Added',
        'member.removed': 'Member Removed',
        'user.updated': 'User Updated',
        'user.banned': 'User Banned',
        'moderation.flagged': 'Content Flagged',
    };
    return labels[event];
};
const getEventCategory = (event) => {
    if (event.startsWith('message.'))
        return 'message';
    if (event.startsWith('channel.'))
        return 'channel';
    if (event.startsWith('member.'))
        return 'member';
    if (event.startsWith('user.'))
        return 'user';
    if (event.startsWith('moderation.'))
        return 'moderation';
    return 'other';
};
const getEventColor = (event) => {
    const category = getEventCategory(event);
    switch (category) {
        case 'message': return 'var(--chatsdk-primary)';
        case 'channel': return 'var(--chatsdk-info)';
        case 'member': return 'var(--chatsdk-success)';
        case 'user': return 'var(--chatsdk-warning)';
        case 'moderation': return 'var(--chatsdk-error)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
const getStatusColor = (status) => {
    switch (status) {
        case 'active': return 'var(--chatsdk-success)';
        case 'paused': return 'var(--chatsdk-warning)';
        case 'failing': return 'var(--chatsdk-error)';
        case 'disabled': return 'var(--chatsdk-text-tertiary)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
const getStatusIcon = (status) => {
    switch (status) {
        case 'active': return _jsx(CheckCircleIcon, {});
        case 'paused': return _jsx(PauseIcon, {});
        case 'failing': return _jsx(AlertCircleIcon, {});
        case 'disabled': return _jsx(XCircleIcon, {});
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
        backgroundColor: 'var(--chatsdk-info)',
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
    webhooksList: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    webhookCard: {
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '12px',
        border: '1px solid var(--chatsdk-border-light)',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease',
    },
    webhookCardHover: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    },
    webhookCardFailing: {
        borderColor: 'var(--chatsdk-error)',
        borderWidth: '2px',
    },
    webhookHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '16px 20px',
        gap: '12px',
    },
    webhookInfo: {
        flex: 1,
        minWidth: 0,
    },
    webhookNameRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px',
    },
    webhookName: {
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
    },
    webhookUrl: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        borderRadius: '6px',
        fontFamily: 'var(--chatsdk-font-mono)',
        fontSize: '13px',
        color: 'var(--chatsdk-text-secondary)',
        maxWidth: 'fit-content',
    },
    webhookMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginTop: '12px',
        flexWrap: 'wrap',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    successRate: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    successRateBar: {
        width: '60px',
        height: '4px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '2px',
        overflow: 'hidden',
    },
    successRateFill: {
        height: '100%',
        borderRadius: '2px',
        transition: 'width 0.3s ease',
    },
    webhookActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
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
    dropdown: {
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: '4px',
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
    dropdownItemDanger: {
        color: 'var(--chatsdk-error)',
    },
    dropdownDivider: {
        height: '1px',
        backgroundColor: 'var(--chatsdk-border-light)',
        margin: '4px 0',
    },
    eventsSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 20px',
        borderTop: '1px solid var(--chatsdk-border-light)',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
    },
    eventsLabel: {
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-tertiary)',
    },
    events: {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
    },
    eventBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
    },
    moreEvents: {
        padding: '3px 8px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-tertiary)',
    },
    deliveriesSection: {
        padding: '12px 20px',
        borderTop: '1px solid var(--chatsdk-border-light)',
    },
    deliveriesHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
    },
    deliveriesTitle: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-tertiary)',
        textTransform: 'uppercase',
    },
    viewAllLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--chatsdk-primary)',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
    },
    deliveriesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    deliveryItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        borderRadius: '6px',
    },
    deliveryStatus: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
    },
    deliveryInfo: {
        flex: 1,
        minWidth: 0,
    },
    deliveryEvent: {
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
    },
    deliveryMeta: {
        fontSize: '11px',
        color: 'var(--chatsdk-text-tertiary)',
        marginTop: '2px',
    },
    deliveryActions: {
        display: 'flex',
        gap: '4px',
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
        marginBottom: '20px',
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
export const WebhooksManager = ({ webhooks, loading = false, onCreateWebhook, onEditWebhook, onDeleteWebhook, onToggleWebhook, onTestWebhook, onViewDeliveries, onRetryDelivery, className, }) => {
    const [hoveredWebhook, setHoveredWebhook] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [expandedWebhook, setExpandedWebhook] = useState(null);
    const stats = useMemo(() => ({
        active: webhooks.filter(w => w.status === 'active').length,
        failing: webhooks.filter(w => w.status === 'failing').length,
        totalDeliveries: webhooks.reduce((sum, w) => sum + w.totalDeliveries, 0),
    }), [webhooks]);
    const renderWebhookCard = (webhook) => {
        const isExpanded = expandedWebhook === webhook.id;
        const maxEventsToShow = 4;
        return (_jsxs("div", { style: {
                ...styles.webhookCard,
                ...(hoveredWebhook === webhook.id ? styles.webhookCardHover : {}),
                ...(webhook.status === 'failing' ? styles.webhookCardFailing : {}),
            }, onMouseEnter: () => setHoveredWebhook(webhook.id), onMouseLeave: () => setHoveredWebhook(null), children: [_jsxs("div", { style: styles.webhookHeader, children: [_jsxs("div", { style: styles.webhookInfo, children: [_jsxs("div", { style: styles.webhookNameRow, children: [_jsx("span", { style: styles.webhookName, children: webhook.name }), _jsxs("span", { style: {
                                                ...styles.statusBadge,
                                                backgroundColor: `${getStatusColor(webhook.status)}15`,
                                                color: getStatusColor(webhook.status),
                                            }, children: [getStatusIcon(webhook.status), webhook.status] })] }), _jsxs("div", { style: styles.webhookUrl, children: [_jsx(LinkIcon, {}), webhook.url] }), _jsxs("div", { style: styles.webhookMeta, children: [_jsxs("div", { style: styles.successRate, children: [_jsxs("span", { style: styles.metaItem, children: [webhook.successRate.toFixed(1), "% success"] }), _jsx("div", { style: styles.successRateBar, children: _jsx("div", { style: {
                                                            ...styles.successRateFill,
                                                            width: `${webhook.successRate}%`,
                                                            backgroundColor: webhook.successRate > 90
                                                                ? 'var(--chatsdk-success)'
                                                                : webhook.successRate > 70
                                                                    ? 'var(--chatsdk-warning)'
                                                                    : 'var(--chatsdk-error)',
                                                        } }) })] }), _jsxs("span", { style: styles.metaItem, children: [_jsx(SendIcon, {}), webhook.totalDeliveries.toLocaleString(), " deliveries"] }), _jsxs("span", { style: styles.metaItem, children: [_jsx(ClockIcon, {}), "Last delivery ", formatRelativeTime(webhook.lastDeliveryAt)] })] })] }), _jsxs("div", { style: { ...styles.webhookActions, position: 'relative' }, children: [_jsx("button", { style: styles.actionButton, onClick: () => onTestWebhook?.(webhook), title: "Send test event", children: _jsx(ZapIcon, {}) }), _jsx("button", { style: {
                                        ...styles.actionButton,
                                        backgroundColor: openMenuId === webhook.id ? 'var(--chatsdk-bg-tertiary)' : undefined,
                                    }, onClick: () => setOpenMenuId(openMenuId === webhook.id ? null : webhook.id), children: _jsx(MoreVerticalIcon, {}) }), openMenuId === webhook.id && (_jsxs("div", { style: styles.dropdown, children: [_jsxs("button", { style: styles.dropdownItem, onClick: () => {
                                                onEditWebhook?.(webhook);
                                                setOpenMenuId(null);
                                            }, children: [_jsx(EditIcon, {}), "Edit Webhook"] }), _jsxs("button", { style: styles.dropdownItem, onClick: () => {
                                                onViewDeliveries?.(webhook);
                                                setOpenMenuId(null);
                                            }, children: [_jsx(HistoryIcon, {}), "View Deliveries"] }), _jsxs("button", { style: styles.dropdownItem, onClick: () => {
                                                onTestWebhook?.(webhook);
                                                setOpenMenuId(null);
                                            }, children: [_jsx(ZapIcon, {}), "Send Test Event"] }), _jsx("div", { style: styles.dropdownDivider }), _jsxs("button", { style: styles.dropdownItem, onClick: () => {
                                                onToggleWebhook?.(webhook, webhook.status !== 'active');
                                                setOpenMenuId(null);
                                            }, children: [webhook.status === 'active' ? _jsx(PauseIcon, {}) : _jsx(PlayIcon, {}), webhook.status === 'active' ? 'Pause Webhook' : 'Enable Webhook'] }), _jsxs("button", { style: { ...styles.dropdownItem, ...styles.dropdownItemDanger }, onClick: () => {
                                                onDeleteWebhook?.(webhook);
                                                setOpenMenuId(null);
                                            }, children: [_jsx(TrashIcon, {}), "Delete Webhook"] })] }))] })] }), _jsxs("div", { style: styles.eventsSection, children: [_jsxs("span", { style: styles.eventsLabel, children: [_jsx(ZapIcon, {}), " Events:"] }), _jsxs("div", { style: styles.events, children: [webhook.events.slice(0, maxEventsToShow).map(event => (_jsx("span", { style: {
                                        ...styles.eventBadge,
                                        backgroundColor: `${getEventColor(event)}15`,
                                        color: getEventColor(event),
                                    }, children: getEventLabel(event) }, event))), webhook.events.length > maxEventsToShow && (_jsxs("span", { style: styles.moreEvents, children: ["+", webhook.events.length - maxEventsToShow, " more"] }))] })] }), webhook.recentDeliveries && webhook.recentDeliveries.length > 0 && isExpanded && (_jsxs("div", { style: styles.deliveriesSection, children: [_jsxs("div", { style: styles.deliveriesHeader, children: [_jsx("span", { style: styles.deliveriesTitle, children: "Recent Deliveries" }), _jsxs("button", { style: styles.viewAllLink, onClick: () => onViewDeliveries?.(webhook), children: ["View all", _jsx(HistoryIcon, {})] })] }), _jsx("div", { style: styles.deliveriesList, children: webhook.recentDeliveries.slice(0, 3).map(delivery => (_jsxs("div", { style: styles.deliveryItem, children: [_jsx("div", { style: {
                                            ...styles.deliveryStatus,
                                            backgroundColor: delivery.status === 'success'
                                                ? 'rgba(34, 197, 94, 0.1)'
                                                : delivery.status === 'failed'
                                                    ? 'rgba(239, 68, 68, 0.1)'
                                                    : 'rgba(245, 158, 11, 0.1)',
                                            color: delivery.status === 'success'
                                                ? 'var(--chatsdk-success)'
                                                : delivery.status === 'failed'
                                                    ? 'var(--chatsdk-error)'
                                                    : 'var(--chatsdk-warning)',
                                        }, children: delivery.status === 'success' ? _jsx(CheckCircleIcon, {}) :
                                            delivery.status === 'failed' ? _jsx(XCircleIcon, {}) :
                                                _jsx(ClockIcon, {}) }), _jsxs("div", { style: styles.deliveryInfo, children: [_jsx("div", { style: styles.deliveryEvent, children: getEventLabel(delivery.event) }), _jsxs("div", { style: styles.deliveryMeta, children: [formatRelativeTime(delivery.timestamp), delivery.statusCode && ` • ${delivery.statusCode}`, delivery.responseTime && ` • ${delivery.responseTime}ms`] })] }), delivery.status === 'failed' && (_jsx("div", { style: styles.deliveryActions, children: _jsx("button", { style: styles.actionButton, onClick: () => onRetryDelivery?.(webhook, delivery), title: "Retry delivery", children: _jsx(RefreshCwIcon, {}) }) }))] }, delivery.id))) })] }))] }, webhook.id));
    };
    const renderSkeletonCard = (index) => (_jsxs("div", { style: styles.webhookCard, children: [_jsx("div", { style: styles.webhookHeader, children: _jsxs("div", { style: styles.webhookInfo, children: [_jsx("div", { style: { ...styles.skeleton, width: 180, height: 18, marginBottom: 12 } }), _jsx("div", { style: { ...styles.skeleton, width: 320, height: 32, marginBottom: 12 } }), _jsx("div", { style: { ...styles.skeleton, width: 280, height: 14 } })] }) }), _jsx("div", { style: styles.eventsSection, children: _jsx("div", { style: { ...styles.skeleton, width: 200, height: 20 } }) })] }, `skeleton-${index}`));
    return (_jsxs("div", { style: styles.container, className: clsx('chatsdk-webhooks-manager', className), children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("div", { style: styles.headerIcon, children: _jsx(WebhookIcon, {}) }), _jsxs("div", { style: styles.headerInfo, children: [_jsx("h2", { style: styles.title, children: "Webhooks" }), _jsxs("div", { style: styles.subtitle, children: [stats.active, " active \u2022 ", stats.failing > 0 && _jsxs("span", { style: { color: 'var(--chatsdk-error)' }, children: [stats.failing, " failing \u2022 "] }), stats.totalDeliveries.toLocaleString(), " total deliveries"] })] })] }), _jsx("div", { style: styles.headerRight, children: _jsxs("button", { style: styles.primaryButton, onClick: onCreateWebhook, children: [_jsx(PlusIcon, {}), "Create Webhook"] }) })] }), _jsx("div", { style: styles.webhooksList, children: loading ? (Array.from({ length: 3 }).map((_, i) => renderSkeletonCard(i))) : webhooks.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsx(WebhookIcon, {}) }), _jsx("div", { style: styles.emptyTitle, children: "No webhooks configured" }), _jsx("div", { style: styles.emptyDescription, children: "Webhooks allow you to receive real-time notifications when events happen in your app" }), _jsxs("button", { style: styles.primaryButton, onClick: onCreateWebhook, children: [_jsx(PlusIcon, {}), "Create your first webhook"] })] })) : (webhooks.map(renderWebhookCard)) }), openMenuId && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 50,
                }, onClick: () => setOpenMenuId(null) }))] }));
};
export default WebhooksManager;
