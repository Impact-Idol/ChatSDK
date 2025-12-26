import type { Meta, StoryObj } from '@storybook/react';
import { ForgotPassword } from '../../components/user/ForgotPassword';

const meta: Meta<typeof ForgotPassword> = {
  title: 'User/ForgotPassword',
  component: ForgotPassword,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ForgotPassword>;

export const Default: Story = {
  args: {
    onSubmit: (email) => console.log('Reset password for:', email),
    onBack: () => console.log('Go back'),
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const WithError: Story = {
  args: {
    error: 'No account found with this email address.',
  },
};

export const Success: Story = {
  args: {
    success: true,
  },
};
