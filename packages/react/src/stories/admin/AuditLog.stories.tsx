import type { Meta, StoryObj } from '@storybook/react';
import { AuditLog, AuditLogEntry } from '../../components/admin/AuditLog';

const meta: Meta<typeof AuditLog> = {
  title: 'Admin/AuditLog',
  component: AuditLog,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onPageChange: (page) => console.log('Page change:', page),
    onEntryClick: (entry) => console.log('Entry clicked:', entry),
    onExport: () => console.log('Export clicked'),
    onFilterChange: (filters) => console.log('Filters changed:', filters),
  },
};

export default meta;
type Story = StoryObj<typeof AuditLog>;

const mockEntries: AuditLogEntry[] = [
  {
    id: '1',
    action: 'user.banned',
    severity: 'critical',
    actor: { id: 'admin-1', name: 'Admin Sarah', email: 'sarah@example.com', imageUrl: 'https://i.pravatar.cc/150?u=sarah', type: 'admin' },
    target: { id: 'user-123', type: 'user', name: 'ToxicUser456' },
    metadata: { reason: 'Repeated violations of community guidelines', duration: 'permanent' },
    ipAddress: '192.168.1.100',
    location: 'New York, US',
    timestamp: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: '2',
    action: 'api_key.created',
    severity: 'warning',
    actor: { id: 'user-1', name: 'John Doe', imageUrl: 'https://i.pravatar.cc/150?u=john', type: 'user' },
    target: { id: 'key-abc', type: 'api_key', name: 'Production Key' },
    ipAddress: '10.0.0.50',
    location: 'San Francisco, US',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    action: 'channel.created',
    severity: 'info',
    actor: { id: 'user-2', name: 'Mike Chen', type: 'user' },
    target: { id: 'ch-new', type: 'channel', name: 'Project Alpha' },
    ipAddress: '172.16.0.25',
    location: 'London, UK',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '4',
    action: 'message.deleted',
    severity: 'warning',
    actor: { id: 'mod-1', name: 'Moderator Team', type: 'admin' },
    target: { id: 'msg-xyz', type: 'message' },
    metadata: { reason: 'Spam content', originalText: 'Buy now! Best deals...' },
    timestamp: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: '5',
    action: 'user.login',
    severity: 'info',
    actor: { id: 'user-3', name: 'Emily Wilson', imageUrl: 'https://i.pravatar.cc/150?u=emily', type: 'user' },
    ipAddress: '203.0.113.42',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    location: 'Tokyo, JP',
    timestamp: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: '6',
    action: 'settings.updated',
    severity: 'info',
    actor: { id: 'admin-2', name: 'System', type: 'system' },
    target: { id: 'settings', type: 'settings', name: 'Rate Limiting' },
    metadata: { changes: { rateLimit: { old: 100, new: 150 } } },
    timestamp: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: '7',
    action: 'webhook.deleted',
    severity: 'warning',
    actor: { id: 'user-1', name: 'John Doe', imageUrl: 'https://i.pravatar.cc/150?u=john', type: 'user' },
    target: { id: 'wh-old', type: 'webhook', name: 'Legacy Notifications' },
    ipAddress: '10.0.0.50',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '8',
    action: 'member.role_changed',
    severity: 'info',
    actor: { id: 'admin-1', name: 'Admin Sarah', imageUrl: 'https://i.pravatar.cc/150?u=sarah', type: 'admin' },
    target: { id: 'user-4', type: 'user', name: 'David Brown' },
    metadata: { oldRole: 'member', newRole: 'moderator', channel: 'General' },
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '9',
    action: 'channel.frozen',
    severity: 'warning',
    actor: { id: 'mod-2', name: 'Mod Alex', type: 'admin' },
    target: { id: 'ch-123', type: 'channel', name: 'Heated Discussion' },
    metadata: { reason: 'Cooling down period after heated argument' },
    timestamp: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: '10',
    action: 'api_key.revoked',
    severity: 'critical',
    actor: { id: 'system', name: 'Security System', type: 'system' },
    target: { id: 'key-compromised', type: 'api_key', name: 'Compromised Key' },
    metadata: { reason: 'Suspicious activity detected' },
    timestamp: new Date(Date.now() - 345600000).toISOString(),
  },
];

export const Default: Story = {
  args: {
    entries: mockEntries,
    totalCount: 150,
    page: 1,
    pageSize: 20,
  },
};

export const Loading: Story = {
  args: {
    entries: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    entries: [],
    loading: false,
    totalCount: 0,
  },
};

export const CriticalEventsOnly: Story = {
  args: {
    entries: mockEntries.filter(e => e.severity === 'critical'),
    totalCount: 2,
  },
};

export const ManyPages: Story = {
  args: {
    entries: mockEntries,
    totalCount: 500,
    page: 3,
    pageSize: 20,
  },
};
