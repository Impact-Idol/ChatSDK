import { X, Pin, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMessageTime } from '@/utils/formatDate'
import { Avatar } from '../ui/Avatar'
import type { Message } from '@/types'

interface PinnedMessagesPanelProps {
  messages: Message[]
  onClose: () => void
  onUnpin?: (message: Message) => void
  onMessageClick?: (message: Message) => void
}

export function PinnedMessagesPanel({
  messages,
  onClose,
  onUnpin,
  onMessageClick,
}: PinnedMessagesPanelProps) {
  const pinnedMessages = messages.filter(msg => msg.isPinned)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Pin size={18} className="text-purple-600 dark:text-purple-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Pinned Messages
          </h2>
          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold rounded-full">
            {pinnedMessages.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          title="Close pinned messages"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {pinnedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Pin size={24} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              No pinned messages
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
              Pin important messages to find them later. Pinned messages appear here for everyone in the channel.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {pinnedMessages.map((message) => (
              <div
                key={message.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                {/* Message header */}
                <div className="flex items-start gap-3 mb-2">
                  <Avatar user={message.user} size="sm" showStatus status={message.user.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {message.user.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message content */}
                <div className="ml-11">
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-4">
                    {message.text}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onMessageClick && (
                      <button
                        onClick={() => onMessageClick(message)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                          'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
                          'text-gray-700 dark:text-gray-300',
                          'transition-colors'
                        )}
                      >
                        <ExternalLink size={12} />
                        Jump to message
                      </button>
                    )}
                    {onUnpin && (
                      <button
                        onClick={() => onUnpin(message)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                          'bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50',
                          'text-purple-700 dark:text-purple-400',
                          'transition-colors'
                        )}
                        title="Unpin message"
                      >
                        <Pin size={12} className="fill-current" />
                        Unpin
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Tip: Hover over any message and click the pin icon to pin it here
          </p>
        </div>
      )}
    </div>
  )
}
