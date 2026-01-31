import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
export function PinnedMessages({ messages, loading = false, onMessageClick, onUnpin, onClose, channelName, }) {
    const [expandedId, setExpandedId] = useState(null);
    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        else if (diffDays === 1) {
            return 'Yesterday';
        }
        else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }
        else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };
    const truncateText = (text, maxLength = 100) => {
        if (text.length <= maxLength)
            return text;
        return text.slice(0, maxLength).trim() + '...';
    };
    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderLeft: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            width: '340px',
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
        },
        headerLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
        },
        headerIcon: {
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'var(--chatsdk-warning-color, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
        },
        headerInfo: {
            display: 'flex',
            flexDirection: 'column',
        },
        headerTitle: {
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
        },
        headerSubtitle: {
            fontSize: '12px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
        },
        closeButton: {
            padding: '8px',
            background: 'none',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        content: {
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
        },
        messageCard: {
            padding: '14px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            borderRadius: '10px',
            marginBottom: '10px',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
            border: '1px solid transparent',
        },
        messageCardHover: {
            backgroundColor: 'var(--chatsdk-bg-tertiary, #f3f4f6)',
            borderColor: 'var(--chatsdk-border-color, #e5e7eb)',
        },
        messageHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px',
        },
        avatar: {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            flexShrink: 0,
        },
        userInfo: {
            flex: 1,
            minWidth: 0,
        },
        userName: {
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
        },
        messageDate: {
            fontSize: '11px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        unpinButton: {
            padding: '6px',
            background: 'none',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            opacity: 0,
            transition: 'opacity 0.15s ease',
        },
        messageText: {
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '8px',
        },
        expandButton: {
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '12px',
            color: 'var(--chatsdk-accent-color, #6366f1)',
            cursor: 'pointer',
            fontWeight: 500,
        },
        attachments: {
            display: 'flex',
            gap: '6px',
            marginBottom: '8px',
            flexWrap: 'wrap',
        },
        attachment: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '6px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            fontSize: '12px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
        },
        attachmentImage: {
            width: '60px',
            height: '60px',
            borderRadius: '6px',
            objectFit: 'cover',
        },
        pinnedInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        pinIcon: {
            color: 'var(--chatsdk-warning-color, #f59e0b)',
        },
        emptyState: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '40px 20px',
            textAlign: 'center',
        },
        emptyIcon: {
            width: '64px',
            height: '64px',
            marginBottom: '16px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        emptyTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '8px',
        },
        emptyDescription: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            maxWidth: '240px',
        },
        loadingState: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '12px',
        },
        skeleton: {
            backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
            borderRadius: '8px',
            animation: 'pulse 1.5s ease-in-out infinite',
        },
        skeletonCard: {
            height: '120px',
        },
    };
    if (loading) {
        return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("div", { style: styles.headerIcon, children: _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "12", y1: "17", x2: "12", y2: "22" }), _jsx("path", { d: "M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" })] }) }), _jsx("div", { style: styles.headerInfo, children: _jsx("h3", { style: styles.headerTitle, children: "Pinned Messages" }) })] }), _jsx("button", { style: styles.closeButton, onClick: onClose, children: _jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }), _jsx("div", { style: styles.loadingState, children: [1, 2, 3].map((i) => (_jsx("div", { style: { ...styles.skeleton, ...styles.skeletonCard } }, i))) })] }));
    }
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("div", { style: styles.headerIcon, children: _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "12", y1: "17", x2: "12", y2: "22" }), _jsx("path", { d: "M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" })] }) }), _jsxs("div", { style: styles.headerInfo, children: [_jsx("h3", { style: styles.headerTitle, children: "Pinned Messages" }), channelName && (_jsxs("span", { style: styles.headerSubtitle, children: ["#", channelName] }))] })] }), _jsx("button", { style: styles.closeButton, onClick: onClose, children: _jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }), _jsx("div", { style: styles.content, children: messages.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsxs("svg", { style: styles.emptyIcon, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("line", { x1: "12", y1: "17", x2: "12", y2: "22" }), _jsx("path", { d: "M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" })] }), _jsx("h4", { style: styles.emptyTitle, children: "No pinned messages" }), _jsx("p", { style: styles.emptyDescription, children: "Pin important messages to keep them easily accessible for everyone in the channel." })] })) : (messages.map((message) => {
                    const isExpanded = expandedId === message.id;
                    const displayText = isExpanded ? message.text : truncateText(message.text);
                    const needsExpand = message.text.length > 100;
                    return (_jsxs("div", { style: styles.messageCard, onClick: () => onMessageClick?.(message), onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = 'var(--chatsdk-bg-tertiary, #f3f4f6)';
                            const unpinBtn = e.currentTarget.querySelector('[data-unpin]');
                            if (unpinBtn)
                                unpinBtn.style.opacity = '1';
                        }, onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = 'var(--chatsdk-bg-secondary, #f9fafb)';
                            const unpinBtn = e.currentTarget.querySelector('[data-unpin]');
                            if (unpinBtn)
                                unpinBtn.style.opacity = '0';
                        }, children: [_jsxs("div", { style: styles.messageHeader, children: [_jsx("div", { style: styles.avatar, children: message.user.imageUrl ? (_jsx("img", { src: message.user.imageUrl, alt: message.user.name, style: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' } })) : (getInitials(message.user.name)) }), _jsxs("div", { style: styles.userInfo, children: [_jsx("div", { style: styles.userName, children: message.user.name }), _jsx("div", { style: styles.messageDate, children: formatDate(message.createdAt) })] }), _jsx("button", { "data-unpin": true, style: styles.unpinButton, onClick: (e) => {
                                            e.stopPropagation();
                                            onUnpin?.(message);
                                        }, title: "Unpin message", children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }), _jsxs("p", { style: styles.messageText, children: [displayText, needsExpand && (_jsxs(_Fragment, { children: [' ', _jsx("button", { style: styles.expandButton, onClick: (e) => {
                                                    e.stopPropagation();
                                                    setExpandedId(isExpanded ? null : message.id);
                                                }, children: isExpanded ? 'Show less' : 'Show more' })] }))] }), message.attachments && message.attachments.length > 0 && (_jsx("div", { style: styles.attachments, children: message.attachments.map((att, i) => att.type === 'image' ? (_jsx("img", { src: att.url, alt: "", style: styles.attachmentImage }, i)) : (_jsxs("div", { style: styles.attachment, children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), _jsx("polyline", { points: "14 2 14 8 20 8" })] }), att.name] }, i))) })), message.pinnedBy && (_jsxs("div", { style: styles.pinnedInfo, children: [_jsxs("svg", { style: styles.pinIcon, width: "12", height: "12", viewBox: "0 0 24 24", fill: "currentColor", children: [_jsx("line", { x1: "12", y1: "17", x2: "12", y2: "22", stroke: "currentColor", strokeWidth: "2" }), _jsx("path", { d: "M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" })] }), "Pinned by ", message.pinnedBy.name, " \u2022 ", formatDate(message.pinnedAt)] }))] }, message.id));
                })) })] }));
}
