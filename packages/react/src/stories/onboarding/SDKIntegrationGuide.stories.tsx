import type { Meta, StoryObj } from '@storybook/react';
import { SDKIntegrationGuide } from '../../components/onboarding/SDKIntegrationGuide';

const meta: Meta<typeof SDKIntegrationGuide> = {
  title: 'Onboarding/SDKIntegrationGuide',
  component: SDKIntegrationGuide,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof SDKIntegrationGuide>;

export const Default: Story = {
  args: {
    apiKey: 'sk_live_abc123xyz',
    appId: 'app_12345',
    onComplete: () => console.log('Setup complete!'),
  },
};

export const WithPlaceholders: Story = {
  args: {
    onComplete: () => console.log('Setup complete!'),
  },
};

export const CustomSteps: Story = {
  args: {
    apiKey: 'my-api-key',
    steps: [
      {
        id: 'custom-1',
        title: 'Custom Step 1',
        description: 'This is a custom step for your integration.',
        snippets: [
          { language: 'bash', label: 'Shell', code: 'echo "Hello World"' },
        ],
      },
      {
        id: 'custom-2',
        title: 'Custom Step 2',
        description: 'Another custom step.',
        snippets: [
          { language: 'javascript', label: 'JavaScript', code: 'console.log("Hello!");' },
          { language: 'python', label: 'Python', code: 'print("Hello!")' },
        ],
      },
    ],
    onComplete: () => console.log('Custom setup complete!'),
  },
};
