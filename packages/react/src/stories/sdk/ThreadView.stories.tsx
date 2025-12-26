import type { Meta, StoryObj } from '@storybook/react';
import { ThreadView, ThreadMessage } from '../../components/sdk/ThreadView';

const meta: Meta<typeof ThreadView> = {
  title: 'SDK/ThreadView',
  component: ThreadView,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    currentUserId: 'user-1',
    channelName: 'general',
    onClose: () => console.log('Close clicked'),
    onSendReply: (text) => console.log('Reply sent:', text),
    onLoadMoreReplies: () => console.log('Load more clicked'),
    onReactionAdd: (msgId, emoji) => console.log('Reaction add:', msgId, emoji),
    onReactionRemove: (msgId, emoji) => console.log('Reaction remove:', msgId, emoji),
    onMessageEdit: (msgId, text) => console.log('Edit:', msgId, text),
    onMessageDelete: (msgId) => console.log('Delete:', msgId),
    onUserClick: (userId) => console.log('User clicked:', userId),
  },
};

export default meta;
type Story = StoryObj<typeof ThreadView>;

const mockParentMessage: ThreadMessage = {
  id: 'parent-1',
  text: 'Hey team! I\'ve been thinking about how we should approach the new feature implementation. What do you all think about using a microservices architecture for this?',
  user: {
    id: 'user-2',
    name: 'Sarah Chen',
    imageUrl: 'https://i.pravatar.cc/150?u=sarah',
  },
  createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  reactions: [
    { emoji: '👍', count: 3, reacted: true },
    { emoji: '🤔', count: 2, reacted: false },
  ],
};

const mockReplies: ThreadMessage[] = [
  {
    id: 'reply-1',
    text: 'I think microservices could work well here. It would give us better scalability and allow teams to work independently.',
    user: {
      id: 'user-3',
      name: 'Mike Johnson',
      imageUrl: 'https://i.pravatar.cc/150?u=mike',
    },
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    reactions: [
      { emoji: '👍', count: 2, reacted: false },
    ],
  },
  {
    id: 'reply-2',
    text: 'Agreed! But we should also consider the added complexity. Have we thought about the deployment and monitoring aspects?',
    user: {
      id: 'user-4',
      name: 'Emily Davis',
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'reply-3',
    text: 'Good point Emily. We could use Kubernetes for orchestration and set up proper logging with ELK stack.',
    user: {
      id: 'user-1',
      name: 'John Doe',
      imageUrl: 'https://i.pravatar.cc/150?u=john',
    },
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    edited: true,
  },
  {
    id: 'reply-4',
    text: 'I can draft an architecture document with the proposed structure. Should have it ready by tomorrow.',
    user: {
      id: 'user-2',
      name: 'Sarah Chen',
      imageUrl: 'https://i.pravatar.cc/150?u=sarah',
    },
    createdAt: new Date(Date.now() - 900000).toISOString(),
    reactions: [
      { emoji: '🎉', count: 4, reacted: true },
      { emoji: '💪', count: 2, reacted: false },
    ],
  },
  {
    id: 'reply-5',
    text: 'Perfect! Looking forward to seeing it. Let\'s schedule a review meeting for Thursday.',
    user: {
      id: 'user-3',
      name: 'Mike Johnson',
      imageUrl: 'https://i.pravatar.cc/150?u=mike',
    },
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
];

const mockParticipants = [
  { id: 'user-1', name: 'John Doe', imageUrl: 'https://i.pravatar.cc/150?u=john' },
  { id: 'user-2', name: 'Sarah Chen', imageUrl: 'https://i.pravatar.cc/150?u=sarah' },
  { id: 'user-3', name: 'Mike Johnson', imageUrl: 'https://i.pravatar.cc/150?u=mike' },
  { id: 'user-4', name: 'Emily Davis' },
];

export const Default: Story = {
  args: {
    parentMessage: mockParentMessage,
    replies: mockReplies,
    replyCount: 5,
    participantCount: 4,
    participants: mockParticipants,
  },
};

export const Loading: Story = {
  args: {
    parentMessage: mockParentMessage,
    replies: [],
    loading: true,
    replyCount: 0,
  },
};

export const Empty: Story = {
  args: {
    parentMessage: mockParentMessage,
    replies: [],
    loading: false,
    replyCount: 0,
  },
};

export const WithMoreReplies: Story = {
  args: {
    parentMessage: mockParentMessage,
    replies: mockReplies.slice(-3),
    hasMoreReplies: true,
    replyCount: 15,
    participantCount: 8,
    participants: mockParticipants,
  },
};

export const WithAttachments: Story = {
  args: {
    parentMessage: {
      ...mockParentMessage,
      attachments: [
        { type: 'image', url: 'https://picsum.photos/400/300', name: 'architecture.png' },
      ],
    },
    replies: [
      {
        id: 'reply-1',
        text: 'Here\'s the updated diagram:',
        user: mockParticipants[1],
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        attachments: [
          { type: 'file', url: '#', name: 'architecture-v2.pdf', size: 2400000 },
        ],
      },
      ...mockReplies.slice(0, 2),
    ],
    replyCount: 3,
    participantCount: 3,
    participants: mockParticipants.slice(0, 3),
  },
};

export const WithDeletedMessage: Story = {
  args: {
    parentMessage: mockParentMessage,
    replies: [
      mockReplies[0],
      {
        id: 'deleted-1',
        text: 'This message was deleted',
        user: mockParticipants[2],
        createdAt: new Date(Date.now() - 1200000).toISOString(),
        deleted: true,
      },
      mockReplies[3],
    ],
    replyCount: 3,
    participantCount: 3,
    participants: mockParticipants.slice(0, 3),
  },
};
