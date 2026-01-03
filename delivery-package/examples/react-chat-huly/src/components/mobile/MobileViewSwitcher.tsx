import type { ReactNode } from 'react'
import { MobileBottomNav } from './MobileBottomNav'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type MobileView = 'workspace' | 'messages' | 'search' | 'profile'

interface MobileViewSwitcherProps {
  workspaceView: ReactNode
  messagesView: ReactNode
  searchView: ReactNode
  profileView: ReactNode
  unreadCount?: number
  onMessagesTabReclick?: () => void
}

export function MobileViewSwitcher({
  workspaceView,
  messagesView,
  searchView,
  profileView,
  unreadCount,
  onMessagesTabReclick,
}: MobileViewSwitcherProps) {
  const [activeView, setActiveView] = useState<MobileView>('messages')

  const handleTabChange = (tab: MobileView) => {
    // If tapping Messages tab while already on Messages view, trigger back navigation
    if (tab === 'messages' && activeView === 'messages' && onMessagesTabReclick) {
      onMessagesTabReclick()
    } else {
      setActiveView(tab)
    }
  }

  const renderView = () => {
    switch (activeView) {
      case 'workspace':
        return workspaceView
      case 'messages':
        return messagesView
      case 'search':
        return searchView
      case 'profile':
        return profileView
      default:
        return messagesView
    }
  }

  return (
    <div className="md:hidden flex flex-col h-screen">
      {/* Main content area - with padding for bottom nav */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="absolute top-0 left-0 right-0 bottom-16"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <MobileBottomNav
        activeTab={activeView}
        onTabChange={handleTabChange}
        unreadCount={unreadCount}
      />
    </div>
  )
}
