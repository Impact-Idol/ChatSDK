import React, { useState, useMemo } from 'react';
import clsx from 'clsx';

// =============================================================================
// TYPES
// =============================================================================

export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface ChannelMember {
  id: string;
  name: string;
  imageUrl?: string;
  role: MemberRole;
  presence: PresenceStatus;
  customStatus?: string;
  lastActiveAt?: string;
  joinedAt: string;
  messageCount?: number;
  isMuted?: boolean;
  isBanned?: boolean;
}

export interface MemberListProps {
  members: ChannelMember[];
  channelName?: string;
  loading?: boolean;
  currentUserId?: string;
  canManageMembers?: boolean;
  onMemberClick?: (member: ChannelMember) => void;
  onInviteClick?: () => void;
  onRemoveMember?: (member: ChannelMember) => void;
  onChangeMemberRole?: (member: ChannelMember, newRole: MemberRole) => void;
  onMuteMember?: (member: ChannelMember) => void;
  onBanMember?: (member: ChannelMember) => void;
  onMessageMember?: (member: ChannelMember) => void;
  className?: string;
}

// =============================================================================
// ICONS
// =============================================================================

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const UserPlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" x2="19" y1="8" y2="14" />
    <line x1="22" x2="16" y1="11" y2="11" />
  </svg>
);

const MoreVerticalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

const MessageSquareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CrownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

const UserXIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="17" x2="22" y1="8" y2="13" />
    <line x1="22" x2="17" y1="8" y2="13" />
  </svg>
);

const VolumeXIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="22" x2="16" y1="9" y2="15" />
    <line x1="16" x2="22" y1="9" y2="15" />
  </svg>
);

const BanIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
);

const UserCogIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="15" r="3" />
    <circle cx="9" cy="7" r="4" />
    <path d="M10 15H6a4 4 0 0 0-4 4v2" />
    <path d="m21.7 16.4-.9-.3" />
    <path d="m15.2 13.9-.9-.3" />
    <path d="m16.6 18.7.3-.9" />
    <path d="m19.1 12.2.3-.9" />
    <path d="m19.6 18.7-.4-1" />
    <path d="m16.8 12.3-.4-1" />
    <path d="m14.3 16.6 1-.4" />
    <path d="m20.7 13.8 1-.4" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getRoleLabel = (role: MemberRole): string => {
  const labels: Record<MemberRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    moderator: 'Moderator',
    member: 'Member',
    guest: 'Guest',
  };
  return labels[role];
};

const getRoleColor = (role: MemberRole): string => {
  switch (role) {
    case 'owner': return '#f59e0b';
    case 'admin': return '#8b5cf6';
    case 'moderator': return '#3b82f6';
    case 'member': return 'var(--chatsdk-text-tertiary)';
    case 'guest': return 'var(--chatsdk-text-tertiary)';
    default: return 'var(--chatsdk-text-tertiary)';
  }
};

const getRoleIcon = (role: MemberRole) => {
  switch (role) {
    case 'owner': return <CrownIcon />;
    case 'admin':
    case 'moderator': return <ShieldIcon />;
    default: return null;
  }
};

const getPresenceColor = (presence: PresenceStatus): string => {
  switch (presence) {
    case 'online': return 'var(--chatsdk-success)';
    case 'away': return 'var(--chatsdk-warning)';
    case 'busy': return 'var(--chatsdk-error)';
    case 'offline': return 'var(--chatsdk-text-tertiary)';
    default: return 'var(--chatsdk-text-tertiary)';
  }
};

const getPresenceLabel = (presence: PresenceStatus): string => {
  switch (presence) {
    case 'online': return 'Online';
    case 'away': return 'Away';
    case 'busy': return 'Do not disturb';
    case 'offline': return 'Offline';
    default: return 'Unknown';
  }
};

