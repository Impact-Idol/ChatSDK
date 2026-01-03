import { useState, memo, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { MoreVertical, Smile, Reply, Edit2, Trash2, MessageSquare, Pin, ExternalLink, Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMessageTime } from '@/utils/formatDate'
import { Avatar } from '../ui/Avatar'
import { EmojiPicker } from '../shared/EmojiPicker'
import { mockUsers } from '@/data/mockData'
import type { Message } from '@/types'

// Helper to extract URLs from text
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const matches = text.match(urlRegex)
  return matches || []
}

// Mock link preview data
function getLinkPreview(url: string) {
  const domain = new URL(url).hostname

  // Mock previews for common domains
  if (domain.includes('github.com')) {
    return {
      title: 'GitHub Repository',
      description: 'Code repository and collaboration platform',
      image: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      domain: 'github.com'
    }
  } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
    return {
      title: 'YouTube Video',
      description: 'Watch videos and subscribe to channels',
      image: 'https://www.youtube.com/img/desktop/yt_1200.png',
      domain: 'youtube.com'
    }
  } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
    return {
      title: 'Post on X',
      description: 'See what\'s happening in the world',
      image: null,
      domain: domain.includes('x.com') ? 'x.com' : 'twitter.com'
    }
  }

  // Generic preview for other URLs
  return {
    title: domain,
    description: 'External link',
    image: null,
    domain
  }
}

// Link Preview Component
function LinkPreview({ url }: { url: string }) {
  const preview = getLinkPreview(url)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 max-w-md border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      {preview.image && (
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <img
            src={preview.image}
            alt={preview.title}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {preview.title}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {preview.description}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
              <ExternalLink size={10} />
              <span>{preview.domain}</span>
            </div>
          </div>
        </div>
      </div>
    </a>
  )
}

// Helper function to detect language from code block
function detectLanguage(code: string): string {
  const firstLine = code.split('\n')[0].trim().toLowerCase()
  // Simple language detection based on common patterns
  if (firstLine.includes('function') || firstLine.includes('const') || firstLine.includes('let')) return 'javascript'
  if (firstLine.includes('def ') || firstLine.includes('import ')) return 'python'
  if (firstLine.includes('public class') || firstLine.includes('private ')) return 'java'
  return 'text'
}

// Helper function to parse markdown and render formatted text
function parseMarkdown(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  let currentIndex = 0
  let keyCounter = 0

  // First, handle code blocks (```code```)
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  let codeBlockMatch

  // Store code block positions to skip them in inline formatting
  const codeBlockRanges: Array<{ start: number; end: number }> = []

  while ((codeBlockMatch = codeBlockRegex.exec(text)) !== null) {
    codeBlockRanges.push({
      start: codeBlockMatch.index,
      end: codeBlockMatch.index + codeBlockMatch[0].length
    })
  }

  // Reset regex
  codeBlockRegex.lastIndex = 0

  while ((codeBlockMatch = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (codeBlockMatch.index > currentIndex) {
      const beforeText = text.substring(currentIndex, codeBlockMatch.index)
      parts.push(...parseInlineMarkdown(beforeText, keyCounter))
    }

    const language = codeBlockMatch[1] || detectLanguage(codeBlockMatch[2])
    const code = codeBlockMatch[2].trim()

    parts.push(
      <div key={`codeblock-${keyCounter++}`} className="my-2">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-1.5 bg-gray-200 dark:bg-gray-750 border-b border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400">
            {language}
          </div>
          <pre className="p-3 overflow-x-auto">
            <code className="text-xs font-mono text-gray-900 dark:text-gray-100">
              {code}
            </code>
          </pre>
        </div>
      </div>
    )

    currentIndex = codeBlockMatch.index + codeBlockMatch[0].length
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex)
    parts.push(...parseInlineMarkdown(remainingText, keyCounter))
  }

  return parts.length > 0 ? parts : [text]
}

// Helper for inline markdown (bold, italic, inline code) and links
function parseInlineMarkdown(text: string, startKey: number): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  let currentIndex = 0
  let keyCounter = startKey

  // Combined regex for all formatting: bold, italic, code, and URLs
  const formatRegex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|`([^`]+)`|(https?:\/\/[^\s]+)/g
  let match

  while ((match = formatRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      const beforeText = text.substring(currentIndex, match.index)
      parts.push(beforeText)
    }

    // Determine which format matched
    if (match[1] && match[2]) {
      // Bold (**text** or __text__)
      parts.push(
        <strong key={`bold-${keyCounter++}`} className="font-bold">
          {match[2]}
        </strong>
      )
    } else if (match[3] && match[4]) {
      // Italic (*text* or _text_)
      parts.push(
        <em key={`italic-${keyCounter++}`} className="italic">
          {match[4]}
        </em>
      )
    } else if (match[5]) {
      // Inline code (`text`)
      parts.push(
        <code
          key={`code-${keyCounter++}`}
          className="bg-gray-100 dark:bg-gray-800 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded text-xs font-mono"
        >
          {match[5]}
        </code>
      )
    } else if (match[6]) {
      // URL link
      const url = match[6]
      parts.push(
        <a
          key={`link-${keyCounter++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
        >
          {url}
        </a>
      )
    }

    currentIndex = match.index + match[0].length
  }

  // Add any remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex))
  }

  return parts
}

