import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  users: Array<{ userId: string; name: string }>
  className?: string
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const message =
    users.length === 1
      ? `${users[0].name} is typing...`
      : users.length === 2
      ? `${users[0].name} and ${users[1].name} are typing...`
      : `${users.length} people are typing...`

  return (
    <div className={cn('flex items-center gap-2 px-6 py-2 text-sm text-gray-500', className)}>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-typing" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-typing [animation-delay:0.2s]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-typing [animation-delay:0.4s]" />
      </div>
      <span>{message}</span>
    </div>
  )
}
