import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  position?: 'top' | 'bottom'
}

// Common emojis organized by category
const EMOJI_CATEGORIES = {
  'Frequently Used': ['👍', '❤️', '😂', '😊', '🎉', '🔥', '👏', '✅'],
  'Smileys & People': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
    '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
    '😝', '🤗', '🤭', '🤔', '🤐', '🤨', '😐', '😑',
  ],
  'Gestures': ['👍', '👎', '👏', '🙌', '👌', '✌️', '🤞', '🤝', '🙏', '💪', '👋', '🤙'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💖'],
  'Objects': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💡', '🔥', '⭐', '✨', '💫'],
  'Nature': ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼', '🌾', '🍀', '🌿', '🌳', '🌈', '☀️'],
  'Food': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🍖', '🍗', '🥓', '🥞', '🧇', '🍞'],
  'Symbols': ['✅', '✔️', '❌', '❗', '❓', '💯', '🔴', '🟢', '🟡', '⭕', '🚫', '💬'],
}

export function EmojiPicker({ onSelect, onClose, position = 'bottom' }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState('Frequently Used')
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Filter emojis based on search
  const getFilteredEmojis = () => {
    if (!searchQuery) {
      return EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES] || []
    }

    // Search across all categories
    const allEmojis = Object.values(EMOJI_CATEGORIES).flat()
    return allEmojis.filter(emoji => emoji.includes(searchQuery))
  }

  const filteredEmojis = getFilteredEmojis()

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji)
    onClose()
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute z-50 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl',
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      )}
    >
      {/* Search */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emoji..."
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg text-sm',
              'bg-gray-100 dark:bg-gray-800',
              'border border-transparent',
              'focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-500 dark:placeholder-gray-400'
            )}
          />
        </div>
      </div>

      {/* Categories */}
      {!searchQuery && (
        <div className="flex gap-1 px-3 py-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto scrollbar-thin">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                selectedCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-3">
        {filteredEmojis.length > 0 ? (
          <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto scrollbar-thin">
            {filteredEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => handleEmojiSelect(emoji)}
                className="w-10 h-10 flex items-center justify-center text-2xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            No emojis found
          </div>
        )}
      </div>
    </div>
  )
}
