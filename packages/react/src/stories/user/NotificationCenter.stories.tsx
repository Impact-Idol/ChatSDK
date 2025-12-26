import type { Meta, StoryObj } from '@storybook/react';
import { NotificationCenter } from '../../components/user/NotificationCenter';

const meta: Meta<typeof NotificationCenter> = {
  title: 'User/NotificationCenter',
  component: NotificationCenter,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof NotificationCenter>;

const notifications = [
  {
    id: '1',
    type: 'mention' as const,
    title: 'Alice mentioned you',
    body: '"Hey @you, can you review this PR?"',
    read: false,
    createdAt: new Date(Date.now() - 300000).toISOString(),
    metadata: { channelName: 'engineering', userName: 'Alice Johnson' },
    imageUrl: 'https://i.pravatar.cc/150?u=alice',
  },
  {
    id: '2',
    type: 'reply' as const,
    title: 'Bob replied to your message',
    body: '"That sounds great, let\'s discuss tomorrow"',
    read: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    metadata: { channelName: 'general', userName: 'Bob Smith' },
  },
  {
    id: '3',
    type: 'reaction' as const,
    title: 'Carol reacted to your message',
    body: 'Added 👍 to "Thanks for the help!"',
    read: true,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    metadata: { userName: 'Carol White' },
    imageUrl: 'https://i.pravatar.cc/150?u=carol',
  },
  {
    id: '4',
    type: 'invite' as const,
    title: 'Channel invitation',
    body: 'You\'ve been invited to join #design-team',
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '5',
    type: 'system' as const,
    title: 'Welcome to ChatSDK',
    body: 'Thanks for joining! Get started by exploring channels.',
    read: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const Default: Story = {
  args: {
    notifications,
    unreadCount: 2,
    onMarkAsRead: (id) => console.log('Mark as read:', id),
    onMarkAllAsRead: () => console.log('Mark all as read'),
    onDelete: (id) => console.log('Delete:', id),
    onClearAll: () => console.log('Clear all'),
    onNotificationClick: (n) => console.log('Clicked:', n),
  },
};

export const AllRead: Story = {
  args: {
    notifications: notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  },
};

export const Empty: Story = {
  args: {
    notifications: [],
    unreadCount: 0,
  },
};

export const Loading: Story = {
  args: {
    notifications: [],
    loading: true,
  },
};
