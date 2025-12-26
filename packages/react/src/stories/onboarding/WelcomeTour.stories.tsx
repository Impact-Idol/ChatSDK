import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { WelcomeTour } from '../../components/onboarding/WelcomeTour';

const meta: Meta<typeof WelcomeTour> = {
  title: 'Onboarding/WelcomeTour',
  component: WelcomeTour,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '100px', minHeight: '100vh' }}>
        <div id="tour-target-1" style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '20px' }}>
          Target Element 1
        </div>
        <div id="tour-target-2" style={{ padding: '20px', background: '#e0e0e0', borderRadius: '8px', marginBottom: '20px' }}>
          Target Element 2
        </div>
        <div id="tour-target-3" style={{ padding: '20px', background: '#d0d0d0', borderRadius: '8px' }}>
          Target Element 3
        </div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WelcomeTour>;

const defaultSteps = [
  {
    id: 'step1',
    target: '#tour-target-1',
    title: 'Welcome!',
    content: 'This is the first step of the tour. We\'ll show you around the app.',
    position: 'bottom' as const,
  },
  {
    id: 'step2',
    target: '#tour-target-2',
    title: 'Features',
    content: 'Here you can find all the amazing features we offer.',
    position: 'bottom' as const,
  },
  {
    id: 'step3',
    target: '#tour-target-3',
    title: 'Get Started',
    content: 'You\'re all set! Click finish to start using the app.',
    position: 'bottom' as const,
    action: {
      label: 'Try it now',
      onClick: () => console.log('Action clicked'),
    },
  },
];

export const Default: Story = {
  args: {
    steps: defaultSteps,
    isOpen: true,
    onComplete: () => console.log('Tour completed'),
    onSkip: () => console.log('Tour skipped'),
  },
};

export const NoProgress: Story = {
  args: {
    steps: defaultSteps,
    isOpen: true,
    showProgress: false,
  },
};

export const NoSkip: Story = {
  args: {
    steps: defaultSteps,
    isOpen: true,
    showSkip: false,
  },
};

export const SingleStep: Story = {
  args: {
    steps: [defaultSteps[0]],
    isOpen: true,
  },
};
