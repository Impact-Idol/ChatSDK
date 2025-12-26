import type { Meta, StoryObj } from '@storybook/react';
import { PinnedMessages } from '../../components/sdk/PinnedMessages';

const meta: Meta<typeof PinnedMessages> = {
  title: 'SDK/PinnedMessages',
  component: PinnedMessages,
  parameters: {
    layout: 'centered',
  },
  args: {
    onMessageClick: (msg) => console.log('Message clicked:', msg.id),
    onUnpin: (id) => console.log('Unpin:', id),
    onClose: () => console.log('Closed'),
  },
};

export default meta;
type Story = StoryObj<typeof PinnedMessages>;

const pinnedMessages = [
  {
    id: '1',
    text: 'Important announcement: Team meeting moved to 3pm tomorrow. Please update your calendars.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    user: { id: 'u1', name: 'Alice Johnson', imageUrl: 'https://i.pravatar.cc/150?u=alice' },
    pinnedBy: { id: 'u1', name: 'Alice Johnson' },
    pinnedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    text: 'Project guidelines: Please follow the new coding standards documented here. Make sure to run linting before submitting PRs.',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    user: { id: 'u2', name: 'Bob Smith' },
    pinnedBy: { id: 'u2', name: 'Bob Smith' },
    pinnedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    text: 'Quick reminder about the holiday schedule.',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    user: { id: 'u3', name: 'Carol White', imageUrl: 'https://i.pravatar.cc/150?u=carol' },
    pinnedBy: { id: 'u1', name: 'Alice Johnson' },
    pinnedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const Default: Story = {
  args: {
    messages: pinnedMessages,
    channelName: 'general',
  },
};

export const SingleMessage: Story = {
  args: {
    messages: [pinnedMessages[0]],
    channelName: 'announcements',
  },
};

export const LongMessage: Story = {
  args: {
    messages: [
      {
        ...pinnedMessages[0],
        text: 'This is a very long pinned message that contains a lot of important information. It includes details about the project timeline, the expected deliverables, and the key milestones that we need to hit. Please make sure to read through all of this carefully and reach out if you have any questions. We want to ensure everyone is aligned on our goals and expectations moving forward. Additionally, remember to update the documentation as you complete your tasks.',
      },
    ],
    channelName: 'project-updates',
  },
};

export const Empty: Story = {
  args: {
    messages: [],
    channelName: 'random',
  },
};

export const Loading: Story = {
  args: {
    messages: [],
    channelName: 'general',
    loading: true,
  },
};

export const CannotUnpin: Story = {
  args: {
    messages: pinnedMessages,
    channelName: 'general',
    canUnpin: false,
  },
};
