import { useState } from 'react'
import { X, Edit2, Check, Users, Lock, Trash2, LogOut, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types'

interface WorkspaceSettingsModalProps {
  workspace: Workspace
  currentUserRole: 'owner' | 'admin' | 'member'
  onClose: () => void
  onUpdateWorkspace?: (updates: Partial<Workspace>) => void
  onInviteMembers?: () => void
  onLeaveWorkspace?: () => void
  onDeleteWorkspace?: () => void
}

export function WorkspaceSettingsModal({
  workspace,
  currentUserRole,
  onClose,
  onUpdateWorkspace,
  onInviteMembers,
  onLeaveWorkspace,
  onDeleteWorkspace,
}: WorkspaceSettingsModalProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [name, setName] = useState(workspace.name)
  const [error, setError] = useState('')

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin'
  const canDelete = currentUserRole === 'owner'

  const handleSaveName = () => {
    // Validate workspace name
    if (!name.trim()) {
      setError('Workspace name is required')
      return
    }

    if (name.trim().length < 2) {
      setError('Workspace name must be at least 2 characters')
      return
    }

    onUpdateWorkspace?.({
      name: name.trim(),
    })

    setIsEditingName(false)
    setError('')
  }

  const handleLeave = () => {
    if (confirm(`Are you sure you want to leave "${workspace.name}"?`)) {
      onLeaveWorkspace?.()
      onClose()
    }
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone and will delete all channels, messages, and data.`)) {
      onDeleteWorkspace?.()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Workspace Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-6">
            {/* Workspace Info */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Workspace Information
                </h3>
                {canEdit && !isEditingName && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                )}
              </div>

              {isEditingName ? (
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Workspace name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="workspace-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        setError('')
                      }}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border text-sm',
                        'bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-gray-100',
                        'focus:outline-none focus:ring-2 focus:ring-purple-500',
                        error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      )}
                      autoFocus
                    />
                    {error && (
                      <p className="mt-1 text-xs text-red-500">{error}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setIsEditingName(false)
                        setName(workspace.name)
                        setError('')
                      }}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveName}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Name</div>
                    <div className="font-medium text-gray-900 dark:text-white mt-1">{workspace.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Your role</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        currentUserRole === 'owner' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
                        currentUserRole === 'admin' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                        currentUserRole === 'member' && 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      )}>
                        {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Permissions Info */}
            {!canEdit && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex gap-2">
                  <Lock size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Only workspace owners and admins can modify workspace settings.
                  </div>
                </div>
              </div>
            )}

            {/* Invite Members */}
            {canEdit && onInviteMembers && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={onInviteMembers}
                  className="w-full flex items-center gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Invite members</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Add people to this workspace</div>
                  </div>
                </button>
              </div>
            )}

            {/* Danger Zone */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Danger Zone
              </h3>
              <div className="space-y-2">
                {onLeaveWorkspace && currentUserRole !== 'owner' && (
                  <button
                    onClick={handleLeave}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                  >
                    <LogOut size={18} />
                    <div className="text-left">
                      <div className="text-sm font-medium">Leave workspace</div>
                      <div className="text-xs">You'll need an invite to rejoin</div>
                    </div>
                  </button>
                )}
                {canDelete && onDeleteWorkspace && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                    <div className="text-left">
                      <div className="text-sm font-medium">Delete workspace</div>
                      <div className="text-xs">Permanently delete all workspace data</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