// Helper function to render text with markdown and highlighted mentions
function renderTextWithMentions(text: string, mentions?: string[]) {
  // First, handle markdown formatting
  const markdownParts = parseMarkdown(text)

  // Then, process mentions in each text segment
  const finalParts: (string | JSX.Element)[] = []
  let keyCounter = 0

  markdownParts.forEach((part, partIndex) => {
    if (typeof part === 'string') {
      // Process mentions in this text segment
      const mentionPattern = /@(\w+)/g
      let lastIndex = 0
      let match

      while ((match = mentionPattern.exec(part)) !== null) {
        const beforeMatch = part.substring(lastIndex, match.index)
        if (beforeMatch) {
          finalParts.push(beforeMatch)
        }

        const mentionedUsername = match[1]
        const mentionedUser = mockUsers.find(
          user => user.name.toLowerCase().replace(/\s+/g, '') === mentionedUsername.toLowerCase()
        )

        if (mentionedUser && mentions?.includes(mentionedUser.id)) {
          finalParts.push(
            <span
              key={`mention-${keyCounter++}`}
              className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
              title={mentionedUser.name}
            >
              @{mentionedUsername}
            </span>
          )
        } else {
          finalParts.push(match[0])
        }

        lastIndex = match.index + match[0].length
      }

      // Add remaining text from this segment
      if (lastIndex < part.length) {
        finalParts.push(part.substring(lastIndex))
      }
    } else {
      // Keep JSX elements as-is (already formatted markdown)
      finalParts.push(part)
    }
  })

  return finalParts.length > 0 ? finalParts : text
}

interface MessageItemProps {
  message: Message
  isGrouped?: boolean
  showAvatar?: boolean
  isHighlighted?: boolean
  onReply?: (message: Message) => void
  onEdit?: (message: Message) => void
  onDelete?: (message: Message) => void
  onReact?: (message: Message, emoji: string) => void
  onThreadClick?: (message: Message) => void
  onPin?: (message: Message) => void
}

