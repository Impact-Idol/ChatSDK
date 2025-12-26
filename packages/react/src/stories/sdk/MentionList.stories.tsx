import type { Meta, StoryObj } from '@storybook/react';
import { MentionList, MentionItem } from '../../components/sdk/MentionList';

const meta: Meta<typeof MentionList> = {
  title: 'SDK/MentionList',
  component: MentionList,
  parameters: {
    layout: 'centered',
  },
  args: {
    onSelect: (item) => console.log('Selected:', item),
    onClose: () => console.log('Closed'),
  },
};

export default meta;
type Story = StoryObj<typeof MentionList>;

const users: MentionItem[] = [
  { type: 'user', data: { id: '1', name: 'Alice Johnson', username: 'alice', online: true, imageUrl: 'https://i.pravatar.cc/150?u=alice' } },
  { type: 'user', data: { id: '2', name: 'Bob Smith', username: 'bob', online: true } },
  { type: 'user', data: { id: '3', name: 'Carol White', username: 'carol', online: false, role: 'Admin' } },
  { type: 'user', data: { id: '4', name: 'David Brown', username: 'david', online: false } },
];

const channels: MentionItem[] = [
  { type: 'channel', data: { id: 'c1', name: 'general', type: 'public', memberCount: 128 } },
  { type: 'channel', data: { id: 'c2', name: 'engineering', type: 'private', memberCount: 24 } },
  { type: 'channel', data: { id: 'c3', name: 'design', type: 'public', memberCount: 45 } },
];

const commands: MentionItem[] = [
  { type: 'command', data: { name: 'giphy', description: 'Search and post GIFs', args: '[search term]' } },
  { type: 'command', data: { name: 'poll', description: 'Create a poll', args: '"question" "option1" "option2"' } },
  { type: 'command', data: { name: 'remind', description: 'Set a reminder', args: '[time] [message]' } },
];

export const UsersOnly: Story = {
  args: {
    items: users,
    searchQuery: '',
  },
};

export const ChannelsOnly: Story = {
  args: {
    items: channels,
    searchQuery: '',
  },
};

export const CommandsOnly: Story = {
  args: {
    items: commands,
    searchQuery: '',
  },
};

export const Mixed: Story = {
  args: {
    items: [...users.slice(0, 2), ...channels.slice(0, 2), ...commands.slice(0, 2)],
    searchQuery: '',
  },
};

export const WithSearch: Story = {
  args: {
    items: users,
    searchQuery: 'ali',
  },
};

export const Loading: Story = {
  args: {
    items: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    items: [],
    searchQuery: 'xyz',
  },
};

export const NoHeader: Story = {
  args: {
    items: users,
    showHeader: false,
  },
};

export const WithSelectedIndex: Story = {
  args: {
    items: users,
    selectedIndex: 2,
  },
};
