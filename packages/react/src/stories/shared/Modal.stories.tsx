import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from '../../components/shared/Modal';

const meta: Meta<typeof Modal> = {
  title: 'Shared/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

const ModalWrapper = (args: any) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export const Default: Story = {
  render: (args) => <ModalWrapper {...args} />,
  args: {
    title: 'Modal Title',
    children: <p>This is the modal content. You can put any React content here.</p>,
  },
};

export const WithFooter: Story = {
  render: (args) => <ModalWrapper {...args} />,
  args: {
    title: 'Confirm Action',
    children: <p>Are you sure you want to proceed with this action?</p>,
    footer: (
      <>
        <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', marginRight: '8px' }}>Cancel</button>
        <button style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff' }}>Confirm</button>
      </>
    ),
  },
};

export const Small: Story = {
  render: (args) => <ModalWrapper {...args} />,
  args: {
    title: 'Small Modal',
    children: <p>This is a small modal.</p>,
    size: 'sm',
  },
};

export const Large: Story = {
  render: (args) => <ModalWrapper {...args} />,
  args: {
    title: 'Large Modal',
    children: <p>This is a large modal with more space for content.</p>,
    size: 'lg',
  },
};

export const NoCloseButton: Story = {
  render: (args) => <ModalWrapper {...args} />,
  args: {
    title: 'No Close Button',
    children: <p>This modal has no close button. Use the overlay to close.</p>,
    showCloseButton: false,
  },
};

export const NoOverlayClose: Story = {
  render: (args) => <ModalWrapper {...args} />,
  args: {
    title: 'Protected Modal',
    children: <p>Clicking the overlay won't close this modal.</p>,
    closeOnOverlayClick: false,
  },
};
