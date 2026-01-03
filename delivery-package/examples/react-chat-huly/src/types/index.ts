export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  status: 'online' | 'offline' | 'away'
  lastSeen?: Date
}

export interface Channel {
  id: string
  name: string
  description?: string
  type: 'public' | 'private'
  memberCount: number
  unreadCount?: number
  lastMessage?: Message
  lastMessageAt?: Date
  isPinned?: boolean
  isMuted?: boolean
  isStarred?: boolean
}

export interface DirectMessage {
  id: string
  type: 'direct' | 'group'
  participants: User[]
  unreadCount?: number
  lastMessage?: Message
  lastMessageAt?: Date
  isPinned?: boolean
  isMuted?: boolean
  isStarred?: boolean
}

export interface Message {
  id: string
  text: string
  userId: string
  user: User
  channelId: string
  createdAt: Date
  updatedAt?: Date
  isEdited?: boolean
  isDeleted?: boolean
  isPinned?: boolean
  attachments?: Attachment[]
  reactions?: Reaction[]
  replyCount?: number
  parentId?: string
  status?: 'sending' | 'sent' | 'failed'
  threadCount?: number
  mentions?: string[]
  readBy?: string[] // Array of user IDs who have read this message
}

export interface Attachment {
  id: string
  type: 'image' | 'file' | 'video'
  url: string
  name: string
  size: number
  mimeType: string
  thumbnail?: string
}

export interface Reaction {
  emoji: string
  count: number
  users: string[]
  own: boolean
}

export interface Workspace {
  id: string
  name: string
  avatar?: string
}
