import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'

interface ChatLayoutProps {
  sidebar: ReactNode
  main: ReactNode
  thread?: ReactNode
  showThread?: boolean
}

export function ChatLayout({ sidebar, main, thread, showThread }: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-secondary">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:relative inset-y-0 left-0 z-40 w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
          'transform transition-transform duration-200 ease-in-out',
          'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebar}
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {main}
      </main>

      {/* Thread panel */}
      {showThread && thread && (
        <aside className={cn(
          'hidden lg:block w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800',
          'absolute lg:relative right-0 top-0 bottom-0 z-20'
        )}>
          {thread}
        </aside>
      )}
    </div>
  )
}
