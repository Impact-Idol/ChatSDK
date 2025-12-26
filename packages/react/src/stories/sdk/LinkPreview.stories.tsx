import type { Meta, StoryObj } from '@storybook/react';
import { LinkPreview } from '../../components/sdk/LinkPreview';

const meta: Meta<typeof LinkPreview> = {
  title: 'SDK/LinkPreview',
  component: LinkPreview,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof LinkPreview>;

export const Default: Story = {
  args: {
    url: 'https://github.com/anthropics/anthropic-sdk-python',
    title: 'anthropics/anthropic-sdk-python',
    description: 'Official Python SDK for the Anthropic API. Build powerful AI applications with Claude.',
    imageUrl: 'https://opengraph.githubassets.com/1/anthropics/anthropic-sdk-python',
    siteName: 'GitHub',
    faviconUrl: 'https://github.githubassets.com/favicons/favicon.svg',
  },
};

export const Compact: Story = {
  args: {
    url: 'https://example.com/article',
    title: 'Understanding Large Language Models',
    description: 'A comprehensive guide to how LLMs work and their applications.',
    siteName: 'Tech Blog',
    variant: 'compact',
  },
};

export const Minimal: Story = {
  args: {
    url: 'https://docs.example.com/api',
    title: 'API Documentation',
    siteName: 'Example Docs',
    variant: 'minimal',
  },
};

export const Loading: Story = {
  args: {
    url: 'https://example.com/loading',
    loading: true,
  },
};

export const WithError: Story = {
  args: {
    url: 'https://example.com/broken',
    error: 'Failed to load preview',
  },
};

export const NoImage: Story = {
  args: {
    url: 'https://example.com/text-only',
    title: 'Text-only Article',
    description: 'This article has no preview image but contains valuable information about development best practices.',
    siteName: 'Dev Weekly',
    faviconUrl: 'https://example.com/favicon.ico',
  },
};

export const LongDescription: Story = {
  args: {
    url: 'https://example.com/long',
    title: 'The Complete Guide to Modern Web Development',
    description: 'This comprehensive guide covers everything you need to know about modern web development, including React, TypeScript, Node.js, and cloud deployment strategies. Learn how to build scalable, maintainable applications that delight users.',
    imageUrl: 'https://picsum.photos/800/400',
    siteName: 'Web Dev Academy',
  },
};
