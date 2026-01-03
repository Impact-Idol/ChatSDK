import { useState } from 'react'
import { X, User, Mail, Bell, Moon, Sun, LogOut, Edit2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/Avatar'
import type { User as UserType } from '@/types'

interface UserProfileModalProps {
  user: UserType
  onClose: () => void
  onUpdateProfile?: (updates: Partial<UserType>) => void
  onLogout?: () => void
}

export function UserProfileModal({
  user,
  onClose,
  onUpdateProfile,
  onLogout,
}: UserProfileModalProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [status, setStatus] = useState<'online' | 'away' | 'offline'>(user.status)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  )

  const handleSaveName = () => {
    if (name.trim() && name !== user.name) {
      onUpdateProfile?.({ name: name.trim() })
    }
    setIsEditingName(false)
  }

  const handleSaveEmail = () => {
    if (email.trim() && email !== user.email) {
      onUpdateProfile?.({ email: email.trim() })
    }
    setIsEditingEmail(false)
  }

  const handleStatusChange = (newStatus: typeof status) => {
    setStatus(newStatus)
    onUpdateProfile?.({ status: newStatus })
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      onLogout?.()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Profile & Settings
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
            {/* Profile Section */}
            <div className="flex flex-col items-center text-center pb-4 border-b border-gray-200 dark:border-gray-800">
              <Avatar
                user={user}
                size="xl"
                showStatus
                status={status}
              />
              <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">
                {user.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Status
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleStatusChange('online')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                    status === 'online'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Online</span>
                </button>
                <button
                  onClick={() => handleStatusChange('away')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                    status === 'away'
                      ? 'border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Away</span>
                </button>
                <button
                  onClick={() => handleStatusChange('offline')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                    status === 'offline'
                      ? 'border-gray-600 bg-gray-50 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Offline</span>
                </button>
              </div>
            </div>

            {/* Profile Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Profile Information
              </h3>
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </label>
                    {!isEditingName && (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={cn(
                          'flex-1 px-3 py-2 rounded-lg border text-sm',
                          'bg-white dark:bg-gray-800',
                          'text-gray-900 dark:text-gray-100',
                          'border-gray-300 dark:border-gray-700',
                          'focus:outline-none focus:ring-2 focus:ring-purple-500'
                        )}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setName(user.name)
                          setIsEditingName(false)
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <User size={16} className="text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{user.name}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    {!isEditingEmail && (
                      <button
                        onClick={() => setIsEditingEmail(true)}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                  {isEditingEmail ? (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cn(
                          'flex-1 px-3 py-2 rounded-lg border text-sm',
                          'bg-white dark:bg-gray-800',
                          'text-gray-900 dark:text-gray-100',
                          'border-gray-300 dark:border-gray-700',
                          'focus:outline-none focus:ring-2 focus:ring-purple-500'
                        )}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEmail}
                        className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEmail(user.email)
                          setIsEditingEmail(false)
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Mail size={16} className="text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{user.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Preferences
              </h3>
              <div className="space-y-2">
                {/* Notifications */}
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-gray-500 dark:text-gray-400" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Notifications
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {notificationsEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors',
                      notificationsEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5',
                        notificationsEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                      )}
                    />
                  </div>
                </button>

                {/* Dark Mode */}
                <button
                  onClick={toggleDarkMode}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {darkMode ? (
                      <Moon size={18} className="text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Sun size={18} className="text-gray-500 dark:text-gray-400" />
                    )}
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Dark Mode
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {darkMode ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors',
                      darkMode ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-700'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5',
                        darkMode ? 'translate-x-5.5' : 'translate-x-0.5'
                      )}
                    />
                  </div>
                </button>
              </div>
            </div>

            {/* Logout */}
            {onLogout && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                >
                  <LogOut size={18} />
                  <div className="text-left">
                    <div className="text-sm font-medium">Log out</div>
                    <div className="text-xs">Sign out of your account</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
