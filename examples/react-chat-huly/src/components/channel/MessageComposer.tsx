import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Paperclip, Smile, Send, AtSign, Hash, Bold, Italic, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MentionAutocomplete } from '../chat/MentionAutocomplete'
import { EmojiPicker } from '../shared/EmojiPicker'
import type { User } from '@/types'

interface MessageComposerProps {
  onSendMessage: (text: string, files?: File[], mentions?: string[]) => void
  placeholder?: string
  disabled?: boolean
  channelId: string
  users?: User[]
}

export function MessageComposer({
  onSendMessage,
  placeholder = 'Type a message...',
  disabled = false,
  channelId,
  users = [],
}: MessageComposerProps) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [showToolbar, setShowToolbar] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(0)
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [mentions, setMentions] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [text])

  // Detect mentions when text changes
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = text.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      const hasSpaceAfterAt = textAfterAt.includes(' ')

      if (!hasSpaceAfterAt) {
        setShowMentions(true)
        setMentionSearch(textAfterAt)
        setMentionStartIndex(lastAtIndex)
        setSelectedMentionIndex(0)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }, [text])

  const handleSend = () => {
    if (text.trim() || files.length > 0) {
      onSendMessage(text.trim(), files, mentions)
      setText('')
      setFiles([])
      setMentions([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPosition = textarea.selectionStart
    const beforeCursor = text.substring(0, cursorPosition)
    const afterCursor = text.substring(cursorPosition)
    const newText = `${beforeCursor}${emoji}${afterCursor}`

    setText(newText)
    setShowEmojiPicker(false)

    // Set cursor position after the emoji
    setTimeout(() => {
      const newPosition = cursorPosition + emoji.length
      textarea.setSelectionRange(newPosition, newPosition)
      textarea.focus()
    }, 0)
  }

  const handleMentionSelect = (user: User) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const username = user.name.toLowerCase().replace(/\s+/g, '')
    const beforeMention = text.substring(0, mentionStartIndex)
    const afterMention = text.substring(textarea.selectionStart)
    const newText = `${beforeMention}@${username} ${afterMention}`

    setText(newText)
    setMentions(prev => [...prev, user.id])
    setShowMentions(false)

    // Set cursor position after the mention
    setTimeout(() => {
      const newPosition = mentionStartIndex + username.length + 2
      textarea.setSelectionRange(newPosition, newPosition)
      textarea.focus()
    }, 0)
  }

  const insertFormatting = (before: string, after: string = before) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = text.substring(start, end)
    const beforeText = text.substring(0, start)
    const afterText = text.substring(end)

    // If text is selected, wrap it
    // If not, insert the markers with cursor in between
    const newText = selectedText
      ? `${beforeText}${before}${selectedText}${after}${afterText}`
      : `${beforeText}${before}${after}${afterText}`

    setText(newText)

    // Set cursor position
    setTimeout(() => {
      const newPosition = selectedText
        ? start + before.length + selectedText.length + after.length
        : start + before.length
      textarea.setSelectionRange(newPosition, newPosition)
      textarea.focus()
    }, 0)
  }

  const handleBold = () => insertFormatting('**')
  const handleItalic = () => insertFormatting('*')
  const handleCode = () => insertFormatting('`')
  const handleInsertMention = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPosition = textarea.selectionStart
    const beforeText = text.substring(0, cursorPosition)
    const afterText = text.substring(cursorPosition)
    const newText = `${beforeText}@${afterText}`

    setText(newText)
    setTimeout(() => {
      textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1)
      textarea.focus()
    }, 0)
  }

  const handleInsertChannel = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPosition = textarea.selectionStart
    const beforeText = text.substring(0, cursorPosition)
    const afterText = text.substring(cursorPosition)
    const newText = `${beforeText}#${afterText}`

    setText(newText)
    setTimeout(() => {
      textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1)
      textarea.focus()
    }, 0)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle keyboard shortcuts for formatting
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === 'b') {
        e.preventDefault()
        handleBold()
        return
      }
      if (e.key === 'i') {
        e.preventDefault()
        handleItalic()
        return
      }
      if (e.key === 'e') {
        e.preventDefault()
        handleCode()
        return
      }
    }

    // Handle mention autocomplete navigation
    if (showMentions) {
      const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(mentionSearch.toLowerCase())
      )

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex(prev =>
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        )
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex(prev =>
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        )
        return
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (filteredUsers[selectedMentionIndex]) {
          handleMentionSelect(filteredUsers[selectedMentionIndex])
        }
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentions(false)
        return
      }
    }

    // Normal message send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selectedFiles])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* File previews */}
      {files.length > 0 && (
        <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
            >
              <Paperclip size={14} className="text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                {file.name}
              </span>
              <button
                onClick={() => removeFile(index)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formatting toolbar (desktop only) */}
      {showToolbar && (
        <div className="hidden md:flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={handleBold}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={handleItalic}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={handleCode}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Inline code (Ctrl+E)"
          >
            <Code size={16} />
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
          <button
            onClick={handleInsertMention}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Mention user (@)"
          >
            <AtSign size={16} />
          </button>
          <button
            onClick={handleInsertChannel}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Mention channel (#)"
          >
            <Hash size={16} />
          </button>
        </div>
      )}

      {/* Main input area */}
      <div className="px-4 py-3">
        <div className="flex items-end gap-2">
          {/* Left: File upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={cn(
              'flex-shrink-0 p-2 rounded-lg transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'text-gray-600 dark:text-gray-400',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Center: Text input */}
          <div className="flex-1 relative">
            {/* Mention autocomplete */}
            {showMentions && (
              <MentionAutocomplete
                users={users}
                searchQuery={mentionSearch}
                selectedIndex={selectedMentionIndex}
                onSelect={handleMentionSelect}
                onClose={() => setShowMentions(false)}
              />
            )}

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowToolbar(true)}
              onBlur={() => setTimeout(() => setShowToolbar(false), 200)}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg resize-none',
                'bg-gray-100 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'placeholder-gray-500 dark:placeholder-gray-400',
                'border border-transparent',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600',
                'focus:border-transparent',
                'transition-colors',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>

          {/* Right: Emoji & Send */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={disabled}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'text-gray-600 dark:text-gray-400',
                  showEmojiPicker && 'bg-gray-100 dark:bg-gray-800',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                title="Add emoji"
              >
                <Smile size={20} />
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                  position="top"
                />
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={disabled || (!text.trim() && files.length === 0)}
              className={cn(
                'p-2 rounded-lg transition-all',
                text.trim() || files.length > 0
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title="Send message"
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* Helper text */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="hidden sm:inline">
            Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to send,{' '}
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Shift+Enter</kbd> for new line
          </span>
          <span className="sm:hidden">Tap send to post message</span>
        </div>
      </div>
    </div>
  )
}
