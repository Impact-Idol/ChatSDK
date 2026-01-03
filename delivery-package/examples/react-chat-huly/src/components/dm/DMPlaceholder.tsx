import { MessageSquare, ArrowLeft } from 'lucide-react'

interface DMPlaceholderProps {
  onBackClick?: () => void
}

export function DMPlaceholder({ onBackClick }: DMPlaceholderProps) {
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Mobile header with back button */}
      {onBackClick && (
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            onClick={onBackClick}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Back to messages"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Direct Message</h1>
        </div>
      )}

      {/* Placeholder content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Direct Messages
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            DM view coming soon!
          </p>
        </div>
      </div>
    </div>
  )
}
