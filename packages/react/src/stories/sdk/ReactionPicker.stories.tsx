import type { Meta, StoryObj } from '@storybook/react';
import { ReactionPicker } from '../../components/sdk/ReactionPicker';

const meta: Meta<typeof ReactionPicker> = {
  title: 'SDK/ReactionPicker',
  component: ReactionPicker,
  parameters: {
    layout: 'centered',
  },
  args: {
    onSelect: (emoji) => console.log('Selected:', emoji),
    onClose: () => console.log('Closed'),
  },
};

export default meta;
type Story = StoryObj<typeof ReactionPicker>;

export const Default: Story = {
  args: {},
};

export const WithFrequentReactions: Story = {
  args: {
    frequentReactions: ['👍', '❤️', '😂', '🎉', '🔥', '✅'],
  },
};

export const NoQuickBar: Story = {
  args: {
    showQuickBar: false,
  },
};

export const NoSearch: Story = {
  args: {
    showSearch: false,
  },
};

export const NoCategories: Story = {
  args: {
    showCategories: false,
  },
};

export const Minimal: Story = {
  args: {
    showQuickBar: true,
    showSearch: false,
    showCategories: false,
  },
};
