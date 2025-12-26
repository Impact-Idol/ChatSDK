import type { Meta, StoryObj } from '@storybook/react';
import { BlockedUsers } from '../../components/user/BlockedUsers';

const meta: Meta<typeof BlockedUsers> = {
  title: 'User/BlockedUsers',
  component: BlockedUsers,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof BlockedUsers>;

const blockedUsers = [
  {
    id: '1',
    userId: 'u1',
    userName: 'SpamUser123',
    userImageUrl: 'https://i.pravatar.cc/150?u=spam',
    blockedAt: new Date(Date.now() - 86400000).toISOString(),
    reason: 'Sending unwanted promotional messages',
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'TrollAccount',
    blockedAt: new Date(Date.now() - 172800000).toISOString(),
    reason: 'Harassment',
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'AnnoyingBot',
    userImageUrl: 'https://i.pravatar.cc/150?u=bot',
    blockedAt: new Date(Date.now() - 604800000).toISOString(),
  },
];

export const Default: Story = {
  args: {
    blockedUsers,
    onUnblock: (userId) => console.log('Unblock:', userId),
    onBlock: (userId, reason) => console.log('Block:', userId, reason),
    onSearchUser: async (query) => {
      await new Promise(r => setTimeout(r, 500));
      return [
        { id: 's1', name: `${query} User 1`, imageUrl: 'https://i.pravatar.cc/150?u=s1' },
        { id: 's2', name: `${query} User 2` },
      ];
    },
  },
};

export const Empty: Story = {
  args: {
    blockedUsers: [],
  },
};

export const ManyUsers: Story = {
  args: {
    blockedUsers: Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      userId: `u${i}`,
      userName: `BlockedUser${i}`,
      blockedAt: new Date(Date.now() - i * 86400000).toISOString(),
      reason: i % 2 === 0 ? 'Spam' : undefined,
    })),
  },
};
