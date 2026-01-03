import { useState, useMemo, useEffect } from 'react'
import { ChatLayout } from './components/layout/ChatLayout'
import { ChatSidebar } from './components/layout/ChatSidebar'
import { ChannelView } from './components/channel/ChannelView'
import { ThreadPanel } from './components/thread/ThreadPanel'
import { MobileViewSwitcher } from './components/mobile/MobileViewSwitcher'
import { UnifiedMessagesView } from './components/mobile/UnifiedMessagesView'
import { WorkspaceSwitcher } from './components/mobile/WorkspaceSwitcher'
import { DMView } from './components/dm/DMView'
import { MessageSearch } from './components/search/MessageSearch'
import { CreateChannelModal } from './components/modals/CreateChannelModal'
import { StartConversationModal } from './components/modals/StartConversationModal'
import { ChannelSettingsModal } from './components/modals/ChannelSettingsModal'
import { AddMembersModal } from './components/modals/AddMembersModal'
import { DMSettingsModal } from './components/modals/DMSettingsModal'
import { WorkspaceSettingsModal } from './components/modals/WorkspaceSettingsModal'
import { UserProfileModal } from './components/modals/UserProfileModal'
import { EditMessageModal } from './components/modals/EditMessageModal'
import { AddWorkspaceModal } from './components/modals/AddWorkspaceModal'
import { ChannelMembersPanel } from './components/channel/ChannelMembersPanel'
import { PinnedMessagesPanel } from './components/channel/PinnedMessagesPanel'
import { DemoLogin } from './components/auth/DemoLogin'
import { getStoredTokens, clearTokens, type DemoUser } from './lib/auth'
import { mockChannels, mockDMs, generateMockMessages, mockUsers, mockWorkspaces } from './data/mockData'
import type { Message, Channel, DirectMessage, User, Workspace } from './types'

