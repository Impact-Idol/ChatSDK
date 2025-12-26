import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastContainer, ToastProps } from '../../components/shared/Toast';

const meta: Meta<typeof ToastContainer> = {
  title: 'Shared/Toast',
  component: ToastContainer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ToastContainer>;

const defaultToasts: ToastProps[] = [
  { id: '1', type: 'success', title: 'Success!', message: 'Your changes have been saved successfully.' },
  { id: '2', type: 'error', title: 'Error', message: 'Something went wrong. Please try again.' },
  { id: '3', type: 'warning', title: 'Warning', message: 'Your session will expire in 5 minutes.' },
  { id: '4', type: 'info', message: 'New updates are available.' },
];

export const Default: Story = {
  args: {
    toasts: defaultToasts.slice(0, 1),
    position: 'top-right',
    onClose: (id) => console.log('Close toast:', id),
  },
};

export const AllTypes: Story = {
  args: {
    toasts: defaultToasts,
    position: 'top-right',
  },
};

export const BottomRight: Story = {
  args: {
    toasts: defaultToasts.slice(0, 2),
    position: 'bottom-right',
  },
};

export const TopCenter: Story = {
  args: {
    toasts: defaultToasts.slice(0, 1),
    position: 'top-center',
  },
};

export const WithAction: Story = {
  args: {
    toasts: [
      {
        id: '1',
        type: 'info',
        title: 'New message',
        message: 'Alice sent you a message.',
        action: { label: 'View', onClick: () => console.log('View clicked') },
      },
    ],
    position: 'top-right',
  },
};
