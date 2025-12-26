import type { Meta, StoryObj } from '@storybook/react';
import { ModerationQueue, ReportedContent } from '../../components/admin/ModerationQueue';

const meta: Meta<typeof ModerationQueue> = {
  title: 'Admin/ModerationQueue',
  component: ModerationQueue,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onReviewReport: (report) => console.log('Review report:', report),
    onTakeAction: (report, action, note) => console.log('Action:', action, 'on', report, note),
    onDismissReport: (report) => console.log('Dismiss:', report),
    onViewUser: (userId) => console.log('View user:', userId),
    onViewChannel: (channelId) => console.log('View channel:', channelId),
    onViewMessage: (messageId, channelId) => console.log('View message:', messageId, channelId),
  },
};

export default meta;
type Story = StoryObj<typeof ModerationQueue>;

const mockReports: ReportedContent[] = [
  {
    id: '1',
    type: 'message',
    content: {
      id: 'msg-1',
      text: 'This is an inappropriate message that violates community guidelines. It contains harmful content that should be reviewed.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    reportedUser: {
      id: 'user-1',
      name: 'ToxicUser123',
      imageUrl: 'https://i.pravatar.cc/150?u=toxic',
    },
    channel: {
      id: 'ch-1',
      name: 'General Chat',
      cid: 'messaging:general',
    },
    reporter: {
      id: 'reporter-1',
      name: 'John Doe',
      imageUrl: 'https://i.pravatar.cc/150?u=john',
    },
    reason: 'harassment',
    details: 'This user has been repeatedly sending harassing messages to me and others.',
    status: 'pending',
    priority: 'high',
    aiScore: 0.87,
    aiCategories: ['harassment', 'profanity'],
    reportCount: 5,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: '2',
    type: 'message',
    content: {
      id: 'msg-2',
      text: 'Buy now! Best deals ever! Click here for free money!!! www.spam-link.com',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    reportedUser: {
      id: 'user-2',
      name: 'SpamBot2024',
    },
    channel: {
      id: 'ch-2',
      name: 'Marketplace',
      cid: 'messaging:marketplace',
    },
    reporter: {
      id: 'reporter-2',
      name: 'Jane Smith',
    },
    reason: 'spam',
    status: 'pending',
    priority: 'medium',
    aiScore: 0.95,
    aiCategories: ['spam', 'phishing'],
    reportCount: 12,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    type: 'message',
    content: {
      id: 'msg-3',
      text: 'Extremely offensive hate speech content that targets a specific group...',
      createdAt: new Date(Date.now() - 900000).toISOString(),
    },
    reportedUser: {
      id: 'user-3',
      name: 'HatefulUser',
      imageUrl: 'https://i.pravatar.cc/150?u=hateful',
    },
    channel: {
      id: 'ch-1',
      name: 'General Chat',
      cid: 'messaging:general',
    },
    reporter: {
      id: 'reporter-3',
      name: 'Moderator Team',
    },
    reason: 'hate_speech',
    details: 'This content directly violates our hate speech policy.',
    status: 'pending',
    priority: 'critical',
    aiScore: 0.98,
    aiCategories: ['hate_speech', 'discrimination'],
    reportCount: 23,
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: '4',
    type: 'user',
    content: {
      id: 'user-4',
      text: 'User profile with inappropriate content',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    reportedUser: {
      id: 'user-4',
      name: 'SuspiciousProfile',
      imageUrl: 'https://i.pravatar.cc/150?u=suspicious',
    },
    reporter: {
      id: 'reporter-4',
      name: 'Community Member',
    },
    reason: 'impersonation',
    details: 'This user is pretending to be a company representative.',
    status: 'reviewed',
    priority: 'medium',
    reportCount: 3,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    reviewedAt: new Date(Date.now() - 7200000).toISOString(),
    reviewedBy: { id: 'mod-1', name: 'Mod Sarah' },
  },
  {
    id: '5',
    type: 'message',
    content: {
      id: 'msg-5',
      text: 'Minor infraction that was already addressed.',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    reportedUser: {
      id: 'user-5',
      name: 'RegularUser',
    },
    channel: {
      id: 'ch-3',
      name: 'Random',
      cid: 'messaging:random',
    },
    reporter: {
      id: 'reporter-5',
      name: 'Another User',
    },
    reason: 'other',
    status: 'actioned',
    priority: 'low',
    reportCount: 1,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    reviewedAt: new Date(Date.now() - 86400000).toISOString(),
    reviewedBy: { id: 'mod-2', name: 'Mod Alex' },
    action: 'warn',
  },
];

export const Default: Story = {
  args: {
    reports: mockReports,
  },
};

export const Loading: Story = {
  args: {
    reports: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    reports: [],
    loading: false,
  },
};

export const CriticalOnly: Story = {
  args: {
    reports: mockReports.filter(r => r.priority === 'critical'),
  },
};

export const PendingOnly: Story = {
  args: {
    reports: mockReports.filter(r => r.status === 'pending'),
  },
};
