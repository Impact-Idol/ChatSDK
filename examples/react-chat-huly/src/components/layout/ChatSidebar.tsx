import { useState } from 'react'
import { Hash, MessageSquare, Search, Plus, MoreHorizontal, Star, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Channel, DirectMessage, Workspace } from '@/types'
import { formatChannelTime } from '@/utils/formatDate'
import { Avatar } from '../ui/Avatar'
import { ThemeToggle } from '../shared/ThemeToggle'
import { WorkspaceDropdown } from '../workspace/WorkspaceDropdown'

interface ChatSidebarProps {
  channels: Channel[]
  dms: DirectMessage[]
  activeChannelId?: string
  activeDMId?: string
  onChannelSelect: (channelId: string) => void
  onDMSelect: (dmId: string) => void
  onStarChannel?: (channelId: string) => void
  onStarDM?: (dmId: string) => void
  workspaces?: Workspace[]
  currentWorkspaceId?: string
  onWorkspaceChange?: (workspaceId: string) => void
  onAddWorkspace?: () => void
  onWorkspaceSettings?: (workspaceId: string) => void
  onCreateChannel?: () => void
  onStartConversation?: () => void
}

export function ChatSidebar({
  channels,
  dms,
  activeChannelId,
  activeDMId,
  onChannelSelect,
  onDMSelect,
  onStarChannel,
  onStarDM,
  workspaces = [],
  currentWorkspaceId,
  onWorkspaceChange,
  onAddWorkspace,
  onWorkspaceSettings,
  onCreateChannel,
  onStartConversation,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [channelsExpanded, setChannelsExpanded] = useState(true)
  const [dmsExpanded, setDMsExpanded] = useState(true)
  const [starredExpanded, setStarredExpanded] = useState(true)

  const filteredChannels = channels.filter(ch =>
    ch?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? true
  )

  const filteredDMs = dms.filter(dm => {
    const otherUser = dm.participants.find(p => p.id !== 'user-1')
    return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Get starred items
  const starredChannels = filteredChannels.filter(ch => ch.isStarred)
  const starredDMs = filteredDMs.filter(dm => dm.isStarred)
  const hasStarredItems = starredChannels.length > 0 || starredDMs.length > 0

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Workspace Switcher - Only shown if user has multiple workspaces */}
      {workspaces.length > 1 && currentWorkspaceId && onWorkspaceChange && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <WorkspaceDropdown
            workspaces={workspaces}
            currentWorkspaceId={currentWorkspaceId}
            onWorkspaceChange={onWorkspaceChange}
            onAddWorkspace={onAddWorkspace}
            onWorkspaceSettings={onWorkspaceSettings}
          />
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat</h2>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {onCreateChannel && (
              <button
                onClick={onCreateChannel}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                title="Create channel"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Starred Section */}
        {hasStarredItems && (
          <div className="px-2 py-3">
            <button
              onClick={() => setStarredExpanded(!starredExpanded)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Star size={14} className="fill-yellow-500 text-yellow-500" />
                Starred
              </span>
              <MoreHorizontal size={14} />
            </button>

            {starredExpanded && (
              <div className="mt-1 space-y-0.5">
                {/* Starred Channels */}
                {starredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className="group relative"
                  >
                    <button
                      onClick={() => onChannelSelect(channel.id)}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors',
                        activeChannelId === channel.id
                          ? 'bg-purple-600 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {channel.type === 'private' ? (
                        <Lock size={16} className="flex-shrink-0" />
                      ) : (
                        <Hash size={16} className="flex-shrink-0" />
                      )}
                      <span className="font-medium truncate flex-1 text-left">{channel.name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {onStarChannel && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              onStarChannel(channel.id)
                            }}
                            className="p-1 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                            role="button"
                            tabIndex={0}
                            aria-label="Unstar channel"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.stopPropagation()
                                onStarChannel(channel.id)
                              }
                            }}
                          >
                            <Star size={14} className="fill-yellow-500 text-yellow-500" />
                          </span>
                        )}
                        {(channel.unreadCount ?? 0) > 0 && (
                          <span className={cn(
                            'px-2 py-0.5 text-xs font-semibold rounded-full',
                            activeChannelId === channel.id
                              ? 'bg-white/20 text-white'
                              : 'bg-purple-600 text-white'
                          )}>
                            {channel.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                ))}

                {/* Starred DMs */}
                {starredDMs.map((dm) => {
                  const otherUsers = dm.participants.filter(p => p.id !== 'user-1')
                  const displayUser = otherUsers[0]
                  const isGroup = dm.type === 'group'

                  return (
                    <div
                      key={dm.id}
                      className="group relative"
                    >
                      <button
                        onClick={() => onDMSelect(dm.id)}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors',
                          activeDMId === dm.id
                            ? 'bg-purple-600 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        )}
                      >
                        <Avatar
                          user={displayUser}
                          size="sm"
                          showStatus
                          status={displayUser.status}
                        />
                        <span className="font-medium truncate flex-1 text-left">
                          {isGroup
                            ? otherUsers.map(u => u.name.split(' ')[0]).join(', ')
                            : displayUser.name}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {onStarDM && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                onStarDM(dm.id)
                              }}
                              className="p-1 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                              role="button"
                              tabIndex={0}
                              aria-label="Unstar conversation"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  onStarDM(dm.id)
                                }
                              }}
                            >
                              <Star size={14} className="fill-yellow-500 text-yellow-500" />
                            </span>
                          )}
                          {(dm.unreadCount ?? 0) > 0 && (
                            <span className={cn(
                              'px-2 py-0.5 text-xs font-semibold rounded-full',
                              activeDMId === dm.id
                                ? 'bg-white/20 text-white'
                                : 'bg-purple-600 text-white'
                            )}>
                              {dm.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Channels Section */}
        <div className={cn("px-2 py-3", hasStarredItems && "border-t border-gray-200 dark:border-gray-800")}>
          <button
            onClick={() => setChannelsExpanded(!channelsExpanded)}
            className="flex items-center justify-between w-full px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Hash size={14} />
              Channels
            </span>
            <MoreHorizontal size={14} />
          </button>

          {channelsExpanded && (
            <div className="mt-1 space-y-0.5">
              {filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="group relative"
                >
                  <button
                    onClick={() => onChannelSelect(channel.id)}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors',
                      activeChannelId === channel.id
                        ? 'bg-purple-600 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {channel.type === 'private' ? (
                      <Lock size={16} className="flex-shrink-0" />
                    ) : (
                      <Hash size={16} className="flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{channel.name}</span>
                        {channel.lastMessageAt && (
                          <span className={cn(
                            'text-xs ml-2',
                            activeChannelId === channel.id ? 'text-white/70' : 'text-gray-500'
                          )}>
                            {formatChannelTime(channel.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      {channel.description && (
                        <p className={cn(
                          'text-xs truncate',
                          activeChannelId === channel.id ? 'text-white/70' : 'text-gray-500'
                        )}>
                          {channel.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onStarChannel && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            onStarChannel(channel.id)
                          }}
                          className={cn(
                            "p-1 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer",
                            channel.isStarred ? "" : "opacity-0 group-hover:opacity-60"
                          )}
                          role="button"
                          tabIndex={0}
                          aria-label={channel.isStarred ? "Unstar channel" : "Star channel"}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              onStarChannel(channel.id)
                            }
                          }}
                        >
                          <Star size={14} className={channel.isStarred ? "fill-yellow-500 text-yellow-500" : "text-gray-400 dark:text-gray-500"} />
                        </span>
                      )}
                      {(channel.unreadCount ?? 0) > 0 && (
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-semibold rounded-full',
                          activeChannelId === channel.id
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-600 text-white'
                        )}>
                          {channel.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Direct Messages Section */}
        <div className="px-2 py-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-3 py-1.5">
            <button
              onClick={() => setDMsExpanded(!dmsExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <MessageSquare size={14} />
              Direct Messages
            </button>
            <div className="flex items-center gap-1">
              {onStartConversation && (
                <button
                  onClick={onStartConversation}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400"
                  title="Start conversation"
                >
                  <Plus size={14} />
                </button>
              )}
              <button
                onClick={() => setDMsExpanded(!dmsExpanded)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-600 dark:text-gray-400"
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>

          {dmsExpanded && (
            <div className="mt-1 space-y-0.5">
              {filteredDMs.map((dm) => {
                const otherUsers = dm.participants.filter(p => p.id !== 'user-1')
                const displayUser = otherUsers[0]
                const isGroup = dm.type === 'group'

                return (
                  <div
                    key={dm.id}
                    className="group relative"
                  >
                    <button
                      onClick={() => onDMSelect(dm.id)}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors',
                        activeDMId === dm.id
                          ? 'bg-purple-600 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <Avatar
                        user={displayUser}
                        size="sm"
                        showStatus
                        status={displayUser.status}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">
                            {isGroup
                              ? otherUsers.map(u => u.name.split(' ')[0]).join(', ')
                              : displayUser.name}
                          </span>
                          {dm.lastMessageAt && (
                            <span className={cn(
                              'text-xs ml-2',
                              activeDMId === dm.id ? 'text-white/70' : 'text-gray-500'
                            )}>
                              {formatChannelTime(dm.lastMessageAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {onStarDM && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              onStarDM(dm.id)
                            }}
                            className={cn(
                              "p-1 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer",
                              dm.isStarred ? "" : "opacity-0 group-hover:opacity-60"
                            )}
                            role="button"
                            tabIndex={0}
                            aria-label={dm.isStarred ? "Unstar conversation" : "Star conversation"}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.stopPropagation()
                                onStarDM(dm.id)
                              }
                            }}
                          >
                            <Star size={14} className={dm.isStarred ? "fill-yellow-500 text-yellow-500" : "text-gray-400 dark:text-gray-500"} />
                          </span>
                        )}
                        {(dm.unreadCount ?? 0) > 0 && (
                          <span className={cn(
                            'px-2 py-0.5 text-xs font-semibold rounded-full',
                            activeDMId === dm.id
                              ? 'bg-white/20 text-white'
                              : 'bg-purple-600 text-white'
                          )}>
                            {dm.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
