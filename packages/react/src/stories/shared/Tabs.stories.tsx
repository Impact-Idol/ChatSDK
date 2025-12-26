import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from '../../components/shared/Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Shared/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const defaultTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

export const Default: Story = {
  args: {
    tabs: defaultTabs,
    onChange: (id) => console.log('Tab changed:', id),
  },
};

export const Pills: Story = {
  args: {
    tabs: defaultTabs,
    variant: 'pills',
  },
};

export const Underline: Story = {
  args: {
    tabs: defaultTabs,
    variant: 'underline',
  },
};

export const WithIcons: Story = {
  args: {
    tabs: [
      { id: 'home', label: 'Home', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
      { id: 'users', label: 'Users', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
      { id: 'settings', label: 'Settings', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
    ],
  },
};

export const WithBadges: Story = {
  args: {
    tabs: [
      { id: 'inbox', label: 'Inbox', badge: 12 },
      { id: 'sent', label: 'Sent', badge: 3 },
      { id: 'drafts', label: 'Drafts' },
    ],
  },
};

export const FullWidth: Story = {
  args: {
    tabs: defaultTabs,
    fullWidth: true,
  },
};

export const WithDisabled: Story = {
  args: {
    tabs: [
      { id: 'tab1', label: 'Active' },
      { id: 'tab2', label: 'Also Active' },
      { id: 'tab3', label: 'Disabled', disabled: true },
    ],
  },
};

export const Small: Story = {
  args: {
    tabs: defaultTabs,
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    tabs: defaultTabs,
    size: 'lg',
  },
};
