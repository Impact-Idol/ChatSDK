import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/Avatar'
import type { User } from '@/types'

interface MentionAutocompleteProps {
  users: User[]
  searchQuery: string
  selectedIndex: number
  onSelect: (user: User) => void
  onClose: () => void
  position?: { top: number; left: number }
}

export function MentionAutocomplete({
  users,
  searchQuery,
  selectedIndex,
  onSelect,
  onClose,
  position,
}: MentionAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter users based on search query
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = containerRef.current?.children[selectedIndex] as HTMLElement
    selectedElement?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (filteredUsers.length === 0) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full mb-2 left-0 w-80 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
      style={position}
    >
      <div className="p-2">
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Mention user
        </div>
        {filteredUsers.map((user, index) => (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
              index === selectedIndex
                ? 'bg-purple-600 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
            )}
          >
            <Avatar user={user} size="sm" showStatus status={user.status} />
            <div className="flex-1 min-w-0">
              <div className={cn(
                'font-medium truncate',
                index === selectedIndex ? 'text-white' : 'text-gray-900 dark:text-white'
              )}>
                {user.name}
              </div>
              <div className={cn(
                'text-xs truncate',
                index === selectedIndex ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
              )}>
                @{user.name.toLowerCase().replace(/\s+/g, '')}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
