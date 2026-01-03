import { useState } from 'react'
import { X, Briefcase, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddWorkspaceModalProps {
  onClose: () => void
  onAddWorkspace: (name: string, icon: string) => void
}

export function AddWorkspaceModal({ onClose, onAddWorkspace }: AddWorkspaceModalProps) {
  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('💼')
  const [error, setError] = useState('')

  const workspaceIcons = [
    '💼', '🏢', '🏪', '🏭', '🏗️', '🏛️',
    '🚀', '💡', '🎯', '⚡', '🔥', '⭐',
    '🎨', '🎮', '🎵', '📚', '🔬', '🏆',
    '🌟', '💎', '🎪', '🎭', '🎬', '📱'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate workspace name
    if (!name.trim()) {
      setError('Workspace name is required')
      return
    }

    if (name.trim().length < 2) {
      setError('Workspace name must be at least 2 characters')
      return
    }

    onAddWorkspace(name.trim(), selectedIcon)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create a workspace
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
          {/* Workspace Name */}
          <div>
            <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Workspace name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <input
                id="workspace-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="e.g., My Team Workspace"
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
          </div>

          {/* Workspace Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choose an icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {workspaceIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={cn(
                    'aspect-square rounded-lg text-2xl flex items-center justify-center transition-all',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    selectedIcon === icon
                      ? 'bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500 dark:ring-purple-600'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  )}
                  title={icon}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
                {selectedIcon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {name || 'Workspace Name'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">0 channels</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                name.trim()
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              )}
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
