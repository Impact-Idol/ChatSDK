import type { Meta, StoryObj } from '@storybook/react';
import { FileUploader } from '../../components/shared/FileUploader';

const meta: Meta<typeof FileUploader> = {
  title: 'Shared/FileUploader',
  component: FileUploader,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FileUploader>;

export const Default: Story = {
  args: {
    onUpload: (files) => console.log('Upload:', files),
    onRemove: (id) => console.log('Remove:', id),
  },
};

export const ImagesOnly: Story = {
  args: {
    accept: 'image/*',
    onUpload: (files) => console.log('Upload:', files),
  },
};

export const SingleFile: Story = {
  args: {
    multiple: false,
    maxFiles: 1,
    onUpload: (files) => console.log('Upload:', files),
  },
};

export const LargeLimit: Story = {
  args: {
    maxSize: 100 * 1024 * 1024,
    maxFiles: 20,
    onUpload: (files) => console.log('Upload:', files),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const NoPreview: Story = {
  args: {
    showPreview: false,
    onUpload: (files) => console.log('Upload:', files),
  },
};
