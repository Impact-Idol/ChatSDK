import { useState } from 'react'
import { Hash, ChevronRight, Users, Star, Plus, MessageSquarePlus, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/Avatar'
import type { Channel, DirectMessage, User } from '@/types'

interface UnifiedMessagesViewProps {
  channels: Channel[]
  dms: DirectMessage[]
  activeChannelId?: string
  activeDMId?: string
  onChannelSelect: (channelId: string) => void
  onDMSelect: (dmId: string) => void
  onStarChannel?: (channelId: string) => void
  onStarDM?: (dmId: string) => void
  onCreateChannel?: () => void
  onStartConversation?: () => void
}

export function UnifiedMessagesView({
  channels,
  dms,
  activeChannelId,
  activeDMId,
  onChannelSelect,
  onDMSelect,
  onStarChannel,
  onStarDM,
  onCreateChannel,
  onStartConversation,
}: UnifiedMessagesViewProps) {
  const [filter, setFilter] = useState<'all' | 'starred'>('all')
  // Helper to get the other user in a DM (assumes current user is user-1)
  const getDMUser = (dm: DirectMessage): User | null => {
    if (dm.type === 'direct') {
      return dm.participants.find(u => u.id !== 'user-1') || null
    }
    return null
  }

  // Helper to get DM name
  const getDMName = (dm: DirectMessage): string => {
    if (dm.type === 'direct') {
      const otherUser = getDMUser(dm)
      return otherUser?.name || 'Unknown'
    }
    // For group DMs, show participant names
    return dm.participants.map(u => u.name).join(', ')
  }

  // Filter channels and DMs
  const filteredChannels = filter === 'starred'
    ? channels.filter(ch => ch.isStarred)
    : channels

  const filteredDMs = filter === 'starred'
    ? dms.filter(dm => dm.isStarred)
    : dms

  const hasStarredItems = channels.some(ch => ch.isStarred) || dms.some(dm => dm.isStarred)

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <div className="flex items-center gap-2">
            {onStartConversation && (
              <button
                onClick={onStartConversation}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                title="Start conversation"
              >
                <MessageSquarePlus size={20} />
              </button>
            )}
            {onCreateChannel && (
              <button
                onClick={onCreateChannel}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                title="Create channel"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        {hasStarredItems && (
          <div className="flex gap-2 px-4 pb-3">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter('starred')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === 'starred'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              <Star size={14} className={filter === 'starred' ? "fill-white" : ""} />
              Starred
            </button>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Channels Section */}
        {filteredChannels.length > 0 && (
          <div className="py-2">
            <div className="px-4 py-2">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Channels
              </h2>
            </div>
            <div className="space-y-0.5">
              {filteredChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  'active:bg-gray-100 dark:active:bg-gray-800',
                  activeChannelId === channel.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}
              >
                <div className="flex-shrink-0">
                  {channel.type === 'private' ? (
                    <Lock size={20} className="text-gray-500 dark:text-gray-400" />
                  ) : (
                    <Hash size={20} className="text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'font-medium truncate',
                        activeChannelId === channel.id
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-900 dark:text-white'
                      )}
                    >
                      {channel.name}
                    </span>
                    {channel.unreadCount && channel.unreadCount > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold text-white bg-purple-600 dark:bg-purple-500 rounded-full">
                        {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                      </span>
                    )}
                  </div>
                  {channel.lastMessage && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                      {channel.lastMessage.text}
                    </p>
                  )}
                </div>
                {channel.isStarred && (
                  <Star size={16} className="flex-shrink-0 fill-yellow-500 text-yellow-500 mr-1" />
                )}
                <ChevronRight
                  size={16}
                  className="flex-shrink-0 text-gray-400 dark:text-gray-500"
                />
              </button>
            ))}
            </div>
          </div>
        )}

        {/* Direct Messages Section */}
        {filteredDMs.length > 0 && (
          <div className="py-2 border-t border-gray-200 dark:border-gray-800">
            <div className="px-4 py-2">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Direct Messages
              </h2>
            </div>
            <div className="space-y-0.5">
              {filteredDMs.map((dm) => {
              const dmUser = getDMUser(dm)
              const dmName = getDMName(dm)

              return (
                <button
                  key={dm.id}
                  onClick={() => onDMSelect(dm.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    'active:bg-gray-100 dark:active:bg-gray-800',
                    activeDMId === dm.id
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                >
                  <div className="flex-shrink-0">
                    {dm.type === 'direct' && dmUser ? (
                      <Avatar user={dmUser} size="md" showStatus status={dmUser.status} />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 flex items-center justify-center">
                        <Users size={20} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'font-medium truncate',
                          activeDMId === dm.id
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-gray-900 dark:text-white'
                        )}
                      >
                        {dmName}
                      </span>
                      {dm.unreadCount && dm.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold text-white bg-purple-600 dark:bg-purple-500 rounded-full">
                          {dm.unreadCount > 99 ? '99+' : dm.unreadCount}
                        </span>
                      )}
                    </div>
                    {dm.lastMessage && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                        {dm.lastMessage.text}
                      </p>
                    )}
                  </div>
                  {dm.isStarred && (
                    <Star size={16} className="flex-shrink-0 fill-yellow-500 text-yellow-500 mr-1" />
                  )}
                  <ChevronRight
                    size={16}
                    className="flex-shrink-0 text-gray-400 dark:text-gray-500"
                  />
                </button>
              )
            })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
