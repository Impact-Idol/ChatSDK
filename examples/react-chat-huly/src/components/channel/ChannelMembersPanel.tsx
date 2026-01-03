import { useState } from 'react'
import { X, UserPlus, MoreVertical, Shield, Crown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/Avatar'
import type { User } from '@/types'

interface ChannelMember extends User {
  role: 'owner' | 'admin' | 'member'
  joinedAt?: Date
}

interface ChannelMembersPanelProps {
  channelId: string
  channelName: string
  members: ChannelMember[]
  currentUserId: string
  onClose: () => void
  onAddMembers?: () => void
  onRemoveMember?: (userId: string) => void
  onChangeRole?: (userId: string, role: 'admin' | 'member') => void
}

export function ChannelMembersPanel({
  channelId,
  channelName,
  members,
  currentUserId,
  onClose,
  onAddMembers,
  onRemoveMember,
  onChangeRole,
}: ChannelMembersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const currentUserMember = members.find(m => m.id === currentUserId)
  const canManageMembers = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort by role: owner > admin > member, then by name
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 }
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role]
    }
    return a.name.localeCompare(b.name)
  })

  const getRoleBadge = (role: ChannelMember['role']) => {
    switch (role) {
      case 'owner':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
            <Crown size={12} />
            Owner
          </span>
        )
      case 'admin':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
            <Shield size={12} />
            Admin
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            Members
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors flex-shrink-0"
          aria-label="Close members panel"
        >
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg border text-sm',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-500 dark:placeholder-gray-400',
              'border-gray-300 dark:border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600'
            )}
          />
        </div>
      </div>

      {/* Add Members Button */}
      {canManageMembers && onAddMembers && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={onAddMembers}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
          >
            <UserPlus size={18} />
            Add Members
          </button>
        </div>
      )}

      {/* Members List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {sortedMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              No members found
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {sortedMembers.map((member) => {
              const isCurrentUser = member.id === currentUserId
              const canManageThisMember = canManageMembers && member.role !== 'owner' && !isCurrentUser

              return (
                <div
                  key={member.id}
                  className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Avatar
                    user={member}
                    size="md"
                    showStatus
                    status={member.status}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {member.name}
                        {isCurrentUser && (
                          <span className="ml-1 text-gray-500 dark:text-gray-400 font-normal">(you)</span>
                        )}
                      </span>
                      {getRoleBadge(member.role)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {member.email}
                    </div>
                  </div>

                  {/* Member Actions Menu */}
                  {canManageThisMember && (
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                          aria-label="Member options"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === member.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                              {onChangeRole && member.role !== 'admin' && (
                                <button
                                  onClick={() => {
                                    onChangeRole(member.id, 'admin')
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Shield size={14} />
                                  Make Admin
                                </button>
                              )}
                              {onChangeRole && member.role === 'admin' && (
                                <button
                                  onClick={() => {
                                    onChangeRole(member.id, 'member')
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <Shield size={14} />
                                  Remove Admin
                                </button>
                              )}
                              {onRemoveMember && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${member.name} from this channel?`)) {
                                      onRemoveMember(member.id)
                                      setOpenMenuId(null)
                                    }
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <X size={14} />
                                  Remove from Channel
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
