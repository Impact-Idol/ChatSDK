import type { Meta, StoryObj } from '@storybook/react';
import { ExportTools } from '../../components/admin/ExportTools';

const meta: Meta<typeof ExportTools> = {
  title: 'Admin/ExportTools',
  component: ExportTools,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ExportTools>;

const jobs = [
  {
    id: 'exp-1',
    type: 'messages' as const,
    status: 'completed' as const,
    progress: 100,
    format: 'json' as const,
    fileSize: 52428800,
    downloadUrl: '#',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3000000).toISOString(),
  },
  {
    id: 'exp-2',
    type: 'users' as const,
    status: 'processing' as const,
    progress: 67,
    format: 'csv' as const,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'exp-3',
    type: 'analytics' as const,
    status: 'failed' as const,
    progress: 45,
    format: 'xlsx' as const,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    error: 'Export failed due to timeout',
  },
  {
    id: 'exp-4',
    type: 'channels' as const,
    status: 'pending' as const,
    progress: 0,
    format: 'json' as const,
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
];

export const Default: Story = {
  args: {
    jobs,
    onCreateExport: (config) => console.log('Create export:', config),
    onDownload: (id) => console.log('Download:', id),
    onDelete: (id) => console.log('Delete:', id),
  },
};

export const Empty: Story = {
  args: {
    jobs: [],
  },
};

export const AllComplete: Story = {
  args: {
    jobs: jobs.map(j => ({
      ...j,
      status: 'completed' as const,
      progress: 100,
      fileSize: Math.floor(Math.random() * 100000000),
      downloadUrl: '#',
      completedAt: new Date().toISOString(),
    })),
  },
};
