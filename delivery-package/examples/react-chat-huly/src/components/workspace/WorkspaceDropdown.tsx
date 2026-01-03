import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Plus, Settings, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types'

interface WorkspaceDropdownProps {
  workspaces: Workspace[]
  currentWorkspaceId: string
  onWorkspaceChange: (workspaceId: string) => void
  onAddWorkspace?: () => void
  onWorkspaceSettings?: (workspaceId: string) => void
}

export function WorkspaceDropdown({
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  onAddWorkspace,
  onWorkspaceSettings,
}: WorkspaceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleWorkspaceSelect = (workspaceId: string) => {
    onWorkspaceChange(workspaceId)
    setIsOpen(false)
  }

  // Only render if user has multiple workspaces
  if (workspaces.length <= 1) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'transition-colors group',
          isOpen && 'bg-gray-100 dark:bg-gray-800'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Workspace Icon */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 flex items-center justify-center flex-shrink-0">
          {currentWorkspace?.avatar ? (
            <img src={currentWorkspace.avatar} alt="" className="w-full h-full rounded-lg" />
          ) : (
            <LayoutGrid className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Workspace Name */}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {currentWorkspace?.name || 'Select Workspace'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {workspaces.length} workspaces
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {/* Workspace List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === currentWorkspaceId

              return (
                <button
                  key={workspace.id}
                  onClick={() => handleWorkspaceSelect(workspace.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    isActive && 'bg-purple-50 dark:bg-purple-900/20'
                  )}
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 flex items-center justify-center flex-shrink-0">
                    {workspace.avatar ? (
                      <img src={workspace.avatar} alt="" className="w-full h-full rounded-lg" />
                    ) : (
                      <LayoutGrid className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'text-sm font-medium truncate',
                        isActive
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-900 dark:text-white'
                      )}
                    >
                      {workspace.name}
                    </div>
                  </div>

                  {/* Check Icon */}
                  {isActive && (
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-500 flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Actions */}
          <div className="py-1">
            {onAddWorkspace && (
              <button
                onClick={() => {
                  onAddWorkspace()
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Add Workspace
                </span>
              </button>
            )}

            {onWorkspaceSettings && currentWorkspace && (
              <button
                onClick={() => {
                  onWorkspaceSettings(currentWorkspace.id)
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Workspace Settings
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
