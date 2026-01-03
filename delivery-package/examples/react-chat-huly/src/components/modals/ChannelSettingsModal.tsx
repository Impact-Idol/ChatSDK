import { useState } from 'react'
import { X, Hash, Globe, Lock, Bell, BellOff, Trash2, LogOut, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Channel } from '@/types'

interface ChannelSettingsModalProps {
  channel: Channel
  currentUserRole: 'owner' | 'admin' | 'member'
  onClose: () => void
  onUpdateChannel?: (updates: Partial<Channel>) => void
  onLeaveChannel?: () => void
  onDeleteChannel?: () => void
  onToggleMute?: () => void
}

export function ChannelSettingsModal({
  channel,
  currentUserRole,
  onClose,
  onUpdateChannel,
  onLeaveChannel,
  onDeleteChannel,
  onToggleMute,
}: ChannelSettingsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(channel.name)
  const [description, setDescription] = useState(channel.description || '')
  const [type, setType] = useState<'public' | 'private'>(channel.type)
  const [error, setError] = useState('')

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin'
  const canDelete = currentUserRole === 'owner'

  const handleSave = () => {
    // Validate channel name
    if (!name.trim()) {
      setError('Channel name is required')
      return
    }

    if (name.trim().length < 2) {
      setError('Channel name must be at least 2 characters')
      return
    }

    if (!/^[a-z0-9-_]+$/.test(name.trim())) {
      setError('Channel name can only contain lowercase letters, numbers, hyphens, and underscores')
      return
    }

    onUpdateChannel?.({
      name: name.trim(),
      description: description.trim(),
      type,
    })

    setIsEditing(false)
  }

  const handleLeave = () => {
    if (confirm(`Are you sure you want to leave #${channel.name}?`)) {
      onLeaveChannel?.()
      onClose()
    }
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete #${channel.name}? This action cannot be undone.`)) {
      onDeleteChannel?.()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Hash size={20} className="text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Channel Settings
            </h2>
          </div>
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
            {/* Channel Info Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Channel Information
                </h3>
                {canEdit && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="channel-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Channel name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                      <input
                        id="channel-name"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          // Convert spaces to dashes, then filter to only lowercase, numbers, hyphens, and underscores
                          const cleaned = e.target.value
                            .toLowerCase()
                            .replace(/\s+/g, '-')  // Convert spaces to dashes
                            .replace(/[^a-z0-9-_]/g, '')  // Remove invalid characters
                          setName(cleaned)
                          setError('')
                        }}
                        className={cn(
                          'w-full pl-10 pr-3 py-2 rounded-lg border text-sm',
                          'bg-white dark:bg-gray-800',
                          'text-gray-900 dark:text-gray-100',
                          'focus:outline-none focus:ring-2 focus:ring-purple-500',
                          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                        )}
                      />
                    </div>
                    {error && (
                      <p className="mt-1 text-xs text-red-500">{error}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="channel-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      id="channel-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border text-sm resize-none',
                        'bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-gray-100',
                        'border-gray-300 dark:border-gray-700',
                        'focus:outline-none focus:ring-2 focus:ring-purple-500'
                      )}
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Channel type
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setType('public')}
                        className={cn(
                          'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left',
                          type === 'public'
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        )}
                      >
                        <Globe size={20} className={type === 'public' ? 'text-purple-600' : 'text-gray-500'} />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Public</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Anyone in the workspace can view and join
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setType('private')}
                        className={cn(
                          'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left',
                          type === 'private'
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        )}
                      >
                        <Lock size={20} className={type === 'private' ? 'text-purple-600' : 'text-gray-500'} />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Private</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Only invited members can view and join
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setName(channel.name)
                        setDescription(channel.description || '')
                        setType(channel.type)
                        setError('')
                      }}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
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
                    <div className="flex items-center gap-2 mt-1">
                      <Hash size={16} className="text-gray-500" />
                      <div className="font-medium text-gray-900 dark:text-white">{channel.name}</div>
                    </div>
                  </div>
                  {channel.description && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Description</div>
                      <div className="mt-1 text-gray-900 dark:text-white">{channel.description}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Type</div>
                    <div className="flex items-center gap-2 mt-1">
                      {channel.type === 'public' ? (
                        <>
                          <Globe size={16} className="text-gray-500" />
                          <span className="text-gray-900 dark:text-white">Public</span>
                        </>
                      ) : (
                        <>
                          <Lock size={16} className="text-gray-500" />
                          <span className="text-gray-900 dark:text-white">Private</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            {onToggleMute && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Notifications
                </h3>
                <button
                  onClick={onToggleMute}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {channel.isMuted ? (
                      <BellOff size={18} className="text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Bell size={18} className="text-gray-500 dark:text-gray-400" />
                    )}
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {channel.isMuted ? 'Unmute channel' : 'Mute channel'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {channel.isMuted ? 'Turn on notifications' : 'Stop receiving notifications'}
                      </div>
                    </div>
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
                {onLeaveChannel && (
                  <button
                    onClick={handleLeave}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                  >
                    <LogOut size={18} />
                    <div className="text-left">
                      <div className="text-sm font-medium">Leave channel</div>
                      <div className="text-xs">You can rejoin at any time</div>
                    </div>
                  </button>
                )}
                {canDelete && onDeleteChannel && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                    <div className="text-left">
                      <div className="text-sm font-medium">Delete channel</div>
                      <div className="text-xs">Permanently delete this channel and all messages</div>
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
