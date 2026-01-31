import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { clsx } from 'clsx';
import { Avatar } from '../shared/Avatar';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
export const UserProfile = ({ user, isOwnProfile = false, isMuted = false, isBlocked = false, sharedChannels = [], sharedMedia = [], onMessage, onCall, onVideoCall, onMute, onBlock, onEdit, onClose, }) => {
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };
    const formatLastSeen = (date) => {
        const diff = Date.now() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1)
            return 'Just now';
        if (minutes < 60)
            return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7)
            return `${days}d ago`;
        return formatDate(date);
    };
    return (_jsxs("div", { className: "chatsdk-user-profile", children: [_jsx("div", { className: "chatsdk-profile-header", children: _jsx("button", { className: "chatsdk-profile-close", onClick: onClose, "aria-label": "Close", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }) }), _jsxs("div", { className: "chatsdk-profile-hero", children: [_jsxs("div", { className: "chatsdk-profile-avatar-wrapper", children: [_jsx(Avatar, { src: user.image, name: user.name, size: "xl", presence: user.status }), user.verified && (_jsx("div", { className: "chatsdk-profile-verified", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }) }))] }), _jsx("h2", { className: "chatsdk-profile-name", children: user.name }), user.username && (_jsxs("span", { className: "chatsdk-profile-username", children: ["@", user.username] })), _jsxs("div", { className: "chatsdk-profile-status", children: [user.status === 'online' ? (_jsx(Badge, { variant: "success", size: "sm", children: "Online" })) : user.lastSeen ? (_jsxs("span", { className: "chatsdk-profile-lastseen", children: ["Last seen ", formatLastSeen(user.lastSeen)] })) : null, user.role && _jsx(Badge, { variant: "secondary", size: "sm", children: user.role })] })] }), _jsx("div", { className: "chatsdk-profile-actions", children: isOwnProfile ? (_jsxs(Button, { variant: "primary", onClick: onEdit, className: "chatsdk-profile-action-btn", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] }), "Edit Profile"] })) : (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "primary", onClick: onMessage, className: "chatsdk-profile-action-btn", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" }) }), "Message"] }), _jsx(Button, { variant: "secondary", onClick: onCall, size: "icon", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" }) }) }), _jsx(Button, { variant: "secondary", onClick: onVideoCall, size: "icon", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polygon", { points: "23 7 16 12 23 17 23 7" }), _jsx("rect", { x: "1", y: "5", width: "15", height: "14", rx: "2", ry: "2" })] }) })] })) }), user.bio && (_jsxs("div", { className: "chatsdk-profile-section", children: [_jsx("h3", { className: "chatsdk-profile-section-title", children: "About" }), _jsx("p", { className: "chatsdk-profile-bio", children: user.bio })] })), _jsxs("div", { className: "chatsdk-profile-section", children: [_jsx("h3", { className: "chatsdk-profile-section-title", children: "Info" }), _jsxs("div", { className: "chatsdk-profile-info-list", children: [user.email && (_jsxs("div", { className: "chatsdk-profile-info-item", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }), _jsx("polyline", { points: "22,6 12,13 2,6" })] }), _jsx("span", { children: user.email })] })), user.phone && (_jsxs("div", { className: "chatsdk-profile-info-item", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" }) }), _jsx("span", { children: user.phone })] })), user.location && (_jsxs("div", { className: "chatsdk-profile-info-item", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" }), _jsx("circle", { cx: "12", cy: "10", r: "3" })] }), _jsx("span", { children: user.location })] })), user.timezone && (_jsxs("div", { className: "chatsdk-profile-info-item", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }), _jsx("span", { children: user.timezone })] })), user.joinedAt && (_jsxs("div", { className: "chatsdk-profile-info-item", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }), _jsx("line", { x1: "16", y1: "2", x2: "16", y2: "6" }), _jsx("line", { x1: "8", y1: "2", x2: "8", y2: "6" }), _jsx("line", { x1: "3", y1: "10", x2: "21", y2: "10" })] }), _jsxs("span", { children: ["Joined ", formatDate(user.joinedAt)] })] }))] })] }), sharedChannels.length > 0 && (_jsxs("div", { className: "chatsdk-profile-section", children: [_jsxs("h3", { className: "chatsdk-profile-section-title", children: ["Shared Channels", _jsx("span", { className: "chatsdk-profile-count", children: sharedChannels.length })] }), _jsxs("div", { className: "chatsdk-profile-channels", children: [sharedChannels.slice(0, 5).map((channel) => (_jsxs("div", { className: "chatsdk-profile-channel", children: [_jsx(Avatar, { src: channel.image, name: channel.name, size: "sm" }), _jsx("span", { children: channel.name })] }, channel.id))), sharedChannels.length > 5 && (_jsxs("button", { className: "chatsdk-profile-show-more", children: ["+", sharedChannels.length - 5, " more"] }))] })] })), sharedMedia.length > 0 && (_jsxs("div", { className: "chatsdk-profile-section", children: [_jsxs("h3", { className: "chatsdk-profile-section-title", children: ["Shared Media", _jsx("span", { className: "chatsdk-profile-count", children: sharedMedia.length })] }), _jsx("div", { className: "chatsdk-profile-media-grid", children: sharedMedia.slice(0, 6).map((media, i) => (_jsxs("div", { className: "chatsdk-profile-media-item", children: [_jsx("img", { src: media.thumbnail || media.url, alt: "" }), media.type === 'video' && (_jsx("div", { className: "chatsdk-profile-media-overlay", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("polygon", { points: "5 3 19 12 5 21 5 3" }) }) }))] }, i))) }), sharedMedia.length > 6 && (_jsx("button", { className: "chatsdk-profile-show-more", children: "View all media" }))] })), !isOwnProfile && (_jsxs("div", { className: "chatsdk-profile-section chatsdk-profile-danger", children: [_jsxs("button", { className: clsx('chatsdk-profile-danger-btn', isMuted && 'active'), onClick: onMute, children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M11 5L6 9H2v6h4l5 4V5z" }), isMuted ? (_jsxs(_Fragment, { children: [_jsx("line", { x1: "23", y1: "9", x2: "17", y2: "15" }), _jsx("line", { x1: "17", y1: "9", x2: "23", y2: "15" })] })) : (_jsx(_Fragment, { children: _jsx("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" }) }))] }), isMuted ? 'Unmute' : 'Mute'] }), _jsxs("button", { className: clsx('chatsdk-profile-danger-btn chatsdk-profile-block-btn', isBlocked && 'active'), onClick: onBlock, children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "4.93", y1: "4.93", x2: "19.07", y2: "19.07" })] }), isBlocked ? 'Unblock' : 'Block'] })] })), _jsx("style", { children: `
        .chatsdk-user-profile {
          width: 360px;
          max-height: 100vh;
          overflow-y: auto;
          background: var(--chatsdk-background);
          border-left: 1px solid var(--chatsdk-border);
          display: flex;
          flex-direction: column;
        }

        .chatsdk-profile-header {
          display: flex;
          justify-content: flex-end;
          padding: var(--chatsdk-space-3);
          position: sticky;
          top: 0;
          background: var(--chatsdk-background);
          z-index: 10;
        }

        .chatsdk-profile-close {
          width: 32px;
          height: 32px;
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

        .chatsdk-profile-close:hover {
          background: var(--chatsdk-muted);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-profile-close svg {
          width: 18px;
          height: 18px;
        }

        .chatsdk-profile-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 var(--chatsdk-space-6) var(--chatsdk-space-6);
          text-align: center;
        }

        .chatsdk-profile-avatar-wrapper {
          position: relative;
          margin-bottom: var(--chatsdk-space-4);
        }

        .chatsdk-profile-verified {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          background: var(--chatsdk-primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid var(--chatsdk-background);
        }

        .chatsdk-profile-verified svg {
          width: 14px;
          height: 14px;
        }

        .chatsdk-profile-name {
          margin: 0;
          font-size: var(--chatsdk-text-xl);
          font-weight: 600;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-profile-username {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
          margin-top: var(--chatsdk-space-1);
        }

        .chatsdk-profile-status {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          margin-top: var(--chatsdk-space-2);
        }

        .chatsdk-profile-lastseen {
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-profile-actions {
          display: flex;
          justify-content: center;
          gap: var(--chatsdk-space-2);
          padding: 0 var(--chatsdk-space-6) var(--chatsdk-space-4);
        }

        .chatsdk-profile-action-btn {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-profile-action-btn svg {
          width: 18px;
          height: 18px;
        }

        .chatsdk-profile-section {
          padding: var(--chatsdk-space-4) var(--chatsdk-space-6);
          border-top: 1px solid var(--chatsdk-border);
        }

        .chatsdk-profile-section-title {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          margin: 0 0 var(--chatsdk-space-3);
          font-size: var(--chatsdk-text-sm);
          font-weight: 600;
          color: var(--chatsdk-muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chatsdk-profile-count {
          background: var(--chatsdk-muted);
          padding: 2px 8px;
          border-radius: var(--chatsdk-radius-full);
          font-size: var(--chatsdk-text-xs);
          font-weight: 500;
          text-transform: none;
          letter-spacing: normal;
        }

        .chatsdk-profile-bio {
          margin: 0;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          line-height: 1.6;
        }

        .chatsdk-profile-info-list {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-3);
        }

        .chatsdk-profile-info-item {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-profile-info-item svg {
          width: 18px;
          height: 18px;
          color: var(--chatsdk-muted-foreground);
          flex-shrink: 0;
        }

        .chatsdk-profile-channels {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-profile-channel {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-2);
          border-radius: var(--chatsdk-radius-lg);
          transition: background 0.15s ease;
          cursor: pointer;
        }

        .chatsdk-profile-channel:hover {
          background: var(--chatsdk-muted);
        }

        .chatsdk-profile-channel span {
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
        }

        .chatsdk-profile-show-more {
          background: none;
          border: none;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-primary);
          cursor: pointer;
          padding: var(--chatsdk-space-2) 0;
        }

        .chatsdk-profile-show-more:hover {
          text-decoration: underline;
        }

        .chatsdk-profile-media-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-profile-media-item {
          aspect-ratio: 1;
          border-radius: var(--chatsdk-radius-lg);
          overflow: hidden;
          position: relative;
          cursor: pointer;
        }

        .chatsdk-profile-media-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .chatsdk-profile-media-item:hover img {
          transform: scale(1.05);
        }

        .chatsdk-profile-media-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          color: white;
        }

        .chatsdk-profile-media-overlay svg {
          width: 24px;
          height: 24px;
        }

        .chatsdk-profile-danger {
          display: flex;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-profile-danger-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-3);
          background: var(--chatsdk-muted);
          border: none;
          border-radius: var(--chatsdk-radius-lg);
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          color: var(--chatsdk-muted-foreground);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chatsdk-profile-danger-btn:hover {
          background: var(--chatsdk-secondary-hover);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-profile-danger-btn.active {
          background: var(--chatsdk-primary);
          color: white;
        }

        .chatsdk-profile-block-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--chatsdk-destructive);
        }

        .chatsdk-profile-block-btn.active {
          background: var(--chatsdk-destructive);
          color: white;
        }

        .chatsdk-profile-danger-btn svg {
          width: 18px;
          height: 18px;
        }
      ` })] }));
};
export default UserProfile;
