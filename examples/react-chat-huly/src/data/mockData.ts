import type { User, Channel, DirectMessage, Message, Workspace } from '../types'

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    status: 'online',
  },
  {
    id: 'user-2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    status: 'away',
  },
  {
    id: 'user-3',
    name: 'Charlie Davis',
    email: 'charlie@example.com',
    status: 'offline',
    lastSeen: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
  },
  {
    id: 'user-4',
    name: 'Diana Prince',
    email: 'diana@example.com',
    status: 'online',
  },
  {
    id: 'user-5',
    name: 'Eve Wilson',
    email: 'eve@example.com',
    status: 'online',
  },
]

export const currentUser = mockUsers[0]

// Mock Workspaces
export const mockWorkspaces: Workspace[] = [
  { id: 'ws-1', name: 'ChatSDK Team' },
  { id: 'ws-2', name: 'Design System' },
]

// Mock Channels
export const mockChannels: Channel[] = [
  {
    id: 'channel-1',
    name: 'general',
    description: 'General discussion for the team',
    type: 'public',
    memberCount: 24,
    unreadCount: 3,
    isPinned: true,
    lastMessageAt: new Date(),
  },
  {
    id: 'channel-2',
    name: 'engineering',
    description: 'Engineering discussions and updates',
    type: 'public',
    memberCount: 12,
    unreadCount: 0,
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: 'channel-3',
    name: 'design',
    description: 'Design reviews and feedback',
    type: 'public',
    memberCount: 8,
    unreadCount: 5,
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: 'channel-4',
    name: 'mobile-dev',
    description: 'Mobile development team',
    type: 'private',
    memberCount: 6,
    unreadCount: 0,
    isPinned: false,
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
]

// Mock DMs
export const mockDMs: DirectMessage[] = [
  {
    id: 'dm-1',
    type: 'direct',
    participants: [mockUsers[0], mockUsers[1]],
    unreadCount: 1,
    lastMessageAt: new Date(),
  },
  {
    id: 'dm-2',
    type: 'direct',
    participants: [mockUsers[0], mockUsers[3]],
    unreadCount: 0,
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: 'dm-3',
    type: 'group',
    participants: [mockUsers[0], mockUsers[1], mockUsers[2]],
    unreadCount: 2,
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 30),
  },
]

// Generate mock messages
export function generateMockMessages(channelId: string, count: number = 50): Message[] {
  const messages: Message[] = []
  const baseTime = Date.now()

  for (let i = 0; i < count; i++) {
    const user = mockUsers[i % mockUsers.length]
    const minutesAgo = count - i

    // Simulate read receipts: messages from user-1 (Alice) are read by others
    const readBy: string[] = []
    if (user.id === 'user-1' && i < count - 3) {
      // Older messages are more likely to be read
      const readCount = Math.floor(Math.random() * 3) + 1
      const readers = ['user-2', 'user-3', 'user-4', 'user-5']
      for (let j = 0; j < readCount; j++) {
        const randomReader = readers[Math.floor(Math.random() * readers.length)]
        if (!readBy.includes(randomReader)) {
          readBy.push(randomReader)
        }
      }
    }

    messages.push({
      id: `msg-${channelId}-${i}`,
      text: getMockMessageText(i),
      userId: user.id,
      user,
      channelId,
      createdAt: new Date(baseTime - minutesAgo * 60 * 1000),
      reactions: i % 5 === 0 ? [
        { emoji: '👍', count: 2, users: [mockUsers[0].id, mockUsers[1].id], own: user.id === mockUsers[0].id || user.id === mockUsers[1].id },
        { emoji: '❤️', count: 1, users: [mockUsers[2].id], own: user.id === mockUsers[2].id },
      ] : undefined,
      threadCount: i % 7 === 0 ? Math.floor(Math.random() * 5) + 1 : undefined,
      mentions: [],
      readBy,
    })
  }

  return messages.reverse() // Newest first
}

function getMockMessageText(index: number): string {
  const texts = [
    'Hey everyone! 👋',
    'Just pushed the latest changes to main',
    'Can someone review my PR?',
    'Meeting at 2pm today',
    'Great work on the new feature!',
    'I think we should refactor this component',
    'The mobile UI is looking much better now',
    'Anyone available for a quick call?',
    'Updated the design mockups in Figma',
    'Fixed the bug in production',
    'This is looking really good! 🚀',
    'Let me know if you have any questions',
    'Thanks for the feedback',
    'Working on the new feature now',
    'Should be ready by EOD',
    'I agree with this approach',
    'Let\'s discuss this in the next standup',
    'The performance improvements are impressive',
    'Documentation has been updated',
    'Deployed to staging',
  ]

  return texts[index % texts.length]
}

// Mock typing users
export const mockTypingUsers = [
  { userId: 'user-2', name: 'Bob Smith' },
]
