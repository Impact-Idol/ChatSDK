import { useState } from 'react'
import { X, Search, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/Avatar'
import type { User } from '@/types'

interface AddMembersModalProps {
  channelName: string
  onClose: () => void
  onAddMembers: (userIds: string[]) => void
  availableUsers: User[]
  currentMemberIds: string[]
}

export function AddMembersModal({
  channelName,
  onClose,
  onAddMembers,
  availableUsers,
  currentMemberIds,
}: AddMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  // Filter out current members and apply search
  const filteredUsers = availableUsers
    .filter(user => !currentMemberIds.includes(user.id))
    .filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const selectedUsers = availableUsers.filter(user => selectedUserIds.includes(user.id))

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleAddMembers = () => {
    if (selectedUserIds.length === 0) return
    onAddMembers(selectedUserIds)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add members
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              to #{channelName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className={cn(
                'w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'placeholder-gray-500 dark:placeholder-gray-400',
                'border-gray-300 dark:border-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600'
              )}
              autoFocus
            />
          </div>
        </div>

        {/* Selected users pills */}
        {selectedUsers.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Selected ({selectedUsers.length}):
              </span>
              {selectedUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                >
                  <span className="font-medium">{user.name.split(' ')[0]}</span>
                  <button
                    onClick={() => toggleUserSelection(user.id)}
                    className="p-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <UserPlus size={24} className="text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                {searchQuery
                  ? 'No users found matching your search'
                  : currentMemberIds.length === availableUsers.length
                  ? 'All users are already members'
                  : 'No users available'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id)

                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUserSelection(user.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-600'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent'
                    )}
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
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedUserIds.length === 0
              ? 'Select people to add'
              : `Add ${selectedUserIds.length} ${selectedUserIds.length === 1 ? 'person' : 'people'}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddMembers}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedUserIds.length === 0}
            >
              Add Members
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
