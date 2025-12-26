import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Avatar } from '../shared/Avatar';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  status: 'active' | 'inactive' | 'banned';
  role: 'admin' | 'moderator' | 'member';
  lastActive?: string;
  messageCount: number;
  channelCount: number;
  createdAt: string;
}

export interface UsersTableProps {
  users: User[];
  totalUsers: number;
  currentPage: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  onFilter?: (status: string, role: string) => void;
  onUserSelect?: (user: User) => void;
  onBanUser?: (user: User) => void;
  onDeleteUser?: (user: User) => void;
  loading?: boolean;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  totalUsers,
  currentPage,
  pageSize,
  onPageChange,
  onSearch,
  onFilter,
  onUserSelect,
  onBanUser,
  onDeleteUser,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const totalPages = Math.ceil(totalUsers / pageSize);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLastActive = (date?: string) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
  };

  const statusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" size="sm">Active</Badge>;
      case 'inactive':
        return <Badge variant="default" size="sm">Inactive</Badge>;
      case 'banned':
        return <Badge variant="destructive" size="sm">Banned</Badge>;
    }
  };

  const roleBadge = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return <Badge variant="primary" size="sm">Admin</Badge>;
      case 'moderator':
        return <Badge variant="warning" size="sm">Moderator</Badge>;
      case 'member':
        return <Badge variant="secondary" size="sm">Member</Badge>;
    }
  };

  return (
    <div className="chatsdk-users-table-container">
      {/* Toolbar */}
      <div className="chatsdk-table-toolbar">
        <div className="chatsdk-table-search">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={handleSearch}
            leftIcon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
          />
        </div>

        <div className="chatsdk-table-filters">
          <select
            className="chatsdk-table-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              onFilter?.(e.target.value, roleFilter);
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="banned">Banned</option>
          </select>

          <select
            className="chatsdk-table-select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              onFilter?.(statusFilter, e.target.value);
            }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="member">Member</option>
          </select>

          <Button variant="primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add User
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="chatsdk-table-bulk-actions">
          <span>{selectedUsers.length} selected</span>
          <Button variant="ghost" size="sm">Export</Button>
          <Button variant="ghost" size="sm">Send Message</Button>
          <Button variant="destructive" size="sm">Ban Selected</Button>
        </div>
      )}

      {/* Table */}
      <div className="chatsdk-table-wrapper">
        <table className="chatsdk-table">
          <thead>
            <tr>
              <th className="chatsdk-table-checkbox">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>User</th>
              <th>Status</th>
              <th>Role</th>
              <th>Messages</th>
              <th>Channels</th>
              <th>Last Active</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="chatsdk-table-skeleton-row">
                  <td><div className="chatsdk-skeleton" style={{ width: 18, height: 18 }} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="chatsdk-skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                      <div>
                        <div className="chatsdk-skeleton" style={{ width: 120, height: 14, marginBottom: 4 }} />
                        <div className="chatsdk-skeleton" style={{ width: 160, height: 12 }} />
                      </div>
                    </div>
                  </td>
                  <td><div className="chatsdk-skeleton" style={{ width: 60, height: 20 }} /></td>
                  <td><div className="chatsdk-skeleton" style={{ width: 70, height: 20 }} /></td>
                  <td><div className="chatsdk-skeleton" style={{ width: 40, height: 14 }} /></td>
                  <td><div className="chatsdk-skeleton" style={{ width: 30, height: 14 }} /></td>
                  <td><div className="chatsdk-skeleton" style={{ width: 60, height: 14 }} /></td>
                  <td><div className="chatsdk-skeleton" style={{ width: 80, height: 14 }} /></td>
                  <td><div className="chatsdk-skeleton" style={{ width: 24, height: 24 }} /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} className="chatsdk-table-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <h3>No users found</h3>
                  <p>Try adjusting your search or filters</p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={clsx(selectedUsers.includes(user.id) && 'selected')}
                  onClick={() => onUserSelect?.(user)}
                >
                  <td className="chatsdk-table-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </td>
                  <td>
                    <div className="chatsdk-table-user">
                      <Avatar src={user.image} name={user.name} size="md" />
                      <div className="chatsdk-table-user-info">
                        <span className="chatsdk-table-user-name">{user.name}</span>
                        <span className="chatsdk-table-user-email">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{statusBadge(user.status)}</td>
                  <td>{roleBadge(user.role)}</td>
                  <td className="chatsdk-table-number">{user.messageCount.toLocaleString()}</td>
                  <td className="chatsdk-table-number">{user.channelCount}</td>
                  <td className="chatsdk-table-muted">{formatLastActive(user.lastActive)}</td>
                  <td className="chatsdk-table-muted">{formatDate(user.createdAt)}</td>
                  <td className="chatsdk-table-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="chatsdk-table-dropdown">
                      <button className="chatsdk-table-action-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="chatsdk-table-pagination">
        <span className="chatsdk-table-pagination-info">
          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
        </span>
        <div className="chatsdk-table-pagination-controls">
          <button
            className="chatsdk-table-pagination-btn"
            disabled={currentPage === 1}
            onClick={() => onPageChange?.(currentPage - 1)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                className={clsx('chatsdk-table-pagination-btn', currentPage === page && 'active')}
                onClick={() => onPageChange?.(page)}
              >
                {page}
              </button>
            );
          })}
          {totalPages > 5 && <span className="chatsdk-table-pagination-ellipsis">...</span>}
          <button
            className="chatsdk-table-pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
};

export default UsersTable;
