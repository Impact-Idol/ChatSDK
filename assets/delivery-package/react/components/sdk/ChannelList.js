import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { clsx } from 'clsx';
import { Avatar } from '../shared/Avatar';
const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    else if (days === 1) {
        return 'Yesterday';
    }
    else if (days < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
    }
    else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
};
const ChannelItem = ({ channel, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (_jsxs("div", { className: clsx('chatsdk-channel-item', isActive && 'chatsdk-channel-item-active', channel.unreadCount > 0 && 'chatsdk-channel-item-unread'), onClick: onClick, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), role: "button", tabIndex: 0, onKeyDown: (e) => e.key === 'Enter' && onClick(), children: [_jsx("div", { className: "chatsdk-channel-avatar-wrapper", children: _jsx(Avatar, { src: channel.image, name: channel.name, size: "md", presence: channel.isOnline ? 'online' : undefined }) }), _jsxs("div", { className: "chatsdk-channel-content", children: [_jsxs("div", { className: "chatsdk-channel-header", children: [_jsx("span", { className: "chatsdk-channel-name", children: channel.name }), channel.lastMessage && (_jsx("span", { className: "chatsdk-channel-time", children: formatTime(channel.lastMessage.timestamp) }))] }), _jsxs("div", { className: "chatsdk-channel-preview", children: [channel.lastMessage ? (_jsxs("span", { className: "chatsdk-channel-message", children: [channel.type !== 'messaging' && (_jsxs("span", { className: "chatsdk-channel-sender", children: [channel.lastMessage.user, ": "] })), channel.lastMessage.text] })) : (_jsx("span", { className: "chatsdk-channel-empty", children: "No messages yet" })), _jsxs("div", { className: "chatsdk-channel-indicators", children: [channel.isMuted && (_jsxs("svg", { className: "chatsdk-channel-muted-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M11 5L6 9H2v6h4l5 4V5z" }), _jsx("line", { x1: "23", y1: "9", x2: "17", y2: "15" }), _jsx("line", { x1: "17", y1: "9", x2: "23", y2: "15" })] })), channel.unreadCount > 0 && (_jsx("span", { className: "chatsdk-channel-badge", children: channel.unreadCount > 99 ? '99+' : channel.unreadCount }))] })] })] }), isHovered && (_jsx("div", { className: "chatsdk-channel-actions", children: _jsx("button", { className: "chatsdk-channel-action-btn", "aria-label": "More options", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: [_jsx("circle", { cx: "12", cy: "5", r: "2" }), _jsx("circle", { cx: "12", cy: "12", r: "2" }), _jsx("circle", { cx: "12", cy: "19", r: "2" })] }) }) }))] }));
};
export const ChannelList = ({ channels, activeChannelId, onChannelSelect, loading, searchQuery = '', onSearchChange, }) => {
    const pinnedChannels = channels.filter((c) => c.isPinned);
    const regularChannels = channels.filter((c) => !c.isPinned);
    return (_jsxs("div", { className: "chatsdk-channel-list", children: [_jsxs("div", { className: "chatsdk-channel-search", children: [_jsxs("div", { className: "chatsdk-channel-search-input-wrapper", children: [_jsxs("svg", { className: "chatsdk-search-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", className: "chatsdk-channel-search-input", placeholder: "Search conversations...", value: searchQuery, onChange: (e) => onSearchChange?.(e.target.value) })] }), _jsx("button", { className: "chatsdk-new-chat-btn", "aria-label": "New conversation", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M12 5v14M5 12h14" }) }) })] }), loading && (_jsx("div", { className: "chatsdk-channel-loading", children: [...Array(5)].map((_, i) => (_jsxs("div", { className: "chatsdk-channel-skeleton", children: [_jsx("div", { className: "chatsdk-skeleton-avatar" }), _jsxs("div", { className: "chatsdk-skeleton-content", children: [_jsx("div", { className: "chatsdk-skeleton-line chatsdk-skeleton-name" }), _jsx("div", { className: "chatsdk-skeleton-line chatsdk-skeleton-message" })] })] }, i))) })), !loading && (_jsxs("div", { className: "chatsdk-channel-scroll", children: [pinnedChannels.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "chatsdk-channel-section-header", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "chatsdk-pin-icon", children: _jsx("path", { d: "M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" }) }), "Pinned"] }), pinnedChannels.map((channel) => (_jsx(ChannelItem, { channel: channel, isActive: channel.id === activeChannelId, onClick: () => onChannelSelect?.(channel) }, channel.id)))] })), regularChannels.length > 0 && (_jsxs(_Fragment, { children: [pinnedChannels.length > 0 && (_jsx("div", { className: "chatsdk-channel-section-header", children: "All Messages" })), regularChannels.map((channel) => (_jsx(ChannelItem, { channel: channel, isActive: channel.id === activeChannelId, onClick: () => onChannelSelect?.(channel) }, channel.id)))] })), channels.length === 0 && (_jsxs("div", { className: "chatsdk-channel-empty-state", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", className: "chatsdk-empty-icon", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" }) }), _jsx("h3", { children: "No conversations yet" }), _jsx("p", { children: "Start a new conversation to get chatting" })] }))] })), _jsx("style", { children: `
        .chatsdk-channel-list {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--chatsdk-background);
          border-right: 1px solid var(--chatsdk-border);
          width: 320px;
          min-width: 280px;
        }

        .chatsdk-channel-search {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-4);
          border-bottom: 1px solid var(--chatsdk-border);
        }

        .chatsdk-channel-search-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          background: var(--chatsdk-muted);
          border-radius: var(--chatsdk-radius-lg);
          padding: 0 var(--chatsdk-space-3);
          transition: all var(--chatsdk-transition-fast);
        }

        .chatsdk-channel-search-input-wrapper:focus-within {
          background: var(--chatsdk-background);
          box-shadow: 0 0 0 2px var(--chatsdk-primary);
        }

        .chatsdk-search-icon {
          width: 18px;
          height: 18px;
          color: var(--chatsdk-muted-foreground);
          flex-shrink: 0;
        }

        .chatsdk-channel-search-input {
          flex: 1;
          height: 40px;
          border: none;
          background: transparent;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          outline: none;
        }

        .chatsdk-channel-search-input::placeholder {
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-new-chat-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-primary);
          color: var(--chatsdk-primary-foreground);
          border: none;
          border-radius: var(--chatsdk-radius-lg);
          cursor: pointer;
          transition: all var(--chatsdk-transition-fast);
        }

        .chatsdk-new-chat-btn:hover {
          background: var(--chatsdk-primary-hover);
          transform: scale(1.05);
        }

        .chatsdk-new-chat-btn svg {
          width: 20px;
          height: 20px;
        }

        .chatsdk-channel-scroll {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .chatsdk-channel-section-header {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-2) var(--chatsdk-space-4);
          font-size: var(--chatsdk-text-xs);
          font-weight: 600;
          color: var(--chatsdk-muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chatsdk-pin-icon {
          width: 12px;
          height: 12px;
        }

        .chatsdk-channel-item {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-3) var(--chatsdk-space-4);
          cursor: pointer;
          transition: all var(--chatsdk-transition-fast);
          position: relative;
        }

        .chatsdk-channel-item:hover {
          background: var(--chatsdk-muted);
        }

        .chatsdk-channel-item-active {
          background: var(--chatsdk-accent);
        }

        .chatsdk-channel-item-active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 24px;
          background: var(--chatsdk-primary);
          border-radius: 0 2px 2px 0;
        }

        .chatsdk-channel-avatar-wrapper {
          flex-shrink: 0;
        }

        .chatsdk-channel-content {
          flex: 1;
          min-width: 0;
        }

        .chatsdk-channel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--chatsdk-space-2);
          margin-bottom: 2px;
        }

        .chatsdk-channel-name {
          font-weight: 500;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chatsdk-channel-item-unread .chatsdk-channel-name {
          font-weight: 600;
        }

        .chatsdk-channel-time {
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
          flex-shrink: 0;
        }

        .chatsdk-channel-item-unread .chatsdk-channel-time {
          color: var(--chatsdk-primary);
        }

        .chatsdk-channel-preview {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-channel-message {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .chatsdk-channel-item-unread .chatsdk-channel-message {
          color: var(--chatsdk-foreground);
        }

        .chatsdk-channel-sender {
          font-weight: 500;
        }

        .chatsdk-channel-empty {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
          font-style: italic;
        }

        .chatsdk-channel-indicators {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          flex-shrink: 0;
        }

        .chatsdk-channel-muted-icon {
          width: 14px;
          height: 14px;
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-channel-badge {
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-primary);
          color: var(--chatsdk-primary-foreground);
          font-size: 11px;
          font-weight: 600;
          border-radius: var(--chatsdk-radius-full);
        }

        .chatsdk-channel-actions {
          position: absolute;
          right: var(--chatsdk-space-3);
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          animation: chatsdk-fade-in 0.15s ease forwards;
        }

        @keyframes chatsdk-fade-in {
          to { opacity: 1; }
        }

        .chatsdk-channel-action-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-md);
          cursor: pointer;
          color: var(--chatsdk-muted-foreground);
          transition: all var(--chatsdk-transition-fast);
        }

        .chatsdk-channel-action-btn:hover {
          background: var(--chatsdk-muted);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-channel-action-btn svg {
          width: 16px;
          height: 16px;
        }

        /* Loading Skeleton */
        .chatsdk-channel-loading {
          padding: var(--chatsdk-space-2);
        }

        .chatsdk-channel-skeleton {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-3) var(--chatsdk-space-4);
        }

        .chatsdk-skeleton-avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--chatsdk-radius-full);
          background: linear-gradient(90deg, var(--chatsdk-muted) 25%, var(--chatsdk-border) 50%, var(--chatsdk-muted) 75%);
          background-size: 200% 100%;
          animation: chatsdk-shimmer 1.5s infinite;
        }

        .chatsdk-skeleton-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-skeleton-line {
          height: 12px;
          border-radius: var(--chatsdk-radius-sm);
          background: linear-gradient(90deg, var(--chatsdk-muted) 25%, var(--chatsdk-border) 50%, var(--chatsdk-muted) 75%);
          background-size: 200% 100%;
          animation: chatsdk-shimmer 1.5s infinite;
        }

        .chatsdk-skeleton-name { width: 60%; }
        .chatsdk-skeleton-message { width: 85%; }

        @keyframes chatsdk-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Empty State */
        .chatsdk-channel-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--chatsdk-space-8);
          text-align: center;
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-empty-icon {
          width: 64px;
          height: 64px;
          margin-bottom: var(--chatsdk-space-4);
          opacity: 0.5;
        }

        .chatsdk-channel-empty-state h3 {
          font-size: var(--chatsdk-text-lg);
          font-weight: 600;
          color: var(--chatsdk-foreground);
          margin-bottom: var(--chatsdk-space-2);
        }

        .chatsdk-channel-empty-state p {
          font-size: var(--chatsdk-text-sm);
        }
      ` })] }));
};
export default ChannelList;
