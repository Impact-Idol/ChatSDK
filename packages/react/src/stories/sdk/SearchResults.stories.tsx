import type { Meta, StoryObj } from '@storybook/react';
import { SearchResults, SearchResult } from '../../components/sdk/SearchResults';

const meta: Meta<typeof SearchResults> = {
  title: 'SDK/SearchResults',
  component: SearchResults,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onFilterChange: (filter) => console.log('Filter:', filter),
    onResultClick: (result) => console.log('Result clicked:', result),
    onLoadMore: () => console.log('Load more'),
  },
};

export default meta;
type Story = StoryObj<typeof SearchResults>;

const mockResults: SearchResult[] = [
  {
    id: 'msg-1',
    type: 'message',
    text: 'Hey team, I just finished the new feature implementation. Can someone review my PR?',
    user: { id: 'user-1', name: 'John Doe', imageUrl: 'https://i.pravatar.cc/150?u=john' },
    channel: { id: 'ch-1', name: 'Engineering', cid: 'messaging:engineering' },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    replyCount: 5,
    reactionCount: 3,
  },
  {
    id: 'msg-2',
    type: 'message',
    text: 'The new feature looks great! I will review it this afternoon.',
    user: { id: 'user-2', name: 'Sarah Smith', imageUrl: 'https://i.pravatar.cc/150?u=sarah' },
    channel: { id: 'ch-1', name: 'Engineering', cid: 'messaging:engineering' },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    replyCount: 2,
  },
  {
    id: 'ch-1',
    type: 'channel',
    name: 'Feature Requests',
    description: 'Channel for discussing new feature ideas and requests from users',
    memberCount: 45,
    lastMessageAt: new Date(Date.now() - 1800000).toISOString(),
    cid: 'messaging:feature-requests',
  },
  {
    id: 'user-1',
    type: 'user',
    name: 'John Doe',
    imageUrl: 'https://i.pravatar.cc/150?u=john',
    presence: 'online',
    role: 'Senior Developer',
    bio: 'Full-stack developer passionate about building great products',
  },
  {
    id: 'user-2',
    type: 'user',
    name: 'Sarah Smith',
    imageUrl: 'https://i.pravatar.cc/150?u=sarah',
    presence: 'away',
    role: 'Product Manager',
  },
  {
    id: 'file-1',
    type: 'file',
    name: 'feature-spec.pdf',
    mimeType: 'application/pdf',
    size: 2450000,
    url: '#',
    uploadedBy: { id: 'user-1', name: 'John Doe' },
    channel: { id: 'ch-1', name: 'Engineering' },
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'msg-3',
    type: 'message',
    text: 'Can we schedule a feature review meeting for next week?',
    user: { id: 'user-3', name: 'Mike Chen' },
    channel: { id: 'ch-2', name: 'General', cid: 'messaging:general' },
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    attachmentCount: 1,
  },
  {
    id: 'ch-2',
    type: 'channel',
    name: 'New Features Beta',
    description: 'Testing channel for new features before release',
    imageUrl: 'https://picsum.photos/100/100?random=1',
    memberCount: 12,
    cid: 'messaging:new-features-beta',
  },
  {
    id: 'file-2',
    type: 'file',
    name: 'feature-mockup.png',
    mimeType: 'image/png',
    size: 890000,
    url: '#',
    thumbnailUrl: 'https://picsum.photos/100/100?random=2',
    uploadedBy: { id: 'user-2', name: 'Sarah Smith' },
    channel: { id: 'ch-1', name: 'Engineering' },
    uploadedAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

export const Default: Story = {
  args: {
    query: 'feature',
    results: mockResults,
    totalCount: mockResults.length,
    activeFilter: 'all',
    hasMore: true,
  },
};

export const Loading: Story = {
  args: {
    query: 'feature',
    results: [],
    loading: true,
  },
};

export const NoResults: Story = {
  args: {
    query: 'xyznonexistent',
    results: [],
    loading: false,
  },
};

export const MessagesOnly: Story = {
  args: {
    query: 'feature',
    results: mockResults.filter(r => r.type === 'message'),
    activeFilter: 'message',
  },
};

export const ChannelsOnly: Story = {
  args: {
    query: 'feature',
    results: mockResults.filter(r => r.type === 'channel'),
    activeFilter: 'channel',
  },
};

export const UsersOnly: Story = {
  args: {
    query: 'john',
    results: mockResults.filter(r => r.type === 'user'),
    activeFilter: 'user',
  },
};
