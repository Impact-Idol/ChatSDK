import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function BanManager({ bans, onBanUser, onUnban, onSearchUser, loading = false, }) {
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newBan, setNewBan] = useState({
        userId: '',
        userName: '',
        reason: '',
        type: 'ban',
        channelId: '',
        duration: 0,
    });
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const filteredBans = bans.filter((ban) => {
        const matchesTab = activeTab === 'all' || ban.type === activeTab;
        const matchesSearch = ban.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ban.reason.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });
    const getTypeLabel = (type) => {
        switch (type) {
            case 'ban':
                return 'Banned';
            case 'mute':
                return 'Muted';
            case 'shadow_ban':
                return 'Shadow Banned';
            default:
                return type;
        }
    };
    const getTypeColor = (type) => {
        switch (type) {
            case 'ban':
                return { bg: 'var(--chatsdk-error-light, #fee2e2)', text: 'var(--chatsdk-error-color, #ef4444)' };
            case 'mute':
                return { bg: 'var(--chatsdk-warning-light, #fef3c7)', text: 'var(--chatsdk-warning-color, #f59e0b)' };
            case 'shadow_ban':
                return { bg: 'var(--chatsdk-bg-tertiary, #e5e7eb)', text: 'var(--chatsdk-text-secondary, #6b7280)' };
            default:
                return { bg: 'var(--chatsdk-bg-tertiary, #e5e7eb)', text: 'var(--chatsdk-text-secondary, #6b7280)' };
        }
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const getInitials = (name) => {
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };
    const handleUserSearch = async (query) => {
        setUserSearch(query);
        if (query.length < 2) {
            setUserResults([]);
            return;
        }
        setSearching(true);
        try {
            const results = await onSearchUser?.(query);
            setUserResults(results || []);
        }
        catch {
            setUserResults([]);
        }
        finally {
            setSearching(false);
        }
    };
    const handleSubmitBan = () => {
        onBanUser?.({
            userId: newBan.userId,
            reason: newBan.reason,
            type: newBan.type,
            channelId: newBan.channelId || undefined,
            duration: newBan.duration || undefined,
        });
        setShowAddModal(false);
        setNewBan({
            userId: '',
            userName: '',
            reason: '',
            type: 'ban',
            channelId: '',
            duration: 0,
        });
    };
    const styles = {
        container: {
            padding: '24px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            minHeight: '100vh',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
        },
        titleSection: {},
        title: {
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
            marginBottom: '4px',
        },
        subtitle: {
            fontSize: '14px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            margin: 0,
        },
        addButton: {
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--chatsdk-error-color, #ef4444)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        controls: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
        },
        tabs: {
            display: 'flex',
            gap: '4px',
            padding: '4px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            borderRadius: '10px',
        },
        tab: {
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
        },
        tabActive: {
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            color: 'var(--chatsdk-text-primary, #111827)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
        searchInput: {
            padding: '10px 16px',
            paddingLeft: '40px',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            fontSize: '14px',
            color: 'var(--chatsdk-text-primary, #111827)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            outline: 'none',
            width: '280px',
        },
        searchWrapper: {
            position: 'relative',
        },
        searchIcon: {
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        th: {
            textAlign: 'left',
            padding: '14px 16px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        td: {
            padding: '16px',
            fontSize: '14px',
            color: 'var(--chatsdk-text-primary, #111827)',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        userCell: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        avatar: {
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            flexShrink: 0,
        },
        avatarImage: {
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
        },
        userName: {
            fontWeight: 500,
        },
        userId: {
            fontSize: '12px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        badge: {
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
        },
        reason: {
            maxWidth: '300px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        unbanButton: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
        },
        emptyState: {
            padding: '60px 24px',
            textAlign: 'center',
        },
        emptyIcon: {
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            margin: '0 auto 16px',
        },
        emptyTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '4px',
        },
        emptyText: {
            fontSize: '14px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        modal: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        },
        modalContent: {
            width: '480px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        },
        modalHeader: {
            padding: '20px 24px',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        modalTitle: {
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
        },
        modalBody: {
            padding: '24px',
        },
        formGroup: {
            marginBottom: '20px',
        },
        label: {
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '8px',
        },
        input: {
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            fontSize: '14px',
            color: 'var(--chatsdk-text-primary, #111827)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            outline: 'none',
            boxSizing: 'border-box',
        },
        textarea: {
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            fontSize: '14px',
            color: 'var(--chatsdk-text-primary, #111827)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            outline: 'none',
            minHeight: '80px',
            resize: 'vertical',
            boxSizing: 'border-box',
        },
        select: {
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            fontSize: '14px',
            color: 'var(--chatsdk-text-primary, #111827)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            outline: 'none',
            cursor: 'pointer',
        },
        userSearchResults: {
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
            maxHeight: '200px',
            overflowY: 'auto',
        },
        userSearchItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
        },
        selectedUser: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            borderRadius: '8px',
            marginTop: '8px',
        },
        removeUser: {
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
            cursor: 'pointer',
            padding: '4px',
        },
        modalFooter: {
            padding: '16px 24px',
            borderTop: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
        },
        button: {
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
        },
        buttonPrimary: {
            backgroundColor: 'var(--chatsdk-error-color, #ef4444)',
            color: '#ffffff',
        },
        buttonSecondary: {
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
    };
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.titleSection, children: [_jsx("h1", { style: styles.title, children: "Ban Manager" }), _jsx("p", { style: styles.subtitle, children: "Manage banned, muted, and shadow banned users" })] }), _jsxs("button", { style: styles.addButton, onClick: () => setShowAddModal(true), children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "16" }), _jsx("line", { x1: "8", y1: "12", x2: "16", y2: "12" })] }), "Add Ban"] })] }), _jsxs("div", { style: styles.controls, children: [_jsx("div", { style: styles.tabs, children: ['all', 'ban', 'mute', 'shadow_ban'].map((tab) => (_jsxs("button", { style: { ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }, onClick: () => setActiveTab(tab), children: [tab === 'all' ? 'All' : getTypeLabel(tab), tab !== 'all' && (_jsxs("span", { style: { marginLeft: '6px', opacity: 0.7 }, children: ["(", bans.filter((b) => b.type === tab).length, ")"] }))] }, tab))) }), _jsxs("div", { style: styles.searchWrapper, children: [_jsxs("svg", { style: styles.searchIcon, width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", style: styles.searchInput, placeholder: "Search users or reasons...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) })] })] }), _jsxs("table", { style: styles.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: styles.th, children: "User" }), _jsx("th", { style: styles.th, children: "Type" }), _jsx("th", { style: styles.th, children: "Reason" }), _jsx("th", { style: styles.th, children: "Channel" }), _jsx("th", { style: styles.th, children: "Expires" }), _jsx("th", { style: styles.th, children: "Banned By" }), _jsx("th", { style: styles.th, children: "Date" }), _jsx("th", { style: styles.th })] }) }), _jsx("tbody", { children: filteredBans.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, children: _jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "4.93", y1: "4.93", x2: "19.07", y2: "19.07" })] }) }), _jsx("div", { style: styles.emptyTitle, children: "No bans found" }), _jsx("div", { style: styles.emptyText, children: searchQuery ? 'Try a different search term' : 'No users have been banned yet' })] }) }) })) : (filteredBans.map((ban) => {
                            const typeColor = getTypeColor(ban.type);
                            return (_jsxs("tr", { children: [_jsx("td", { style: styles.td, children: _jsxs("div", { style: styles.userCell, children: [_jsx("div", { style: styles.avatar, children: ban.userImageUrl ? (_jsx("img", { src: ban.userImageUrl, alt: ban.userName, style: styles.avatarImage })) : (getInitials(ban.userName)) }), _jsxs("div", { children: [_jsx("div", { style: styles.userName, children: ban.userName }), _jsx("div", { style: styles.userId, children: ban.userId })] })] }) }), _jsx("td", { style: styles.td, children: _jsx("span", { style: {
                                                ...styles.badge,
                                                backgroundColor: typeColor.bg,
                                                color: typeColor.text,
                                            }, children: getTypeLabel(ban.type) }) }), _jsx("td", { style: styles.td, children: _jsx("div", { style: styles.reason, title: ban.reason, children: ban.reason }) }), _jsx("td", { style: styles.td, children: ban.channelName ? (_jsxs("span", { style: { color: 'var(--chatsdk-text-secondary, #6b7280)' }, children: ["#", ban.channelName] })) : (_jsx("span", { style: { color: 'var(--chatsdk-text-tertiary, #9ca3af)' }, children: "Global" })) }), _jsx("td", { style: styles.td, children: ban.expiresAt ? (formatDate(ban.expiresAt)) : (_jsx("span", { style: { color: 'var(--chatsdk-text-tertiary, #9ca3af)' }, children: "Never" })) }), _jsx("td", { style: styles.td, children: ban.createdByName }), _jsx("td", { style: styles.td, children: formatDate(ban.createdAt) }), _jsx("td", { style: styles.td, children: _jsx("button", { style: styles.unbanButton, onClick: () => onUnban?.(ban.id), children: "Remove" }) })] }, ban.id));
                        })) })] }), showAddModal && (_jsx("div", { style: styles.modal, onClick: () => setShowAddModal(false), children: _jsxs("div", { style: styles.modalContent, onClick: (e) => e.stopPropagation(), children: [_jsx("div", { style: styles.modalHeader, children: _jsx("h2", { style: styles.modalTitle, children: "Add Ban" }) }), _jsxs("div", { style: styles.modalBody, children: [_jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "User" }), _jsxs("div", { style: { position: 'relative' }, children: [_jsx("input", { type: "text", style: styles.input, placeholder: "Search for a user...", value: userSearch, onChange: (e) => handleUserSearch(e.target.value) }), userResults.length > 0 && (_jsx("div", { style: styles.userSearchResults, children: userResults.map((user) => (_jsxs("div", { style: styles.userSearchItem, onClick: () => {
                                                            setNewBan({ ...newBan, userId: user.id, userName: user.name });
                                                            setUserSearch('');
                                                            setUserResults([]);
                                                        }, children: [_jsx("div", { style: { ...styles.avatar, width: '28px', height: '28px', fontSize: '10px' }, children: user.imageUrl ? (_jsx("img", { src: user.imageUrl, alt: user.name, style: styles.avatarImage })) : (getInitials(user.name)) }), _jsx("span", { children: user.name })] }, user.id))) }))] }), newBan.userId && (_jsxs("div", { style: styles.selectedUser, children: [_jsx("div", { style: { ...styles.avatar, width: '24px', height: '24px', fontSize: '9px' }, children: getInitials(newBan.userName) }), _jsx("span", { children: newBan.userName }), _jsx("button", { style: styles.removeUser, onClick: () => setNewBan({ ...newBan, userId: '', userName: '' }), children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }))] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Type" }), _jsxs("select", { style: styles.select, value: newBan.type, onChange: (e) => setNewBan({ ...newBan, type: e.target.value }), children: [_jsx("option", { value: "ban", children: "Ban - User cannot access chat" }), _jsx("option", { value: "mute", children: "Mute - User cannot send messages" }), _jsx("option", { value: "shadow_ban", children: "Shadow Ban - Messages only visible to user" })] })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Reason" }), _jsx("textarea", { style: styles.textarea, placeholder: "Enter the reason for this action...", value: newBan.reason, onChange: (e) => setNewBan({ ...newBan, reason: e.target.value }) })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Duration (hours, 0 = permanent)" }), _jsx("input", { type: "number", style: styles.input, placeholder: "0", value: newBan.duration || '', onChange: (e) => setNewBan({ ...newBan, duration: parseInt(e.target.value) || 0 }) })] })] }), _jsxs("div", { style: styles.modalFooter, children: [_jsx("button", { style: { ...styles.button, ...styles.buttonSecondary }, onClick: () => setShowAddModal(false), children: "Cancel" }), _jsx("button", { style: { ...styles.button, ...styles.buttonPrimary }, onClick: handleSubmitBan, disabled: !newBan.userId || !newBan.reason, children: "Add Ban" })] })] }) }))] }));
}
