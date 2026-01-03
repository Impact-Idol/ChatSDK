import { Hash, Users, Search, Phone, Video, MoreVertical, Bell, Pin, ArrowLeft, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Channel } from '@/types'

interface ChannelHeaderProps {
  channel: Channel
  memberCount?: number
  pinnedMessageCount?: number
  onSearchClick?: () => void
  onMembersClick?: () => void
  onPinnedMessagesClick?: () => void
  onCallClick?: () => void
  onVideoClick?: () => void
  onSettingsClick?: () => void
  onToggleMute?: () => void
  onTogglePin?: () => void
  onBackClick?: () => void
}

export function ChannelHeader({
  channel,
  memberCount,
  pinnedMessageCount,
  onSearchClick,
  onMembersClick,
  onPinnedMessagesClick,
  onCallClick,
  onVideoClick,
  onSettingsClick,
  onToggleMute,
  onTogglePin,
  onBackClick,
}: ChannelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Left: Channel Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile back button */}
        {onBackClick && (
          <button
            onClick={onBackClick}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Back to channels"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div className="flex-shrink-0">
          {channel.type === 'private' ? (
            <Lock size={20} className="text-gray-500 dark:text-gray-400" />
          ) : (
            <Hash size={20} className="text-gray-500 dark:text-gray-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {channel.name}
            </h1>
            {channel.isPinned && (
              <Pin size={14} className="text-purple-600 dark:text-purple-500 flex-shrink-0" />
            )}
            {channel.isMuted && (
              <Bell size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            )}
          </div>
          {channel.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {channel.description}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Member count */}
        {memberCount && (
          <button
            onClick={onMembersClick}
            className={cn(
              'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'transition-colors text-sm font-medium'
            )}
          >
            <Users size={16} />
            <span>{memberCount}</span>
          </button>
        )}

        {/* Pinned messages */}
        {pinnedMessageCount !== undefined && pinnedMessageCount > 0 && onPinnedMessagesClick && (
          <button
            onClick={onPinnedMessagesClick}
            className={cn(
              'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'hover:bg-purple-100 dark:hover:bg-purple-900/30',
              'text-purple-700 dark:text-purple-400',
              'transition-colors text-sm font-medium'
            )}
            title="View pinned messages"
          >
            <Pin size={16} className="fill-current" />
            <span>{pinnedMessageCount}</span>
          </button>
        )}

        {/* Search */}
        <button
          onClick={onSearchClick}
          className={cn(
            'p-2 rounded-lg',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'text-gray-600 dark:text-gray-400',
            'transition-colors'
          )}
          title="Search messages"
        >
          <Search size={18} />
        </button>

        {/* Phone call */}
        <button
          onClick={onCallClick}
          className={cn(
            'hidden md:block p-2 rounded-lg',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'text-gray-600 dark:text-gray-400',
            'transition-colors'
          )}
          title="Start voice call"
        >
          <Phone size={18} />
        </button>

        {/* Video call */}
        <button
          onClick={onVideoClick}
          className={cn(
            'hidden md:block p-2 rounded-lg',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'text-gray-600 dark:text-gray-400',
            'transition-colors'
          )}
          title="Start video call"
        >
          <Video size={18} />
        </button>

        {/* More options */}
        <button
          onClick={onSettingsClick}
          className={cn(
            'p-2 rounded-lg',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'text-gray-600 dark:text-gray-400',
            'transition-colors'
          )}
          title="Channel settings"
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  )
}
