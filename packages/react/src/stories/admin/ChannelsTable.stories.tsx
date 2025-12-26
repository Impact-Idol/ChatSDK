import type { Meta, StoryObj } from '@storybook/react';
import { ChannelsTable, Channel } from '../../components/admin/ChannelsTable';

const meta: Meta<typeof ChannelsTable> = {
  title: 'Admin/ChannelsTable',
  component: ChannelsTable,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onChannelClick: (channel) => console.log('Channel clicked:', channel),
    onEditChannel: (channel) => console.log('Edit channel:', channel),
    onFreezeChannel: (channel) => console.log('Freeze channel:', channel),
    onArchiveChannel: (channel) => console.log('Archive channel:', channel),
    onDeleteChannel: (channel) => console.log('Delete channel:', channel),
    onPageChange: (page) => console.log('Page change:', page),
  },
};

export default meta;
type Story = StoryObj<typeof ChannelsTable>;

const mockChannels: Channel[] = [
  {
    id: '1',
    cid: 'messaging:general',
    type: 'messaging',
    name: 'General Discussion',
    description: 'Main channel for general discussions',
    memberCount: 1245,
    messageCount: 45230,
    createdBy: { id: '1', name: 'John Doe', imageUrl: 'https://i.pravatar.cc/150?u=john' },
    status: 'active',
    config: { readEvents: true, typingEvents: true, reactions: true, replies: true, uploads: true, urlEnrichment: true },
    lastMessageAt: new Date(Date.now() - 300000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: '2',
    cid: 'livestream:product-launch',
    type: 'livestream',
    name: 'Product Launch Event',
    memberCount: 5420,
    messageCount: 12450,
    createdBy: { id: '2', name: 'Sarah Smith' },
    status: 'active',
    config: { readEvents: false, typingEvents: false, reactions: true, replies: false, uploads: false, urlEnrichment: false, slowModeInterval: 30 },
    lastMessageAt: new Date(Date.now() - 60000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: '3',
    cid: 'team:engineering',
    type: 'team',
    name: 'Engineering Team',
    description: 'Private channel for engineering discussions',
    memberCount: 45,
    messageCount: 8920,
    createdBy: { id: '3', name: 'Mike Chen', imageUrl: 'https://i.pravatar.cc/150?u=mike' },
    status: 'active',
    config: { readEvents: true, typingEvents: true, reactions: true, replies: true, uploads: true, urlEnrichment: true },
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '4',
    cid: 'commerce:orders',
    type: 'commerce',
    name: 'Order Support',
    memberCount: 890,
    messageCount: 23100,
    createdBy: { id: '4', name: 'Emily Wilson' },
    status: 'frozen',
    config: { readEvents: true, typingEvents: true, reactions: true, replies: true, uploads: true, urlEnrichment: true },
    lastMessageAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 180).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '5',
    cid: 'support:tickets',
    type: 'support',
    name: 'Customer Support',
    memberCount: 120,
    messageCount: 56780,
    createdBy: { id: '5', name: 'David Brown', imageUrl: 'https://i.pravatar.cc/150?u=david' },
    status: 'active',
    config: { readEvents: true, typingEvents: true, reactions: true, replies: true, uploads: true, urlEnrichment: true },
    lastMessageAt: new Date(Date.now() - 120000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 365).toISOString(),
    updatedAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: '6',
    cid: 'messaging:archived-project',
    type: 'messaging',
    name: 'Project Alpha (Archived)',
    memberCount: 15,
    messageCount: 3400,
    createdBy: { id: '1', name: 'John Doe' },
    status: 'archived',
    config: { readEvents: true, typingEvents: true, reactions: true, replies: true, uploads: true, urlEnrichment: true },
    lastMessageAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 200).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
];

export const Default: Story = {
  args: {
    channels: mockChannels,
    totalCount: mockChannels.length,
    page: 1,
    pageSize: 10,
  },
};

export const Loading: Story = {
  args: {
    channels: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    channels: [],
    loading: false,
  },
};

export const ManyChannels: Story = {
  args: {
    channels: Array.from({ length: 25 }, (_, i) => ({
      ...mockChannels[i % mockChannels.length],
      id: `channel-${i}`,
      cid: `messaging:channel-${i}`,
      name: `Channel ${i + 1}`,
    })),
    totalCount: 100,
    page: 1,
    pageSize: 25,
  },
};
