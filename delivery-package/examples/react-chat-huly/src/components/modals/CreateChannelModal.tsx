import { useState } from 'react'
import { X, Hash, Lock, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreateChannelModalProps {
  onClose: () => void
  onCreateChannel: (name: string, description: string, type: 'public' | 'private') => void
}

export function CreateChannelModal({ onClose, onCreateChannel }: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'public' | 'private'>('public')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

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

    onCreateChannel(name.trim(), description.trim(), type)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create a channel
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Channel Name */}
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
                placeholder="e.g., team-updates"
                className={cn(
                  'w-full pl-10 pr-3 py-2 rounded-lg border text-sm',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600',
                  error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                )}
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use lowercase letters, numbers, hyphens, and underscores
            </p>
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
              placeholder="What's this channel about?"
              rows={3}
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm resize-none',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'placeholder-gray-500 dark:placeholder-gray-400',
                'border-gray-300 dark:border-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600'
              )}
            />
          </div>

          {/* Channel Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Channel type
            </label>
            <div className="space-y-2">
              {/* Public option */}
              <button
                type="button"
                onClick={() => setType('public')}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left',
                  type === 'public'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <Globe size={20} className={cn(
                  'flex-shrink-0 mt-0.5',
                  type === 'public' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
                )} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Public
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Anyone in the workspace can view and join
                  </div>
                </div>
              </button>

              {/* Private option */}
              <button
                type="button"
                onClick={() => setType('private')}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left',
                  type === 'private'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <Lock size={20} className={cn(
                  'flex-shrink-0 mt-0.5',
                  type === 'private' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
                )} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Private
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Only invited members can view and join
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name.trim()}
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
