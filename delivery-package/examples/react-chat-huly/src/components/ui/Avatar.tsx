import { cn, getInitials, getAvatarColor } from '@/lib/utils'

interface AvatarProps {
  user: {
    id: string
    name: string
    avatar?: string
  }
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
  status?: 'online' | 'offline' | 'away'
  className?: string
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function Avatar({ user, size = 'md', showStatus, status, className }: AvatarProps) {
  const initials = getInitials(user.name)
  const colorClass = getAvatarColor(user.id)

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className={cn('rounded-full object-cover', sizeClasses[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white',
            sizeClasses[size],
            colorClass
          )}
        >
          {initials}
        </div>
      )}

      {showStatus && status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900',
            {
              'bg-green-500': status === 'online',
              'bg-yellow-500': status === 'away',
              'bg-gray-400': status === 'offline',
            }
          )}
        />
      )}
    </div>
  )
}
