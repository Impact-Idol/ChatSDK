import type { Meta, StoryObj } from '@storybook/react';
import { MediaGallery, MediaItem } from '../../components/sdk/MediaGallery';

const meta: Meta<typeof MediaGallery> = {
  title: 'SDK/MediaGallery',
  component: MediaGallery,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onItemClick: (item) => console.log('Item clicked:', item),
    onDownload: (item) => console.log('Download:', item),
    onDelete: (item) => console.log('Delete:', item),
    onGoToMessage: (messageId, channelId) => console.log('Go to message:', messageId, channelId),
    canDelete: true,
  },
};

export default meta;
type Story = StoryObj<typeof MediaGallery>;

const mockItems: MediaItem[] = [
  {
    id: '1',
    type: 'image',
    url: 'https://picsum.photos/800/600?random=1',
    thumbnailUrl: 'https://picsum.photos/200/200?random=1',
    name: 'vacation-photo.jpg',
    size: 2450000,
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
    uploadedBy: { id: 'user-1', name: 'John Doe', imageUrl: 'https://i.pravatar.cc/150?u=john' },
    uploadedAt: new Date(Date.now() - 3600000).toISOString(),
    messageId: 'msg-1',
    channelId: 'ch-1',
  },
  {
    id: '2',
    type: 'image',
    url: 'https://picsum.photos/1200/800?random=2',
    thumbnailUrl: 'https://picsum.photos/200/200?random=2',
    name: 'team-meeting.png',
    size: 1890000,
    mimeType: 'image/png',
    uploadedBy: { id: 'user-2', name: 'Sarah Smith' },
    uploadedAt: new Date(Date.now() - 7200000).toISOString(),
    messageId: 'msg-2',
    channelId: 'ch-1',
  },
  {
    id: '3',
    type: 'video',
    url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://picsum.photos/200/200?random=3',
    name: 'product-demo.mp4',
    size: 15600000,
    mimeType: 'video/mp4',
    duration: 120,
    uploadedBy: { id: 'user-3', name: 'Mike Chen', imageUrl: 'https://i.pravatar.cc/150?u=mike' },
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    messageId: 'msg-3',
    channelId: 'ch-1',
  },
  {
    id: '4',
    type: 'image',
    url: 'https://picsum.photos/600/800?random=4',
    thumbnailUrl: 'https://picsum.photos/200/200?random=4',
    name: 'screenshot.png',
    size: 456000,
    mimeType: 'image/png',
    uploadedBy: { id: 'user-4', name: 'Emily Wilson' },
    uploadedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '5',
    type: 'audio',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    name: 'voice-message.mp3',
    size: 3200000,
    mimeType: 'audio/mpeg',
    duration: 185,
    uploadedBy: { id: 'user-1', name: 'John Doe', imageUrl: 'https://i.pravatar.cc/150?u=john' },
    uploadedAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: '6',
    type: 'file',
    url: '#',
    name: 'project-report.pdf',
    size: 5670000,
    mimeType: 'application/pdf',
    uploadedBy: { id: 'user-2', name: 'Sarah Smith' },
    uploadedAt: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: '7',
    type: 'image',
    url: 'https://picsum.photos/1000/1000?random=7',
    thumbnailUrl: 'https://picsum.photos/200/200?random=7',
    name: 'design-mockup.jpg',
    size: 890000,
    mimeType: 'image/jpeg',
    uploadedBy: { id: 'user-5', name: 'David Brown' },
    uploadedAt: new Date(Date.now() - 432000000).toISOString(),
  },
  {
    id: '8',
    type: 'video',
    url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://picsum.photos/200/200?random=8',
    name: 'tutorial.mp4',
    size: 28900000,
    mimeType: 'video/mp4',
    duration: 340,
    uploadedBy: { id: 'user-3', name: 'Mike Chen', imageUrl: 'https://i.pravatar.cc/150?u=mike' },
    uploadedAt: new Date(Date.now() - 518400000).toISOString(),
  },
];

export const Default: Story = {
  args: {
    items: mockItems,
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
    loading: false,
  },
};

export const ImagesOnly: Story = {
  args: {
    items: mockItems.filter(i => i.type === 'image'),
    initialFilter: 'image',
  },
};

export const ThreeColumns: Story = {
  args: {
    items: mockItems,
    gridColumns: 3,
  },
};

export const FiveColumns: Story = {
  args: {
    items: mockItems,
    gridColumns: 5,
  },
};
