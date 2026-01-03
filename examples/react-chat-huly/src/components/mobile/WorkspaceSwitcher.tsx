import { LayoutGrid, Check, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Workspace {
  id: string
  name: string
  avatar?: string
  isActive: boolean
}

interface WorkspaceSwitcherProps {
  workspaces?: Workspace[]
}

export function WorkspaceSwitcher({ workspaces }: WorkspaceSwitcherProps) {
  // Mock workspaces for now
  const defaultWorkspaces: Workspace[] = [
    {
      id: 'workspace-1',
      name: 'ChatSDK Team',
      isActive: true,
    },
    {
      id: 'workspace-2',
      name: 'Engineering',
      isActive: false,
    },
  ]

  const displayWorkspaces = workspaces || defaultWorkspaces

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Workspaces</h1>
      </div>

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-4 space-y-1">
          {displayWorkspaces.map((workspace) => (
            <button
              key={workspace.id}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                'active:bg-gray-100 dark:active:bg-gray-800',
                workspace.isActive
                  ? 'bg-purple-50 dark:bg-purple-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  workspace.isActive
                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              >
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white truncate">
                  {workspace.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {workspace.isActive ? 'Active workspace' : 'Switch to this workspace'}
                </div>
              </div>
              {workspace.isActive ? (
                <Check size={20} className="flex-shrink-0 text-purple-600 dark:text-purple-500" />
              ) : (
                <ChevronRight size={20} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
              )}
            </button>
          ))}
        </div>

        {/* Add workspace button */}
        <div className="px-4 py-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Plus className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white">Add Workspace</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Join or create a new workspace
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Switch between workspaces to access different teams and conversations
        </p>
      </div>
    </div>
  )
}
