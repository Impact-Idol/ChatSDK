import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function ReadReceipts({ readers, variant = 'avatars', maxDisplayUsers = 5, size = 'small', showNames = false, showTimestamp = false, position = 'right', status = 'read', onUserClick, }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const displayReaders = readers.slice(0, maxDisplayUsers);
    const remainingCount = readers.length - maxDisplayUsers;
    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const sizeConfig = {
        small: { avatar: 16, font: 10, checkmark: 14 },
        medium: { avatar: 20, font: 11, checkmark: 16 },
        large: { avatar: 24, font: 12, checkmark: 20 },
    }[size];
    const styles = {
        container: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: position === 'right' ? 'flex-end' : 'flex-start',
            gap: '4px',
            position: 'relative',
        },
        // Avatars variant
        avatarGroup: {
            display: 'flex',
            alignItems: 'center',
        },
        avatar: {
            width: `${sizeConfig.avatar}px`,
            height: `${sizeConfig.avatar}px`,
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: `${sizeConfig.font}px`,
            fontWeight: 600,
            border: '1.5px solid var(--chatsdk-bg-primary, #ffffff)',
            marginLeft: '-6px',
            cursor: onUserClick ? 'pointer' : 'default',
        },
        avatarFirst: {
            marginLeft: '0',
        },
        avatarImage: {
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
        },
        remainingBadge: {
            width: `${sizeConfig.avatar}px`,
            height: `${sizeConfig.avatar}px`,
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            fontSize: `${sizeConfig.font - 1}px`,
            fontWeight: 600,
            border: '1.5px solid var(--chatsdk-bg-primary, #ffffff)',
            marginLeft: '-6px',
        },
        // Checkmarks variant
        checkmarksContainer: {
            display: 'flex',
            alignItems: 'center',
        },
        checkmark: {
            color: status === 'read'
                ? 'var(--chatsdk-accent-color, #6366f1)'
                : status === 'delivered'
                    ? 'var(--chatsdk-text-tertiary, #9ca3af)'
                    : 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        checkmarkSingle: {
            marginLeft: '-8px',
        },
        // List variant
        listContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px 0',
        },
        listItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 0',
            cursor: onUserClick ? 'pointer' : 'default',
        },
        listAvatar: {
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            flexShrink: 0,
        },
        listInfo: {
            flex: 1,
            minWidth: 0,
        },
        listName: {
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-primary, #111827)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        listTime: {
            fontSize: '11px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        listCheck: {
            color: 'var(--chatsdk-accent-color, #6366f1)',
            flexShrink: 0,
        },
        // Tooltip
        tooltip: {
            position: 'absolute',
            bottom: '100%',
            right: position === 'right' ? '0' : 'auto',
            left: position === 'left' ? '0' : 'auto',
            marginBottom: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            minWidth: '160px',
            maxWidth: '240px',
            zIndex: 50,
        },
        tooltipHeader: {
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px',
        },
        tooltipList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
        },
        tooltipItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        tooltipAvatar: {
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '9px',
            fontWeight: 600,
        },
        tooltipName: {
            flex: 1,
            fontSize: '12px',
            color: 'var(--chatsdk-text-primary, #111827)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        tooltipTime: {
            fontSize: '11px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            flexShrink: 0,
        },
        // Names display
        namesText: {
            fontSize: `${sizeConfig.font + 1}px`,
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            whiteSpace: 'nowrap',
        },
    };
    const renderAvatar = (user, index) => {
        const style = {
            ...styles.avatar,
            ...(index === 0 ? styles.avatarFirst : {}),
            zIndex: displayReaders.length - index,
        };
        return (_jsx("div", { style: style, onClick: () => onUserClick?.(user.id), title: `${user.name} - Read ${formatTime(user.readAt)}`, children: user.imageUrl ? (_jsx("img", { src: user.imageUrl, alt: user.name, style: styles.avatarImage })) : (getInitials(user.name)) }, user.id));
    };
    const renderCheckmarks = () => {
        const checkmarkSize = sizeConfig.checkmark;
        if (status === 'sent') {
            return (_jsx("svg", { width: checkmarkSize, height: checkmarkSize, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", style: styles.checkmark, children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }));
        }
        // Double checkmarks for delivered/read
        return (_jsxs("div", { style: styles.checkmarksContainer, children: [_jsx("svg", { width: checkmarkSize, height: checkmarkSize, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", style: styles.checkmark, children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }), _jsx("svg", { width: checkmarkSize, height: checkmarkSize, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", style: { ...styles.checkmark, ...styles.checkmarkSingle }, children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })] }));
    };
    if (variant === 'checkmarks') {
        return (_jsxs("div", { style: styles.container, children: [renderCheckmarks(), showNames && readers.length > 0 && (_jsx("span", { style: styles.namesText, children: readers.length === 1
                        ? `Read by ${readers[0].name}`
                        : `Read by ${readers.length}` }))] }));
    }
    if (variant === 'list') {
        if (readers.length === 0) {
            return (_jsx("div", { style: { ...styles.listContainer, padding: '12px', textAlign: 'center' }, children: _jsx("span", { style: { fontSize: '13px', color: 'var(--chatsdk-text-tertiary, #9ca3af)' }, children: "No one has read this message yet" }) }));
        }
        return (_jsx("div", { style: styles.listContainer, children: readers.map((reader) => (_jsxs("div", { style: styles.listItem, onClick: () => onUserClick?.(reader.id), children: [_jsx("div", { style: styles.listAvatar, children: reader.imageUrl ? (_jsx("img", { src: reader.imageUrl, alt: reader.name, style: styles.avatarImage })) : (getInitials(reader.name)) }), _jsxs("div", { style: styles.listInfo, children: [_jsx("div", { style: styles.listName, children: reader.name }), showTimestamp && (_jsx("div", { style: styles.listTime, children: formatTime(reader.readAt) }))] }), _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: styles.listCheck, children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })] }, reader.id))) }));
    }
    if (variant === 'tooltip') {
        return (_jsxs("div", { style: styles.container, onMouseEnter: () => setShowTooltip(true), onMouseLeave: () => setShowTooltip(false), children: [_jsxs("div", { style: styles.avatarGroup, children: [displayReaders.map((reader, i) => renderAvatar(reader, i)), remainingCount > 0 && (_jsxs("div", { style: styles.remainingBadge, children: ["+", remainingCount] }))] }), showTooltip && readers.length > 0 && (_jsxs("div", { style: styles.tooltip, children: [_jsxs("div", { style: styles.tooltipHeader, children: ["Read by ", readers.length] }), _jsxs("div", { style: styles.tooltipList, children: [readers.slice(0, 8).map((reader) => (_jsxs("div", { style: styles.tooltipItem, children: [_jsx("div", { style: styles.tooltipAvatar, children: reader.imageUrl ? (_jsx("img", { src: reader.imageUrl, alt: reader.name, style: styles.avatarImage })) : (getInitials(reader.name)) }), _jsx("span", { style: styles.tooltipName, children: reader.name }), _jsx("span", { style: styles.tooltipTime, children: formatTime(reader.readAt) })] }, reader.id))), readers.length > 8 && (_jsxs("div", { style: { fontSize: '11px', color: 'var(--chatsdk-text-tertiary, #9ca3af)', textAlign: 'center', paddingTop: '4px' }, children: ["and ", readers.length - 8, " more"] }))] })] }))] }));
    }
    // Default avatars variant
    if (readers.length === 0) {
        return (_jsx("div", { style: styles.container, children: renderCheckmarks() }));
    }
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.avatarGroup, children: [displayReaders.map((reader, i) => renderAvatar(reader, i)), remainingCount > 0 && (_jsxs("div", { style: styles.remainingBadge, children: ["+", remainingCount] }))] }), showNames && (_jsx("span", { style: styles.namesText, children: readers.length === 1 ? readers[0].name : `${readers.length} read` }))] }));
}
