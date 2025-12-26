import type { Meta, StoryObj } from '@storybook/react';
import { PushSettings } from '../../components/admin/PushSettings';

const meta: Meta<typeof PushSettings> = {
  title: 'Admin/PushSettings',
  component: PushSettings,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof PushSettings>;

const providers = [
  { id: 'fcm', name: 'fcm' as const, enabled: true, configured: true, testStatus: 'success' as const },
  { id: 'apns', name: 'apns' as const, enabled: true, configured: true },
  { id: 'onesignal', name: 'onesignal' as const, enabled: false, configured: false },
  { id: 'expo', name: 'expo' as const, enabled: false, configured: false },
];

const templates = [
  { id: 't1', name: 'New Message', event: 'message.new', title: '{{sender_name}}', body: '{{message_preview}}', enabled: true },
  { id: 't2', name: 'Mention', event: 'message.mention', title: 'You were mentioned', body: '{{sender_name}} mentioned you in #{{channel_name}}', enabled: true },
  { id: 't3', name: 'Channel Invite', event: 'channel.invite', title: 'Channel invitation', body: 'You\'ve been invited to join #{{channel_name}}', enabled: true },
  { id: 't4', name: 'Reaction', event: 'reaction.new', title: 'New reaction', body: '{{sender_name}} reacted {{emoji}} to your message', enabled: false },
];

export const Default: Story = {
  args: {
    providers,
    templates,
    onProviderToggle: (id, enabled) => console.log('Toggle:', id, enabled),
    onProviderConfigure: (id, creds) => console.log('Configure:', id, creds),
    onProviderTest: (id) => console.log('Test:', id),
    onTemplateUpdate: (template) => console.log('Update template:', template),
    onTemplateToggle: (id, enabled) => console.log('Toggle template:', id, enabled),
  },
};

export const AllUnconfigured: Story = {
  args: {
    providers: providers.map(p => ({ ...p, configured: false, enabled: false })),
    templates,
  },
};

export const WithFailedTest: Story = {
  args: {
    providers: providers.map(p =>
      p.id === 'fcm' ? { ...p, testStatus: 'failed' as const } : p
    ),
    templates,
  },
};
