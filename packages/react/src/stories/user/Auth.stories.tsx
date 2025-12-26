import type { Meta, StoryObj } from '@storybook/react';
import { AuthLayout } from '../../components/user/AuthLayout';
import { LoginForm } from '../../components/user/LoginForm';
import React, { useState } from 'react';

const meta: Meta<typeof AuthLayout> = {
  title: 'User/Authentication',
  component: AuthLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AuthLayout>;

const LoginExample = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (password !== 'password123') {
      setError('Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
      testimonial={{
        quote: "ChatSDK has transformed how we build messaging features. The developer experience is unmatched.",
        author: "Sarah Chen",
        role: "CTO at TechCorp",
        avatar: "https://i.pravatar.cc/150?u=testimonial",
      }}
    >
      <LoginForm
        onLogin={handleLogin}
        loading={loading}
        error={error}
        onForgotPassword={() => console.log('Forgot password clicked')}
        onSignUp={() => console.log('Sign up clicked')}
        onSocialLogin={(provider) => console.log(`${provider} login clicked`)}
      />
    </AuthLayout>
  );
};

export const Login: Story = {
  render: () => <LoginExample />,
};

export const LoginWithError: Story = {
  render: () => (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      <LoginForm
        error="Invalid email or password. Please try again."
        onLogin={async () => {}}
        onForgotPassword={() => {}}
        onSignUp={() => {}}
      />
    </AuthLayout>
  ),
};

export const LoginCentered: Story = {
  render: () => (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
      variant="centered"
    >
      <LoginForm
        onLogin={async () => {}}
        onForgotPassword={() => {}}
        onSignUp={() => {}}
      />
    </AuthLayout>
  ),
};

export const LoginLoading: Story = {
  render: () => (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      <LoginForm
        loading={true}
        onLogin={async () => {}}
        onForgotPassword={() => {}}
        onSignUp={() => {}}
      />
    </AuthLayout>
  ),
};

// Signup Form Component
const SignupForm = () => {
  const [loading, setLoading] = useState(false);

  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="chatsdk-input-wrapper">
          <label className="chatsdk-input-label">First name</label>
          <div className="chatsdk-input-container">
            <input className="chatsdk-input" placeholder="John" />
          </div>
        </div>
        <div className="chatsdk-input-wrapper">
          <label className="chatsdk-input-label">Last name</label>
          <div className="chatsdk-input-container">
            <input className="chatsdk-input" placeholder="Doe" />
          </div>
        </div>
      </div>
      <div className="chatsdk-input-wrapper">
        <label className="chatsdk-input-label">Email</label>
        <div className="chatsdk-input-container">
          <input type="email" className="chatsdk-input" placeholder="you@example.com" />
        </div>
      </div>
      <div className="chatsdk-input-wrapper">
        <label className="chatsdk-input-label">Password</label>
        <div className="chatsdk-input-container">
          <input type="password" className="chatsdk-input" placeholder="Create a strong password" />
        </div>
        <p className="chatsdk-input-helper">Must be at least 8 characters</p>
      </div>
      <div className="chatsdk-input-wrapper">
        <label className="chatsdk-input-label">Company</label>
        <div className="chatsdk-input-container">
          <input className="chatsdk-input" placeholder="Your company name" />
        </div>
      </div>
      <button
        type="submit"
        className="chatsdk-button chatsdk-button-primary chatsdk-button-md"
        style={{ width: '100%', height: '44px', marginTop: '0.5rem' }}
      >
        Create account
      </button>
      <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--chatsdk-muted-foreground)', margin: 0 }}>
        Already have an account?{' '}
        <button type="button" style={{ background: 'none', border: 'none', color: 'var(--chatsdk-primary)', fontWeight: 500, cursor: 'pointer' }}>
          Sign in
        </button>
      </p>
    </form>
  );
};

export const Signup: Story = {
  render: () => (
    <AuthLayout
      title="Create your account"
      subtitle="Get started with ChatSDK in minutes"
      testimonial={{
        quote: "We integrated ChatSDK in just 2 hours. The documentation is excellent and the support team is incredibly responsive.",
        author: "Mike Johnson",
        role: "Lead Developer at StartupXYZ",
        avatar: "https://i.pravatar.cc/150?u=mike",
      }}
    >
      <SignupForm />
    </AuthLayout>
  ),
};

// Forgot Password
const ForgotPasswordForm = () => (
  <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <p style={{ fontSize: '14px', color: 'var(--chatsdk-muted-foreground)', margin: 0, textAlign: 'center' }}>
      Enter your email address and we'll send you a link to reset your password.
    </p>
    <div className="chatsdk-input-wrapper">
      <label className="chatsdk-input-label">Email</label>
      <div className="chatsdk-input-container">
        <input type="email" className="chatsdk-input" placeholder="you@example.com" />
      </div>
    </div>
    <button
      type="submit"
      className="chatsdk-button chatsdk-button-primary chatsdk-button-md"
      style={{ width: '100%', height: '44px' }}
    >
      Send reset link
    </button>
    <button
      type="button"
      style={{ background: 'none', border: 'none', color: 'var(--chatsdk-primary)', fontSize: '14px', cursor: 'pointer' }}
    >
      ← Back to login
    </button>
  </form>
);

export const ForgotPassword: Story = {
  render: () => (
    <AuthLayout
      title="Reset password"
      subtitle="We'll help you get back in"
      variant="centered"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  ),
};

// Onboarding Step
const OnboardingForm = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--chatsdk-primary)' }} />
      <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--chatsdk-border)' }} />
      <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--chatsdk-border)' }} />
    </div>

    <div style={{ textAlign: 'center' }}>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--chatsdk-foreground)' }}>
        What will you build?
      </h3>
      <p style={{ margin: '0.5rem 0 0', fontSize: '14px', color: 'var(--chatsdk-muted-foreground)' }}>
        This helps us customize your experience
      </p>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {[
        { icon: '💬', title: 'In-app messaging', desc: 'Real-time chat for your app' },
        { icon: '🎮', title: 'Live streaming', desc: 'Interactive chat for streams' },
        { icon: '🛒', title: 'E-commerce', desc: 'Customer support & sales' },
        { icon: '🏥', title: 'Healthcare', desc: 'HIPAA-compliant messaging' },
      ].map((option, i) => (
        <label
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            border: '1px solid var(--chatsdk-border)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <input type="radio" name="usecase" style={{ display: 'none' }} />
          <span style={{ fontSize: '24px' }}>{option.icon}</span>
          <div>
            <div style={{ fontWeight: 500, color: 'var(--chatsdk-foreground)' }}>{option.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--chatsdk-muted-foreground)' }}>{option.desc}</div>
          </div>
        </label>
      ))}
    </div>

    <button
      className="chatsdk-button chatsdk-button-primary chatsdk-button-md"
      style={{ width: '100%', height: '44px' }}
    >
      Continue →
    </button>
  </div>
);

export const Onboarding: Story = {
  render: () => (
    <AuthLayout
      title="Let's set up your workspace"
      subtitle="Step 1 of 3"
      variant="centered"
    >
      <OnboardingForm />
    </AuthLayout>
  ),
};
