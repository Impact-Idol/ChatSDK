import type { Meta, StoryObj } from '@storybook/react';
import { AppSetupWizard, AppConfig } from '../../components/onboarding/AppSetupWizard';

const meta: Meta<typeof AppSetupWizard> = {
  title: 'Onboarding/AppSetupWizard',
  component: AppSetupWizard,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onComplete: (config: AppConfig) => console.log('App created:', config),
    onCancel: () => console.log('Wizard cancelled'),
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '40px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AppSetupWizard>;

export const Default: Story = {
  args: {},
};

export const WithInitialConfig: Story = {
  args: {
    initialConfig: {
      name: 'My Chat App',
      description: 'A real-time chat application for our platform',
      environment: 'development',
      features: {
        messaging: true,
        threads: true,
        reactions: true,
        attachments: true,
        typing: true,
        readReceipts: true,
        presence: true,
        search: false,
        moderation: false,
        push: false,
      },
    },
  },
};

export const ProductionSetup: Story = {
  args: {
    initialConfig: {
      name: 'Production Chat',
      environment: 'production',
      features: {
        messaging: true,
        threads: true,
        reactions: true,
        attachments: true,
        typing: true,
        readReceipts: true,
        presence: true,
        search: true,
        moderation: true,
        push: true,
      },
      allowedOrigins: ['https://app.example.com', 'https://www.example.com'],
      webhookUrl: 'https://api.example.com/webhooks/chat',
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 500,
      },
    },
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    initialConfig: {
      name: 'Test App',
      environment: 'staging',
    },
  },
};

export const MinimalFeatures: Story = {
  args: {
    initialConfig: {
      name: 'Simple Chat',
      environment: 'development',
      features: {
        messaging: true,
        threads: false,
        reactions: false,
        attachments: false,
        typing: false,
        readReceipts: false,
        presence: false,
        search: false,
        moderation: false,
        push: false,
      },
    },
  },
};
