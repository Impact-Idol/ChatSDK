import type { Meta, StoryObj } from '@storybook/react';
import { RolesPermissions } from '../../components/admin/RolesPermissions';

const meta: Meta<typeof RolesPermissions> = {
  title: 'Admin/RolesPermissions',
  component: RolesPermissions,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof RolesPermissions>;

const roles = [
  { id: 'admin', name: 'Admin', description: 'Full access to all features', color: '#ef4444', permissions: ['*'], memberCount: 5, isSystem: true },
  { id: 'moderator', name: 'Moderator', description: 'Can moderate content and users', color: '#f59e0b', permissions: ['read_messages', 'delete_messages', 'ban_users', 'mute_users'], memberCount: 12 },
  { id: 'member', name: 'Member', description: 'Standard member access', color: '#6366f1', permissions: ['read_messages', 'send_messages', 'create_reactions'], memberCount: 450, isDefault: true },
  { id: 'guest', name: 'Guest', description: 'Limited read-only access', color: '#9ca3af', permissions: ['read_messages'], memberCount: 89 },
];

const permissions = [
  { id: 'read_messages', name: 'Read Messages', description: 'View messages in channels', category: 'messages' },
  { id: 'send_messages', name: 'Send Messages', description: 'Send new messages', category: 'messages' },
  { id: 'delete_messages', name: 'Delete Messages', description: 'Delete any message', category: 'messages' },
  { id: 'edit_messages', name: 'Edit Messages', description: 'Edit own messages', category: 'messages' },
  { id: 'create_reactions', name: 'Add Reactions', description: 'React to messages', category: 'messages' },
  { id: 'create_channels', name: 'Create Channels', description: 'Create new channels', category: 'channels' },
  { id: 'delete_channels', name: 'Delete Channels', description: 'Delete channels', category: 'channels' },
  { id: 'manage_channels', name: 'Manage Channels', description: 'Edit channel settings', category: 'channels' },
  { id: 'ban_users', name: 'Ban Users', description: 'Ban users from the app', category: 'moderation' },
  { id: 'mute_users', name: 'Mute Users', description: 'Mute users in channels', category: 'moderation' },
  { id: 'view_analytics', name: 'View Analytics', description: 'Access analytics dashboard', category: 'admin' },
  { id: 'manage_settings', name: 'Manage Settings', description: 'Edit app settings', category: 'admin' },
];

export const Default: Story = {
  args: {
    roles,
    permissions,
    onRoleCreate: (role) => console.log('Create role:', role),
    onRoleUpdate: (role) => console.log('Update role:', role),
    onRoleDelete: (id) => console.log('Delete role:', id),
  },
};

export const EmptyRoles: Story = {
  args: {
    roles: [],
    permissions,
  },
};
