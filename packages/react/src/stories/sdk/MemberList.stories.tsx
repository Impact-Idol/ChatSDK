import type { Meta, StoryObj } from '@storybook/react';
import { MemberList, ChannelMember } from '../../components/sdk/MemberList';

const meta: Meta<typeof MemberList> = {
  title: 'SDK/MemberList',
  component: MemberList,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px', height: '600px' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    currentUserId: 'user-1',
    canManageMembers: true,
    onMemberClick: (member) => console.log('Member clicked:', member),
    onInviteClick: () => console.log('Invite clicked'),
    onRemoveMember: (member) => console.log('Remove member:', member),
    onChangeMemberRole: (member, role) => console.log('Change role:', member, role),
    onMuteMember: (member) => console.log('Mute member:', member),
    onBanMember: (member) => console.log('Ban member:', member),
    onMessageMember: (member) => console.log('Message member:', member),
  },
};

export default meta;
type Story = StoryObj<typeof MemberList>;

const mockMembers: ChannelMember[] = [
  {
    id: 'user-1',
    name: 'John Doe (You)',
    imageUrl: 'https://i.pravatar.cc/150?u=john',
    role: 'owner',
    presence: 'online',
    joinedAt: new Date(Date.now() - 86400000 * 365).toISOString(),
  },
  {
    id: 'user-2',
    name: 'Sarah Smith',
    imageUrl: 'https://i.pravatar.cc/150?u=sarah',
    role: 'admin',
    presence: 'online',
    customStatus: 'Working on the new feature',
    joinedAt: new Date(Date.now() - 86400000 * 180).toISOString(),
  },
  {
    id: 'user-3',
    name: 'Mike Chen',
    imageUrl: 'https://i.pravatar.cc/150?u=mike',
    role: 'moderator',
    presence: 'away',
    customStatus: 'In a meeting',
    joinedAt: new Date(Date.now() - 86400000 * 90).toISOString(),
  },
  {
    id: 'user-4',
    name: 'Emily Wilson',
    role: 'member',
    presence: 'online',
    joinedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'user-5',
    name: 'David Brown',
    imageUrl: 'https://i.pravatar.cc/150?u=david',
    role: 'member',
    presence: 'busy',
    customStatus: 'Do not disturb',
    joinedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: 'user-6',
    name: 'Lisa Anderson',
    imageUrl: 'https://i.pravatar.cc/150?u=lisa',
    role: 'member',
    presence: 'offline',
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
    joinedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'user-7',
    name: 'James Taylor',
    role: 'member',
    presence: 'offline',
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
    joinedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'user-8',
    name: 'Muted User',
    imageUrl: 'https://i.pravatar.cc/150?u=muted',
    role: 'member',
    presence: 'online',
    isMuted: true,
    joinedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: 'user-9',
    name: 'Guest User',
    role: 'guest',
    presence: 'online',
    joinedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const Default: Story = {
  args: {
    members: mockMembers,
    channelName: 'General',
  },
};

export const Loading: Story = {
  args: {
    members: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    members: [],
    loading: false,
  },
};

export const ReadOnly: Story = {
  args: {
    members: mockMembers,
    canManageMembers: false,
  },
};

export const ManyMembers: Story = {
  args: {
    members: Array.from({ length: 50 }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i + 1}`,
      role: i < 2 ? 'admin' : 'member' as const,
      presence: i % 3 === 0 ? 'online' : i % 3 === 1 ? 'away' : 'offline' as const,
      joinedAt: new Date(Date.now() - 86400000 * i).toISOString(),
    })),
  },
};
