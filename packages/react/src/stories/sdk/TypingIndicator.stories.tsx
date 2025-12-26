import type { Meta, StoryObj } from '@storybook/react';
import { TypingIndicator, TypingUser } from '../../components/sdk/TypingIndicator';

const meta: Meta<typeof TypingIndicator> = {
  title: 'SDK/TypingIndicator',
  component: TypingIndicator,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TypingIndicator>;

const mockUsers: TypingUser[] = [
  { id: 'user-1', name: 'Sarah Chen', imageUrl: 'https://i.pravatar.cc/150?u=sarah' },
  { id: 'user-2', name: 'Mike Johnson', imageUrl: 'https://i.pravatar.cc/150?u=mike' },
  { id: 'user-3', name: 'Emily Davis' },
  { id: 'user-4', name: 'John Doe', imageUrl: 'https://i.pravatar.cc/150?u=john' },
];

export const SingleUser: Story = {
  args: {
    users: [mockUsers[0]],
  },
};

export const TwoUsers: Story = {
  args: {
    users: mockUsers.slice(0, 2),
  },
};

export const ThreeUsers: Story = {
  args: {
    users: mockUsers.slice(0, 3),
  },
};

export const ManyUsers: Story = {
  args: {
    users: mockUsers,
    maxDisplayUsers: 2,
  },
};

export const InlineVariant: Story = {
  args: {
    users: mockUsers.slice(0, 2),
    variant: 'inline',
    showAvatars: true,
  },
};

export const BubbleVariant: Story = {
  args: {
    users: mockUsers.slice(0, 2),
    variant: 'bubble',
    showAvatars: true,
  },
};

export const MinimalVariant: Story = {
  args: {
    users: mockUsers.slice(0, 3),
    variant: 'minimal',
  },
};

export const DotsAnimation: Story = {
  args: {
    users: [mockUsers[0]],
    animationStyle: 'dots',
  },
};

export const WaveAnimation: Story = {
  args: {
    users: [mockUsers[0]],
    animationStyle: 'wave',
  },
};

export const PulseAnimation: Story = {
  args: {
    users: [mockUsers[0]],
    animationStyle: 'pulse',
  },
};

export const NoAvatars: Story = {
  args: {
    users: mockUsers.slice(0, 2),
    showAvatars: false,
  },
};

export const BubbleWithWave: Story = {
  args: {
    users: mockUsers.slice(0, 3),
    variant: 'bubble',
    animationStyle: 'wave',
    showAvatars: true,
  },
};
