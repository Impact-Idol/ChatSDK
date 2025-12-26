import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from '../../components/shared/Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Shared/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    content: 'This is a tooltip',
    children: <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }}>Hover me</button>,
  },
};

export const Top: Story = {
  args: {
    content: 'Tooltip on top',
    position: 'top',
    children: <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }}>Top</button>,
  },
};

export const Bottom: Story = {
  args: {
    content: 'Tooltip on bottom',
    position: 'bottom',
    children: <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }}>Bottom</button>,
  },
};

export const Left: Story = {
  args: {
    content: 'Tooltip on left',
    position: 'left',
    children: <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }}>Left</button>,
  },
};

export const Right: Story = {
  args: {
    content: 'Tooltip on right',
    position: 'right',
    children: <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }}>Right</button>,
  },
};

export const LongContent: Story = {
  args: {
    content: 'This is a longer tooltip with more information that wraps to multiple lines.',
    children: <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }}>Long tooltip</button>,
  },
};

export const NoDelay: Story = {
  args: {
    content: 'Instant tooltip',
    delay: 0,
    children: <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }}>No delay</button>,
  },
};
