import type { Meta, StoryObj } from '@storybook/react';
import { AttachmentPreview } from '../../components/sdk/AttachmentPreview';

const meta: Meta<typeof AttachmentPreview> = {
  title: 'SDK/AttachmentPreview',
  component: AttachmentPreview,
  parameters: {
    layout: 'padded',
  },
  args: {
    onRemove: (id) => console.log('Remove:', id),
    onRetry: (id) => console.log('Retry:', id),
  },
};

export default meta;
type Story = StoryObj<typeof AttachmentPreview>;

export const SingleImage: Story = {
  args: {
    attachments: [
      {
        id: '1',
        name: 'screenshot.png',
        size: 245000,
        type: 'image/png',
        previewUrl: 'https://picsum.photos/400/300',
        status: 'complete',
      },
    ],
  },
};

export const MultipleImages: Story = {
  args: {
    attachments: [
      {
        id: '1',
        name: 'photo1.jpg',
        size: 1200000,
        type: 'image/jpeg',
        previewUrl: 'https://picsum.photos/400/300',
        status: 'complete',
      },
      {
        id: '2',
        name: 'photo2.jpg',
        size: 980000,
        type: 'image/jpeg',
        previewUrl: 'https://picsum.photos/400/301',
        status: 'complete',
      },
      {
        id: '3',
        name: 'photo3.jpg',
        size: 1500000,
        type: 'image/jpeg',
        previewUrl: 'https://picsum.photos/400/302',
        status: 'complete',
      },
    ],
  },
};

export const Uploading: Story = {
  args: {
    attachments: [
      {
        id: '1',
        name: 'large-file.zip',
        size: 52000000,
        type: 'application/zip',
        status: 'uploading',
        progress: 45,
      },
      {
        id: '2',
        name: 'video.mp4',
        size: 128000000,
        type: 'video/mp4',
        status: 'uploading',
        progress: 78,
      },
    ],
  },
};

export const WithError: Story = {
  args: {
    attachments: [
      {
        id: '1',
        name: 'failed-upload.pdf',
        size: 5000000,
        type: 'application/pdf',
        status: 'error',
        error: 'Upload failed. Please try again.',
      },
    ],
  },
};

export const MixedTypes: Story = {
  args: {
    attachments: [
      {
        id: '1',
        name: 'document.pdf',
        size: 2500000,
        type: 'application/pdf',
        status: 'complete',
      },
      {
        id: '2',
        name: 'presentation.pptx',
        size: 5000000,
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        status: 'uploading',
        progress: 60,
      },
      {
        id: '3',
        name: 'recording.mp3',
        size: 8000000,
        type: 'audio/mpeg',
        status: 'complete',
      },
    ],
  },
};

export const Pending: Story = {
  args: {
    attachments: [
      {
        id: '1',
        name: 'queued-file.doc',
        size: 1000000,
        type: 'application/msword',
        status: 'pending',
      },
    ],
  },
};
