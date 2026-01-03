import { useState } from 'react'
import { X, Bell, BellOff, LogOut, Users as UsersIcon, UserMinus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/Avatar'
import type { DirectMessage, User } from '@/types'

interface DMSettingsModalProps {
  dm: DirectMessage
  onClose: () => void
  onToggleMute?: () => void
  onLeaveConversation?: () => void
  onManageMembers?: () => void
}

export function DMSettingsModal({
  dm,
  onClose,
  onToggleMute,
  onLeaveConversation,
  onManageMembers,
}: DMSettingsModalProps) {
  const otherUsers = dm.participants.filter(p => p.id !== 'user-1')
  const isGroup = dm.type === 'group'

  const handleLeave = () => {
    if (confirm(`Are you sure you want to leave this conversation?`)) {
      onLeaveConversation?.()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isGroup ? 'Group Settings' : 'Conversation Settings'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-6">
            {/* Participants */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {isGroup ? 'Members' : 'Participant'}
              </h3>
              <div className="space-y-2">
                {otherUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Avatar
                      user={user}
                      size="md"
                      showStatus
                      status={user.status}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate capitalize">
                        {user.status || 'offline'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {isGroup && onManageMembers && otherUsers.length > 1 && (
                <button
                  onClick={() => {
                    onManageMembers()
                    onClose()
                  }}
                  className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors text-sm font-medium"
                >
                  <UsersIcon size={16} />
                  Manage Members
                </button>
              )}
            </div>

            {/* Notifications */}
            {onToggleMute && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Notifications
                </h3>
                <button
                  onClick={onToggleMute}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {dm.isMuted ? (
                      <BellOff size={18} className="text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Bell size={18} className="text-gray-500 dark:text-gray-400" />
                    )}
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {dm.isMuted ? 'Unmute conversation' : 'Mute conversation'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {dm.isMuted ? 'Turn on notifications' : 'Stop receiving notifications'}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Danger Zone */}
            {onLeaveConversation && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Danger Zone
                </h3>
                <button
                  onClick={handleLeave}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                >
                  <LogOut size={18} />
                  <div className="text-left">
                    <div className="text-sm font-medium">
                      {isGroup ? 'Leave group' : 'Leave conversation'}
                    </div>
                    <div className="text-xs">
                      {isGroup ? 'You can be re-added by other members' : 'Clear conversation history'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
