import type { Meta, StoryObj } from '@storybook/react';
import { ChatLayout } from '../../components/sdk/ChatLayout';

const mockChannels = [
  {
    id: '1',
    name: 'Sarah Wilson',
    type: 'messaging' as const,
    image: 'https://i.pravatar.cc/150?u=sarah',
    lastMessage: {
      text: 'Hey! How are you doing today?',
      user: 'Sarah',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    unreadCount: 3,
    isOnline: true,
  },
  {
    id: '2',
    name: 'Engineering Team',
    type: 'team' as const,
    image: undefined,
    lastMessage: {
      text: 'The deployment was successful! 🎉',
      user: 'Alex',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    unreadCount: 0,
    members: [
      { id: '1', name: 'Alex' },
      { id: '2', name: 'Sarah' },
      { id: '3', name: 'Mike' },
    ],
    isPinned: true,
  },
  {
    id: '3',
    name: 'Product Discussion',
    type: 'group' as const,
    lastMessage: {
      text: 'Can we schedule a meeting for tomorrow?',
      user: 'Mike',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    unreadCount: 12,
    members: [
      { id: '1', name: 'Mike' },
      { id: '2', name: 'Sarah' },
    ],
  },
  {
    id: '4',
    name: 'James Chen',
    type: 'messaging' as const,
    image: 'https://i.pravatar.cc/150?u=james',
    lastMessage: {
      text: 'Thanks for the help!',
      user: 'James',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    unreadCount: 0,
    isOnline: false,
    isMuted: true,
  },
];

const mockMessages = [
  {
    id: '1',
    text: 'Hey! How are you doing today?',
    user: { id: '2', name: 'Sarah Wilson', image: 'https://i.pravatar.cc/150?u=sarah' },
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'read' as const,
  },
  {
    id: '2',
    text: "I'm doing great, thanks for asking! Just finished that project we were working on.",
    user: { id: '1', name: 'Me' },
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    status: 'read' as const,
  },
  {
    id: '3',
    text: "That's awesome! Can you share the final results?",
    user: { id: '2', name: 'Sarah Wilson', image: 'https://i.pravatar.cc/150?u=sarah' },
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    reactions: [
      { emoji: '👍', count: 2, reacted: true },
      { emoji: '🎉', count: 1, reacted: false },
    ],
  },
  {
    id: '4',
    text: 'Sure! Here it is:',
    user: { id: '1', name: 'Me' },
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'delivered' as const,
    attachments: [
      {
        type: 'image' as const,
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
      },
    ],
  },
  {
    id: '5',
    text: 'This looks incredible! The team is going to love this. Great job! 🎉',
    user: { id: '2', name: 'Sarah Wilson', image: 'https://i.pravatar.cc/150?u=sarah' },
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    reactions: [
      { emoji: '❤️', count: 3, reacted: true },
    ],
  },
  {
    id: '6',
    text: '',
    user: { id: '1', name: 'Me' },
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    status: 'sent' as const,
    attachments: [
      {
        type: 'voice' as const,
        url: '#',
        duration: 34,
        waveform: [...Array(30)].map(() => Math.random()),
      },
    ],
  },
];

const meta: Meta<typeof ChatLayout> = {
  title: 'SDK/ChatLayout',
  component: ChatLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ChatLayout>;

export const Default: Story = {
  args: {
    channels: mockChannels,
    activeChannel: mockChannels[0],
    messages: mockMessages,
    currentUser: { id: '1', name: 'Me' },
    typingUsers: [],
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export const WithTypingIndicator: Story = {
  args: {
    ...Default.args,
    typingUsers: [{ id: '2', name: 'Sarah', image: 'https://i.pravatar.cc/150?u=sarah' }],
  },
  decorators: Default.decorators,
};

export const NoActiveChannel: Story = {
  args: {
    channels: mockChannels,
    activeChannel: undefined,
    messages: [],
    currentUser: { id: '1', name: 'Me' },
  },
  decorators: Default.decorators,
};

export const EmptyChannels: Story = {
  args: {
    channels: [],
    activeChannel: undefined,
    messages: [],
    currentUser: { id: '1', name: 'Me' },
  },
  decorators: Default.decorators,
};

export const WithThread: Story = {
  args: {
    ...Default.args,
    threadMessage: mockMessages[2],
    threadReplies: [
      {
        id: 't1',
        text: 'Here are the metrics!',
        user: { id: '1', name: 'Me' },
        timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        status: 'read' as const,
      },
      {
        id: 't2',
        text: 'Perfect, exactly what I needed.',
        user: { id: '2', name: 'Sarah Wilson', image: 'https://i.pravatar.cc/150?u=sarah' },
        timestamp: new Date(Date.now() - 1000 * 60 * 16).toISOString(),
      },
    ],
  },
  decorators: Default.decorators,
};
