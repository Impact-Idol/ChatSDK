import type { Meta, StoryObj } from '@storybook/react';
import { MessageBubble } from '../../components/sdk/MessageBubble';

const meta: Meta<typeof MessageBubble> = {
  title: 'SDK/MessageBubble',
  component: MessageBubble,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem', background: '#f8fafc', minWidth: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageBubble>;

// Base args for reuse
const baseArgs = {
  id: 'msg-1',
  text: 'Hey everyone! How is the project coming along? I wanted to check in and see if anyone needs help.',
  createdAt: new Date().toISOString(),
  user: {
    id: 'user-1',
    name: 'Alice Johnson',
    imageUrl: 'https://i.pravatar.cc/150?u=alice',
  },
};

export const Default: Story = {
  args: {
    ...baseArgs,
    isOwn: false,
  },
};

export const OwnMessage: Story = {
  args: {
    ...baseArgs,
    isOwn: true,
    status: 'sent',
  },
};

export const WithReactions: Story = {
  args: {
    ...baseArgs,
    isOwn: false,
    reactions: [
      { emoji: '👍', count: 5, reacted: true },
      { emoji: '❤️', count: 3, reacted: false },
      { emoji: '🔥', count: 2, reacted: true },
    ],
  },
};

export const WithReply: Story = {
  args: {
    ...baseArgs,
    isOwn: false,
    replyTo: {
      id: 'msg-0',
      text: 'Can someone help me with the deployment?',
      user: { name: 'Bob Smith' },
    },
  },
};

export const WithImageAttachments: Story = {
  args: {
    ...baseArgs,
    text: 'Check out these design mockups!',
    isOwn: false,
    attachments: [
      { type: 'image' as const, url: 'https://picsum.photos/400/300', name: 'mockup-1.png' },
      { type: 'image' as const, url: 'https://picsum.photos/400/301', name: 'mockup-2.png' },
    ],
  },
};

export const WithFileAttachment: Story = {
  args: {
    ...baseArgs,
    text: 'Here is the document you requested',
    isOwn: true,
    status: 'delivered',
    attachments: [
      {
        type: 'file' as const,
        url: '#',
        name: 'project-report.pdf',
        size: 2456000,
        mimeType: 'application/pdf',
      },
    ],
  },
};

export const Edited: Story = {
  args: {
    ...baseArgs,
    isOwn: true,
    edited: true,
    status: 'read',
  },
};

export const Deleted: Story = {
  args: {
    ...baseArgs,
    isOwn: false,
    deleted: true,
  },
};

export const StatusSending: Story = {
  args: {
    ...baseArgs,
    isOwn: true,
    status: 'sending',
  },
};

export const StatusSent: Story = {
  args: {
    ...baseArgs,
    isOwn: true,
    status: 'sent',
  },
};

export const StatusDelivered: Story = {
  args: {
    ...baseArgs,
    isOwn: true,
    status: 'delivered',
  },
};

export const StatusRead: Story = {
  args: {
    ...baseArgs,
    isOwn: true,
    status: 'read',
  },
};

export const StatusFailed: Story = {
  args: {
    ...baseArgs,
    isOwn: true,
    status: 'failed',
    onRetry: () => console.log('Retry clicked'),
  },
};

export const Pinned: Story = {
  args: {
    ...baseArgs,
    isOwn: false,
    pinned: true,
  },
};

export const Highlighted: Story = {
  args: {
    ...baseArgs,
    isOwn: false,
    highlighted: true,
  },
};

export const GroupedMessages: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <MessageBubble
        id="msg-1"
        text="First message in the group"
        user={{ id: 'user-1', name: 'Alice Johnson', imageUrl: 'https://i.pravatar.cc/150?u=alice' }}
        createdAt={new Date().toISOString()}
        isOwn={false}
        isFirstInGroup={true}
        isLastInGroup={false}
        showTimestamp={false}
      />
      <MessageBubble
        id="msg-2"
        text="Second message, no avatar shown"
        user={{ id: 'user-1', name: 'Alice Johnson', imageUrl: 'https://i.pravatar.cc/150?u=alice' }}
        createdAt={new Date().toISOString()}
        isOwn={false}
        isFirstInGroup={false}
        isLastInGroup={false}
        showName={false}
        showTimestamp={false}
      />
      <MessageBubble
        id="msg-3"
        text="Last message in the group"
        user={{ id: 'user-1', name: 'Alice Johnson', imageUrl: 'https://i.pravatar.cc/150?u=alice' }}
        createdAt={new Date().toISOString()}
        isOwn={false}
        isFirstInGroup={false}
        isLastInGroup={true}
        showName={false}
      />
    </div>
  ),
};

export const FullConversation: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '600px' }}>
      <MessageBubble
        id="msg-1"
        text="Hey! Did you see the latest updates?"
        user={{ id: 'user-2', name: 'Bob Smith', imageUrl: 'https://i.pravatar.cc/150?u=bob' }}
        createdAt={new Date(Date.now() - 1000 * 60 * 5).toISOString()}
        isOwn={false}
      />
      <MessageBubble
        id="msg-2"
        text="Yes! The new design looks amazing 🎉"
        user={{ id: 'user-1', name: 'Me' }}
        createdAt={new Date(Date.now() - 1000 * 60 * 4).toISOString()}
        isOwn={true}
        status="read"
        reactions={[{ emoji: '👍', count: 1, reacted: false }]}
      />
      <MessageBubble
        id="msg-3"
        text="I'm working on the final touches now"
        user={{ id: 'user-1', name: 'Me' }}
        createdAt={new Date(Date.now() - 1000 * 60 * 3).toISOString()}
        isOwn={true}
        status="delivered"
        isFirstInGroup={false}
        showName={false}
      />
      <MessageBubble
        id="msg-4"
        text="Can't wait to see it! Let me know when it's ready."
        user={{ id: 'user-2', name: 'Bob Smith', imageUrl: 'https://i.pravatar.cc/150?u=bob' }}
        createdAt={new Date(Date.now() - 1000 * 60 * 1).toISOString()}
        isOwn={false}
      />
    </div>
  ),
};