const MessageItemComponent = forwardRef<HTMLDivElement, MessageItemProps>(({
  message,
  isGrouped = false,
  showAvatar = true,
  isHighlighted = false,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onThreadClick,
  onPin,
}, ref) => {
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handleReact = (emoji: string) => {
    onReact?.(message, emoji)
    setShowEmojiPicker(false)
  }

  // Check if current user is mentioned in this message
  const currentUserId = 'user-1' // Alice Johnson
  const isMentioned = message.mentions?.includes(currentUserId) || false

  // Check if message can be deleted (within 15 minutes)
  const canDelete = () => {
    if (message.userId !== 'user-1') return false
    const fifteenMinutes = 15 * 60 * 1000
    const messageAge = Date.now() - message.createdAt.getTime()
    return messageAge < fifteenMinutes
  }

  const handleDeleteClick = () => {
    if (!canDelete()) {
      alert('Messages can only be deleted within 15 minutes of sending')
      return
    }
    onDelete?.(message)
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative px-4 transition-colors',
        isGrouped ? 'py-0.5' : 'py-2',
        isHighlighted
          ? 'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-400 dark:ring-yellow-600 rounded-lg'
          : isMentioned
          ? 'bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-l-4 border-purple-600 dark:border-purple-500 pl-3'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex gap-3">
        {/* Avatar (hidden when grouped) */}
        <div className={cn('flex-shrink-0', isGrouped && 'invisible')}>
          {showAvatar && (
            <Avatar user={message.user} size="md" showStatus status={message.user.status} />
          )}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Header (hidden when grouped) */}
          {!isGrouped && (
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                {message.user.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatMessageTime(message.createdAt)}
              </span>
              {message.isEdited && (
                <span className="text-xs text-gray-400 dark:text-gray-500">(edited)</span>
              )}
              {/* Read receipts for current user's messages */}
              {message.userId === currentUserId && (
                <span
                  className="text-xs text-gray-400 dark:text-gray-500"
                  title={
                    message.readBy && message.readBy.length > 0
                      ? `Read by ${message.readBy
                          .map(id => mockUsers.find(u => u.id === id)?.name)
                          .filter(Boolean)
                          .join(', ')}`
                      : 'Sent'
                  }
                >
                  {message.readBy && message.readBy.length > 0 ? (
                    <CheckCheck size={12} className="inline text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Check size={12} className="inline" />
                  )}
                </span>
              )}
            </div>
          )}

          {/* Message text */}
          <div className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {renderTextWithMentions(message.text, message.mentions)}
          </div>

          {/* Link Previews */}
          {extractUrls(message.text).map((url, index) => (
            <LinkPreview key={`preview-${index}`} url={url} />
          ))}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {attachment.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {attachment.size && `${(attachment.size / 1024).toFixed(1)} KB`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReact(reaction.emoji)
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                    'bg-gray-100 dark:bg-gray-800',
                    'hover:bg-gray-200 dark:hover:bg-gray-700',
                    'transition-colors',
                    reaction.users.some((u) => u.id === 'user-1') &&
                      'bg-purple-100 dark:bg-purple-900/30 border border-purple-500 dark:border-purple-600'
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {reaction.count}
                  </span>
                </button>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleReact('👍')
                }}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Smile size={14} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          )}

          {/* Thread indicator */}
          {message.threadCount && message.threadCount > 0 && (
            <button
              onClick={() => onThreadClick?.(message)}
              className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-purple-600 dark:text-purple-500 transition-colors"
            >
              <MessageSquare size={16} />
              <span>
                {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}
              </span>
            </button>
          )}
        </div>

        {/* Hover actions (desktop only) */}
        {showActions && (
          <div className="hidden md:flex absolute -top-1 right-8 items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-1 py-1 z-10">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors',
                  showEmojiPicker && 'bg-gray-100 dark:bg-gray-700'
                )}
                title="React"
              >
                <Smile size={16} className="text-gray-600 dark:text-gray-400" />
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={handleReact}
                  onClose={() => setShowEmojiPicker(false)}
                  position="top"
                />
              )}
            </div>
            <button
              onClick={() => onReply?.(message)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Reply in thread"
            >
              <Reply size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => onPin?.(message)}
              className={cn(
                'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors',
                message.isPinned && 'text-purple-600 dark:text-purple-400'
              )}
              title={message.isPinned ? 'Unpin message' : 'Pin message'}
            >
              <Pin size={16} className={message.isPinned ? 'fill-current' : ''} />
            </button>
            {message.userId === 'user-1' && (
              <>
                <button
                  onClick={() => onEdit?.(message)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Edit message"
                >
                  <Edit2 size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={handleDeleteClick}
                  className={cn(
                    'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors',
                    !canDelete() && 'opacity-50 cursor-not-allowed'
                  )}
                  title={canDelete() ? 'Delete message' : 'Can only delete within 15 minutes'}
                >
                  <Trash2 size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
              </>
            )}
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-700" />
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
              <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* Timestamp on grouped messages (shows on hover) */}
      {isGrouped && (
        <div className="absolute left-16 top-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 dark:text-gray-500">
          {formatMessageTime(message.createdAt)}
        </div>
      )}
    </motion.div>
  )
})

export const MessageItem = memo(MessageItemComponent)
