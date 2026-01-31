import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function BlockedUsers({ blockedUsers, onUnblock, onBlock, onSearchUser, loading = false, }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [blockReason, setBlockReason] = useState('');
    const [searching, setSearching] = useState(false);
    const [confirmUnblock, setConfirmUnblock] = useState(null);
    const filteredUsers = blockedUsers.filter((user) => user.userName.toLowerCase().includes(searchQuery.toLowerCase()));
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
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
    const handleBlock = () => {
        if (selectedUser) {
            onBlock?.(selectedUser.id, blockReason || undefined);
            setShowBlockModal(false);
            setSelectedUser(null);
            setBlockReason('');
            setUserSearch('');
        }
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
        blockButton: {
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
        searchWrapper: {
            position: 'relative',
            marginBottom: '20px',
        },
        searchInput: {
            width: '100%',
            padding: '12px 16px',
            paddingLeft: '44px',
            borderRadius: '10px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            fontSize: '14px',
            color: 'var(--chatsdk-text-primary, #111827)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            outline: 'none',
            boxSizing: 'border-box',
        },
        searchIcon: {
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        list: {
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            overflow: 'hidden',
        },
        userItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        avatar: {
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 600,
            flexShrink: 0,
        },
        avatarImage: {
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
        },
        userInfo: {
            flex: 1,
        },
        userName: {
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '4px',
        },
        userMeta: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-tertiary, #9ca3af)',
        },
        reason: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            marginTop: '4px',
            fontStyle: 'italic',
        },
        unblockButton: {
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
        },
        confirmButtons: {
            display: 'flex',
            gap: '8px',
        },
        confirmYes: {
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--chatsdk-error-color, #ef4444)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
        },
        confirmNo: {
            padding: '8px 16px',
            borderRadius: '8px',
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
            width: '440px',
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
        selectedUserCard: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
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
        warning: {
            padding: '12px 16px',
            backgroundColor: 'var(--chatsdk-warning-light, #fef3c7)',
            borderRadius: '8px',
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
        },
        warningIcon: {
            color: 'var(--chatsdk-warning-color, #f59e0b)',
            flexShrink: 0,
        },
        warningText: {
            fontSize: '13px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            lineHeight: 1.5,
        },
    };
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.titleSection, children: [_jsx("h1", { style: styles.title, children: "Blocked Users" }), _jsx("p", { style: styles.subtitle, children: "Manage users you've blocked from contacting you" })] }), _jsxs("button", { style: styles.blockButton, onClick: () => setShowBlockModal(true), children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "4.93", y1: "4.93", x2: "19.07", y2: "19.07" })] }), "Block User"] })] }), _jsxs("div", { style: styles.searchWrapper, children: [_jsxs("svg", { style: styles.searchIcon, width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", style: styles.searchInput, placeholder: "Search blocked users...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) })] }), _jsx("div", { style: styles.list, children: filteredUsers.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "4.93", y1: "4.93", x2: "19.07", y2: "19.07" })] }) }), _jsx("div", { style: styles.emptyTitle, children: searchQuery ? 'No matching users' : 'No blocked users' }), _jsx("div", { style: styles.emptyText, children: searchQuery
                                ? 'Try a different search term'
                                : 'Users you block will appear here' })] })) : (filteredUsers.map((user) => (_jsxs("div", { style: styles.userItem, children: [_jsx("div", { style: styles.avatar, children: user.userImageUrl ? (_jsx("img", { src: user.userImageUrl, alt: user.userName, style: styles.avatarImage })) : (getInitials(user.userName)) }), _jsxs("div", { style: styles.userInfo, children: [_jsx("div", { style: styles.userName, children: user.userName }), _jsxs("div", { style: styles.userMeta, children: ["Blocked on ", formatDate(user.blockedAt)] }), user.reason && _jsxs("div", { style: styles.reason, children: ["\"", user.reason, "\""] })] }), confirmUnblock === user.userId ? (_jsxs("div", { style: styles.confirmButtons, children: [_jsx("button", { style: styles.confirmYes, onClick: () => {
                                        onUnblock?.(user.userId);
                                        setConfirmUnblock(null);
                                    }, children: "Unblock" }), _jsx("button", { style: styles.confirmNo, onClick: () => setConfirmUnblock(null), children: "Cancel" })] })) : (_jsx("button", { style: styles.unblockButton, onClick: () => setConfirmUnblock(user.userId), children: "Unblock" }))] }, user.id)))) }), showBlockModal && (_jsx("div", { style: styles.modal, onClick: () => setShowBlockModal(false), children: _jsxs("div", { style: styles.modalContent, onClick: (e) => e.stopPropagation(), children: [_jsx("div", { style: styles.modalHeader, children: _jsx("h2", { style: styles.modalTitle, children: "Block User" }) }), _jsxs("div", { style: styles.modalBody, children: [_jsxs("div", { style: styles.warning, children: [_jsxs("svg", { style: styles.warningIcon, width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }), _jsx("div", { style: styles.warningText, children: "Blocked users won't be able to send you messages, add you to channels, or see your online status." })] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "User to block" }), _jsxs("div", { style: { position: 'relative' }, children: [_jsx("input", { type: "text", style: styles.input, placeholder: "Search for a user...", value: userSearch, onChange: (e) => handleUserSearch(e.target.value) }), userResults.length > 0 && (_jsx("div", { style: styles.userSearchResults, children: userResults.map((user) => (_jsxs("div", { style: styles.userSearchItem, onClick: () => {
                                                            setSelectedUser(user);
                                                            setUserSearch('');
                                                            setUserResults([]);
                                                        }, children: [_jsx("div", { style: { ...styles.avatar, width: '32px', height: '32px', fontSize: '12px' }, children: user.imageUrl ? (_jsx("img", { src: user.imageUrl, alt: user.name, style: styles.avatarImage })) : (getInitials(user.name)) }), _jsx("span", { children: user.name })] }, user.id))) }))] }), selectedUser && (_jsxs("div", { style: styles.selectedUserCard, children: [_jsx("div", { style: { ...styles.avatar, width: '32px', height: '32px', fontSize: '12px' }, children: selectedUser.imageUrl ? (_jsx("img", { src: selectedUser.imageUrl, alt: selectedUser.name, style: styles.avatarImage })) : (getInitials(selectedUser.name)) }), _jsx("span", { style: { fontWeight: 500 }, children: selectedUser.name }), _jsx("button", { style: styles.removeUser, onClick: () => setSelectedUser(null), children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }))] }), _jsxs("div", { style: styles.formGroup, children: [_jsx("label", { style: styles.label, children: "Reason (optional)" }), _jsx("textarea", { style: styles.textarea, placeholder: "Why are you blocking this user?", value: blockReason, onChange: (e) => setBlockReason(e.target.value) })] })] }), _jsxs("div", { style: styles.modalFooter, children: [_jsx("button", { style: { ...styles.button, ...styles.buttonSecondary }, onClick: () => {
                                        setShowBlockModal(false);
                                        setSelectedUser(null);
                                        setBlockReason('');
                                    }, children: "Cancel" }), _jsx("button", { style: { ...styles.button, ...styles.buttonPrimary }, onClick: handleBlock, disabled: !selectedUser, children: "Block User" })] })] }) }))] }));
}
