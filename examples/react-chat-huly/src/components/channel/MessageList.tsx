import { useEffect, useRef, useState } from 'react'
import { formatDateSeparator } from '@/utils/formatDate'
import { shouldGroupWithPrevious } from '@/utils/groupMessages'
import { MessageItem } from './MessageItem'
import { TypingIndicator } from '../shared/TypingIndicator'
import type { Message } from '@/types'
import { isSameDay } from 'date-fns'

interface MessageListProps {
  messages: Message[]
  onReply?: (message: Message) => void
  onEdit?: (message: Message) => void
  onDelete?: (message: Message) => void
  onReact?: (message: Message, emoji: string) => void
  onThreadClick?: (message: Message) => void
  onPin?: (message: Message) => void
  typingUsers?: Array<{ userId: string; name: string }>
  highlightMessageId?: string
  isLoading?: boolean
}

export function MessageList({
  messages,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onThreadClick,
  onPin,
  typingUsers = [],
  highlightMessageId,
  isLoading = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current && !highlightMessageId) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, highlightMessageId])

  // Scroll to and highlight specific message
  useEffect(() => {
    if (highlightMessageId) {
      const messageElement = messageRefs.current.get(highlightMessageId)
      if (messageElement && scrollContainerRef.current) {
        // Scroll to message
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Highlight message
        setHighlightedId(highlightMessageId)

        // Remove highlight after 2 seconds
        const timer = setTimeout(() => {
          setHighlightedId(null)
        }, 2000)

        return () => clearTimeout(timer)
      }
    }
  }, [highlightMessageId])

  const setMessageRef = (id: string, element: HTMLDivElement | null) => {
    if (element) {
      messageRefs.current.set(id, element)
    } else {
      messageRefs.current.delete(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-500" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-sm px-4">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No messages yet
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Be the first to send a message in this channel
          </p>
        </div>
      </div>
    )
  }

  // Group messages by date
  const groupedMessages: { date: Date; messages: Message[] }[] = []
  messages.forEach((message) => {
    const lastGroup = groupedMessages[groupedMessages.length - 1]
    if (lastGroup && isSameDay(lastGroup.date, message.createdAt)) {
      lastGroup.messages.push(message)
    } else {
      groupedMessages.push({ date: message.createdAt, messages: [message] })
    }
  })

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto scrollbar-thin bg-gray-50 dark:bg-gray-950"
    >
      <div className="py-4">
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date separator */}
            <div className="sticky top-0 z-10 flex items-center justify-center py-4">
              <div className="px-4 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full shadow-sm">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {formatDateSeparator(group.date)}
                </span>
              </div>
            </div>

            {/* Messages for this date */}
            {group.messages.map((message, index) => {
              const prevMessage = index > 0 ? group.messages[index - 1] : undefined
              const isGrouped = shouldGroupWithPrevious(message, prevMessage)

              return (
                <MessageItem
                  key={message.id}
                  ref={(el) => setMessageRef(message.id, el)}
                  message={message}
                  isGrouped={isGrouped}
                  showAvatar={!isGrouped}
                  isHighlighted={highlightedId === message.id}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                  onThreadClick={onThreadClick}
                  onPin={onPin}
                />
              )
            })}
          </div>
        ))}
        {/* Typing Indicator */}
        <TypingIndicator users={typingUsers} />
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
