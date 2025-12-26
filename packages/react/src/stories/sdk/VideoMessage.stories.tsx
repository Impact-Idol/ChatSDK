import type { Meta, StoryObj } from '@storybook/react';
import { VideoMessage } from '../../components/sdk/VideoMessage';

const meta: Meta<typeof VideoMessage> = {
  title: 'SDK/VideoMessage',
  component: VideoMessage,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem', background: '#f8fafc' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof VideoMessage>;

// Sample video URL (Big Buck Bunny - open source video)
const sampleVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const sampleThumbnail = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=225&fit=crop';

export const Default: Story = {
  args: {
    url: sampleVideoUrl,
    thumbnailUrl: sampleThumbnail,
    duration: 596,
    isOwn: false,
  },
};

export const OwnMessage: Story = {
  args: {
    url: sampleVideoUrl,
    thumbnailUrl: sampleThumbnail,
    duration: 127,
    isOwn: true,
  },
};

export const ShortClip: Story = {
  args: {
    url: sampleVideoUrl,
    thumbnailUrl: sampleThumbnail,
    duration: 15,
    width: 320,
    height: 180,
    isOwn: false,
  },
};

export const LargeVideo: Story = {
  args: {
    url: sampleVideoUrl,
    thumbnailUrl: sampleThumbnail,
    duration: 245,
    width: 480,
    height: 270,
    isOwn: false,
  },
};

export const NoThumbnail: Story = {
  args: {
    url: sampleVideoUrl,
    duration: 180,
    isOwn: false,
  },
};

export const WithCallbacks: Story = {
  args: {
    url: sampleVideoUrl,
    thumbnailUrl: sampleThumbnail,
    duration: 60,
    isOwn: false,
    onPlay: () => console.log('Video started playing'),
    onPause: () => console.log('Video paused'),
    onEnded: () => console.log('Video ended'),
    onFullscreen: () => console.log('Fullscreen toggled'),
  },
};
