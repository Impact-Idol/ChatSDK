import type { Meta, StoryObj } from '@storybook/react';
import { WebhooksManager, Webhook, WebhookDelivery } from '../../components/admin/WebhooksManager';

const meta: Meta<typeof WebhooksManager> = {
  title: 'Admin/WebhooksManager',
  component: WebhooksManager,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onCreateWebhook: () => console.log('Create webhook clicked'),
    onEditWebhook: (webhook) => console.log('Edit webhook:', webhook),
    onDeleteWebhook: (webhook) => console.log('Delete webhook:', webhook),
    onToggleWebhook: (webhook, enabled) => console.log('Toggle webhook:', webhook, enabled),
    onTestWebhook: (webhook) => console.log('Test webhook:', webhook),
    onViewDeliveries: (webhook) => console.log('View deliveries:', webhook),
    onRetryDelivery: (webhook, delivery) => console.log('Retry delivery:', webhook, delivery),
  },
};

export default meta;
type Story = StoryObj<typeof WebhooksManager>;

const mockDeliveries: WebhookDelivery[] = [
  { id: 'd1', event: 'message.new', status: 'success', statusCode: 200, responseTime: 45, timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 'd2', event: 'member.added', status: 'success', statusCode: 200, responseTime: 52, timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: 'd3', event: 'message.new', status: 'failed', statusCode: 500, error: 'Internal Server Error', timestamp: new Date(Date.now() - 900000).toISOString() },
];

const mockWebhooks: Webhook[] = [
  {
    id: '1',
    name: 'Message Notifications',
    url: 'https://api.example.com/webhooks/messages',
    events: ['message.new', 'message.updated', 'message.deleted', 'message.reaction'],
    status: 'active',
    retryEnabled: true,
    maxRetries: 3,
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    lastDeliveryAt: new Date(Date.now() - 300000).toISOString(),
    successRate: 99.2,
    totalDeliveries: 125000,
    failedDeliveries: 1000,
    recentDeliveries: mockDeliveries,
  },
  {
    id: '2',
    name: 'User Events',
    url: 'https://api.example.com/webhooks/users',
    events: ['user.updated', 'user.banned', 'member.added', 'member.removed'],
    status: 'active',
    retryEnabled: true,
    maxRetries: 5,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    lastDeliveryAt: new Date(Date.now() - 3600000).toISOString(),
    successRate: 98.5,
    totalDeliveries: 45000,
    failedDeliveries: 675,
  },
  {
    id: '3',
    name: 'Moderation Alerts',
    url: 'https://slack.example.com/webhook/moderation',
    events: ['moderation.flagged'],
    status: 'failing',
    retryEnabled: true,
    maxRetries: 3,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastDeliveryAt: new Date(Date.now() - 7200000).toISOString(),
    successRate: 45.2,
    totalDeliveries: 1200,
    failedDeliveries: 658,
    recentDeliveries: [
      { id: 'd4', event: 'moderation.flagged', status: 'failed', statusCode: 503, error: 'Service Unavailable', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: 'd5', event: 'moderation.flagged', status: 'failed', statusCode: 503, error: 'Service Unavailable', timestamp: new Date(Date.now() - 14400000).toISOString() },
    ],
  },
  {
    id: '4',
    name: 'Channel Analytics',
    url: 'https://analytics.example.com/channel-events',
    events: ['channel.created', 'channel.updated', 'channel.deleted'],
    status: 'paused',
    retryEnabled: false,
    maxRetries: 0,
    createdAt: new Date(Date.now() - 86400000 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    lastDeliveryAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    successRate: 100,
    totalDeliveries: 890,
    failedDeliveries: 0,
  },
];

export const Default: Story = {
  args: {
    webhooks: mockWebhooks,
  },
};

export const Loading: Story = {
  args: {
    webhooks: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    webhooks: [],
    loading: false,
  },
};

export const SingleWebhook: Story = {
  args: {
    webhooks: [mockWebhooks[0]],
  },
};

export const WithFailingWebhook: Story = {
  args: {
    webhooks: mockWebhooks.filter(w => w.status === 'failing' || w.status === 'active'),
  },
};
