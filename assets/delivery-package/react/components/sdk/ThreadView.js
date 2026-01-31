import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
export function ThreadView({ parentMessage, replies, currentUserId, channelName, loading = false, hasMoreReplies = false, replyCount = 0, participantCount = 0, participants = [], onClose, onSendReply, onLoadMoreReplies, onReactionAdd, onReactionRemove, onMessageEdit, onMessageDelete, onUserClick, }) {
    const [replyText, setReplyText] = useState('');
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editText, setEditText] = useState('');
    const [activeMenu, setActiveMenu] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (activeMenu && !e.target.closest('[data-menu]')) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeMenu]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [replies.length]);
    const handleSendReply = () => {
        if (replyText.trim() && onSendReply) {
            onSendReply(replyText.trim());
            setReplyText('');
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };
    const handleEditSave = (messageId) => {
        if (editText.trim() && onMessageEdit) {
            onMessageEdit(messageId, editText.trim());
            setEditingMessageId(null);
            setEditText('');
        }
    };
    const formatTime = (dateString) => {
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
        if (diffDays === 1)
            return 'Yesterday';
        return date.toLocaleDateString();
    };
    const formatFileSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderLeft: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            minWidth: '360px',
            maxWidth: '480px',
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
            flexDirection: 'column',
            gap: '2px',
        },
        headerTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
        },
        headerSubtitle: {
            fontSize: '13px',
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
        parentSection: {
            padding: '16px 20px',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #f3f4f6)',
        },
        messageWrapper: {
            display: 'flex',
            gap: '12px',
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
            cursor: 'pointer',
        },
        avatarSmall: {
            width: '32px',
            height: '32px',
            fontSize: '12px',
        },
        messageContent: {
            flex: 1,
            minWidth: 0,
        },
        messageHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
        },
        userName: {
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            cursor: 'pointer',
        },
        timestamp: {
            fontSize: '12px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        messageText: {
            fontSize: '14px',
            lineHeight: 1.5,
            color: 'var(--chatsdk-text-primary, #111827)',
            wordBreak: 'break-word',
        },
        deletedMessage: {
            fontStyle: 'italic',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        editedBadge: {
            fontSize: '11px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            marginLeft: '4px',
        },
        attachments: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '8px',
        },
        imageAttachment: {
            maxWidth: '200px',
            maxHeight: '150px',
            borderRadius: '8px',
            cursor: 'pointer',
        },
        fileAttachment: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        reactions: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginTop: '8px',
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
        repliesSection: {
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
        },
        repliesHeader: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
        },
        repliesTitle: {
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
        participants: {
            display: 'flex',
            alignItems: 'center',
        },
        participantAvatar: {
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '2px solid var(--chatsdk-bg-primary, #ffffff)',
            marginLeft: '-8px',
            fontSize: '10px',
        },
        participantCount: {
            marginLeft: '8px',
            fontSize: '12px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
        },
        loadMoreButton: {
            width: '100%',
            padding: '8px',
            marginBottom: '16px',
            backgroundColor: 'transparent',
            border: '1px dashed var(--chatsdk-border-color, #e5e7eb)',
            borderRadius: '6px',
            color: 'var(--chatsdk-accent-color, #6366f1)',
            fontSize: '13px',
            cursor: 'pointer',
        },
        replyItem: {
            marginBottom: '16px',
            position: 'relative',
        },
        replyActions: {
            position: 'absolute',
            top: '0',
            right: '0',
            display: 'flex',
            gap: '4px',
            opacity: 0,
            transition: 'opacity 0.15s ease',
        },
        actionButton: {
            padding: '4px',
            background: 'var(--chatsdk-bg-secondary, #f9fafb)',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            borderRadius: '4px',
            cursor: 'pointer',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        menuDropdown: {
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '4px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            zIndex: 50,
            minWidth: '140px',
            overflow: 'hidden',
        },
        menuItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
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
        editInput: {
            width: '100%',
            padding: '8px 12px',
            fontSize: '14px',
            borderRadius: '6px',
            border: '1px solid var(--chatsdk-accent-color, #6366f1)',
            outline: 'none',
            fontFamily: 'inherit',
            resize: 'none',
        },
        editActions: {
            display: 'flex',
            gap: '8px',
            marginTop: '8px',
        },
        editButton: {
            padding: '6px 12px',
            fontSize: '13px',
            borderRadius: '4px',
            cursor: 'pointer',
            border: 'none',
        },
        composer: {
            padding: '16px 20px',
            borderTop: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
        },
        composerInput: {
            width: '100%',
            padding: '12px 14px',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            outline: 'none',
            fontFamily: 'inherit',
            resize: 'none',
            minHeight: '44px',
            maxHeight: '120px',
        },
        composerActions: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
        },
        composerButtons: {
            display: 'flex',
            gap: '8px',
        },
        composerButton: {
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
        sendButton: {
            padding: '8px 16px',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        },
        sendButtonDisabled: {
            backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
            cursor: 'not-allowed',
        },
        emptyReplies: {
            textAlign: 'center',
            padding: '40px 20px',
        },
        emptyIcon: {
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        emptyTitle: {
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '4px',
        },
        emptyDescription: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
        },
        loadingState: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
        },
        skeletonMessage: {
            display: 'flex',
            gap: '12px',
        },
        skeletonAvatar: {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
            animation: 'pulse 1.5s ease-in-out infinite',
        },
        skeletonContent: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        },
        skeletonLine: {
            height: '12px',
            backgroundColor: 'var(--chatsdk-border-color, #e5e7eb)',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
        },
    };
    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };
    const renderAvatar = (user, size = 'normal') => {
        const style = size === 'small'
            ? { ...styles.avatar, ...styles.avatarSmall }
            : styles.avatar;
        if (user.imageUrl) {
            return (_jsx("img", { src: user.imageUrl, alt: user.name, style: { ...style, objectFit: 'cover' }, onClick: () => onUserClick?.(user.name) }));
        }
        return (_jsx("div", { style: style, onClick: () => onUserClick?.(user.name), children: getInitials(user.name) }));
    };
    const renderMessage = (message, isParent = false) => {
        const isOwn = message.user.id === currentUserId;
        const isEditing = editingMessageId === message.id;
        return (_jsxs("div", { style: !isParent ? styles.replyItem : undefined, onMouseEnter: (e) => {
                const actions = e.currentTarget.querySelector('[data-actions]');
                if (actions)
                    actions.style.opacity = '1';
            }, onMouseLeave: (e) => {
                const actions = e.currentTarget.querySelector('[data-actions]');
                if (actions)
                    actions.style.opacity = '0';
            }, children: [_jsxs("div", { style: styles.messageWrapper, children: [renderAvatar(message.user, isParent ? 'normal' : 'small'), _jsxs("div", { style: styles.messageContent, children: [_jsxs("div", { style: styles.messageHeader, children: [_jsx("span", { style: styles.userName, onClick: () => onUserClick?.(message.user.id), children: message.user.name }), _jsx("span", { style: styles.timestamp, children: formatTime(message.createdAt) })] }), message.deleted ? (_jsx("p", { style: { ...styles.messageText, ...styles.deletedMessage }, children: "This message was deleted" })) : isEditing ? (_jsxs("div", { children: [_jsx("textarea", { style: styles.editInput, value: editText, onChange: (e) => setEditText(e.target.value), rows: 2, autoFocus: true }), _jsxs("div", { style: styles.editActions, children: [_jsx("button", { style: {
                                                        ...styles.editButton,
                                                        backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
                                                        color: '#ffffff',
                                                    }, onClick: () => handleEditSave(message.id), children: "Save" }), _jsx("button", { style: {
                                                        ...styles.editButton,
                                                        backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
                                                        color: 'var(--chatsdk-text-primary, #111827)',
                                                    }, onClick: () => {
                                                        setEditingMessageId(null);
                                                        setEditText('');
                                                    }, children: "Cancel" })] })] })) : (_jsxs("p", { style: styles.messageText, children: [message.text, message.edited && _jsx("span", { style: styles.editedBadge, children: "(edited)" })] })), message.attachments && message.attachments.length > 0 && !message.deleted && (_jsx("div", { style: styles.attachments, children: message.attachments.map((att, i) => (att.type === 'image' ? (_jsx("img", { src: att.url, alt: "", style: styles.imageAttachment }, i)) : (_jsxs("div", { style: styles.fileAttachment, children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), _jsx("polyline", { points: "14 2 14 8 20 8" })] }), _jsx("span", { style: { fontSize: '13px' }, children: att.name }), att.size && (_jsx("span", { style: { fontSize: '12px', color: 'var(--chatsdk-text-tertiary, #9ca3af)' }, children: formatFileSize(att.size) }))] }, i)))) })), message.reactions && message.reactions.length > 0 && !message.deleted && (_jsx("div", { style: styles.reactions, children: message.reactions.map((reaction, i) => (_jsxs("button", { style: {
                                            ...styles.reaction,
                                            ...(reaction.reacted ? styles.reactionActive : {}),
                                        }, onClick: () => {
                                            if (reaction.reacted) {
                                                onReactionRemove?.(message.id, reaction.emoji);
                                            }
                                            else {
                                                onReactionAdd?.(message.id, reaction.emoji);
                                            }
                                        }, children: [_jsx("span", { children: reaction.emoji }), _jsx("span", { style: { color: 'var(--chatsdk-text-secondary, #6b7280)' }, children: reaction.count })] }, i))) }))] })] }), !isParent && !message.deleted && (_jsxs("div", { style: styles.replyActions, "data-actions": true, children: [_jsx("button", { style: styles.actionButton, onClick: () => onReactionAdd?.(message.id, '👍'), title: "Add reaction", children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }), _jsx("line", { x1: "9", y1: "9", x2: "9.01", y2: "9" }), _jsx("line", { x1: "15", y1: "9", x2: "15.01", y2: "9" })] }) }), isOwn && (_jsxs("div", { style: { position: 'relative' }, "data-menu": true, children: [_jsx("button", { style: styles.actionButton, onClick: (e) => {
                                        e.stopPropagation();
                                        setActiveMenu(activeMenu === message.id ? null : message.id);
                                    }, title: "More options", children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "1" }), _jsx("circle", { cx: "19", cy: "12", r: "1" }), _jsx("circle", { cx: "5", cy: "12", r: "1" })] }) }), activeMenu === message.id && (_jsxs("div", { style: styles.menuDropdown, children: [_jsxs("button", { style: styles.menuItem, onClick: () => {
                                                setEditingMessageId(message.id);
                                                setEditText(message.text);
                                                setActiveMenu(null);
                                            }, children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] }), "Edit"] }), _jsxs("button", { style: { ...styles.menuItem, ...styles.menuItemDanger }, onClick: () => {
                                                onMessageDelete?.(message.id);
                                                setActiveMenu(null);
                                            }, children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })] }), "Delete"] })] }))] }))] }))] }, message.id));
    };
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("h3", { style: styles.headerTitle, children: "Thread" }), channelName && (_jsxs("span", { style: styles.headerSubtitle, children: ["in #", channelName] }))] }), _jsx("button", { style: styles.closeButton, onClick: onClose, children: _jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }), _jsx("div", { style: styles.parentSection, children: renderMessage(parentMessage, true) }), _jsxs("div", { style: styles.repliesSection, children: [_jsxs("div", { style: styles.repliesHeader, children: [_jsxs("span", { style: styles.repliesTitle, children: [replyCount, " ", replyCount === 1 ? 'Reply' : 'Replies'] }), participants.length > 0 && (_jsxs("div", { style: styles.participants, children: [participants.slice(0, 3).map((p, i) => (_jsx("div", { style: {
                                            ...styles.avatar,
                                            ...styles.participantAvatar,
                                            marginLeft: i > 0 ? '-8px' : '0',
                                            zIndex: 3 - i,
                                        }, title: p.name, children: p.imageUrl ? (_jsx("img", { src: p.imageUrl, alt: p.name, style: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' } })) : (getInitials(p.name)) }, p.id))), participantCount > 3 && (_jsxs("span", { style: styles.participantCount, children: ["+", participantCount - 3] }))] }))] }), hasMoreReplies && (_jsx("button", { style: styles.loadMoreButton, onClick: onLoadMoreReplies, children: "Load earlier replies" })), loading ? (_jsx("div", { style: styles.loadingState, children: [1, 2, 3].map((i) => (_jsxs("div", { style: styles.skeletonMessage, children: [_jsx("div", { style: styles.skeletonAvatar }), _jsxs("div", { style: styles.skeletonContent, children: [_jsx("div", { style: { ...styles.skeletonLine, width: '40%' } }), _jsx("div", { style: { ...styles.skeletonLine, width: '80%' } })] })] }, i))) })) : replies.length === 0 ? (_jsxs("div", { style: styles.emptyReplies, children: [_jsx("svg", { style: styles.emptyIcon, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }), _jsx("p", { style: styles.emptyTitle, children: "No replies yet" }), _jsx("p", { style: styles.emptyDescription, children: "Be the first to reply to this message" })] })) : (_jsxs(_Fragment, { children: [replies.map((reply) => renderMessage(reply)), _jsx("div", { ref: messagesEndRef })] }))] }), _jsxs("div", { style: styles.composer, children: [_jsx("textarea", { ref: inputRef, style: styles.composerInput, value: replyText, onChange: (e) => setReplyText(e.target.value), onKeyDown: handleKeyDown, placeholder: "Reply to thread...", rows: 1 }), _jsxs("div", { style: styles.composerActions, children: [_jsxs("div", { style: styles.composerButtons, children: [_jsx("button", { style: styles.composerButton, title: "Add emoji", children: _jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }), _jsx("line", { x1: "9", y1: "9", x2: "9.01", y2: "9" }), _jsx("line", { x1: "15", y1: "9", x2: "15.01", y2: "9" })] }) }), _jsx("button", { style: styles.composerButton, title: "Attach file", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" }) }) }), _jsx("button", { style: styles.composerButton, title: "Mention someone", children: _jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "4" }), _jsx("path", { d: "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" })] }) })] }), _jsxs("button", { style: {
                                    ...styles.sendButton,
                                    ...(replyText.trim() ? {} : styles.sendButtonDisabled),
                                }, onClick: handleSendReply, disabled: !replyText.trim(), children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "22", y1: "2", x2: "11", y2: "13" }), _jsx("polygon", { points: "22 2 15 22 11 13 2 9 22 2" })] }), "Reply"] })] })] })] }));
}
