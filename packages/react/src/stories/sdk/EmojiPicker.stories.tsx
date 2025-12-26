import type { Meta, StoryObj } from '@storybook/react';
import { EmojiPicker, Emoji } from '../../components/sdk/EmojiPicker';

const meta: Meta<typeof EmojiPicker> = {
  title: 'SDK/EmojiPicker',
  component: EmojiPicker,
  parameters: {
    layout: 'centered',
  },
  args: {
    onSelect: (emoji: Emoji) => console.log('Selected emoji:', emoji),
    onClose: () => console.log('Picker closed'),
    onSkinToneChange: (tone) => console.log('Skin tone:', tone),
  },
};

export default meta;
type Story = StoryObj<typeof EmojiPicker>;

const recentEmojis: Emoji[] = [
  { id: 'thumbsup', native: '👍', name: 'Thumbs Up', shortcodes: [':thumbsup:'], keywords: ['yes'] },
  { id: 'heart', native: '❤️', name: 'Red Heart', shortcodes: [':heart:'], keywords: ['love'] },
  { id: 'joy', native: '😂', name: 'Face with Tears of Joy', shortcodes: [':joy:'], keywords: ['laugh'] },
  { id: 'fire', native: '🔥', name: 'Fire', shortcodes: [':fire:'], keywords: ['hot'] },
  { id: 'rocket', native: '🚀', name: 'Rocket', shortcodes: [':rocket:'], keywords: ['launch'] },
  { id: 'check', native: '✅', name: 'Check Mark', shortcodes: [':check:'], keywords: ['yes'] },
  { id: 'tada', native: '🎉', name: 'Party Popper', shortcodes: [':tada:'], keywords: ['party'] },
  { id: 'eyes', native: '👀', name: 'Eyes', shortcodes: [':eyes:'], keywords: ['look'] },
];

export const Default: Story = {
  args: {},
};

export const WithRecentEmojis: Story = {
  args: {
    recentEmojis,
  },
};

export const NoSearch: Story = {
  args: {
    showSearch: false,
  },
};

export const NoPreview: Story = {
  args: {
    showPreview: false,
  },
};

export const NoSkinTones: Story = {
  args: {
    showSkinTones: false,
  },
};

export const Minimal: Story = {
  args: {
    showSearch: false,
    showPreview: false,
    showSkinTones: false,
  },
};

export const WithSkinTone: Story = {
  args: {
    skinTone: 3,
    recentEmojis,
  },
};
