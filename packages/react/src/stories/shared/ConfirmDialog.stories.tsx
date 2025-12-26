import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Shared/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

const DialogWrapper = (args: any) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Dialog</button>
      <ConfirmDialog
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => { console.log('Confirmed'); setIsOpen(false); }}
      />
    </>
  );
};

export const Default: Story = {
  render: (args) => <DialogWrapper {...args} />,
  args: {
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed? This action cannot be undone.',
  },
};

export const Danger: Story = {
  render: (args) => <DialogWrapper {...args} />,
  args: {
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item? This action is permanent and cannot be reversed.',
    variant: 'danger',
    confirmLabel: 'Delete',
  },
};

export const Warning: Story = {
  render: (args) => <DialogWrapper {...args} />,
  args: {
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Are you sure you want to leave this page?',
    variant: 'warning',
    confirmLabel: 'Leave',
    cancelLabel: 'Stay',
  },
};

export const Loading: Story = {
  render: (args) => <DialogWrapper {...args} />,
  args: {
    title: 'Processing',
    message: 'Please wait while we process your request...',
    loading: true,
  },
};
