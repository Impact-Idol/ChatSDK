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
import { mockDMs, generateMockMessages, mockUsers } from './data/mockData'
import type { Message, Channel, DirectMessage, User, Workspace } from './types'

// Hooks
import { useAuth } from './hooks/useAuth'
import { useChannels, useStarChannel, useMuteChannel, useCreateChannel, useDeleteChannel } from './hooks/useChannels'
import { useWorkspaces, useCreateWorkspace, useUpdateWorkspace, useDeleteWorkspace } from './hooks/useWorkspaces'
import { useMessages, useSendMessage, useUpdateMessage, useDeleteMessage, usePinMessage, useAddReaction, useRemoveReaction } from './hooks/useMessages'
import { useWebSocket, useChannelSubscription, useWorkspaceSubscription } from './hooks/useWebSocket'

function App() {
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[0])
  const auth = useAuth()

  // Initialize WebSocket when authenticated
  useWebSocket(isAuthenticated)

  // Check for stored tokens on mount
  useEffect(() => {
    const storedTokens = getStoredTokens()
    if (storedTokens) {
      setIsAuthenticated(true)
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
  const handleLogin = async (user: DemoUser, token: string, wsToken: string) => {
    setIsAuthenticated(true)
    setCurrentUser({
      id: user.id,
      name: user.name,
      email: `${user.id}@demo.chatsdk.dev`,
      avatar: user.image || '',
      status: 'online'
    })
  }

  // Fetch data from API
  const { data: workspacesData } = useWorkspaces()
  const { data: channelsData } = useChannels()
  const workspaces = workspacesData?.workspaces || []
  const channels = channelsData?.channels || []

  // Workspace state
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('')

  // Set first workspace as current when data loads
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspaceId) {
      setCurrentWorkspaceId(workspaces[0].id)
    }
  }, [workspaces, currentWorkspaceId])

  // Subscribe to workspace events
  useWorkspaceSubscription(currentWorkspaceId)

  // Channel and DM state
  const [activeChannelId, setActiveChannelId] = useState<string>('')
  const [activeDMId, setActiveDMId] = useState<string | undefined>()
  const [dms, setDMs] = useState(mockDMs)

  // Subscribe to active channel events
  useChannelSubscription(activeChannelId)

  // Fetch messages for active channel
  const { data: messagesData } = useMessages(activeChannelId || '', { limit: 100 })
  const currentMessages = messagesData?.messages || []

  // Mutations
  const starChannelMutation = useStarChannel()
  const muteChannelMutation = useMuteChannel()
  const createChannelMutation = useCreateChannel()
  const deleteChannelMutation = useDeleteChannel()
  const sendMessageMutation = useSendMessage()
  const updateMessageMutation = useUpdateMessage()
  const deleteMessageMutation = useDeleteMessage()
  const pinMessageMutation = usePinMessage()
  const addReactionMutation = useAddReaction()
  const removeReactionMutation = useRemoveReaction()
  const createWorkspaceMutation = useCreateWorkspace()
  const updateWorkspaceMutation = useUpdateWorkspace()
  const deleteWorkspaceMutation = useDeleteWorkspace()

  // Thread state
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

  // Convert API channels to UI format
  const uiChannels: Channel[] = channels.map(ch => ({
    id: ch.id,
    name: ch.name,
    description: ch.description,
    type: ch.type as 'public' | 'private',
    memberCount: ch.memberCount,
    unreadCount: ch.unreadCount || 0,
    isPinned: false,
    isMuted: ch.muted || false,
    isStarred: ch.starred || false,
  }))

  // Convert API workspaces to UI format
  const uiWorkspaces: Workspace[] = workspaces.map(ws => ({
    id: ws.id,
    name: ws.name,
    icon: ws.icon || '💼',
    channels: [],
    members: [],
    createdAt: new Date(ws.createdAt),
  }))

  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId)
    setActiveDMId(undefined)
  }

  const handleDMSelect = (dmId: string) => {
    setActiveDMId(dmId)
    setActiveChannelId('')
  }

  const activeChannel = uiChannels.find(c => c.id === activeChannelId)
  const activeDM = dms.find(dm => dm.id === activeDMId)

  // Get all messages for search (use API messages)
  const allMessages = currentMessages

  // Message handlers
  const handleSendMessage = async (text: string, files?: File[], mentions?: string[]) => {
    const channelId = activeChannelId || activeDMId
    if (!channelId) return

    await sendMessageMutation.mutateAsync({
      channelId,
      text,
      mentions,
    })
  }

  const handleReact = async (message: Message, emoji: string) => {
    const channelId = activeChannelId || activeDMId
    if (!channelId) return

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions?.find(r => r.emoji === emoji)
    const hasReacted = existingReaction?.users.some(u => u.id === currentUser.id)

    if (hasReacted) {
      await removeReactionMutation.mutateAsync({ messageId: message.id, emoji, channelId })
    } else {
      await addReactionMutation.mutateAsync({ messageId: message.id, emoji, channelId })
    }
  }

  const handleEdit = (message: Message) => {
    setMessageToEdit(message)
    setShowEditMessage(true)
  }

  const handleSaveEdit = async (messageId: string, newText: string) => {
    await updateMessageMutation.mutateAsync({ messageId, text: newText })
    setShowEditMessage(false)
    setMessageToEdit(undefined)
  }

  const handleDelete = async (message: Message) => {
    const channelId = activeChannelId || activeDMId
    if (!channelId) return

    if (confirm('Delete this message?')) {
      await deleteMessageMutation.mutateAsync({ messageId: message.id, channelId })
    }
  }

  const handlePin = async (message: Message) => {
    const channelId = activeChannelId || activeDMId
    if (!channelId) return

    await pinMessageMutation.mutateAsync({
      messageId: message.id,
      pinned: !message.isPinned,
      channelId
    })
  }

  const handleThreadClick = (message: Message) => {
    setActiveThreadMessage(message)
    // Generate mock replies (TODO: implement thread API)
    if (!threadReplies[message.id]) {
      const mockReplies: Message[] = []
      setThreadReplies(prev => ({ ...prev, [message.id]: mockReplies }))
    }
  }

  const handleCloseThread = () => {
    setActiveThreadMessage(undefined)
  }

  const handleSendReply = async (text: string, files?: File[]) => {
    if (!activeThreadMessage) return

    await sendMessageMutation.mutateAsync({
      channelId: activeThreadMessage.channelId,
      text,
      parentId: activeThreadMessage.id,
    })
  }

  // Star handlers
  const handleStarChannel = async (channelId: string) => {
    const channel = uiChannels.find(ch => ch.id === channelId)
    if (!channel) return

    await starChannelMutation.mutateAsync({
      channelId,
      starred: !channel.isStarred
    })
  }

  const handleStarDM = (dmId: string) => {
    setDMs(prev => prev.map(dm =>
      dm.id === dmId ? { ...dm, isStarred: !dm.isStarred } : dm
    ))
  }

  // Workspace handlers
  const handleWorkspaceChange = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId)
    setActiveChannelId('')
    setActiveDMId(undefined)
  }

  const handleAddWorkspace = () => {
    setShowAddWorkspace(true)
  }

  const handleCreateWorkspace = async (name: string, icon: string) => {
    await createWorkspaceMutation.mutateAsync({ name, icon })
    setShowAddWorkspace(false)
  }

  const handleWorkspaceSettings = (_workspaceId: string) => {
    setShowWorkspaceSettings(true)
  }

  const handleUpdateWorkspace = async (updates: Partial<Workspace>) => {
    if (!currentWorkspaceId) return
    await updateWorkspaceMutation.mutateAsync({
      id: currentWorkspaceId,
      data: { name: updates.name, icon: updates.icon }
    })
  }

  const handleLeaveWorkspace = async () => {
    if (!currentWorkspaceId) return
    await deleteWorkspaceMutation.mutateAsync(currentWorkspaceId)
    setShowWorkspaceSettings(false)
    // Switch to first remaining workspace
    if (uiWorkspaces.length > 1) {
      setCurrentWorkspaceId(uiWorkspaces[0].id)
    }
  }

  const handleDeleteWorkspace = () => {
    handleLeaveWorkspace()
  }

  // Mobile back navigation
  const handleMobileBack = () => {
    setActiveChannelId('')
    setActiveDMId(undefined)
  }

  // Handle search result click
  const handleSearchMessageClick = (message: Message) => {
    const channelId = message.channelId
    setActiveChannelId(channelId)
    setActiveDMId(undefined)
  }

  // Create channel handler
  const handleCreateChannel = async (name: string, description: string, type: 'public' | 'private') => {
    const newChannel = await createChannelMutation.mutateAsync({
      name,
      description,
      type,
      workspaceId: currentWorkspaceId,
    })

    setActiveChannelId(newChannel.id)
    setActiveDMId(undefined)
    setShowCreateChannel(false)
  }

  // Start conversation handler (mock for now)
  const handleStartConversation = (userIds: string[], isGroup: boolean) => {
    const participants = mockUsers.filter(u => userIds.includes(u.id) || u.id === currentUser.id)

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
  }

  // Get members for the active channel (mock for now)
  const channelMembers = useMemo(() => {
    if (!activeChannelId) return []

    if (channelMembersMap[activeChannelId]) {
      return channelMembersMap[activeChannelId]
    }

    return mockUsers.map((user, index) => ({
      ...user,
      role: index === 0 ? 'owner' as const : index === 1 ? 'admin' as const : 'member' as const,
      joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    }))
  }, [activeChannelId, channelMembersMap])

  // Filter channels (all visible for now)
  const visibleChannels = uiChannels

  // Calculate unread counts
  const totalUnread = uiChannels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0) +
    dms.reduce((sum, dm) => sum + (dm.unreadCount || 0), 0)

  const handleLogout = () => {
    clearTokens()
    auth.logout()
    setIsAuthenticated(false)
    setActiveChannelId('')
    setActiveDMId(undefined)
    setActiveThreadMessage(undefined)
  }

  const handleUpdateProfile = (updates: Partial<User>) => {
    setCurrentUser(prev => ({ ...prev, ...updates }))
  }

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
          workspaces={uiWorkspaces}
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
              if (activeChannelId) {
                pinMessageMutation.mutate({
                  messageId: message.id,
                  pinned: false,
                  channelId: activeChannelId
                })
              }
            }}
            onMessageClick={(message) => {
              setHighlightMessageId(message.id)
              setShowPinnedMessages(false)
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
            typingUsers={typingUsers[activeChannelId]}
            highlightMessageId={highlightMessageId}
          />
        ) : activeDM ? (
          <DMView
            dm={activeDM}
            messages={generateMockMessages(activeDM.id, 20)}
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
            typingUsers={typingUsers[activeDMId]}
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
                <span>Mobile-first design • Connected to ChatSDK API</span>
              </div>
            </div>
          </div>
        )
      }
    />
  )

  // Mobile views (simplified for now, keep existing mobile implementation)
  const mobileWorkspaceView = <WorkspaceSwitcher />
  const mobileMessagesView = (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        {activeChannel || activeDM ? (
          desktopLayout
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

  const mobileProfileView = (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <UserProfileModal
        user={currentUser}
        onClose={() => {}}
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
      <div className="hidden md:block h-screen">
        {desktopLayout}
      </div>

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
          currentUserRole={channelMembers.find(m => m.id === currentUser.id)?.role || 'member'}
          onClose={() => setShowChannelSettings(false)}
          onUpdateChannel={(updates) => {
            // TODO: Call update channel API
            console.log('Update channel:', updates)
          }}
          onLeaveChannel={() => {
            setActiveChannelId('')
            setShowChannelSettings(false)
          }}
          onDeleteChannel={async () => {
            await deleteChannelMutation.mutateAsync(activeChannel.id)
            setActiveChannelId('')
            setShowChannelSettings(false)
          }}
          onToggleMute={async () => {
            await muteChannelMutation.mutateAsync({
              channelId: activeChannel.id,
              muted: !activeChannel.isMuted
            })
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
          workspace={uiWorkspaces.find(w => w.id === currentWorkspaceId)!}
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
          workspace={uiWorkspaces.find(w => w.id === currentWorkspaceId)!}
          onClose={() => setShowWorkspaceInvite(false)}
          onInvite={(emails) => {
            alert(`Invitations sent to ${emails.length} ${emails.length === 1 ? 'person' : 'people'}!\n\n${emails.join('\n')}`)
            setShowWorkspaceInvite(false)
          }}
        />
      )}
    </>
  )
}

export default App
