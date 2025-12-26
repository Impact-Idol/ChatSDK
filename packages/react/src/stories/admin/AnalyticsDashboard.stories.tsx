import type { Meta, StoryObj } from '@storybook/react';
import { AnalyticsDashboard, AnalyticsData } from '../../components/admin/AnalyticsDashboard';

const meta: Meta<typeof AnalyticsDashboard> = {
  title: 'Admin/AnalyticsDashboard',
  component: AnalyticsDashboard,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof AnalyticsDashboard>;

const generateDailyData = (days: number) => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    return {
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 5000) + 1000,
    };
  });
};

const mockData: AnalyticsData = {
  mau: 125000,
  mauChange: 12.5,
  dau: 42000,
  dauChange: 8.3,
  totalMessages: 2450000,
  messagesChange: 15.2,
  activeChannels: 856,
  channelsChange: 5.1,
  avgSessionDuration: 845,
  sessionChange: -2.3,
  messagesByDay: generateDailyData(30),
  usersByDay: generateDailyData(30).map(d => ({ ...d, count: Math.floor(d.count / 3) })),
  topChannels: [
    { name: 'general', messages: 125000, members: 5000 },
    { name: 'engineering', messages: 89000, members: 450 },
    { name: 'design', messages: 67000, members: 320 },
    { name: 'marketing', messages: 45000, members: 180 },
    { name: 'support', messages: 38000, members: 120 },
  ],
  userRetention: [
    { week: 'Week 1', percentage: 100 },
    { week: 'Week 2', percentage: 68 },
    { week: 'Week 3', percentage: 52 },
    { week: 'Week 4', percentage: 45 },
    { week: 'Week 5', percentage: 40 },
    { week: 'Week 6', percentage: 38 },
    { week: 'Week 7', percentage: 35 },
    { week: 'Week 8', percentage: 33 },
  ],
  messageTypes: [
    { type: 'Text', count: 1800000, percentage: 73 },
    { type: 'Images', count: 350000, percentage: 14 },
    { type: 'Files', count: 200000, percentage: 8 },
    { type: 'Reactions', count: 100000, percentage: 5 },
  ],
  peakHours: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    messages: Math.floor(Math.sin((i - 6) * Math.PI / 12) * 5000 + 6000 + Math.random() * 2000),
  })),
};

export const Default: Story = {
  args: {
    data: mockData,
  },
};

export const Loading: Story = {
  args: {
    data: mockData,
    loading: true,
  },
};

export const NegativeChanges: Story = {
  args: {
    data: {
      ...mockData,
      mauChange: -5.2,
      dauChange: -3.1,
      messagesChange: -8.5,
      channelsChange: -2.0,
      sessionChange: -12.3,
    },
  },
};
