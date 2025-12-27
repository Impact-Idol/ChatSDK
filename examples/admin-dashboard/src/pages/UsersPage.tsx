import { useState, useEffect } from 'react';
import { ChatProvider } from '@chatsdk/react';
import { UsersTable, User } from '@chatsdk/react';
import { api } from '../services/api';
import { handleApiError, showError, showSuccess } from '../utils/errorHandler';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        pageSize,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }

      const response = await api.getUsers(params);
      setUsers(response.users);
      setTotalUsers(response.total);
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to load users: ${message}`);
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users when filters or page changes
  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery, statusFilter, roleFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleFilter = (status: string, role: string) => {
    setStatusFilter(status);
    setRoleFilter(role);
    setCurrentPage(1); // Reset to first page on filter
  };

  const handleUserSelect = (user: User) => {
    console.log('User selected:', user);
    // In a real app, this might open a user details modal or navigate to user profile
  };

  const handleBanUser = async (user: User) => {
    try {
      const reason = prompt('Enter reason for banning this user:');
      if (reason === null) return; // User cancelled

      await api.banUser(user.id, reason || undefined);
      showSuccess(`User ${user.name} has been banned`);

      // Refresh the user list
      await fetchUsers();
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to ban user: ${message}`);
      console.error('Error banning user:', error);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteUser(user.id);
      showSuccess(`User ${user.name} has been deleted`);

      // Refresh the user list
      await fetchUsers();
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to delete user: ${message}`);
      console.error('Error deleting user:', error);
    }
  };

  return (
    <ChatProvider apiKey={API_KEY} apiUrl={API_URL}>
      <UsersTable
        users={users}
        totalUsers={totalUsers}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onFilter={handleFilter}
        onUserSelect={handleUserSelect}
        onBanUser={handleBanUser}
        onDeleteUser={handleDeleteUser}
        loading={loading}
      />
    </ChatProvider>
  );
}
