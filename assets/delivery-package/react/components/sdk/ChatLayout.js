import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { clsx } from 'clsx';
import { ChannelList } from './ChannelList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Thread } from './Thread';
import { Avatar } from '../shared/Avatar';
export const ChatLayout = ({ channels, activeChannel, messages, currentUser, onChannelSelect, onSendMessage, onReaction, typingUsers = [], threadMessage, threadReplies = [], onOpenThread, onCloseThread, onSendThreadReply, }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    return (_jsxs("div", { className: "chatsdk-chat-layout", children: [_jsx("div", { className: clsx('chatsdk-sidebar', sidebarCollapsed && 'chatsdk-sidebar-collapsed'), children: _jsx(ChannelList, { channels: channels, activeChannelId: activeChannel?.id, onChannelSelect: onChannelSelect }) }), _jsx("div", { className: "chatsdk-main", children: activeChannel ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "chatsdk-channel-header", children: [_jsx("button", { className: "chatsdk-sidebar-toggle", onClick: () => setSidebarCollapsed(!sidebarCollapsed), "aria-label": sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar', children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }), _jsx("line", { x1: "9", y1: "3", x2: "9", y2: "21" })] }) }), _jsxs("div", { className: "chatsdk-header-info", children: [_jsx(Avatar, { src: activeChannel.image, name: activeChannel.name, size: "md", presence: activeChannel.isOnline ? 'online' : undefined }), _jsxs("div", { className: "chatsdk-header-details", children: [_jsx("h2", { className: "chatsdk-header-name", children: activeChannel.name }), _jsx("p", { className: "chatsdk-header-status", children: activeChannel.type === 'messaging'
                                                        ? activeChannel.isOnline
                                                            ? 'Online'
                                                            : 'Offline'
                                                        : `${activeChannel.members?.length || 0} members` })] })] }), _jsxs("div", { className: "chatsdk-header-actions", children: [_jsx("button", { className: "chatsdk-header-action", "aria-label": "Voice call", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" }) }) }), _jsx("button", { className: "chatsdk-header-action", "aria-label": "Video call", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polygon", { points: "23 7 16 12 23 17 23 7" }), _jsx("rect", { x: "1", y: "5", width: "15", height: "14", rx: "2", ry: "2" })] }) }), _jsx("button", { className: "chatsdk-header-action", "aria-label": "Search", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }) }), _jsx("button", { className: "chatsdk-header-action", "aria-label": "More options", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: [_jsx("circle", { cx: "12", cy: "5", r: "2" }), _jsx("circle", { cx: "12", cy: "12", r: "2" }), _jsx("circle", { cx: "12", cy: "19", r: "2" })] }) })] })] }), _jsx(MessageList, { messages: messages, currentUserId: currentUser.id, onReaction: onReaction, onReply: onOpenThread, typingUsers: typingUsers }), _jsx(MessageInput, { onSend: onSendMessage })] })) : (_jsxs("div", { className: "chatsdk-empty-channel", children: [_jsx("div", { className: "chatsdk-empty-icon", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" }) }) }), _jsx("h2", { children: "Select a conversation" }), _jsx("p", { children: "Choose a chat from the sidebar to start messaging" })] })) }), threadMessage && (_jsx(Thread, { parentMessage: threadMessage, replies: threadReplies, currentUserId: currentUser.id, onClose: onCloseThread, onSend: onSendThreadReply, onReaction: onReaction, typingUsers: typingUsers })), _jsx("style", { children: `
        .chatsdk-chat-layout {
          display: flex;
          height: 100%;
          background: var(--chatsdk-background);
        }

        .chatsdk-sidebar {
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .chatsdk-sidebar-collapsed {
          margin-left: -320px;
        }

        .chatsdk-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .chatsdk-channel-header {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-3) var(--chatsdk-space-4);
          border-bottom: 1px solid var(--chatsdk-border);
          background: var(--chatsdk-background);
        }

        .chatsdk-sidebar-toggle {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--chatsdk-radius-md);
          cursor: pointer;
          color: var(--chatsdk-muted-foreground);
          transition: all 0.15s ease;
        }

        .chatsdk-sidebar-toggle:hover {
          background: var(--chatsdk-muted);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-sidebar-toggle svg {
          width: 20px;
          height: 20px;
        }

        .chatsdk-header-info {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          flex: 1;
          min-width: 0;
        }

        .chatsdk-header-details {
          min-width: 0;
        }

        .chatsdk-header-name {
          margin: 0;
          font-size: var(--chatsdk-text-base);
          font-weight: 600;
          color: var(--chatsdk-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chatsdk-header-status {
          margin: 0;
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-header-actions {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-1);
        }

        .chatsdk-header-action {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--chatsdk-radius-md);
          cursor: pointer;
          color: var(--chatsdk-muted-foreground);
          transition: all 0.15s ease;
        }

        .chatsdk-header-action:hover {
          background: var(--chatsdk-muted);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-header-action svg {
          width: 20px;
          height: 20px;
        }

        .chatsdk-empty-channel {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--chatsdk-space-8);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-empty-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-muted);
          border-radius: var(--chatsdk-radius-full);
          margin-bottom: var(--chatsdk-space-4);
        }

        .chatsdk-empty-icon svg {
          width: 40px;
          height: 40px;
          opacity: 0.5;
        }

        .chatsdk-empty-channel h2 {
          margin: 0 0 var(--chatsdk-space-2);
          font-size: var(--chatsdk-text-xl);
          font-weight: 600;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-empty-channel p {
          margin: 0;
          font-size: var(--chatsdk-text-sm);
        }
      ` })] }));
};
export default ChatLayout;
