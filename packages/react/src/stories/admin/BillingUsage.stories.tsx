import type { Meta, StoryObj } from '@storybook/react';
import { BillingUsage } from '../../components/admin/BillingUsage';

const meta: Meta<typeof BillingUsage> = {
  title: 'Admin/BillingUsage',
  component: BillingUsage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof BillingUsage>;

const currentPlan = {
  id: 'pro',
  name: 'Pro',
  price: 99,
  interval: 'monthly' as const,
  features: ['100K MAU', '10M Messages', '50GB Storage', 'Priority Support'],
  limits: {
    mau: 100000,
    messages: 10000000,
    storage: 50,
    channels: 1000,
  },
};

const usage = [
  { name: 'Monthly Active Users', current: 78500, limit: 100000, unit: 'users' },
  { name: 'Messages', current: 8250000, limit: 10000000, unit: 'messages' },
  { name: 'Storage', current: 32, limit: 50, unit: 'GB' },
  { name: 'Channels', current: 456, limit: 1000, unit: 'channels' },
];

const invoices = [
  { id: 'INV-001', date: new Date(Date.now() - 2592000000).toISOString(), amount: 99, status: 'paid' as const, downloadUrl: '#' },
  { id: 'INV-002', date: new Date(Date.now() - 5184000000).toISOString(), amount: 99, status: 'paid' as const, downloadUrl: '#' },
  { id: 'INV-003', date: new Date(Date.now() - 7776000000).toISOString(), amount: 99, status: 'paid' as const, downloadUrl: '#' },
  { id: 'INV-004', date: new Date(Date.now() - 10368000000).toISOString(), amount: 49, status: 'paid' as const, downloadUrl: '#' },
];

const usageHistory = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
  mau: Math.floor(70000 + Math.random() * 10000),
  messages: Math.floor(200000 + Math.random() * 100000),
}));

export const Default: Story = {
  args: {
    currentPlan,
    usage,
    invoices,
    usageHistory,
    nextBillingDate: new Date(Date.now() + 604800000).toISOString(),
    onUpgrade: () => console.log('Upgrade clicked'),
    onDownloadInvoice: (id) => console.log('Download invoice:', id),
  },
};

export const NearLimits: Story = {
  args: {
    currentPlan,
    usage: usage.map(u => ({
      ...u,
      current: Math.floor(u.limit * 0.92),
      overage: u.name === 'Messages' ? 12.50 : undefined,
    })),
    invoices,
    usageHistory,
    nextBillingDate: new Date(Date.now() + 604800000).toISOString(),
  },
};

export const FreePlan: Story = {
  args: {
    currentPlan: {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: 'monthly' as const,
      features: ['1K MAU', '10K Messages', '1GB Storage'],
      limits: { mau: 1000, messages: 10000, storage: 1, channels: 10 },
    },
    usage: [
      { name: 'Monthly Active Users', current: 850, limit: 1000, unit: 'users' },
      { name: 'Messages', current: 8500, limit: 10000, unit: 'messages' },
      { name: 'Storage', current: 0.8, limit: 1, unit: 'GB' },
    ],
    invoices: [],
    usageHistory: usageHistory.map(h => ({ ...h, mau: Math.floor(h.mau / 100), messages: Math.floor(h.messages / 100) })),
  },
};
