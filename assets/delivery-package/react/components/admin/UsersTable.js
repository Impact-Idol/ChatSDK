import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { clsx } from 'clsx';
import { Avatar } from '../shared/Avatar';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
export const UsersTable = ({ users, totalUsers, currentPage, pageSize, onPageChange, onSearch, onFilter, onUserSelect, onBanUser, onDeleteUser, loading = false, }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const totalPages = Math.ceil(totalUsers / pageSize);
    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        onSearch?.(e.target.value);
    };
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUsers(users.map(u => u.id));
        }
        else {
            setSelectedUsers([]);
        }
    };
    const handleSelectUser = (userId) => {
        setSelectedUsers(prev => prev.includes(userId)
            ? prev.filter(id => id !== userId)
            : [...prev, userId]);
    };
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };
    const formatLastActive = (date) => {
        if (!date)
            return 'Never';
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
    const statusBadge = (status) => {
        switch (status) {
            case 'active':
                return _jsx(Badge, { variant: "success", size: "sm", children: "Active" });
            case 'inactive':
                return _jsx(Badge, { variant: "default", size: "sm", children: "Inactive" });
            case 'banned':
                return _jsx(Badge, { variant: "destructive", size: "sm", children: "Banned" });
        }
    };
    const roleBadge = (role) => {
        switch (role) {
            case 'admin':
                return _jsx(Badge, { variant: "primary", size: "sm", children: "Admin" });
            case 'moderator':
                return _jsx(Badge, { variant: "warning", size: "sm", children: "Moderator" });
            case 'member':
                return _jsx(Badge, { variant: "secondary", size: "sm", children: "Member" });
        }
    };
    return (_jsxs("div", { className: "chatsdk-users-table-container", children: [_jsxs("div", { className: "chatsdk-table-toolbar", children: [_jsx("div", { className: "chatsdk-table-search", children: _jsx(Input, { placeholder: "Search users...", value: searchQuery, onChange: handleSearch, leftIcon: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }) }) }), _jsxs("div", { className: "chatsdk-table-filters", children: [_jsxs("select", { className: "chatsdk-table-select", value: statusFilter, onChange: (e) => {
                                    setStatusFilter(e.target.value);
                                    onFilter?.(e.target.value, roleFilter);
                                }, children: [_jsx("option", { value: "all", children: "All Status" }), _jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "inactive", children: "Inactive" }), _jsx("option", { value: "banned", children: "Banned" })] }), _jsxs("select", { className: "chatsdk-table-select", value: roleFilter, onChange: (e) => {
                                    setRoleFilter(e.target.value);
                                    onFilter?.(statusFilter, e.target.value);
                                }, children: [_jsx("option", { value: "all", children: "All Roles" }), _jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "moderator", children: "Moderator" }), _jsx("option", { value: "member", children: "Member" })] }), _jsxs(Button, { variant: "primary", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), _jsx("line", { x1: "5", y1: "12", x2: "19", y2: "12" })] }), "Add User"] })] })] }), selectedUsers.length > 0 && (_jsxs("div", { className: "chatsdk-table-bulk-actions", children: [_jsxs("span", { children: [selectedUsers.length, " selected"] }), _jsx(Button, { variant: "ghost", size: "sm", children: "Export" }), _jsx(Button, { variant: "ghost", size: "sm", children: "Send Message" }), _jsx(Button, { variant: "destructive", size: "sm", children: "Ban Selected" })] })), _jsx("div", { className: "chatsdk-table-wrapper", children: _jsxs("table", { className: "chatsdk-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "chatsdk-table-checkbox", children: _jsx("input", { type: "checkbox", checked: selectedUsers.length === users.length && users.length > 0, onChange: handleSelectAll }) }), _jsx("th", { children: "User" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Role" }), _jsx("th", { children: "Messages" }), _jsx("th", { children: "Channels" }), _jsx("th", { children: "Last Active" }), _jsx("th", { children: "Joined" }), _jsx("th", {})] }) }), _jsx("tbody", { children: loading ? ([...Array(5)].map((_, i) => (_jsxs("tr", { className: "chatsdk-table-skeleton-row", children: [_jsx("td", { children: _jsx("div", { className: "chatsdk-skeleton", style: { width: 18, height: 18 } }) }), _jsx("td", { children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { className: "chatsdk-skeleton", style: { width: 40, height: 40, borderRadius: '50%' } }), _jsxs("div", { children: [_jsx("div", { className: "chatsdk-skeleton", style: { width: 120, height: 14, marginBottom: 4 } }), _jsx("div", { className: "chatsdk-skeleton", style: { width: 160, height: 12 } })] })] }) }), _jsx("td", { children: _jsx("div", { className: "chatsdk-skeleton", style: { width: 60, height: 20 } }) }), _jsx("td", { children: _jsx("div", { className: "chatsdk-skeleton", style: { width: 70, height: 20 } }) }), _jsx("td", { children: _jsx("div", { className: "chatsdk-skeleton", style: { width: 40, height: 14 } }) }), _jsx("td", { children: _jsx("div", { className: "chatsdk-skeleton", style: { width: 30, height: 14 } }) }), _jsx("td", { children: _jsx("div", { className: "chatsdk-skeleton", style: { width: 60, height: 14 } }) }), _jsx("td", { children: _jsx("div", { className: "chatsdk-skeleton", style: { width: 80, height: 14 } }) }), _jsx("td", { children: _jsx("div", { className: "chatsdk-skeleton", style: { width: 24, height: 24 } }) })] }, i)))) : users.length === 0 ? (_jsx("tr", { children: _jsxs("td", { colSpan: 9, className: "chatsdk-table-empty", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })] }), _jsx("h3", { children: "No users found" }), _jsx("p", { children: "Try adjusting your search or filters" })] }) })) : (users.map((user) => (_jsxs("tr", { className: clsx(selectedUsers.includes(user.id) && 'selected'), onClick: () => onUserSelect?.(user), children: [_jsx("td", { className: "chatsdk-table-checkbox", onClick: (e) => e.stopPropagation(), children: _jsx("input", { type: "checkbox", checked: selectedUsers.includes(user.id), onChange: () => handleSelectUser(user.id) }) }), _jsx("td", { children: _jsxs("div", { className: "chatsdk-table-user", children: [_jsx(Avatar, { src: user.image, name: user.name, size: "md" }), _jsxs("div", { className: "chatsdk-table-user-info", children: [_jsx("span", { className: "chatsdk-table-user-name", children: user.name }), _jsx("span", { className: "chatsdk-table-user-email", children: user.email })] })] }) }), _jsx("td", { children: statusBadge(user.status) }), _jsx("td", { children: roleBadge(user.role) }), _jsx("td", { className: "chatsdk-table-number", children: user.messageCount.toLocaleString() }), _jsx("td", { className: "chatsdk-table-number", children: user.channelCount }), _jsx("td", { className: "chatsdk-table-muted", children: formatLastActive(user.lastActive) }), _jsx("td", { className: "chatsdk-table-muted", children: formatDate(user.createdAt) }), _jsx("td", { className: "chatsdk-table-actions", onClick: (e) => e.stopPropagation(), children: _jsx("div", { className: "chatsdk-table-dropdown", children: _jsx("button", { className: "chatsdk-table-action-btn", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: [_jsx("circle", { cx: "12", cy: "5", r: "2" }), _jsx("circle", { cx: "12", cy: "12", r: "2" }), _jsx("circle", { cx: "12", cy: "19", r: "2" })] }) }) }) })] }, user.id)))) })] }) }), _jsxs("div", { className: "chatsdk-table-pagination", children: [_jsxs("span", { className: "chatsdk-table-pagination-info", children: ["Showing ", (currentPage - 1) * pageSize + 1, " to ", Math.min(currentPage * pageSize, totalUsers), " of ", totalUsers, " users"] }), _jsxs("div", { className: "chatsdk-table-pagination-controls", children: [_jsx("button", { className: "chatsdk-table-pagination-btn", disabled: currentPage === 1, onClick: () => onPageChange?.(currentPage - 1), children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }) }), [...Array(Math.min(5, totalPages))].map((_, i) => {
                                const page = i + 1;
                                return (_jsx("button", { className: clsx('chatsdk-table-pagination-btn', currentPage === page && 'active'), onClick: () => onPageChange?.(page), children: page }, page));
                            }), totalPages > 5 && _jsx("span", { className: "chatsdk-table-pagination-ellipsis", children: "..." }), _jsx("button", { className: "chatsdk-table-pagination-btn", disabled: currentPage === totalPages, onClick: () => onPageChange?.(currentPage + 1), children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "9 18 15 12 9 6" }) }) })] })] }), _jsx("style", { children: `
        .chatsdk-users-table-container {
          background: var(--chatsdk-background);
          border-radius: var(--chatsdk-radius-xl);
          border: 1px solid var(--chatsdk-border);
          overflow: hidden;
        }

        .chatsdk-table-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--chatsdk-space-4);
          border-bottom: 1px solid var(--chatsdk-border);
          gap: var(--chatsdk-space-4);
          flex-wrap: wrap;
        }

        .chatsdk-table-search {
          flex: 1;
          max-width: 320px;
        }

        .chatsdk-table-filters {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
        }

        .chatsdk-table-select {
          height: 40px;
          padding: 0 var(--chatsdk-space-3);
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-md);
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          cursor: pointer;
        }

        .chatsdk-table-bulk-actions {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-3) var(--chatsdk-space-4);
          background: var(--chatsdk-primary);
          color: white;
          font-size: var(--chatsdk-text-sm);
        }

        .chatsdk-table-bulk-actions button {
          color: white;
          border-color: rgba(255, 255, 255, 0.3);
        }

        .chatsdk-table-wrapper {
          overflow-x: auto;
        }

        .chatsdk-table {
          width: 100%;
          border-collapse: collapse;
        }

        .chatsdk-table th,
        .chatsdk-table td {
          padding: var(--chatsdk-space-3) var(--chatsdk-space-4);
          text-align: left;
          border-bottom: 1px solid var(--chatsdk-border);
        }

        .chatsdk-table th {
          font-size: var(--chatsdk-text-xs);
          font-weight: 600;
          color: var(--chatsdk-muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--chatsdk-background-subtle);
        }

        .chatsdk-table tbody tr {
          transition: background 0.15s ease;
          cursor: pointer;
        }

        .chatsdk-table tbody tr:hover {
          background: var(--chatsdk-muted);
        }

        .chatsdk-table tbody tr.selected {
          background: rgba(99, 102, 241, 0.05);
        }

        .chatsdk-table-checkbox {
          width: 40px;
        }

        .chatsdk-table-checkbox input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .chatsdk-table-user {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
        }

        .chatsdk-table-user-info {
          display: flex;
          flex-direction: column;
        }

        .chatsdk-table-user-name {
          font-weight: 500;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-table-user-email {
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-table-number {
          font-variant-numeric: tabular-nums;
        }

        .chatsdk-table-muted {
          color: var(--chatsdk-muted-foreground);
          font-size: var(--chatsdk-text-sm);
        }

        .chatsdk-table-actions {
          width: 48px;
        }

        .chatsdk-table-action-btn {
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

        .chatsdk-table-action-btn:hover {
          background: var(--chatsdk-secondary);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-table-action-btn svg {
          width: 18px;
          height: 18px;
        }

        .chatsdk-table-empty {
          text-align: center;
          padding: var(--chatsdk-space-12) !important;
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-table-empty svg {
          width: 48px;
          height: 48px;
          margin-bottom: var(--chatsdk-space-4);
          opacity: 0.5;
        }

        .chatsdk-table-empty h3 {
          margin: 0 0 var(--chatsdk-space-2);
          font-size: var(--chatsdk-text-lg);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-table-empty p {
          margin: 0;
          font-size: var(--chatsdk-text-sm);
        }

        .chatsdk-skeleton {
          background: linear-gradient(90deg, var(--chatsdk-muted) 25%, var(--chatsdk-border) 50%, var(--chatsdk-muted) 75%);
          background-size: 200% 100%;
          animation: chatsdk-shimmer 1.5s infinite;
          border-radius: var(--chatsdk-radius-sm);
        }

        @keyframes chatsdk-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .chatsdk-table-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--chatsdk-space-4);
          border-top: 1px solid var(--chatsdk-border);
        }

        .chatsdk-table-pagination-info {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-table-pagination-controls {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-1);
        }

        .chatsdk-table-pagination-btn {
          min-width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-md);
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chatsdk-table-pagination-btn:hover:not(:disabled) {
          background: var(--chatsdk-muted);
        }

        .chatsdk-table-pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chatsdk-table-pagination-btn.active {
          background: var(--chatsdk-primary);
          border-color: var(--chatsdk-primary);
          color: white;
        }

        .chatsdk-table-pagination-btn svg {
          width: 16px;
          height: 16px;
        }

        .chatsdk-table-pagination-ellipsis {
          padding: 0 var(--chatsdk-space-2);
          color: var(--chatsdk-muted-foreground);
        }
      ` })] }));
};
export default UsersTable;
