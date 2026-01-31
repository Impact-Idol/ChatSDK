import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
export function MessageBubble({ id, text, user, createdAt, isOwn = false, status = 'sent', attachments = [], reactions = [], replyTo, edited = false, deleted = false, pinned = false, highlighted = false, showAvatar = true, showName = true, showTimestamp = true, isFirstInGroup = true, isLastInGroup = true, onReply, onReact, onRemoveReaction, onEdit, onDelete, onPin, onCopy, onForward, onUserClick, onAttachmentClick, onRetry, }) {
    const [showMenu, setShowMenu] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('[data-menu]')) {
                setShowMenu(false);
                setShowReactions(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);
    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const formatFileSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    const styles = {
        container: {
            display: 'flex',
            flexDirection: isOwn ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            gap: '8px',
            padding: '2px 16px',
            marginTop: isFirstInGroup ? '8px' : '2px',
            backgroundColor: highlighted ? 'var(--chatsdk-accent-light, #eef2ff)' : 'transparent',
            position: 'relative',
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
            cursor: 'pointer',
            visibility: (showAvatar && isLastInGroup) ? 'visible' : 'hidden',
        },
        bubbleWrapper: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: isOwn ? 'flex-end' : 'flex-start',
            maxWidth: '70%',
        },
        name: {
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            marginBottom: '4px',
            marginLeft: isOwn ? '0' : '12px',
            marginRight: isOwn ? '12px' : '0',
            cursor: 'pointer',
        },
        bubble: {
            position: 'relative',
            padding: '10px 14px',
            borderRadius: '18px',
            backgroundColor: isOwn
                ? 'var(--chatsdk-message-own-bg, #6366f1)'
                : 'var(--chatsdk-message-other-bg, #f3f4f6)',
            color: isOwn
                ? 'var(--chatsdk-message-own-text, #ffffff)'
                : 'var(--chatsdk-message-other-text, #111827)',
            borderTopLeftRadius: !isOwn && !isFirstInGroup ? '6px' : '18px',
            borderTopRightRadius: isOwn && !isFirstInGroup ? '6px' : '18px',
            borderBottomLeftRadius: !isOwn && !isLastInGroup ? '6px' : '18px',
            borderBottomRightRadius: isOwn && !isLastInGroup ? '6px' : '18px',
        },
        deletedBubble: {
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            fontStyle: 'italic',
            border: '1px dashed var(--chatsdk-border-color, #e5e7eb)',
        },
        pinnedIndicator: {
            position: 'absolute',
            top: '-8px',
            right: isOwn ? 'auto' : '-8px',
            left: isOwn ? '-8px' : 'auto',
            backgroundColor: 'var(--chatsdk-warning-color, #f59e0b)',
            borderRadius: '50%',
            padding: '2px',
            display: 'flex',
        },
        replyPreview: {
            padding: '8px 12px',
            marginBottom: '6px',
            borderRadius: '8px',
            backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderLeft: `3px solid ${isOwn ? 'rgba(255,255,255,0.5)' : 'var(--chatsdk-accent-color, #6366f1)'}`,
            fontSize: '12px',
        },
        replyName: {
            fontWeight: 600,
            marginBottom: '2px',
        },
        replyText: {
            opacity: 0.8,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px',
        },
        text: {
            fontSize: '14px',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
        },
        attachments: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: text ? '8px' : '0',
        },
        imageAttachment: {
            maxWidth: '280px',
            maxHeight: '200px',
            borderRadius: '12px',
            cursor: 'pointer',
            objectFit: 'cover',
        },
        fileAttachment: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius: '10px',
            cursor: 'pointer',
        },
        fileIcon: {
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--chatsdk-accent-color, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
        },
        fileInfo: {
            flex: 1,
            minWidth: 0,
        },
        fileName: {
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        fileSize: {
            fontSize: '11px',
            opacity: 0.7,
        },
        footer: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '4px',
            justifyContent: isOwn ? 'flex-end' : 'flex-start',
        },
        timestamp: {
            fontSize: '11px',
            color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        editedBadge: {
            fontSize: '11px',
            opacity: 0.7,
        },
        statusIcon: {
            display: 'flex',
            alignItems: 'center',
        },
        reactions: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            marginTop: '6px',
        },
        reaction: {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            borderRadius: '12px',
            fontSize: '13px',
            cursor: 'pointer',
        },
        reactionActive: {
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
            borderColor: 'var(--chatsdk-accent-color, #6366f1)',
        },
        actionsBar: {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left: isOwn ? '-80px' : 'auto',
            right: isOwn ? 'auto' : '-80px',
            display: 'flex',
            gap: '4px',
            opacity: 0,
            transition: 'opacity 0.15s ease',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            padding: '4px',
        },
        actionButton: {
            padding: '6px',
            background: 'none',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        reactionPicker: {
            position: 'absolute',
            top: '-44px',
            left: isOwn ? 'auto' : '0',
            right: isOwn ? '0' : 'auto',
            display: 'flex',
            gap: '4px',
            padding: '6px 10px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        emojiButton: {
            padding: '4px 6px',
            background: 'none',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '18px',
            transition: 'transform 0.1s ease',
        },
        menu: {
            position: 'absolute',
            top: '100%',
            left: isOwn ? 'auto' : '0',
            right: isOwn ? '0' : 'auto',
            marginTop: '4px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            zIndex: 50,
            minWidth: '160px',
            overflow: 'hidden',
        },
        menuItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            fontSize: '14px',
            color: 'var(--chatsdk-text-primary, #111827)',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            width: '100%',
            textAlign: 'left',
        },
        menuItemDanger: {
            color: 'var(--chatsdk-error-color, #ef4444)',
        },
        failedOverlay: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px',
            color: 'var(--chatsdk-error-color, #ef4444)',
            fontSize: '12px',
        },
        retryButton: {
            padding: '4px 8px',
            backgroundColor: 'var(--chatsdk-error-color, #ef4444)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
        },
    };
    const renderStatusIcon = () => {
        if (!isOwn || deleted)
            return null;
        const iconStyle = { width: '14px', height: '14px' };
        const color = status === 'read' ? 'var(--chatsdk-accent-color, #6366f1)' : 'rgba(255,255,255,0.5)';
        switch (status) {
            case 'sending':
                return (_jsx("svg", { style: iconStyle, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2", children: _jsx("circle", { cx: "12", cy: "12", r: "10", strokeDasharray: "40", strokeDashoffset: "10", children: _jsx("animateTransform", { attributeName: "transform", type: "rotate", from: "0 12 12", to: "360 12 12", dur: "1s", repeatCount: "indefinite" }) }) }));
            case 'sent':
                return (_jsx("svg", { style: iconStyle, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2.5", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }));
            case 'delivered':
            case 'read':
                return (_jsxs("div", { style: { display: 'flex', marginLeft: '-6px' }, children: [_jsx("svg", { style: iconStyle, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2.5", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }), _jsx("svg", { style: { ...iconStyle, marginLeft: '-8px' }, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2.5", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })] }));
            default:
                return null;
        }
    };
    if (deleted) {
        return (_jsxs("div", { style: styles.container, children: [showAvatar && !isOwn && (_jsx("div", { style: styles.avatar, onClick: () => onUserClick?.(user.id), children: user.imageUrl ? (_jsx("img", { src: user.imageUrl, alt: user.name, style: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' } })) : (getInitials(user.name)) })), _jsx("div", { style: styles.bubbleWrapper, children: _jsx("div", { style: { ...styles.bubble, ...styles.deletedBubble }, children: _jsx("p", { style: styles.text, children: "This message was deleted" }) }) })] }));
    }
    return (_jsxs("div", { style: styles.container, onMouseEnter: (e) => {
            const actions = e.currentTarget.querySelector('[data-actions]');
            if (actions)
                actions.style.opacity = '1';
        }, onMouseLeave: (e) => {
            const actions = e.currentTarget.querySelector('[data-actions]');
            if (actions)
                actions.style.opacity = '0';
        }, children: [showAvatar && !isOwn && (_jsx("div", { style: styles.avatar, onClick: () => onUserClick?.(user.id), children: user.imageUrl ? (_jsx("img", { src: user.imageUrl, alt: user.name, style: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' } })) : (getInitials(user.name)) })), _jsxs("div", { style: styles.bubbleWrapper, children: [showName && !isOwn && isFirstInGroup && (_jsx("span", { style: styles.name, onClick: () => onUserClick?.(user.id), children: user.name })), _jsxs("div", { style: styles.bubble, "data-menu": true, children: [pinned && (_jsx("div", { style: styles.pinnedIndicator, children: _jsxs("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "#ffffff", children: [_jsx("line", { x1: "12", y1: "17", x2: "12", y2: "22", stroke: "#ffffff", strokeWidth: "2" }), _jsx("path", { d: "M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z", fill: "#ffffff" })] }) })), replyTo && (_jsxs("div", { style: styles.replyPreview, children: [_jsx("div", { style: styles.replyName, children: replyTo.user.name }), _jsx("div", { style: styles.replyText, children: replyTo.text })] })), text && _jsx("p", { style: styles.text, children: text }), attachments.length > 0 && (_jsx("div", { style: styles.attachments, children: attachments.map((att, i) => (att.type === 'image' ? (_jsx("img", { src: att.thumbnailUrl || att.url, alt: att.name, style: styles.imageAttachment, onClick: () => onAttachmentClick?.(att) }, i)) : att.type === 'video' ? (_jsx("video", { src: att.url, poster: att.thumbnailUrl, style: styles.imageAttachment, controls: true }, i)) : (_jsxs("div", { style: styles.fileAttachment, onClick: () => onAttachmentClick?.(att), children: [_jsx("div", { style: styles.fileIcon, children: _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), _jsx("polyline", { points: "14 2 14 8 20 8" })] }) }), _jsxs("div", { style: styles.fileInfo, children: [_jsx("div", { style: styles.fileName, children: att.name }), att.size && _jsx("div", { style: styles.fileSize, children: formatFileSize(att.size) })] })] }, i)))) })), showTimestamp && (_jsxs("div", { style: styles.footer, children: [edited && _jsx("span", { style: styles.editedBadge, children: "(edited)" }), _jsx("span", { style: styles.timestamp, children: formatTime(createdAt) }), _jsx("span", { style: styles.statusIcon, children: renderStatusIcon() })] })), showReactions && (_jsx("div", { style: styles.reactionPicker, children: quickReactions.map((emoji) => (_jsx("button", { style: styles.emojiButton, onClick: () => {
                                        onReact?.(emoji);
                                        setShowReactions(false);
                                    }, children: emoji }, emoji))) })), showMenu && (_jsxs("div", { style: styles.menu, children: [_jsxs("button", { style: styles.menuItem, onClick: () => { onReply?.(); setShowMenu(false); }, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "9 17 4 12 9 7" }), _jsx("path", { d: "M20 18v-2a4 4 0 0 0-4-4H4" })] }), "Reply"] }), _jsxs("button", { style: styles.menuItem, onClick: () => { onForward?.(); setShowMenu(false); }, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "15 17 20 12 15 7" }), _jsx("path", { d: "M4 18v-2a4 4 0 0 1 4-4h12" })] }), "Forward"] }), _jsxs("button", { style: styles.menuItem, onClick: () => { onCopy?.(); setShowMenu(false); }, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }), "Copy"] }), _jsxs("button", { style: styles.menuItem, onClick: () => { onPin?.(); setShowMenu(false); }, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "12", y1: "17", x2: "12", y2: "22" }), _jsx("path", { d: "M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" })] }), pinned ? 'Unpin' : 'Pin'] }), isOwn && (_jsxs(_Fragment, { children: [_jsxs("button", { style: styles.menuItem, onClick: () => { onEdit?.(); setShowMenu(false); }, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] }), "Edit"] }), _jsxs("button", { style: { ...styles.menuItem, ...styles.menuItemDanger }, onClick: () => { onDelete?.(); setShowMenu(false); }, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })] }), "Delete"] })] }))] }))] }), reactions.length > 0 && (_jsx("div", { style: styles.reactions, children: reactions.map((reaction, i) => (_jsxs("button", { style: {
                                ...styles.reaction,
                                ...(reaction.reacted ? styles.reactionActive : {}),
                            }, onClick: () => {
                                if (reaction.reacted) {
                                    onRemoveReaction?.(reaction.emoji);
                                }
                                else {
                                    onReact?.(reaction.emoji);
                                }
                            }, children: [_jsx("span", { children: reaction.emoji }), _jsx("span", { style: { color: 'var(--chatsdk-text-secondary, #6b7280)' }, children: reaction.count })] }, i))) })), status === 'failed' && (_jsxs("div", { style: styles.failedOverlay, children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }), "Failed to send", _jsx("button", { style: styles.retryButton, onClick: onRetry, children: "Retry" })] })), _jsxs("div", { style: styles.actionsBar, "data-actions": true, children: [_jsx("button", { style: styles.actionButton, onClick: (e) => { e.stopPropagation(); setShowReactions(!showReactions); }, title: "React", children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }), _jsx("line", { x1: "9", y1: "9", x2: "9.01", y2: "9" }), _jsx("line", { x1: "15", y1: "9", x2: "15.01", y2: "9" })] }) }), _jsx("button", { style: styles.actionButton, onClick: onReply, title: "Reply", children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "9 17 4 12 9 7" }), _jsx("path", { d: "M20 18v-2a4 4 0 0 0-4-4H4" })] }) }), _jsx("button", { style: styles.actionButton, onClick: (e) => { e.stopPropagation(); setShowMenu(!showMenu); }, title: "More", children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "1" }), _jsx("circle", { cx: "19", cy: "12", r: "1" }), _jsx("circle", { cx: "5", cy: "12", r: "1" })] }) })] })] })] }));
}
