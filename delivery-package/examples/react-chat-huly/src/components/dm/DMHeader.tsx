import { Search, Phone, Video, MoreVertical, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/Avatar'
import type { DirectMessage } from '@/types'

interface DMHeaderProps {
  dm: DirectMessage
  onSearchClick?: () => void
  onCallClick?: () => void
  onVideoClick?: () => void
  onSettingsClick?: () => void
  onBackClick?: () => void
}

export function DMHeader({
  dm,
  onSearchClick,
  onCallClick,
  onVideoClick,
  onSettingsClick,
  onBackClick,
}: DMHeaderProps) {
  const otherUsers = dm.participants.filter(p => p.id !== 'user-1')
  const displayUser = otherUsers[0]
  const isGroup = dm.type === 'group'

  const displayName = isGroup
    ? otherUsers.map(u => u.name.split(' ')[0]).join(', ')
    : displayUser.name

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Left: DM Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile back button */}
        {onBackClick && (
          <button
            onClick={onBackClick}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Back to messages"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <Avatar
          user={displayUser}
          size="md"
          showStatus
          status={displayUser.status}
        />

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {displayName}
          </h1>
          {!isGroup && displayUser.status && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate capitalize">
              {displayUser.status}
            </p>
          )}
          {isGroup && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {otherUsers.length + 1} members
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
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
        {!isGroup && (
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
        )}

        {/* Video call */}
        {!isGroup && (
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
        )}

        {/* More options */}
        <button
          onClick={onSettingsClick}
          className={cn(
            'p-2 rounded-lg',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'text-gray-600 dark:text-gray-400',
            'transition-colors'
          )}
          title="DM settings"
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  )
}
