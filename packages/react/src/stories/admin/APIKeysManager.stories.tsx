import type { Meta, StoryObj } from '@storybook/react';
import { APIKeysManager, APIKey } from '../../components/admin/APIKeysManager';

const meta: Meta<typeof APIKeysManager> = {
  title: 'Admin/APIKeysManager',
  component: APIKeysManager,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onCreateKey: () => console.log('Create key clicked'),
    onEditKey: (key) => console.log('Edit key:', key),
    onRevokeKey: (key) => console.log('Revoke key:', key),
    onRegenerateKey: (key) => console.log('Regenerate key:', key),
    onCopyKey: (key) => console.log('Copy key:', key),
    onViewUsage: (key) => console.log('View usage:', key),
  },
};

export default meta;
type Story = StoryObj<typeof APIKeysManager>;

const mockAPIKeys: APIKey[] = [
  {
    id: '1',
    name: 'Production API Key',
    keyPrefix: 'sk_live_',
    keyHint: '...abc123xyz',
    scopes: ['full'],
    status: 'active',
    environment: 'production',
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 275).toISOString(),
    lastUsedAt: new Date(Date.now() - 60000).toISOString(),
    usageCount: 1250000,
    createdBy: { id: 'user-1', name: 'John Doe' },
    rateLimit: 1000,
    allowedOrigins: ['https://app.example.com', 'https://api.example.com'],
  },
  {
    id: '2',
    name: 'Development API Key',
    keyPrefix: 'sk_dev_',
    keyHint: '...dev456def',
    scopes: ['read', 'write'],
    status: 'active',
    environment: 'development',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
    usageCount: 45000,
    createdBy: { id: 'user-2', name: 'Sarah Smith' },
    rateLimit: 100,
  },
  {
    id: '3',
    name: 'Staging Environment',
    keyPrefix: 'sk_stg_',
    keyHint: '...stg789ghi',
    scopes: ['read', 'write', 'admin'],
    status: 'active',
    environment: 'staging',
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
    usageCount: 12500,
    createdBy: { id: 'user-1', name: 'John Doe' },
    rateLimit: 500,
  },
  {
    id: '4',
    name: 'Old Production Key',
    keyPrefix: 'sk_live_',
    keyHint: '...old000old',
    scopes: ['full'],
    status: 'expired',
    environment: 'production',
    createdAt: new Date(Date.now() - 86400000 * 365).toISOString(),
    expiresAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    lastUsedAt: new Date(Date.now() - 86400000 * 31).toISOString(),
    usageCount: 890000,
    createdBy: { id: 'user-3', name: 'Mike Chen' },
  },
  {
    id: '5',
    name: 'Revoked Test Key',
    keyPrefix: 'sk_dev_',
    keyHint: '...rev111jkl',
    scopes: ['read'],
    status: 'revoked',
    environment: 'development',
    createdAt: new Date(Date.now() - 86400000 * 180).toISOString(),
    usageCount: 5000,
    createdBy: { id: 'user-2', name: 'Sarah Smith' },
  },
];

export const Default: Story = {
  args: {
    apiKeys: mockAPIKeys,
  },
};

export const Loading: Story = {
  args: {
    apiKeys: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    apiKeys: [],
    loading: false,
  },
};

export const SingleKey: Story = {
  args: {
    apiKeys: [mockAPIKeys[0]],
  },
};

export const AllActive: Story = {
  args: {
    apiKeys: mockAPIKeys.filter(k => k.status === 'active'),
  },
};
