import { LayoutGrid, MessageSquare, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type MobileNavTab = 'workspace' | 'messages' | 'search' | 'profile'

interface MobileBottomNavProps {
  activeTab: MobileNavTab
  onTabChange: (tab: MobileNavTab) => void
  unreadCount?: number
}

export function MobileBottomNav({
  activeTab,
  onTabChange,
  unreadCount = 0,
}: MobileBottomNavProps) {
  const tabs = [
    {
      id: 'workspace' as MobileNavTab,
      label: 'Workspace',
      icon: LayoutGrid,
    },
    {
      id: 'messages' as MobileNavTab,
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadCount,
    },
    {
      id: 'search' as MobileNavTab,
      label: 'Search',
      icon: Search,
    },
    {
      id: 'profile' as MobileNavTab,
      label: 'Profile',
      icon: User,
    },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full rounded-lg transition-colors relative',
                'active:bg-gray-100 dark:active:bg-gray-800',
                isActive
                  ? 'text-purple-600 dark:text-purple-500'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              <div className="relative">
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-semibold text-white bg-red-500 rounded-full">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 font-medium',
                  isActive ? 'text-purple-600 dark:text-purple-500' : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
