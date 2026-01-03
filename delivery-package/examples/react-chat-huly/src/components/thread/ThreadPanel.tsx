import { X, ArrowLeft } from 'lucide-react'
import { MessageItem } from '../channel/MessageItem'
import { MessageComposer } from '../channel/MessageComposer'
import type { Message } from '@/types'

interface ThreadPanelProps {
  parentMessage: Message
  replies: Message[]
  onClose: () => void
  onSendReply: (text: string, files?: File[]) => void
  onReact?: (message: Message, emoji: string) => void
  onEdit?: (message: Message) => void
  onDelete?: (message: Message) => void
}

export function ThreadPanel({
  parentMessage,
  replies,
  onClose,
  onSendReply,
  onReact,
  onEdit,
  onDelete,
}: ThreadPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        {/* Mobile back button */}
        <button
          onClick={onClose}
          className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          aria-label="Back to channel"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Thread</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </p>
        </div>

        {/* Desktop close button */}
        <button
          onClick={onClose}
          className="hidden md:block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
          aria-label="Close thread"
        >
          <X size={20} />
        </button>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Parent message */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <div className="px-2 py-4">
            <MessageItem
              message={parentMessage}
              showAvatar={true}
              isGrouped={false}
              onReact={onReact}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>

        {/* Replies */}
        <div className="py-2">
          {replies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                No replies yet. Be the first to reply!
              </p>
            </div>
          ) : (
            replies.map((reply, index) => {
              const prevReply = index > 0 ? replies[index - 1] : undefined
              const isGrouped =
                prevReply &&
                reply.userId === prevReply.userId &&
                reply.createdAt.getTime() - prevReply.createdAt.getTime() < 5 * 60 * 1000

              return (
                <MessageItem
                  key={reply.id}
                  message={reply}
                  showAvatar={!isGrouped}
                  isGrouped={isGrouped}
                  onReact={onReact}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              )
            })
          )}
        </div>
      </div>

      {/* Reply composer */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <MessageComposer
          channelId={parentMessage.channelId}
          onSendMessage={onSendReply}
          placeholder="Reply to thread..."
        />
      </div>
    </div>
  )
}
