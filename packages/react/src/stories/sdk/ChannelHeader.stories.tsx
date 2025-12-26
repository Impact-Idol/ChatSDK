import type { Meta, StoryObj } from '@storybook/react';
import { ChannelHeader } from '../../components/sdk/ChannelHeader';

const meta: Meta<typeof ChannelHeader> = {
  title: 'SDK/ChannelHeader',
  component: ChannelHeader,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof ChannelHeader>;

const defaultMembers = [
  { id: '1', name: 'Alice Johnson', online: true, imageUrl: 'https://i.pravatar.cc/150?u=alice' },
  { id: '2', name: 'Bob Smith', online: true },
  { id: '3', name: 'Carol White', online: false, imageUrl: 'https://i.pravatar.cc/150?u=carol' },
  { id: '4', name: 'David Brown', online: true },
  { id: '5', name: 'Eva Green', online: false },
];

export const Default: Story = {
  args: {
    channel: {
      id: 'channel-1',
      name: 'general',
      type: 'public',
      memberCount: 128,
    },
    members: defaultMembers,
  },
};

export const PrivateChannel: Story = {
  args: {
    channel: {
      id: 'channel-2',
      name: 'team-leads',
      type: 'private',
      description: 'Private channel for team leads only',
      memberCount: 5,
    },
    members: defaultMembers.slice(0, 3),
  },
};

export const DirectMessage: Story = {
  args: {
    channel: {
      id: 'dm-1',
      type: 'direct',
      memberCount: 2,
    },
    members: defaultMembers.slice(0, 2),
  },
};

export const WithTypingUsers: Story = {
  args: {
    channel: {
      id: 'channel-1',
      name: 'general',
      type: 'public',
      memberCount: 128,
    },
    members: defaultMembers,
    typingUsers: ['Alice', 'Bob'],
  },
};

export const WithDescription: Story = {
  args: {
    channel: {
      id: 'channel-1',
      name: 'announcements',
      type: 'public',
      description: 'Company-wide announcements and updates',
      memberCount: 500,
    },
    members: defaultMembers,
  },
};