const formatLastActive = (dateString?: string): string => {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

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
    flexDirection: 'column' as const,
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
    overflowY: 'auto' as const,
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
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    position: 'sticky' as const,
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
    position: 'relative' as const,
    flexShrink: 0,
  },

  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
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
    position: 'absolute' as const,
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
    flexDirection: 'column' as const,
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
    whiteSpace: 'nowrap' as const,
  },

  youBadge: {
    padding: '1px 5px',
    backgroundColor: 'var(--chatsdk-primary-light)',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--chatsdk-primary)',
    textTransform: 'uppercase' as const,
  },

  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
  },

  memberStatus: {
    fontSize: '12px',
    color: 'var(--chatsdk-text-tertiary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
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
    position: 'absolute' as const,
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
    textAlign: 'left' as const,
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
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center' as const,
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

export const MemberList: React.FC<MemberListProps> = ({
  members,
  channelName,
  loading = false,
  currentUserId,
  canManageMembers = false,
  onMemberClick,
  onInviteClick,
  onRemoveMember,
  onChangeMemberRole,
  onMuteMember,
  onBanMember,
  onMessageMember,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    return members.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  const groupedMembers = useMemo(() => {
    const online = filteredMembers.filter(m => m.presence !== 'offline');
    const offline = filteredMembers.filter(m => m.presence === 'offline');

    // Sort by role priority then by name
    const sortByRole = (a: ChannelMember, b: ChannelMember) => {
      const roleOrder: Record<MemberRole, number> = {
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

  const handleMemberClick = (member: ChannelMember, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onMemberClick?.(member);
  };

  const renderMemberItem = (member: ChannelMember) => {
    const isHovered = hoveredMember === member.id;
    const isCurrentUser = member.id === currentUserId;

    return (
      <div
        key={member.id}
        style={{
          ...styles.memberItem,
          ...(isHovered ? styles.memberItemHover : {}),
          position: 'relative' as const,
        }}
        onMouseEnter={() => setHoveredMember(member.id)}
        onMouseLeave={() => setHoveredMember(null)}
        onClick={(e) => handleMemberClick(member, e)}
      >
        {/* Avatar */}
        <div style={styles.memberAvatar}>
          {member.imageUrl ? (
            <img src={member.imageUrl} alt="" style={styles.avatar} />
          ) : (
            <div style={styles.avatarFallback}>
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div
            style={{
              ...styles.presenceIndicator,
              backgroundColor: getPresenceColor(member.presence),
            }}
          />
        </div>

        {/* Info */}
        <div style={styles.memberInfo}>
          <div style={styles.memberNameRow}>
            <span style={styles.memberName}>{member.name}</span>
            {isCurrentUser && (
              <span style={styles.youBadge}>You</span>
            )}
            {member.isMuted && (
              <span style={{
                ...styles.statusBadge,
                backgroundColor: 'var(--chatsdk-warning)',
                color: 'white',
              }}>
                Muted
              </span>
            )}
            {member.isBanned && (
              <span style={{
                ...styles.statusBadge,
                backgroundColor: 'var(--chatsdk-error)',
                color: 'white',
              }}>
                Banned
              </span>
            )}
          </div>
          <span style={styles.memberStatus}>
            {member.customStatus || getPresenceLabel(member.presence)}
            {member.presence === 'offline' && member.lastActiveAt && (
              <> • Last seen {formatLastActive(member.lastActiveAt)}</>
            )}
          </span>
        </div>

        {/* Actions */}
        <div style={{
          ...styles.memberActions,
          ...(isHovered ? styles.memberActionsVisible : {}),
        }}>
          {!isCurrentUser && (
            <button
              style={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                onMessageMember?.(member);
              }}
              title="Send message"
            >
              <MessageSquareIcon />
            </button>
          )}
          {(canManageMembers || isHovered) && !isCurrentUser && (
            <button
              style={{
                ...styles.moreButton,
                backgroundColor: openMenuId === member.id ? 'var(--chatsdk-bg-tertiary)' : undefined,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === member.id ? null : member.id);
              }}
            >
              <MoreVerticalIcon />
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {openMenuId === member.id && canManageMembers && (
          <div style={styles.dropdown}>
            <button
              style={styles.dropdownItem}
              onClick={(e) => {
                e.stopPropagation();
                onChangeMemberRole?.(member, 'admin');
                setOpenMenuId(null);
              }}
            >
              <UserCogIcon />
              Change Role
            </button>
            <button
              style={styles.dropdownItem}
              onClick={(e) => {
                e.stopPropagation();
                onMuteMember?.(member);
                setOpenMenuId(null);
              }}
            >
              <VolumeXIcon />
              {member.isMuted ? 'Unmute' : 'Mute'} Member
            </button>
            <div style={styles.dropdownDivider} />
            <button
              style={styles.dropdownItem}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveMember?.(member);
                setOpenMenuId(null);
              }}
            >
              <UserXIcon />
              Remove from Channel
            </button>
            <button
              style={{ ...styles.dropdownItem, ...styles.dropdownItemDanger }}
              onClick={(e) => {
                e.stopPropagation();
                onBanMember?.(member);
                setOpenMenuId(null);
              }}
            >
              <BanIcon />
              Ban User
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSkeletonItem = (index: number) => (
    <div key={`skeleton-${index}`} style={styles.memberItem}>
      <div style={{ ...styles.skeleton, width: 36, height: 36, borderRadius: '50%' }} />
      <div style={styles.memberInfo}>
        <div style={{ ...styles.skeleton, width: 100, height: 14, marginBottom: 6 }} />
        <div style={{ ...styles.skeleton, width: 60, height: 12 }} />
      </div>
    </div>
  );

  return (
    <div style={styles.container} className={clsx('chatsdk-member-list', className)}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <UsersIcon />
          </div>
          <h3 style={styles.title}>Members</h3>
          <span style={styles.memberCount}>{members.length}</span>
        </div>
        {canManageMembers && (
          <button
            style={styles.inviteButton}
            onClick={onInviteClick}
            title="Invite members"
          >
            <UserPlusIcon />
          </button>
        )}
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <div style={styles.searchWrapper}>
          <div style={styles.searchIcon}>
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              style={{ ...styles.moreButton, width: 20, height: 20 }}
              onClick={() => setSearchQuery('')}
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>

      {/* Members List */}
      <div style={styles.membersList}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => renderSkeletonItem(i))
        ) : filteredMembers.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <UsersIcon />
            </div>
            <div style={styles.emptyTitle}>
              {searchQuery ? 'No members found' : 'No members yet'}
            </div>
            <div style={styles.emptyDescription}>
              {searchQuery
                ? 'Try a different search term'
                : 'Invite people to join this channel'}
            </div>
          </div>
        ) : (
          <>
            {/* Online Section */}
            {groupedMembers.online.length > 0 && (
              <div style={styles.onlineSection}>
                <div style={styles.roleSectionHeader}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: 'var(--chatsdk-success)',
                    }}
                  />
                  Online
                  <span style={styles.roleCount}>{groupedMembers.online.length}</span>
                </div>
                {groupedMembers.online.map(renderMemberItem)}
              </div>
            )}

            {/* Offline Section */}
            {groupedMembers.offline.length > 0 && (
              <div style={styles.roleSection}>
                <div style={styles.roleSectionHeader}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: 'var(--chatsdk-text-tertiary)',
                    }}
                  />
                  Offline
                  <span style={styles.roleCount}>{groupedMembers.offline.length}</span>
                </div>
                {groupedMembers.offline.map(renderMemberItem)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Click outside handler for menu */}
      {openMenuId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
          }}
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
};

export default MemberList;
