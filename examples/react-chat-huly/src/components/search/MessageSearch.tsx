import { useState, useMemo } from 'react'
import { Search, X, Filter, Calendar, User as UserIcon, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMessageTime } from '@/utils/formatDate'
import { Avatar } from '../ui/Avatar'
import type { Message, Channel, User } from '@/types'

interface MessageSearchProps {
  messages: Message[]
  channels: Channel[]
  users: User[]
  onMessageClick?: (message: Message) => void
  onClose?: () => void
  isMobile?: boolean
}

interface SearchFilters {
  channelId?: string
  userId?: string
  dateFrom?: Date
  dateTo?: Date
}

export function MessageSearch({
  messages,
  channels,
  users,
  onMessageClick,
  onClose,
  isMobile = false,
}: MessageSearchProps) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})

  // Search logic
  const searchResults = useMemo(() => {
    if (!query.trim() && !filters.channelId && !filters.userId) {
      return []
    }

    let results = messages

    // Text search
    if (query.trim()) {
      const lowerQuery = query.toLowerCase()
      results = results.filter((msg) =>
        msg.text.toLowerCase().includes(lowerQuery)
      )
    }

    // Channel filter
    if (filters.channelId) {
      results = results.filter((msg) => msg.channelId === filters.channelId)
    }

    // User filter
    if (filters.userId) {
      results = results.filter((msg) => msg.userId === filters.userId)
    }

    // Date range filter
    if (filters.dateFrom) {
      results = results.filter((msg) => msg.createdAt >= filters.dateFrom!)
    }
    if (filters.dateTo) {
      results = results.filter((msg) => msg.createdAt <= filters.dateTo!)
    }

    // Sort by newest first
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [query, filters, messages])

  // Highlight matching text
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 text-gray-900 dark:text-white">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col border-b border-gray-200 dark:border-gray-800">
        {/* Top bar with close button */}
        {onClose && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isMobile ? 'Search Messages' : 'Search'}
            </h1>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Search input */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className={cn(
                'w-full pl-10 pr-10 py-2.5 rounded-lg',
                'bg-gray-100 dark:bg-gray-800',
                'border border-transparent',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                'text-gray-900 dark:text-white',
                'placeholder:text-gray-500 dark:placeholder:text-gray-400'
              )}
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              showFilters
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 bg-purple-600 dark:bg-purple-500 text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Filter options */}
        {showFilters && (
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Channel filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Hash size={14} className="inline mr-1" />
                Channel
              </label>
              <select
                value={filters.channelId || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    channelId: e.target.value || undefined,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 dark:text-white"
              >
                <option value="">All channels</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </div>

            {/* User filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <UserIcon size={14} className="inline mr-1" />
                User
              </label>
              <select
                value={filters.userId || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    userId: e.target.value || undefined,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 dark:text-white"
              >
                <option value="">All users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Calendar size={14} className="inline mr-1" />
                Date range
              </label>
              <select
                onChange={(e) => {
                  const value = e.target.value
                  const now = new Date()
                  let dateFrom: Date | undefined
                  let dateTo: Date | undefined = now

                  switch (value) {
                    case 'today':
                      dateFrom = new Date(now.setHours(0, 0, 0, 0))
                      break
                    case 'week':
                      dateFrom = new Date(now.setDate(now.getDate() - 7))
                      break
                    case 'month':
                      dateFrom = new Date(now.setMonth(now.getMonth() - 1))
                      break
                    case 'all':
                    default:
                      dateFrom = undefined
                      dateTo = undefined
                  }

                  setFilters((prev) => ({ ...prev, dateFrom, dateTo }))
                }}
                className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 dark:text-white"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">Past week</option>
                <option value="month">Past month</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!query.trim() && activeFilterCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Search messages
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
              Search across all channels and direct messages. Use filters to narrow down results.
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No results found
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Try different keywords or adjust your filters
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {searchResults.map((message) => {
              const channel = channels.find((c) => c.id === message.channelId)

              return (
                <button
                  key={message.id}
                  onClick={() => onMessageClick?.(message)}
                  className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  {/* Channel/User info */}
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar user={message.user} size="sm" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {message.user.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">in</span>
                    <Hash size={14} className="text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {channel?.name || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>

                  {/* Message text with highlighting */}
                  <div className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                    {highlightText(message.text, query)}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Result count */}
        {searchResults.length > 0 && (
          <div className="sticky bottom-0 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
