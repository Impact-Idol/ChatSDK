import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
export function NotificationCenter({ notifications, unreadCount = 0, onMarkAsRead, onMarkAllAsRead, onDelete, onClearAll, onNotificationClick, loading = false, }) {
    const [filter, setFilter] = useState('all');
    const filteredNotifications = notifications.filter((n) => filter === 'unread' ? !n.read : true);
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1)
            return 'Just now';
        if (minutes < 60)
            return `${minutes}m ago`;
        if (hours < 24)
            return `${hours}h ago`;
        if (days < 7)
            return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    const getTypeIcon = (type) => {
        switch (type) {
            case 'message':
                return (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }));
            case 'mention':
                return (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "4" }), _jsx("path", { d: "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" })] }));
            case 'reaction':
                return (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }), _jsx("line", { x1: "9", y1: "9", x2: "9.01", y2: "9" }), _jsx("line", { x1: "15", y1: "9", x2: "15.01", y2: "9" })] }));
            case 'reply':
                return (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "9 17 4 12 9 7" }), _jsx("path", { d: "M20 18v-2a4 4 0 0 0-4-4H4" })] }));
            case 'invite':
                return (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "8.5", cy: "7", r: "4" }), _jsx("line", { x1: "20", y1: "8", x2: "20", y2: "14" }), _jsx("line", { x1: "23", y1: "11", x2: "17", y2: "11" })] }));
            case 'system':
            default:
                return (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "16", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })] }));
        }
    };
    const getTypeColor = (type) => {
        switch (type) {
            case 'mention':
                return 'var(--chatsdk-accent-color, #6366f1)';
            case 'reaction':
                return 'var(--chatsdk-warning-color, #f59e0b)';
            case 'invite':
                return 'var(--chatsdk-success-color, #10b981)';
            case 'system':
                return 'var(--chatsdk-text-tertiary, #9ca3af)';
            default:
                return 'var(--chatsdk-text-secondary, #6b7280)';
        }
    };
    const getInitials = (name) => {
        if (!name)
            return '?';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };
    const styles = {
        container: {
            width: '400px',
            maxHeight: '600px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        },
        header: {
            padding: '16px 20px',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        headerLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
        },
        title: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
        },
        badge: {
            padding: '2px 8px',
            borderRadius: '10px',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
        },
        headerActions: {
            display: 'flex',
            gap: '8px',
        },
        actionButton: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--chatsdk-accent-color, #6366f1)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
        },
        filters: {
            padding: '12px 20px',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            display: 'flex',
            gap: '8px',
        },
        filterButton: {
            padding: '6px 14px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
        },
        filterButtonActive: {
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
            color: 'var(--chatsdk-accent-color, #6366f1)',
        },
        list: {
            flex: 1,
            overflowY: 'auto',
        },
        notification: {
            padding: '14px 20px',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            display: 'flex',
            gap: '12px',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
        },
        notificationUnread: {
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
        },
        iconWrapper: {
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
        },
        avatar: {
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            flexShrink: 0,
        },
        avatarImage: {
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
        },
        typeIndicator: {
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
        content: {
            flex: 1,
            minWidth: 0,
        },
        notificationTitle: {
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        unreadDot: {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            flexShrink: 0,
        },
        notificationBody: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        meta: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        channel: {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
        },
        deleteButton: {
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.15s ease',
        },
        emptyState: {
            padding: '60px 24px',
            textAlign: 'center',
        },
        emptyIcon: {
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            margin: '0 auto 16px',
        },
        emptyTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '4px',
        },
        emptyText: {
            fontSize: '14px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        skeleton: {
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            borderRadius: '4px',
            animation: 'pulse 2s ease-in-out infinite',
        },
    };
    if (loading) {
        return (_jsxs("div", { style: styles.container, children: [_jsx("div", { style: styles.header, children: _jsx("div", { style: { ...styles.skeleton, width: '120px', height: '20px' } }) }), _jsx("div", { style: styles.list, children: [1, 2, 3].map((i) => (_jsxs("div", { style: { ...styles.notification, gap: '12px' }, children: [_jsx("div", { style: { ...styles.skeleton, width: '40px', height: '40px', borderRadius: '50%' } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { ...styles.skeleton, width: '70%', height: '16px', marginBottom: '8px' } }), _jsx("div", { style: { ...styles.skeleton, width: '100%', height: '14px', marginBottom: '6px' } }), _jsx("div", { style: { ...styles.skeleton, width: '40%', height: '12px' } })] })] }, i))) })] }));
    }
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("h2", { style: styles.title, children: "Notifications" }), unreadCount > 0 && _jsx("span", { style: styles.badge, children: unreadCount })] }), _jsxs("div", { style: styles.headerActions, children: [unreadCount > 0 && (_jsx("button", { style: styles.actionButton, onClick: onMarkAllAsRead, children: "Mark all read" })), notifications.length > 0 && (_jsx("button", { style: styles.actionButton, onClick: onClearAll, children: "Clear all" }))] })] }), _jsxs("div", { style: styles.filters, children: [_jsx("button", { style: {
                            ...styles.filterButton,
                            ...(filter === 'all' ? styles.filterButtonActive : {}),
                        }, onClick: () => setFilter('all'), children: "All" }), _jsx("button", { style: {
                            ...styles.filterButton,
                            ...(filter === 'unread' ? styles.filterButtonActive : {}),
                        }, onClick: () => setFilter('unread'), children: "Unread" })] }), _jsx("div", { style: styles.list, children: filteredNotifications.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), _jsx("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })] }) }), _jsx("div", { style: styles.emptyTitle, children: filter === 'unread' ? 'All caught up!' : 'No notifications' }), _jsx("div", { style: styles.emptyText, children: filter === 'unread'
                                ? 'You have no unread notifications'
                                : 'Notifications will appear here' })] })) : (filteredNotifications.map((notification) => (_jsxs("div", { style: {
                        ...styles.notification,
                        ...(!notification.read ? styles.notificationUnread : {}),
                    }, onClick: () => {
                        if (!notification.read) {
                            onMarkAsRead?.(notification.id);
                        }
                        onNotificationClick?.(notification);
                    }, onMouseEnter: (e) => {
                        const deleteBtn = e.currentTarget.querySelector('[data-delete]');
                        if (deleteBtn)
                            deleteBtn.style.opacity = '1';
                    }, onMouseLeave: (e) => {
                        const deleteBtn = e.currentTarget.querySelector('[data-delete]');
                        if (deleteBtn)
                            deleteBtn.style.opacity = '0';
                    }, children: [_jsxs("div", { style: styles.iconWrapper, children: [notification.imageUrl || notification.metadata?.userName ? (_jsx("div", { style: styles.avatar, children: notification.imageUrl ? (_jsx("img", { src: notification.imageUrl, alt: "", style: styles.avatarImage })) : (getInitials(notification.metadata?.userName)) })) : (_jsx("div", { style: {
                                        ...styles.iconWrapper,
                                        backgroundColor: `${getTypeColor(notification.type)}20`,
                                        color: getTypeColor(notification.type),
                                    }, children: getTypeIcon(notification.type) })), notification.imageUrl && (_jsx("div", { style: styles.typeIndicator, children: _jsx("div", { style: { color: getTypeColor(notification.type), transform: 'scale(0.75)' }, children: getTypeIcon(notification.type) }) }))] }), _jsxs("div", { style: styles.content, children: [_jsxs("div", { style: styles.notificationTitle, children: [notification.title, !notification.read && _jsx("div", { style: styles.unreadDot })] }), _jsx("div", { style: styles.notificationBody, children: notification.body }), _jsxs("div", { style: styles.meta, children: [_jsx("span", { children: formatTime(notification.createdAt) }), notification.metadata?.channelName && (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2022" }), _jsxs("span", { style: styles.channel, children: [_jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "4", y1: "9", x2: "20", y2: "9" }), _jsx("line", { x1: "4", y1: "15", x2: "20", y2: "15" }), _jsx("line", { x1: "10", y1: "3", x2: "8", y2: "21" }), _jsx("line", { x1: "16", y1: "3", x2: "14", y2: "21" })] }), notification.metadata.channelName] })] }))] })] }), _jsx("button", { "data-delete": true, style: styles.deleteButton, onClick: (e) => {
                                e.stopPropagation();
                                onDelete?.(notification.id);
                            }, children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }, notification.id)))) })] }));
}