function App() {
  // User and workspace state - declared first so we can use setCurrentUser in useEffect
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[0])

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [authToken, setAuthToken] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [wsToken, setWsToken] = useState<string | null>(null)

  // Check for stored tokens on mount
  useEffect(() => {
    const storedTokens = getStoredTokens()
    if (storedTokens) {
      setAuthToken(storedTokens.token)
      setWsToken(storedTokens.wsToken)
      setIsAuthenticated(true)
      // Set current user from stored tokens
      setCurrentUser({
        id: storedTokens.user.id,
        name: storedTokens.user.name,
        email: `${storedTokens.user.id}@demo.chatsdk.dev`,
        avatar: storedTokens.user.image || '',
        status: 'online'
      })
    }
  }, [])

  // Handle login
  const handleLogin = (user: DemoUser, token: string, wsToken: string) => {
    setAuthToken(token)
    setWsToken(wsToken)
    setIsAuthenticated(true)
    setCurrentUser({
      id: user.id,
      name: user.name,
      email: `${user.id}@demo.chatsdk.dev`,
      avatar: user.image || '',
      status: 'online'
    })
  }

  const [workspaces, setWorkspaces] = useState<Workspace[]>(mockWorkspaces)
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('ws-1')

  // Channel and DM state
  const [activeChannelId, setActiveChannelId] = useState<string>('channel-1')
  const [activeDMId, setActiveDMId] = useState<string | undefined>()
  const [channels, setChannels] = useState(mockChannels)
  const [dms, setDMs] = useState(mockDMs)

  // Message state
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | undefined>()
  const [threadReplies, setThreadReplies] = useState<Record<string, Message[]>>({})

  // Modal state
  const [showSearch, setShowSearch] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showStartConversation, setShowStartConversation] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [showChannelSettings, setShowChannelSettings] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [showDMSettings, setShowDMSettings] = useState(false)
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false)
  const [showEditMessage, setShowEditMessage] = useState(false)
  const [showAddWorkspace, setShowAddWorkspace] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [showWorkspaceInvite, setShowWorkspaceInvite] = useState(false)

  // Other state
  const [messageToEdit, setMessageToEdit] = useState<Message | undefined>()
  const [channelMembersMap, setChannelMembersMap] = useState<Record<string, Array<User & { role: 'owner' | 'admin' | 'member', joinedAt: Date }>>>({})
  const [typingUsers, setTypingUsers] = useState<Record<string, Array<{ userId: string; name: string }>>>({})
  const [highlightMessageId, setHighlightMessageId] = useState<string | undefined>()

  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId)
    setActiveDMId(undefined)

    // Generate messages for this channel if not already loaded
    if (!messages[channelId]) {
      setMessages(prev => ({
        ...prev,
        [channelId]: generateMockMessages(channelId, 30)
      }))
    }
  }

  const handleDMSelect = (dmId: string) => {
    setActiveDMId(dmId)
    setActiveChannelId('')

    // Generate messages for this DM if not already loaded
    if (!messages[dmId]) {
      setMessages(prev => ({
        ...prev,
        [dmId]: generateMockMessages(dmId, 20)
      }))
    }
  }

  const activeChannel = channels.find(c => c.id === activeChannelId)
  const activeDM = dms.find(dm => dm.id === activeDMId)

  // Get messages for the active channel/DM
  const currentConversationId = activeChannelId || activeDMId || ''
  const currentMessages = useMemo(() => {
    return messages[currentConversationId] || []
  }, [messages, currentConversationId])

  // Get all messages for search (flattened from all channels/DMs)
  const allMessages = useMemo(() => {
    return Object.values(messages).flat()
  }, [messages])

  // Message handlers
  const handleSendMessage = (text: string, files?: File[], mentions?: string[]) => {
    const conversationId = activeChannelId || activeDMId
    if (!conversationId) return

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      userId: 'user-1',
      user: mockUsers[0], // Alice Johnson
      channelId: conversationId,
      createdAt: new Date(),
      attachments: files?.map((file, index) => ({
        id: `attachment-${Date.now()}-${index}`,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
      })),
      reactions: [],
      mentions: mentions || [],
      readBy: [], // Initialize empty, will be populated when others read the message
    }

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage]
    }))
  }

  const handleReact = (message: Message, emoji: string) => {
    const conversationId = activeChannelId || activeDMId
    if (!conversationId) return

    setMessages(prev => {
      const conversationMessages = prev[conversationId] || []
      return {
        ...prev,
        [conversationId]: conversationMessages.map(msg => {
          if (msg.id !== message.id) return msg

          const reactions = msg.reactions || []
          const existingReaction = reactions.find(r => r.emoji === emoji)

          if (existingReaction) {
            // Toggle user's reaction
            const hasReacted = existingReaction.users.some(u => u.id === 'user-1')
            if (hasReacted) {
              // Remove reaction
              const updatedUsers = existingReaction.users.filter(u => u.id !== 'user-1')
              return {
                ...msg,
                reactions: updatedUsers.length > 0
                  ? reactions.map(r => r.emoji === emoji
                    ? { ...r, users: updatedUsers, count: updatedUsers.length }
                    : r)
                  : reactions.filter(r => r.emoji !== emoji)
              }
            } else {
              // Add reaction
              return {
                ...msg,
                reactions: reactions.map(r => r.emoji === emoji
                  ? { ...r, users: [...r.users, mockUsers[0]], count: r.count + 1 }
                  : r)
              }
            }
          } else {
            // New reaction
            return {
              ...msg,
              reactions: [...reactions, { emoji, count: 1, users: [mockUsers[0]] }]
            }
          }
        })
      }
    })
  }

  const handleEdit = (message: Message) => {
    setMessageToEdit(message)
    setShowEditMessage(true)
  }

  const handleSaveEdit = (messageId: string, newText: string) => {
    const conversationId = activeChannelId || activeDMId
    if (!conversationId) return

    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(msg =>
        msg.id === messageId
          ? { ...msg, text: newText, isEdited: true, updatedAt: new Date() }
          : msg
      ),
    }))

    setShowEditMessage(false)
    setMessageToEdit(undefined)
  }

  const handleDelete = (message: Message) => {
    const conversationId = activeChannelId || activeDMId
    if (!conversationId) return

    if (confirm('Delete this message?')) {
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(msg => msg.id !== message.id)
      }))
    }
  }

  const handlePin = (message: Message) => {
    const conversationId = activeChannelId || activeDMId
    if (!conversationId) return

    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(msg =>
        msg.id === message.id
          ? { ...msg, isPinned: !msg.isPinned }
          : msg
      )
    }))
  }

  const handleThreadClick = (message: Message) => {
    setActiveThreadMessage(message)
    // Generate mock replies if not already loaded
    if (!threadReplies[message.id]) {
      const mockReplies: Message[] = Array.from({ length: 3 }, (_, i) => ({
        id: `thread-${message.id}-reply-${i}`,
        text: `Reply ${i + 1} to this message`,
        userId: mockUsers[i % mockUsers.length].id,
        user: mockUsers[i % mockUsers.length],
        channelId: message.channelId,
        createdAt: new Date(message.createdAt.getTime() + (i + 1) * 60000),
        reactions: [],
        mentions: [],
        parentId: message.id,
      }))
      setThreadReplies(prev => ({ ...prev, [message.id]: mockReplies }))
    }
  }

  const handleCloseThread = () => {
    setActiveThreadMessage(undefined)
  }

  const handleSendReply = (text: string, files?: File[]) => {
    if (!activeThreadMessage) return

    const newReply: Message = {
      id: `thread-reply-${Date.now()}`,
      text,
      userId: 'user-1',
      user: mockUsers[0],
      channelId: activeThreadMessage.channelId,
      createdAt: new Date(),
      attachments: files?.map((file, index) => ({
        id: `attachment-${Date.now()}-${index}`,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
      })),
      reactions: [],
      mentions: [],
      parentId: activeThreadMessage.id,
    }

    setThreadReplies(prev => ({
      ...prev,
      [activeThreadMessage.id]: [...(prev[activeThreadMessage.id] || []), newReply],
    }))

    // Update thread count on parent message
    const conversationId = activeChannelId || activeDMId
    if (conversationId) {
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg =>
          msg.id === activeThreadMessage.id
            ? { ...msg, threadCount: (msg.threadCount || 0) + 1 }
            : msg
        ),
      }))
    }
  }

  // Initialize messages for the first channel
  useMemo(() => {
    if (activeChannelId && !messages[activeChannelId]) {
      setMessages(prev => ({
        ...prev,
        [activeChannelId]: generateMockMessages(activeChannelId, 30)
      }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Star handlers
  const handleStarChannel = (channelId: string) => {
    setChannels(prev => prev.map(ch =>
      ch.id === channelId
        ? { ...ch, isStarred: !ch.isStarred }
        : ch
    ))
  }

  const handleStarDM = (dmId: string) => {
    setDMs(prev => prev.map(dm =>
      dm.id === dmId
        ? { ...dm, isStarred: !dm.isStarred }
        : dm
    ))
  }

  // Workspace handlers
  const handleWorkspaceChange = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId)
    // Clear active channel/DM when switching workspaces
    setActiveChannelId('')
    setActiveDMId(undefined)
  }

  const handleAddWorkspace = () => {
    setShowAddWorkspace(true)
  }

  const handleCreateWorkspace = (name: string, icon: string) => {
    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      icon,
      channels: [],
      members: [currentUser.id],
      createdAt: new Date(),
    }
    setWorkspaces(prev => [...prev, newWorkspace])
    setCurrentWorkspaceId(newWorkspace.id)
  }

  const handleWorkspaceSettings = (workspaceId: string) => {
    setShowWorkspaceSettings(true)
  }

  const handleUpdateWorkspace = (updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(ws =>
      ws.id === currentWorkspaceId ? { ...ws, ...updates } : ws
    ))
  }

  const handleLeaveWorkspace = () => {
    const remainingWorkspaces = workspaces.filter(ws => ws.id !== currentWorkspaceId)
    setWorkspaces(remainingWorkspaces)

    // Switch to first remaining workspace or create a default one
    if (remainingWorkspaces.length > 0) {
      setCurrentWorkspaceId(remainingWorkspaces[0].id)
    } else {
      // Create a default workspace
      const defaultWorkspace: Workspace = {
        id: 'ws-default',
        name: 'My Workspace',
        icon: '💼',
        channels: [],
        members: [currentUser.id],
        createdAt: new Date(),
      }
      setWorkspaces([defaultWorkspace])
      setCurrentWorkspaceId(defaultWorkspace.id)
    }
    setShowWorkspaceSettings(false)
  }

  const handleDeleteWorkspace = () => {
    handleLeaveWorkspace() // Same logic as leaving
  }

  // Mobile back navigation
  const handleMobileBack = () => {
    setActiveChannelId('')
    setActiveDMId(undefined)
  }

  // Handle search result click - navigate to the message's channel
  const handleSearchMessageClick = (message: Message) => {
    const channelId = message.channelId
    setActiveChannelId(channelId)
    setActiveDMId(undefined)

    // Generate messages for this channel if not already loaded
    if (!messages[channelId]) {
      setMessages(prev => ({
        ...prev,
        [channelId]: generateMockMessages(channelId, 30)
      }))
    }
  }

  // Create channel handler
  const handleCreateChannel = (name: string, description: string, type: 'public' | 'private') => {
    const newChannel: Channel = {
      id: `channel-${Date.now()}`,
      name,
      description,
      type,
      memberCount: 1, // Just the creator for now
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isStarred: false,
    }

    setChannels(prev => [...prev, newChannel])
    setActiveChannelId(newChannel.id)
    setActiveDMId(undefined)
    setShowCreateChannel(false)

    // Initialize empty messages for the new channel
    setMessages(prev => ({
      ...prev,
      [newChannel.id]: []
    }))

    // Initialize members - only the creator
    setChannelMembersMap(prev => ({
      ...prev,
      [newChannel.id]: [{
        ...mockUsers[0], // Alice Johnson (current user)
        role: 'owner' as const,
        joinedAt: new Date(),
      }]
    }))
  }

  // Start conversation handler
  const handleStartConversation = (userIds: string[], isGroup: boolean) => {
    const participants = mockUsers.filter(u => userIds.includes(u.id) || u.id === 'user-1')

    const newDM: DirectMessage = {
      id: `dm-${Date.now()}`,
      type: isGroup ? 'group' : 'direct',
      participants,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isStarred: false,
    }

    setDMs(prev => [...prev, newDM])
    setActiveDMId(newDM.id)
    setActiveChannelId('')
    setShowStartConversation(false)

    // Initialize empty messages for the new DM
    setMessages(prev => ({
      ...prev,
      [newDM.id]: []
    }))
  }

  // Get members for the active channel
  const channelMembers = useMemo(() => {
    if (!activeChannelId) return []

    // If we have members for this channel, return them
    if (channelMembersMap[activeChannelId]) {
      return channelMembersMap[activeChannelId]
    }

    // For existing mock channels, initialize with all users
    return mockUsers.map((user, index) => ({
      ...user,
      role: index === 0 ? 'owner' as const : index === 1 ? 'admin' as const : 'member' as const,
      joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    }))
  }, [activeChannelId, channelMembersMap])

  // Filter channels based on visibility (private channels only visible to members)
  const visibleChannels = useMemo(() => {
    return channels.filter(channel => {
      // Public channels are visible to everyone
      if (channel.type === 'public') return true

      // Private channels only visible to members
      if (channel.type === 'private') {
        const members = channelMembersMap[channel.id]
        if (!members) {
          // If no member list exists for a private channel, assume it's a legacy mock channel
          // For mock channels, check if it was created from mockChannels (has members)
          return true
        }
        // Only show if current user is a member
        return members.some(member => member.id === currentUser.id)
      }

      return true
    })
  }, [channels, channelMembersMap, currentUser.id])

  // Calculate unread counts
  const totalUnread = channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0) +
    dms.reduce((sum, dm) => sum + (dm.unreadCount || 0), 0)

  // Desktop layout
  const desktopLayout = (
    <ChatLayout
      sidebar={
        <ChatSidebar
          channels={visibleChannels}
          dms={dms}
          activeChannelId={activeChannelId}
          activeDMId={activeDMId}
          onChannelSelect={handleChannelSelect}
          onDMSelect={handleDMSelect}
          onStarChannel={handleStarChannel}
          onStarDM={handleStarDM}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onWorkspaceChange={handleWorkspaceChange}
          onAddWorkspace={handleAddWorkspace}
          onWorkspaceSettings={handleWorkspaceSettings}
          onCreateChannel={() => setShowCreateChannel(true)}
          onStartConversation={() => setShowStartConversation(true)}
        />
      }
      showThread={!!activeThreadMessage || showSearch || showMembers || showPinnedMessages}
      thread={
        showSearch ? (
          <MessageSearch
            messages={allMessages}
            channels={visibleChannels}
            users={mockUsers}
            onMessageClick={handleSearchMessageClick}
            onClose={() => setShowSearch(false)}
          />
        ) : showPinnedMessages ? (
          <PinnedMessagesPanel
            messages={currentMessages}
            onClose={() => setShowPinnedMessages(false)}
            onUnpin={(message) => {
              const conversationId = activeChannelId || activeDMId
              if (conversationId) {
                setMessages(prev => ({
                  ...prev,
                  [conversationId]: (prev[conversationId] || []).map(msg =>
                    msg.id === message.id ? { ...msg, isPinned: false } : msg
                  ),
                }))
              }
            }}
            onMessageClick={(message) => {
              // Set highlight message ID to scroll to it
              setHighlightMessageId(message.id)
              // Close pinned messages panel
              setShowPinnedMessages(false)
              // Clear highlight after navigation
              setTimeout(() => setHighlightMessageId(undefined), 2500)
            }}
          />
        ) : showMembers && activeChannel ? (
          <ChannelMembersPanel
            channelId={activeChannel.id}
            channelName={activeChannel.name}
            members={channelMembers}
            currentUserId={currentUser.id}
            onClose={() => setShowMembers(false)}
            onAddMembers={() => {
              setShowAddMembers(true)
              setShowMembers(false)
            }}
            onRemoveMember={(userId) => {
              setChannelMembersMap(prev => ({
                ...prev,
                [activeChannel.id]: (prev[activeChannel.id] || channelMembers).filter(m => m.id !== userId)
              }))

              // Update member count
              setChannels(prev => prev.map(ch =>
                ch.id === activeChannel.id
                  ? { ...ch, memberCount: Math.max(1, (ch.memberCount || 1) - 1) }
                  : ch
              ))
            }}
            onChangeRole={(userId, role) => {
              setChannelMembersMap(prev => ({
                ...prev,
                [activeChannel.id]: (prev[activeChannel.id] || channelMembers).map(m =>
                  m.id === userId ? { ...m, role } : m
                )
              }))
            }}
          />
        ) : activeThreadMessage ? (
          <ThreadPanel
            parentMessage={activeThreadMessage}
            replies={threadReplies[activeThreadMessage.id] || []}
            onClose={handleCloseThread}
            onSendReply={handleSendReply}
            onReact={handleReact}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : undefined
      }
      main={
        activeChannel ? (
          <ChannelView
            channel={activeChannel}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            onReply={handleThreadClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReact={handleReact}
            onThreadClick={handleThreadClick}
            onPin={handlePin}
            onSearchClick={() => {
              setShowSearch(true)
              setShowMembers(false)
              setActiveThreadMessage(undefined)
            }}
            onMembersClick={() => {
              setShowMembers(!showMembers)
              setShowSearch(false)
              setShowPinnedMessages(false)
              setActiveThreadMessage(undefined)
            }}
            onPinnedMessagesClick={() => {
              setShowPinnedMessages(!showPinnedMessages)
              setShowMembers(false)
              setShowSearch(false)
              setActiveThreadMessage(undefined)
            }}
            onSettingsClick={() => setShowChannelSettings(true)}
            typingUsers={typingUsers[currentConversationId]}
            highlightMessageId={highlightMessageId}
          />
        ) : activeDM ? (
          <DMView
            dm={activeDM}
            messages={currentMessages}
            currentUserId={currentUser.id}
            onSendMessage={handleSendMessage}
            onReply={handleThreadClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReact={handleReact}
            onThreadClick={handleThreadClick}
            onPin={handlePin}
            onSearchClick={() => {
              setShowSearch(true)
              setShowMembers(false)
              setActiveThreadMessage(undefined)
            }}
            onSettingsClick={() => setShowDMSettings(true)}
            typingUsers={typingUsers[currentConversationId]}
            highlightMessageId={highlightMessageId}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-950">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Chat SDK Mobile
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Select a channel or DM to start chatting
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Mobile-first design • Huly patterns</span>
              </div>
            </div>
          </div>
        )
      }
    />
  )

  // Mobile views
  const mobileWorkspaceView = <WorkspaceSwitcher />

  const mobileMessagesView = (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        {activeThreadMessage ? (
          // Show thread view when a thread is open
          <ThreadPanel
            parentMessage={activeThreadMessage}
            replies={threadReplies[activeThreadMessage.id] || []}
            onClose={handleCloseThread}
            onSendReply={handleSendReply}
            onReact={handleReact}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : activeChannel ? (
          <ChannelView
            channel={activeChannel}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            onReply={handleThreadClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReact={handleReact}
            onThreadClick={handleThreadClick}
            onPin={handlePin}
            onBackClick={handleMobileBack}
            typingUsers={typingUsers[currentConversationId]}
            highlightMessageId={highlightMessageId}
          />
        ) : activeDM ? (
          <DMView
            dm={activeDM}
            messages={currentMessages}
            currentUserId={currentUser.id}
            onSendMessage={handleSendMessage}
            onReply={handleThreadClick}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReact={handleReact}
            onThreadClick={handleThreadClick}
            onPin={handlePin}
            onBackClick={handleMobileBack}
            typingUsers={typingUsers[currentConversationId]}
            highlightMessageId={highlightMessageId}
          />
        ) : (
          <UnifiedMessagesView
            channels={visibleChannels}
            dms={dms}
            activeChannelId={activeChannelId}
            activeDMId={activeDMId}
            onChannelSelect={handleChannelSelect}
            onDMSelect={handleDMSelect}
            onStarChannel={handleStarChannel}
            onStarDM={handleStarDM}
            onCreateChannel={() => setShowCreateChannel(true)}
            onStartConversation={() => setShowStartConversation(true)}
          />
        )}
      </div>
    </div>
  )

  const mobileSearchView = (
    <MessageSearch
      messages={allMessages}
      channels={visibleChannels}
      users={mockUsers}
      onMessageClick={handleSearchMessageClick}
      isMobile={true}
    />
  )

  const handleUpdateProfile = (updates: Partial<User>) => {
    setCurrentUser(prev => ({ ...prev, ...updates }))
  }

  const handleLogout = () => {
    // Clear authentication tokens
    clearTokens()
    setAuthToken(null)
    setWsToken(null)
    setIsAuthenticated(false)

    // Clear active states
    setActiveChannelId('')
    setActiveDMId(undefined)
    setActiveThreadMessage(undefined)

    // Show confirmation (in UI-only mode, just reset to first workspace)
    setCurrentWorkspaceId(workspaces[0]?.id || 'ws-1')
  }

  const mobileProfileView = (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <UserProfileModal
        user={currentUser}
        onClose={() => {}} // No close button on mobile profile tab
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
      />
    </div>
  )

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <DemoLogin onLogin={handleLogin} />
  }

  return (
    <>
      {/* Desktop layout - hidden on mobile */}
      <div className="hidden md:block h-screen">
        {desktopLayout}
      </div>

      {/* Mobile layout - hidden on desktop */}
      <MobileViewSwitcher
        workspaceView={mobileWorkspaceView}
        messagesView={mobileMessagesView}
        searchView={mobileSearchView}
        profileView={mobileProfileView}
        unreadCount={totalUnread}
        onMessagesTabReclick={handleMobileBack}
      />

      {/* Modals */}
      {showCreateChannel && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onCreateChannel={handleCreateChannel}
        />
      )}
      {showStartConversation && (
        <StartConversationModal
          onClose={() => setShowStartConversation(false)}
          onStartConversation={handleStartConversation}
          availableUsers={mockUsers}
          currentUserId={currentUser.id}
        />
      )}
      {showChannelSettings && activeChannel && (
        <ChannelSettingsModal
          channel={activeChannel}
          currentUserRole={
            channelMembers.find(m => m.id === currentUser.id)?.role || 'member'
          }
          onClose={() => setShowChannelSettings(false)}
          onUpdateChannel={(updates) => {
            setChannels(prev => prev.map(ch =>
              ch.id === activeChannel.id ? { ...ch, ...updates } : ch
            ))
          }}
          onLeaveChannel={() => {
            // Remove user from channel members
            setChannelMembersMap(prev => ({
              ...prev,
              [activeChannel.id]: (prev[activeChannel.id] || []).filter(m => m.id !== currentUser.id)
            }))

            // If it's a private channel, remove it from the visible channels list
            if (activeChannel.type === 'private') {
              setChannels(prev => prev.filter(ch => ch.id !== activeChannel.id))
            }

            setActiveChannelId('')
            setShowChannelSettings(false)
          }}
          onDeleteChannel={() => {
            setChannels(prev => prev.filter(ch => ch.id !== activeChannel.id))
            setActiveChannelId('')
            setShowChannelSettings(false)
          }}
          onToggleMute={() => {
            setChannels(prev => prev.map(ch =>
              ch.id === activeChannel.id ? { ...ch, isMuted: !ch.isMuted } : ch
            ))
          }}
        />
      )}
      {showAddMembers && activeChannel && (
        <AddMembersModal
          channelName={activeChannel.name}
          onClose={() => {
            setShowAddMembers(false)
            setShowMembers(true)
          }}
          onAddMembers={(userIds) => {
            // Add the selected users to the channel
            const newMembers = mockUsers
              .filter(u => userIds.includes(u.id))
              .map(user => ({
                ...user,
                role: 'member' as const,
                joinedAt: new Date(),
              }))

            setChannelMembersMap(prev => ({
              ...prev,
              [activeChannel.id]: [...(prev[activeChannel.id] || channelMembers), ...newMembers]
            }))

            // Update member count
            setChannels(prev => prev.map(ch =>
              ch.id === activeChannel.id
                ? { ...ch, memberCount: (ch.memberCount || 0) + newMembers.length }
                : ch
            ))

            setShowAddMembers(false)
            setShowMembers(true)
          }}
          availableUsers={mockUsers}
          currentMemberIds={channelMembers.map(m => m.id)}
        />
      )}
      {showDMSettings && activeDM && (
        <DMSettingsModal
          dm={activeDM}
          onClose={() => setShowDMSettings(false)}
          onToggleMute={() => {
            setDMs(prev => prev.map(dm =>
              dm.id === activeDM.id ? { ...dm, isMuted: !dm.isMuted } : dm
            ))
          }}
          onLeaveConversation={() => {
            setDMs(prev => prev.filter(dm => dm.id !== activeDM.id))
            setActiveDMId(undefined)
            setShowDMSettings(false)
          }}
        />
      )}
      {showWorkspaceSettings && (
        <WorkspaceSettingsModal
          workspace={workspaces.find(w => w.id === currentWorkspaceId)!}
          currentUserRole="owner"
          onClose={() => setShowWorkspaceSettings(false)}
          onUpdateWorkspace={handleUpdateWorkspace}
          onInviteMembers={() => {
            setShowWorkspaceInvite(true)
            setShowWorkspaceSettings(false)
          }}
          onLeaveWorkspace={handleLeaveWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
        />
      )}
      {showEditMessage && messageToEdit && (
        <EditMessageModal
          message={messageToEdit}
          onClose={() => {
            setShowEditMessage(false)
            setMessageToEdit(undefined)
          }}
          onSave={handleSaveEdit}
        />
      )}
      {showAddWorkspace && (
        <AddWorkspaceModal
          onClose={() => setShowAddWorkspace(false)}
          onAddWorkspace={handleCreateWorkspace}
        />
      )}
      {showUserProfile && (
        <UserProfileModal
          user={currentUser}
          onClose={() => setShowUserProfile(false)}
          onUpdateProfile={handleUpdateProfile}
          onLogout={handleLogout}
        />
      )}
      {showWorkspaceInvite && (
        <WorkspaceInviteModal
          workspace={workspaces.find(w => w.id === currentWorkspaceId)!}
          onClose={() => setShowWorkspaceInvite(false)}
          onInvite={(emails) => {
            // In production, this would send email invites via API
            // For now, just show a success message
            alert(`Invitations sent to ${emails.length} ${emails.length === 1 ? 'person' : 'people'}!\n\n${emails.join('\n')}`)
            setShowWorkspaceInvite(false)
          }}
        />
      )}
    </>
  )
}

export default App
