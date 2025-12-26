import type { Meta, StoryObj } from '@storybook/react';
import { ReadReceipts, ReadReceiptUser } from '../../components/sdk/ReadReceipts';

const meta: Meta<typeof ReadReceipts> = {
  title: 'SDK/ReadReceipts',
  component: ReadReceipts,
  parameters: {
    layout: 'centered',
  },
  args: {
    onUserClick: (userId) => console.log('User clicked:', userId),
  },
};

export default meta;
type Story = StoryObj<typeof ReadReceipts>;

const mockReaders: ReadReceiptUser[] = [
  { id: 'user-1', name: 'Sarah Chen', imageUrl: 'https://i.pravatar.cc/150?u=sarah', readAt: new Date(Date.now() - 60000).toISOString() },
  { id: 'user-2', name: 'Mike Johnson', imageUrl: 'https://i.pravatar.cc/150?u=mike', readAt: new Date(Date.now() - 120000).toISOString() },
  { id: 'user-3', name: 'Emily Davis', readAt: new Date(Date.now() - 180000).toISOString() },
  { id: 'user-4', name: 'John Doe', imageUrl: 'https://i.pravatar.cc/150?u=john', readAt: new Date(Date.now() - 300000).toISOString() },
  { id: 'user-5', name: 'Alex Kim', imageUrl: 'https://i.pravatar.cc/150?u=alex', readAt: new Date(Date.now() - 600000).toISOString() },
  { id: 'user-6', name: 'Lisa Wang', readAt: new Date(Date.now() - 900000).toISOString() },
];

export const AvatarsVariant: Story = {
  args: {
    readers: mockReaders.slice(0, 3),
    variant: 'avatars',
  },
};

export const ManyReaders: Story = {
  args: {
    readers: mockReaders,
    variant: 'avatars',
    maxDisplayUsers: 3,
  },
};

export const CheckmarksRead: Story = {
  args: {
    readers: mockReaders.slice(0, 2),
    variant: 'checkmarks',
    status: 'read',
  },
};

export const CheckmarksDelivered: Story = {
  args: {
    readers: [],
    variant: 'checkmarks',
    status: 'delivered',
  },
};

export const CheckmarksSent: Story = {
  args: {
    readers: [],
    variant: 'checkmarks',
    status: 'sent',
  },
};

export const ListVariant: Story = {
  args: {
    readers: mockReaders,
    variant: 'list',
    showTimestamp: true,
  },
};

export const TooltipVariant: Story = {
  args: {
    readers: mockReaders,
    variant: 'tooltip',
    maxDisplayUsers: 3,
  },
};

export const SmallSize: Story = {
  args: {
    readers: mockReaders.slice(0, 3),
    variant: 'avatars',
    size: 'small',
  },
};

export const MediumSize: Story = {
  args: {
    readers: mockReaders.slice(0, 3),
    variant: 'avatars',
    size: 'medium',
  },
};

export const LargeSize: Story = {
  args: {
    readers: mockReaders.slice(0, 3),
    variant: 'avatars',
    size: 'large',
  },
};

export const WithNames: Story = {
  args: {
    readers: mockReaders.slice(0, 1),
    variant: 'avatars',
    showNames: true,
  },
};

export const NoReaders: Story = {
  args: {
    readers: [],
    variant: 'avatars',
    status: 'delivered',
  },
};

export const PositionLeft: Story = {
  args: {
    readers: mockReaders.slice(0, 3),
    variant: 'avatars',
    position: 'left',
  },
};
