import type { Meta, StoryObj } from '@storybook/react';
import { BanManager } from '../../components/admin/BanManager';

const meta: Meta<typeof BanManager> = {
  title: 'Admin/BanManager',
  component: BanManager,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof BanManager>;

const bans = [
  {
    id: '1',
    userId: 'u1',
    userName: 'ToxicUser123',
    reason: 'Repeated harassment and spam in multiple channels',
    type: 'ban' as const,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'admin-1',
    createdByName: 'Admin',
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'SpamBot99',
    userImageUrl: 'https://i.pravatar.cc/150?u=spam',
    reason: 'Automated spam messages',
    type: 'ban' as const,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    createdBy: 'mod-1',
    createdByName: 'Moderator',
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'QuietUser',
    reason: 'Inappropriate language',
    type: 'mute' as const,
    channelId: 'c1',
    channelName: 'general',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    createdBy: 'mod-2',
    createdByName: 'Moderator 2',
  },
  {
    id: '4',
    userId: 'u4',
    userName: 'ShadowedUser',
    userImageUrl: 'https://i.pravatar.cc/150?u=shadow',
    reason: 'Suspicious activity detected',
    type: 'shadow_ban' as const,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    createdBy: 'admin-1',
    createdByName: 'Admin',
  },
];

export const Default: Story = {
  args: {
    bans,
    onBanUser: (data) => console.log('Ban user:', data),
    onUnban: (id) => console.log('Unban:', id),
    onSearchUser: async (query) => {
      await new Promise(r => setTimeout(r, 500));
      return [
        { id: 'search-1', name: `${query} User 1` },
        { id: 'search-2', name: `${query} User 2` },
      ];
    },
  },
};

export const Empty: Story = {
  args: {
    bans: [],
  },
};

export const OnlyBans: Story = {
  args: {
    bans: bans.filter(b => b.type === 'ban'),
  },
};

export const OnlyMutes: Story = {
  args: {
    bans: bans.filter(b => b.type === 'mute'),
  },
};
