import type { Meta, StoryObj } from '@storybook/react';
import { Dashboard } from '../../components/admin/Dashboard';
import { Sidebar } from '../../components/admin/Sidebar';
import React, { useState } from 'react';

const meta: Meta<typeof Dashboard> = {
  title: 'Admin/Dashboard',
  component: Dashboard,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dashboard>;

const mockStats = {
  totalUsers: 24573,
  activeUsers: 8234,
  totalMessages: 1247832,
  totalChannels: 892,
  userGrowth: 12.5,
  messageGrowth: 23.1,
};

const mockMessageChart = [
  { label: 'Mon', value: 42000 },
  { label: 'Tue', value: 38000 },
  { label: 'Wed', value: 55000 },
  { label: 'Thu', value: 48000 },
  { label: 'Fri', value: 62000 },
  { label: 'Sat', value: 35000 },
  { label: 'Sun', value: 28000 },
];

const mockUserChart = [
  { label: 'Mon', value: 5200 },
  { label: 'Tue', value: 4800 },
  { label: 'Wed', value: 6100 },
  { label: 'Thu', value: 5900 },
  { label: 'Fri', value: 7200 },
  { label: 'Sat', value: 4100 },
  { label: 'Sun', value: 3500 },
];

const mockActivity = [
  {
    id: '1',
    type: 'user' as const,
    title: 'New user registered',
    description: 'john.doe@example.com joined the platform',
    timestamp: '2 min ago',
  },
  {
    id: '2',
    type: 'channel' as const,
    title: 'Channel created',
    description: 'Engineering Team created a new channel',
    timestamp: '15 min ago',
  },
  {
    id: '3',
    type: 'message' as const,
    title: 'Spike in messages',
    description: '2,400 messages sent in the last hour',
    timestamp: '1 hour ago',
  },
  {
    id: '4',
    type: 'app' as const,
    title: 'New app connected',
    description: 'Acme Corp integrated the SDK',
    timestamp: '3 hours ago',
  },
];

const mockTopChannels = [
  { name: 'General Discussion', messages: 45230, members: 1250 },
  { name: 'Engineering', messages: 32100, members: 89 },
  { name: 'Product Updates', messages: 28900, members: 456 },
  { name: 'Support', messages: 21500, members: 234 },
  { name: 'Random', messages: 18700, members: 890 },
];

export const Default: Story = {
  args: {
    stats: mockStats,
    messageChart: mockMessageChart,
    userChart: mockUserChart,
    recentActivity: mockActivity,
    topChannels: mockTopChannels,
  },
};

// Full Admin Layout with Sidebar
const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'apps',
    label: 'Applications',
    badge: 12,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    id: 'users',
    label: 'Users',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'channels',
    label: 'Channels',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="10" y1="3" x2="8" y2="21" />
        <line x1="16" y1="3" x2="14" y2="21" />
      </svg>
    ),
  },
  {
    id: 'moderation',
    label: 'Moderation',
    badge: 'New',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    children: [
      {
        id: 'moderation-reports',
        label: 'Reports',
        badge: 5,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        ),
      },
      {
        id: 'moderation-banned',
        label: 'Banned Users',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const AdminLayoutExample = () => {
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        items={navItems}
        activeId={activeNav}
        onNavigate={setActiveNav}
        user={{
          name: 'John Doe',
          email: 'john@example.com',
          avatar: 'https://i.pravatar.cc/150?u=admin',
        }}
        onLogout={() => console.log('Logout clicked')}
      />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Dashboard
          stats={mockStats}
          messageChart={mockMessageChart}
          userChart={mockUserChart}
          recentActivity={mockActivity}
          topChannels={mockTopChannels}
        />
      </div>
    </div>
  );
};

export const FullAdminLayout: Story = {
  render: () => <AdminLayoutExample />,
};
