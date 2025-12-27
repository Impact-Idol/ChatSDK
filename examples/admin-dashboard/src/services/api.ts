// API Service Layer for Admin Dashboard
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';

interface ApiError {
  message: string;
  status: number;
}

class ApiService {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = {
        message: await response.text(),
        status: response.status,
      };
      throw error;
    }

    return response.json();
  }

  // =============================================================================
  // AUTHENTICATION
  // =============================================================================

  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    this.clearToken();
    return Promise.resolve();
  }

  // =============================================================================
  // USERS
  // =============================================================================

  async getUsers(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    role?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.role) query.set('role', params.role);

    return this.request<{
      users: any[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/users?${query}`);
  }

  async getUser(userId: string) {
    return this.request<any>(`/api/users/${userId}`);
  }

  async createUser(userData: any) {
    return this.request<any>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: any) {
    return this.request<any>(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  async banUser(userId: string, reason?: string) {
    return this.request<any>(`/api/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async deleteUser(userId: string) {
    return this.request<void>(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // CHANNELS
  // =============================================================================

  async getChannels(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    status?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);

    return this.request<{
      channels: any[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/channels?${query}`);
  }

  async getChannel(channelId: string) {
    return this.request<any>(`/api/channels/${channelId}`);
  }

  async createChannel(channelData: any) {
    return this.request<any>('/api/channels', {
      method: 'POST',
      body: JSON.stringify(channelData),
    });
  }

  async updateChannel(channelId: string, channelData: any) {
    return this.request<any>(`/api/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify(channelData),
    });
  }

  async freezeChannel(channelId: string) {
    return this.request<any>(`/api/channels/${channelId}/freeze`, {
      method: 'POST',
    });
  }

  async unfreezeChannel(channelId: string) {
    return this.request<any>(`/api/channels/${channelId}/unfreeze`, {
      method: 'POST',
    });
  }

  async archiveChannel(channelId: string) {
    return this.request<any>(`/api/channels/${channelId}/archive`, {
      method: 'POST',
    });
  }

  async deleteChannel(channelId: string) {
    return this.request<void>(`/api/channels/${channelId}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // MESSAGES
  // =============================================================================

  async getMessages(params?: {
    page?: number;
    pageSize?: number;
    channelId?: string;
    userId?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.channelId) query.set('channelId', params.channelId);
    if (params?.userId) query.set('userId', params.userId);

    return this.request<{
      messages: any[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/messages?${query}`);
  }

  async deleteMessage(messageId: string) {
    return this.request<void>(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async moderateMessage(messageId: string, action: string, reason?: string) {
    return this.request<any>(`/api/messages/${messageId}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
  }

  // =============================================================================
  // MODERATION / REPORTS
  // =============================================================================

  async getReports(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    priority?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);

    return this.request<{
      reports: any[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/reports?${query}`);
  }

  async reviewReport(reportId: string) {
    return this.request<any>(`/api/reports/${reportId}/review`, {
      method: 'POST',
    });
  }

  async takeAction(reportId: string, action: string, note?: string) {
    return this.request<any>(`/api/reports/${reportId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    });
  }

  async dismissReport(reportId: string) {
    return this.request<any>(`/api/reports/${reportId}/dismiss`, {
      method: 'POST',
    });
  }

  // =============================================================================
  // API KEYS
  // =============================================================================

  async getAPIKeys() {
    return this.request<{ keys: any[] }>('/api/api-keys');
  }

  async createAPIKey(keyData: any) {
    return this.request<any>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify(keyData),
    });
  }

  async updateAPIKey(keyId: string, keyData: any) {
    return this.request<any>(`/api/api-keys/${keyId}`, {
      method: 'PATCH',
      body: JSON.stringify(keyData),
    });
  }

  async revokeAPIKey(keyId: string) {
    return this.request<any>(`/api/api-keys/${keyId}/revoke`, {
      method: 'POST',
    });
  }

  async regenerateAPIKey(keyId: string) {
    return this.request<any>(`/api/api-keys/${keyId}/regenerate`, {
      method: 'POST',
    });
  }

  async deleteAPIKey(keyId: string) {
    return this.request<void>(`/api/api-keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  // =============================================================================
  // ANALYTICS
  // =============================================================================

  async getAnalytics(dateRange?: { start: string; end: string }) {
    const query = new URLSearchParams();
    if (dateRange?.start) query.set('start', dateRange.start);
    if (dateRange?.end) query.set('end', dateRange.end);

    return this.request<any>(`/api/analytics?${query}`);
  }

  async getDashboardStats() {
    return this.request<any>('/api/analytics/dashboard');
  }

  // =============================================================================
  // AUDIT LOG
  // =============================================================================

  async getAuditLogs(params?: {
    page?: number;
    pageSize?: number;
    action?: string;
    actorType?: string;
    dateRange?: { start: string; end: string };
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.action) query.set('action', params.action);
    if (params?.actorType) query.set('actorType', params.actorType);
    if (params?.dateRange?.start) query.set('start', params.dateRange.start);
    if (params?.dateRange?.end) query.set('end', params.dateRange.end);

    return this.request<{
      entries: any[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/audit-log?${query}`);
  }

  async exportAuditLogs(format: 'csv' | 'json' = 'csv') {
    return this.request<Blob>(`/api/audit-log/export?format=${format}`, {
      headers: {
        'Accept': format === 'csv' ? 'text/csv' : 'application/json',
      },
    });
  }
}

export const api = new ApiService(API_URL);
export default api;
