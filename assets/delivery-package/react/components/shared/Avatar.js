import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
const sizeClasses = {
    xs: 'chatsdk-avatar-xs',
    sm: 'chatsdk-avatar-sm',
    md: 'chatsdk-avatar-md',
    lg: 'chatsdk-avatar-lg',
    xl: 'chatsdk-avatar-xl',
};
const presenceColors = {
    online: 'var(--chatsdk-online)',
    offline: 'var(--chatsdk-offline)',
    busy: 'var(--chatsdk-busy)',
    away: 'var(--chatsdk-away)',
};
function getInitials(name) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
        '#f43f5e', '#f97316', '#eab308', '#84cc16',
        '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
    ];
    return colors[Math.abs(hash) % colors.length];
}
export const Avatar = ({ src, alt, name = '', size = 'md', presence, className, }) => {
    const initials = getInitials(name || alt || '?');
    const bgColor = stringToColor(name || alt || 'default');
    return (_jsxs("div", { className: clsx('chatsdk-avatar', sizeClasses[size], className), children: [src ? (_jsx("img", { src: src, alt: alt || name, className: "chatsdk-avatar-image" })) : (_jsx("div", { className: "chatsdk-avatar-fallback", style: { backgroundColor: bgColor }, children: initials })), presence && (_jsx("div", { className: "chatsdk-avatar-presence", style: { backgroundColor: presenceColors[presence] } })), _jsx("style", { children: `
        .chatsdk-avatar {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: var(--chatsdk-radius-full);
          overflow: visible;
        }
        .chatsdk-avatar-xs { width: 24px; height: 24px; font-size: 10px; }
        .chatsdk-avatar-sm { width: 32px; height: 32px; font-size: 12px; }
        .chatsdk-avatar-md { width: 40px; height: 40px; font-size: 14px; }
        .chatsdk-avatar-lg { width: 48px; height: 48px; font-size: 16px; }
        .chatsdk-avatar-xl { width: 64px; height: 64px; font-size: 20px; }
        .chatsdk-avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: var(--chatsdk-radius-full);
        }
        .chatsdk-avatar-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 500;
          border-radius: var(--chatsdk-radius-full);
        }
        .chatsdk-avatar-presence {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 25%;
          height: 25%;
          min-width: 8px;
          min-height: 8px;
          border-radius: var(--chatsdk-radius-full);
          border: 2px solid var(--chatsdk-background);
        }
      ` })] }));
};
export default Avatar;
