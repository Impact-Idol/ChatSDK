import type { Meta, StoryObj } from '@storybook/react';
import { SignupForm } from '../../components/user/SignupForm';

const meta: Meta<typeof SignupForm> = {
  title: 'User/SignupForm',
  component: SignupForm,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SignupForm>;

export const Default: Story = {
  args: {
    onSubmit: (data) => console.log('Signup:', data),
    onLogin: () => console.log('Navigate to login'),
    onSocialLogin: (provider) => console.log('Social login:', provider),
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const WithError: Story = {
  args: {
    error: 'An account with this email already exists.',
  },
};

export const NoSocialLogin: Story = {
  args: {
    showSocialLogin: false,
  },
};
