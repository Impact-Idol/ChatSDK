import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
export function MentionList({ items, loading = false, searchQuery = '', selectedIndex = 0, onSelect, onClose, position, maxHeight = 300, showHeader = true, }) {
    const [activeIndex, setActiveIndex] = useState(selectedIndex);
    const containerRef = useRef(null);
    const itemRefs = useRef([]);
    useEffect(() => {
        setActiveIndex(selectedIndex);
    }, [selectedIndex]);
    useEffect(() => {
        if (itemRefs.current[activeIndex]) {
            itemRefs.current[activeIndex]?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [activeIndex]);
    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setActiveIndex((prev) => (prev + 1) % items.length);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
                    break;
                case 'Enter':
                case 'Tab':
                    e.preventDefault();
                    if (items[activeIndex]) {
                        onSelect?.(items[activeIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose?.();
                    break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex, items, onSelect, onClose]);
    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };
    const highlightMatch = (text, query) => {
        if (!query)
            return text;
        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => regex.test(part) ? (_jsx("strong", { style: { color: 'var(--chatsdk-accent-color, #6366f1)' }, children: part }, i)) : (part));
    };
    const groupedItems = items.reduce((acc, item) => {
        const type = item.type;
        if (!acc[type])
            acc[type] = [];
        acc[type].push(item);
        return acc;
    }, {});
    const styles = {
        container: {
            position: position ? 'absolute' : 'relative',
            top: position?.top,
            left: position?.left,
            width: '280px',
            maxHeight: `${maxHeight}px`,
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            overflow: 'hidden',
            zIndex: 100,
        },
        header: {
            padding: '10px 14px',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
        },
        headerText: {
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
        content: {
            overflowY: 'auto',
            maxHeight: `${maxHeight - 40}px`,
        },
        section: {
            padding: '6px 0',
        },
        sectionTitle: {
            padding: '6px 14px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
        item: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            cursor: 'pointer',
            transition: 'background-color 0.1s ease',
        },
        itemActive: {
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
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
            position: 'relative',
        },
        avatarImage: {
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
        },
        onlineIndicator: {
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-success-color, #10b981)',
            border: '2px solid var(--chatsdk-bg-primary, #ffffff)',
        },
        channelIcon: {
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            flexShrink: 0,
        },
        commandIcon: {
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'var(--chatsdk-accent-light, #eef2ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--chatsdk-accent-color, #6366f1)',
            flexShrink: 0,
        },
        info: {
            flex: 1,
            minWidth: 0,
        },
        name: {
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-primary, #111827)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        username: {
            fontSize: '12px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        meta: {
            fontSize: '12px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        roleBadge: {
            fontSize: '10px',
            fontWeight: 500,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
        },
        loading: {
            padding: '20px',
            textAlign: 'center',
        },
        loadingDots: {
            display: 'flex',
            justifyContent: 'center',
            gap: '4px',
        },
        loadingDot: {
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-text-tertiary, #9ca3af)',
            animation: 'pulse 1.5s ease-in-out infinite',
        },
        empty: {
            padding: '24px',
            textAlign: 'center',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            fontSize: '13px',
        },
    };
    let flatIndex = -1;
    const renderUserItem = (item, index) => {
        if (item.type !== 'user')
            return null;
        const { data } = item;
        flatIndex++;
        const currentIndex = flatIndex;
        return (_jsxs("div", { ref: (el) => { itemRefs.current[currentIndex] = el; }, style: {
                ...styles.item,
                ...(currentIndex === activeIndex ? styles.itemActive : {}),
            }, onClick: () => onSelect?.(item), onMouseEnter: () => setActiveIndex(currentIndex), children: [_jsxs("div", { style: styles.avatar, children: [data.imageUrl ? (_jsx("img", { src: data.imageUrl, alt: data.name, style: styles.avatarImage })) : (getInitials(data.name)), data.online && _jsx("div", { style: styles.onlineIndicator })] }), _jsxs("div", { style: styles.info, children: [_jsx("div", { style: styles.name, children: highlightMatch(data.name, searchQuery) }), data.username && (_jsxs("div", { style: styles.username, children: ["@", highlightMatch(data.username, searchQuery)] }))] }), data.role && (_jsx("span", { style: styles.roleBadge, children: data.role }))] }, `user-${data.id}`));
    };
    const renderChannelItem = (item) => {
        if (item.type !== 'channel')
            return null;
        const { data } = item;
        flatIndex++;
        const currentIndex = flatIndex;
        return (_jsxs("div", { ref: (el) => { itemRefs.current[currentIndex] = el; }, style: {
                ...styles.item,
                ...(currentIndex === activeIndex ? styles.itemActive : {}),
            }, onClick: () => onSelect?.(item), onMouseEnter: () => setActiveIndex(currentIndex), children: [_jsx("div", { style: styles.channelIcon, children: data.type === 'private' ? (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }), _jsx("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })] })) : (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "4", y1: "9", x2: "20", y2: "9" }), _jsx("line", { x1: "4", y1: "15", x2: "20", y2: "15" }), _jsx("line", { x1: "10", y1: "3", x2: "8", y2: "21" }), _jsx("line", { x1: "16", y1: "3", x2: "14", y2: "21" })] })) }), _jsxs("div", { style: styles.info, children: [_jsxs("div", { style: styles.name, children: ["#", highlightMatch(data.name, searchQuery)] }), data.memberCount !== undefined && (_jsxs("div", { style: styles.meta, children: [data.memberCount, " members"] }))] })] }, `channel-${data.id}`));
    };
    const renderCommandItem = (item) => {
        if (item.type !== 'command')
            return null;
        const { data } = item;
        flatIndex++;
        const currentIndex = flatIndex;
        return (_jsxs("div", { ref: (el) => { itemRefs.current[currentIndex] = el; }, style: {
                ...styles.item,
                ...(currentIndex === activeIndex ? styles.itemActive : {}),
            }, onClick: () => onSelect?.(item), onMouseEnter: () => setActiveIndex(currentIndex), children: [_jsx("div", { style: styles.commandIcon, children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "4 17 10 11 4 5" }), _jsx("line", { x1: "12", y1: "19", x2: "20", y2: "19" })] }) }), _jsxs("div", { style: styles.info, children: [_jsxs("div", { style: styles.name, children: ["/", highlightMatch(data.name, searchQuery), data.args && (_jsxs("span", { style: { color: 'var(--chatsdk-text-tertiary, #9ca3af)', fontWeight: 400 }, children: [' ', data.args] }))] }), _jsx("div", { style: styles.meta, children: data.description })] })] }, `command-${data.name}`));
    };
    if (loading) {
        return (_jsx("div", { ref: containerRef, style: styles.container, children: _jsx("div", { style: styles.loading, children: _jsx("div", { style: styles.loadingDots, children: [0, 1, 2].map((i) => (_jsx("div", { style: { ...styles.loadingDot, animationDelay: `${i * 0.2}s` } }, i))) }) }) }));
    }
    if (items.length === 0) {
        return (_jsx("div", { ref: containerRef, style: styles.container, children: _jsx("div", { style: styles.empty, children: "No results found" }) }));
    }
    return (_jsxs("div", { ref: containerRef, style: styles.container, children: [showHeader && (_jsx("div", { style: styles.header, children: _jsx("span", { style: styles.headerText, children: searchQuery ? `Results for "${searchQuery}"` : 'Suggestions' }) })), _jsxs("div", { style: styles.content, children: [groupedItems.user && groupedItems.user.length > 0 && (_jsxs("div", { style: styles.section, children: [Object.keys(groupedItems).length > 1 && (_jsx("div", { style: styles.sectionTitle, children: "People" })), groupedItems.user.map((item, i) => renderUserItem(item, i))] })), groupedItems.channel && groupedItems.channel.length > 0 && (_jsxs("div", { style: styles.section, children: [Object.keys(groupedItems).length > 1 && (_jsx("div", { style: styles.sectionTitle, children: "Channels" })), groupedItems.channel.map(renderChannelItem)] })), groupedItems.command && groupedItems.command.length > 0 && (_jsxs("div", { style: styles.section, children: [Object.keys(groupedItems).length > 1 && (_jsx("div", { style: styles.sectionTitle, children: "Commands" })), groupedItems.command.map(renderCommandItem)] }))] })] }));
}
