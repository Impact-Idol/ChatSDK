import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { clsx } from 'clsx';
export const Sidebar = ({ logo, appName = 'ChatSDK', items, activeId, onNavigate, user, onLogout, }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [expandedItems, setExpandedItems] = useState([]);
    const toggleExpand = (id) => {
        setExpandedItems((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    };
    return (_jsxs("aside", { className: clsx('chatsdk-admin-sidebar', collapsed && 'chatsdk-sidebar-collapsed'), children: [_jsxs("div", { className: "chatsdk-sidebar-header", children: [_jsxs("div", { className: "chatsdk-sidebar-logo", children: [logo || (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "chatsdk-default-logo", children: _jsx("path", { d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" }) })), !collapsed && _jsx("span", { className: "chatsdk-sidebar-app-name", children: appName })] }), _jsx("button", { className: "chatsdk-sidebar-toggle", onClick: () => setCollapsed(!collapsed), "aria-label": collapsed ? 'Expand sidebar' : 'Collapse sidebar', children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: collapsed ? (_jsx("polyline", { points: "9 18 15 12 9 6" })) : (_jsx("polyline", { points: "15 18 9 12 15 6" })) }) })] }), _jsx("nav", { className: "chatsdk-sidebar-nav", children: items.map((item) => (_jsxs("div", { className: "chatsdk-nav-group", children: [_jsxs("button", { className: clsx('chatsdk-nav-item', activeId === item.id && 'chatsdk-nav-item-active', item.children && 'chatsdk-nav-item-parent'), onClick: () => {
                                if (item.children) {
                                    toggleExpand(item.id);
                                }
                                else {
                                    onNavigate?.(item.id);
                                }
                            }, title: collapsed ? item.label : undefined, children: [_jsx("span", { className: "chatsdk-nav-icon", children: item.icon }), !collapsed && (_jsxs(_Fragment, { children: [_jsx("span", { className: "chatsdk-nav-label", children: item.label }), item.badge && (_jsx("span", { className: "chatsdk-nav-badge", children: item.badge })), item.children && (_jsx("svg", { className: clsx('chatsdk-nav-chevron', expandedItems.includes(item.id) && 'chatsdk-nav-chevron-open'), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "6 9 12 15 18 9" }) }))] }))] }), item.children && expandedItems.includes(item.id) && !collapsed && (_jsx("div", { className: "chatsdk-nav-children", children: item.children.map((child) => (_jsxs("button", { className: clsx('chatsdk-nav-item chatsdk-nav-item-child', activeId === child.id && 'chatsdk-nav-item-active'), onClick: () => onNavigate?.(child.id), children: [_jsx("span", { className: "chatsdk-nav-icon", children: child.icon }), _jsx("span", { className: "chatsdk-nav-label", children: child.label }), child.badge && (_jsx("span", { className: "chatsdk-nav-badge", children: child.badge }))] }, child.id))) }))] }, item.id))) }), user && (_jsxs("div", { className: "chatsdk-sidebar-user", children: [_jsx("div", { className: "chatsdk-user-avatar", children: user.avatar ? (_jsx("img", { src: user.avatar, alt: user.name })) : (_jsx("span", { children: user.name.charAt(0).toUpperCase() })) }), !collapsed && (_jsxs("div", { className: "chatsdk-user-info", children: [_jsx("span", { className: "chatsdk-user-name", children: user.name }), _jsx("span", { className: "chatsdk-user-email", children: user.email })] })), _jsx("button", { className: "chatsdk-logout-btn", onClick: onLogout, "aria-label": "Logout", title: "Logout", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), _jsx("polyline", { points: "16 17 21 12 16 7" }), _jsx("line", { x1: "21", y1: "12", x2: "9", y2: "12" })] }) })] })), _jsx("style", { children: `
        .chatsdk-admin-sidebar {
          width: 260px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--chatsdk-background);
          border-right: 1px solid var(--chatsdk-border);
          transition: width 0.2s ease;
        }

        .chatsdk-sidebar-collapsed {
          width: 72px;
        }

        .chatsdk-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--chatsdk-space-4);
          border-bottom: 1px solid var(--chatsdk-border);
        }

        .chatsdk-sidebar-logo {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
        }

        .chatsdk-default-logo {
          width: 32px;
          height: 32px;
          color: var(--chatsdk-primary);
        }

        .chatsdk-sidebar-app-name {
          font-size: var(--chatsdk-text-lg);
          font-weight: 700;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-sidebar-toggle {
          width: 28px;
          height: 28px;
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
          width: 16px;
          height: 16px;
        }

        .chatsdk-sidebar-collapsed .chatsdk-sidebar-toggle {
          margin: 0 auto;
        }

        .chatsdk-sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: var(--chatsdk-space-3);
        }

        .chatsdk-nav-group {
          margin-bottom: var(--chatsdk-space-1);
        }

        .chatsdk-nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-3);
          background: transparent;
          border: none;
          border-radius: var(--chatsdk-radius-lg);
          cursor: pointer;
          color: var(--chatsdk-muted-foreground);
          transition: all 0.15s ease;
          text-align: left;
        }

        .chatsdk-nav-item:hover {
          background: var(--chatsdk-muted);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-nav-item-active {
          background: rgba(99, 102, 241, 0.1);
          color: var(--chatsdk-primary);
        }

        .chatsdk-nav-item-active:hover {
          background: rgba(99, 102, 241, 0.15);
        }

        .chatsdk-sidebar-collapsed .chatsdk-nav-item {
          justify-content: center;
          padding: var(--chatsdk-space-3);
        }

        .chatsdk-nav-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .chatsdk-nav-icon svg {
          width: 20px;
          height: 20px;
        }

        .chatsdk-nav-label {
          flex: 1;
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chatsdk-nav-badge {
          padding: 2px 8px;
          background: var(--chatsdk-primary);
          color: white;
          font-size: 11px;
          font-weight: 600;
          border-radius: var(--chatsdk-radius-full);
        }

        .chatsdk-nav-chevron {
          width: 16px;
          height: 16px;
          transition: transform 0.2s ease;
        }

        .chatsdk-nav-chevron-open {
          transform: rotate(180deg);
        }

        .chatsdk-nav-children {
          padding-left: var(--chatsdk-space-6);
          margin-top: var(--chatsdk-space-1);
        }

        .chatsdk-nav-item-child {
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
        }

        .chatsdk-sidebar-user {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-4);
          border-top: 1px solid var(--chatsdk-border);
        }

        .chatsdk-sidebar-collapsed .chatsdk-sidebar-user {
          flex-direction: column;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-user-avatar {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-primary);
          color: white;
          font-weight: 600;
          border-radius: var(--chatsdk-radius-full);
          flex-shrink: 0;
          overflow: hidden;
        }

        .chatsdk-user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .chatsdk-user-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .chatsdk-user-name {
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          color: var(--chatsdk-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chatsdk-user-email {
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chatsdk-logout-btn {
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
          flex-shrink: 0;
        }

        .chatsdk-logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--chatsdk-destructive);
        }

        .chatsdk-logout-btn svg {
          width: 18px;
          height: 18px;
        }
      ` })] }));
};
export default Sidebar;
