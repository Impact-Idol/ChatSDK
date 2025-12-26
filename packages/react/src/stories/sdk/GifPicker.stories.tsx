import type { Meta, StoryObj } from '@storybook/react';
import { GifPicker } from '../../components/sdk/GifPicker';

const meta: Meta<typeof GifPicker> = {
  title: 'SDK/GifPicker',
  component: GifPicker,
  parameters: {
    layout: 'centered',
  },
  args: {
    onSelect: (gif) => console.log('Selected GIF:', gif),
    onClose: () => console.log('Closed'),
  },
};

export default meta;
type Story = StoryObj<typeof GifPicker>;

export const Default: Story = {
  args: {},
};

export const WithSearchQuery: Story = {
  args: {
    initialSearchQuery: 'happy',
  },
};

export const NoCategories: Story = {
  args: {
    showCategories: false,
  },
};

export const NoTrending: Story = {
  args: {
    showTrending: false,
  },
};

export const MinimalView: Story = {
  args: {
    showCategories: false,
    showTrending: false,
  },
};

export const CustomProvider: Story = {
  args: {
    provider: 'tenor',
  },
};
