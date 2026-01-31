import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import clsx from 'clsx';
// =============================================================================
// ICONS
// =============================================================================
const SearchIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("path", { d: "m21 21-4.35-4.35" })] }));
const UsersIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })] }));
const UserPlusIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("line", { x1: "19", x2: "19", y1: "8", y2: "14" }), _jsx("line", { x1: "22", x2: "16", y1: "11", y2: "11" })] }));
const MoreVerticalIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "1" }), _jsx("circle", { cx: "12", cy: "5", r: "1" }), _jsx("circle", { cx: "12", cy: "19", r: "1" })] }));
const MessageSquareIcon = () => (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }));
const CrownIcon = () => (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" }) }));
const ShieldIcon = () => (_jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" }) }));
const UserXIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("line", { x1: "17", x2: "22", y1: "8", y2: "13" }), _jsx("line", { x1: "22", x2: "17", y1: "8", y2: "13" })] }));
const VolumeXIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }), _jsx("line", { x1: "22", x2: "16", y1: "9", y2: "15" }), _jsx("line", { x1: "16", x2: "22", y1: "9", y2: "15" })] }));
const BanIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "m4.9 4.9 14.2 14.2" })] }));
const UserCogIcon = () => (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "18", cy: "15", r: "3" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M10 15H6a4 4 0 0 0-4 4v2" }), _jsx("path", { d: "m21.7 16.4-.9-.3" }), _jsx("path", { d: "m15.2 13.9-.9-.3" }), _jsx("path", { d: "m16.6 18.7.3-.9" }), _jsx("path", { d: "m19.1 12.2.3-.9" }), _jsx("path", { d: "m19.6 18.7-.4-1" }), _jsx("path", { d: "m16.8 12.3-.4-1" }), _jsx("path", { d: "m14.3 16.6 1-.4" }), _jsx("path", { d: "m20.7 13.8 1-.4" })] }));
const XIcon = () => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }));
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const getRoleLabel = (role) => {
    const labels = {
        owner: 'Owner',
        admin: 'Admin',
        moderator: 'Moderator',
        member: 'Member',
        guest: 'Guest',
    };
    return labels[role];
};
const getRoleColor = (role) => {
    switch (role) {
        case 'owner': return '#f59e0b';
        case 'admin': return '#8b5cf6';
        case 'moderator': return '#3b82f6';
        case 'member': return 'var(--chatsdk-text-tertiary)';
        case 'guest': return 'var(--chatsdk-text-tertiary)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
const getRoleIcon = (role) => {
    switch (role) {
        case 'owner': return _jsx(CrownIcon, {});
        case 'admin':
        case 'moderator': return _jsx(ShieldIcon, {});
        default: return null;
    }
};
const getPresenceColor = (presence) => {
    switch (presence) {
        case 'online': return 'var(--chatsdk-success)';
        case 'away': return 'var(--chatsdk-warning)';
        case 'busy': return 'var(--chatsdk-error)';
        case 'offline': return 'var(--chatsdk-text-tertiary)';
        default: return 'var(--chatsdk-text-tertiary)';
    }
};
const getPresenceLabel = (presence) => {
    switch (presence) {
        case 'online': return 'Online';
        case 'away': return 'Away';
        case 'busy': return 'Do not disturb';
        case 'offline': return 'Offline';
        default: return 'Unknown';
    }
};
const formatLastActive = (dateString) => {
    if (!dateString)
        return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
};
// =============================================================================
// STYLES
// =============================================================================
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '12px',
        border: '1px solid var(--chatsdk-border-light)',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
        gap: '12px',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    headerIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--chatsdk-text-secondary)',
    },
    title: {
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        margin: 0,
    },
    memberCount: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-tertiary)',
        fontWeight: 500,
    },
    inviteButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        backgroundColor: 'var(--chatsdk-primary)',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    searchContainer: {
        padding: '12px 16px',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    searchWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--chatsdk-border-light)',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        background: 'none',
        fontSize: '14px',
        color: 'var(--chatsdk-text-primary)',
        outline: 'none',
    },
    searchIcon: {
        color: 'var(--chatsdk-text-tertiary)',
        flexShrink: 0,
    },
    membersList: {
        flex: 1,
        overflowY: 'auto',
    },
    roleSection: {
        padding: '0',
    },
    roleSectionHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: 'var(--chatsdk-bg-secondary)',
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        position: 'sticky',
        top: 0,
        zIndex: 5,
    },
    roleIcon: {
        display: 'flex',
        alignItems: 'center',
    },
    roleCount: {
        marginLeft: 'auto',
        fontWeight: 500,
    },
    memberItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 20px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
    memberItemHover: {
        backgroundColor: 'var(--chatsdk-bg-secondary)',
    },
    memberAvatar: {
        position: 'relative',
        flexShrink: 0,
    },
    avatar: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        objectFit: 'cover',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
    },
    avatarFallback: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-secondary)',
    },
    presenceIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        border: '2px solid var(--chatsdk-bg-primary)',
    },
    memberInfo: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    memberNameRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    memberName: {
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    youBadge: {
        padding: '1px 5px',
        backgroundColor: 'var(--chatsdk-primary-light)',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--chatsdk-primary)',
        textTransform: 'uppercase',
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 500,
        textTransform: 'uppercase',
    },
    memberStatus: {
        fontSize: '12px',
        color: 'var(--chatsdk-text-tertiary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    memberActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        opacity: 0,
        transition: 'opacity 0.15s ease',
    },
    memberActionsVisible: {
        opacity: 1,
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        border: 'none',
        borderRadius: '6px',
        color: 'var(--chatsdk-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    moreButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '6px',
        color: 'var(--chatsdk-text-tertiary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    dropdown: {
        position: 'absolute',
        right: '20px',
        top: '100%',
        marginTop: '4px',
        backgroundColor: 'var(--chatsdk-bg-primary)',
        borderRadius: '8px',
        border: '1px solid var(--chatsdk-border-light)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        minWidth: '180px',
        zIndex: 100,
        overflow: 'hidden',
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '10px 14px',
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--chatsdk-text-primary)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.15s ease',
    },
    dropdownItemDanger: {
        color: 'var(--chatsdk-error)',
    },
    dropdownDivider: {
        height: '1px',
        backgroundColor: 'var(--chatsdk-border-light)',
        margin: '4px 0',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
    },
    emptyIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '50%',
        marginBottom: '12px',
        color: 'var(--chatsdk-text-tertiary)',
    },
    emptyTitle: {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--chatsdk-text-primary)',
        marginBottom: '4px',
    },
    emptyDescription: {
        fontSize: '13px',
        color: 'var(--chatsdk-text-tertiary)',
        maxWidth: '240px',
    },
    skeleton: {
        backgroundColor: 'var(--chatsdk-bg-tertiary)',
        borderRadius: '4px',
        animation: 'pulse 1.5s ease-in-out infinite',
    },
    onlineSection: {
        borderBottom: '1px solid var(--chatsdk-border-light)',
    },
};
// =============================================================================
// COMPONENT
// =============================================================================
export const MemberList = ({ members, channelName, loading = false, currentUserId, canManageMembers = false, onMemberClick, onInviteClick, onRemoveMember, onChangeMemberRole, onMuteMember, onBanMember, onMessageMember, className, }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredMember, setHoveredMember] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const filteredMembers = useMemo(() => {
        return members.filter(member => member.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [members, searchQuery]);
    const groupedMembers = useMemo(() => {
        const online = filteredMembers.filter(m => m.presence !== 'offline');
        const offline = filteredMembers.filter(m => m.presence === 'offline');
        // Sort by role priority then by name
        const sortByRole = (a, b) => {
            const roleOrder = {
                owner: 0,
                admin: 1,
                moderator: 2,
                member: 3,
                guest: 4,
            };
            if (roleOrder[a.role] !== roleOrder[b.role]) {
                return roleOrder[a.role] - roleOrder[b.role];
            }
            return a.name.localeCompare(b.name);
        };
        return {
            online: online.sort(sortByRole),
            offline: offline.sort(sortByRole),
        };
    }, [filteredMembers]);
    const handleMemberClick = (member, e) => {
        if (e.target.closest('button'))
            return;
        onMemberClick?.(member);
    };
    const renderMemberItem = (member) => {
        const isHovered = hoveredMember === member.id;
        const isCurrentUser = member.id === currentUserId;
        return (_jsxs("div", { style: {
                ...styles.memberItem,
                ...(isHovered ? styles.memberItemHover : {}),
                position: 'relative',
            }, onMouseEnter: () => setHoveredMember(member.id), onMouseLeave: () => setHoveredMember(null), onClick: (e) => handleMemberClick(member, e), children: [_jsxs("div", { style: styles.memberAvatar, children: [member.imageUrl ? (_jsx("img", { src: member.imageUrl, alt: "", style: styles.avatar })) : (_jsx("div", { style: styles.avatarFallback, children: member.name.charAt(0).toUpperCase() })), _jsx("div", { style: {
                                ...styles.presenceIndicator,
                                backgroundColor: getPresenceColor(member.presence),
                            } })] }), _jsxs("div", { style: styles.memberInfo, children: [_jsxs("div", { style: styles.memberNameRow, children: [_jsx("span", { style: styles.memberName, children: member.name }), isCurrentUser && (_jsx("span", { style: styles.youBadge, children: "You" })), member.isMuted && (_jsx("span", { style: {
                                        ...styles.statusBadge,
                                        backgroundColor: 'var(--chatsdk-warning)',
                                        color: 'white',
                                    }, children: "Muted" })), member.isBanned && (_jsx("span", { style: {
                                        ...styles.statusBadge,
                                        backgroundColor: 'var(--chatsdk-error)',
                                        color: 'white',
                                    }, children: "Banned" }))] }), _jsxs("span", { style: styles.memberStatus, children: [member.customStatus || getPresenceLabel(member.presence), member.presence === 'offline' && member.lastActiveAt && (_jsxs(_Fragment, { children: [" \u2022 Last seen ", formatLastActive(member.lastActiveAt)] }))] })] }), _jsxs("div", { style: {
                        ...styles.memberActions,
                        ...(isHovered ? styles.memberActionsVisible : {}),
                    }, children: [!isCurrentUser && (_jsx("button", { style: styles.actionButton, onClick: (e) => {
                                e.stopPropagation();
                                onMessageMember?.(member);
                            }, title: "Send message", children: _jsx(MessageSquareIcon, {}) })), (canManageMembers || isHovered) && !isCurrentUser && (_jsx("button", { style: {
                                ...styles.moreButton,
                                backgroundColor: openMenuId === member.id ? 'var(--chatsdk-bg-tertiary)' : undefined,
                            }, onClick: (e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === member.id ? null : member.id);
                            }, children: _jsx(MoreVerticalIcon, {}) }))] }), openMenuId === member.id && canManageMembers && (_jsxs("div", { style: styles.dropdown, children: [_jsxs("button", { style: styles.dropdownItem, onClick: (e) => {
                                e.stopPropagation();
                                onChangeMemberRole?.(member, 'admin');
                                setOpenMenuId(null);
                            }, children: [_jsx(UserCogIcon, {}), "Change Role"] }), _jsxs("button", { style: styles.dropdownItem, onClick: (e) => {
                                e.stopPropagation();
                                onMuteMember?.(member);
                                setOpenMenuId(null);
                            }, children: [_jsx(VolumeXIcon, {}), member.isMuted ? 'Unmute' : 'Mute', " Member"] }), _jsx("div", { style: styles.dropdownDivider }), _jsxs("button", { style: styles.dropdownItem, onClick: (e) => {
                                e.stopPropagation();
                                onRemoveMember?.(member);
                                setOpenMenuId(null);
                            }, children: [_jsx(UserXIcon, {}), "Remove from Channel"] }), _jsxs("button", { style: { ...styles.dropdownItem, ...styles.dropdownItemDanger }, onClick: (e) => {
                                e.stopPropagation();
                                onBanMember?.(member);
                                setOpenMenuId(null);
                            }, children: [_jsx(BanIcon, {}), "Ban User"] })] }))] }, member.id));
    };
    const renderSkeletonItem = (index) => (_jsxs("div", { style: styles.memberItem, children: [_jsx("div", { style: { ...styles.skeleton, width: 36, height: 36, borderRadius: '50%' } }), _jsxs("div", { style: styles.memberInfo, children: [_jsx("div", { style: { ...styles.skeleton, width: 100, height: 14, marginBottom: 6 } }), _jsx("div", { style: { ...styles.skeleton, width: 60, height: 12 } })] })] }, `skeleton-${index}`));
    return (_jsxs("div", { style: styles.container, className: clsx('chatsdk-member-list', className), children: [_jsxs("div", { style: styles.header, children: [_jsxs("div", { style: styles.headerLeft, children: [_jsx("div", { style: styles.headerIcon, children: _jsx(UsersIcon, {}) }), _jsx("h3", { style: styles.title, children: "Members" }), _jsx("span", { style: styles.memberCount, children: members.length })] }), canManageMembers && (_jsx("button", { style: styles.inviteButton, onClick: onInviteClick, title: "Invite members", children: _jsx(UserPlusIcon, {}) }))] }), _jsx("div", { style: styles.searchContainer, children: _jsxs("div", { style: styles.searchWrapper, children: [_jsx("div", { style: styles.searchIcon, children: _jsx(SearchIcon, {}) }), _jsx("input", { type: "text", placeholder: "Search members...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), style: styles.searchInput }), searchQuery && (_jsx("button", { style: { ...styles.moreButton, width: 20, height: 20 }, onClick: () => setSearchQuery(''), children: _jsx(XIcon, {}) }))] }) }), _jsx("div", { style: styles.membersList, children: loading ? (Array.from({ length: 8 }).map((_, i) => renderSkeletonItem(i))) : filteredMembers.length === 0 ? (_jsxs("div", { style: styles.emptyState, children: [_jsx("div", { style: styles.emptyIcon, children: _jsx(UsersIcon, {}) }), _jsx("div", { style: styles.emptyTitle, children: searchQuery ? 'No members found' : 'No members yet' }), _jsx("div", { style: styles.emptyDescription, children: searchQuery
                                ? 'Try a different search term'
                                : 'Invite people to join this channel' })] })) : (_jsxs(_Fragment, { children: [groupedMembers.online.length > 0 && (_jsxs("div", { style: styles.onlineSection, children: [_jsxs("div", { style: styles.roleSectionHeader, children: [_jsx("div", { style: {
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                backgroundColor: 'var(--chatsdk-success)',
                                            } }), "Online", _jsx("span", { style: styles.roleCount, children: groupedMembers.online.length })] }), groupedMembers.online.map(renderMemberItem)] })), groupedMembers.offline.length > 0 && (_jsxs("div", { style: styles.roleSection, children: [_jsxs("div", { style: styles.roleSectionHeader, children: [_jsx("div", { style: {
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                backgroundColor: 'var(--chatsdk-text-tertiary)',
                                            } }), "Offline", _jsx("span", { style: styles.roleCount, children: groupedMembers.offline.length })] }), groupedMembers.offline.map(renderMemberItem)] }))] })) }), openMenuId && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 50,
                }, onClick: () => setOpenMenuId(null) }))] }));
};
export default MemberList;
