import { useState } from 'react'
import { X, Copy, Check, Mail, Link as LinkIcon, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types'

interface WorkspaceInviteModalProps {
  workspace: Workspace
  onClose: () => void
  onInvite?: (emails: string[]) => void
}

export function WorkspaceInviteModal({
  workspace,
  onClose,
  onInvite,
}: WorkspaceInviteModalProps) {
  const [emails, setEmails] = useState('')
  const [copied, setCopied] = useState(false)

  // Generate invite link (mock)
  const inviteLink = `https://chat.example.com/invite/${workspace.id}/${Math.random().toString(36).substr(2, 9)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleSendInvites = () => {
    const emailList = emails
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0)

    if (emailList.length > 0) {
      onInvite?.(emailList)
      setEmails('')
      onClose()
    }
  }

  const emailCount = emails
    .split(/[,\n]/)
    .map(e => e.trim())
    .filter(e => e.length > 0).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invite to {workspace.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add people to your workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Invite by email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail size={16} className="inline mr-1.5" />
              Invite by email
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter email addresses separated by commas or new lines&#10;example@company.com, another@company.com"
              rows={4}
              className={cn(
                'w-full px-4 py-3 rounded-lg resize-none',
                'bg-gray-50 dark:bg-gray-800/50',
                'text-gray-900 dark:text-gray-100',
                'placeholder-gray-500 dark:placeholder-gray-400',
                'border border-gray-200 dark:border-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600',
                'focus:border-transparent',
                'transition-colors'
              )}
            />
            {emailCount > 0 && (
              <p className="mt-2 text-sm text-purple-600 dark:text-purple-400">
                {emailCount} {emailCount === 1 ? 'person' : 'people'} will be invited
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Or share invite link
              </span>
            </div>
          </div>

          {/* Invite link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <LinkIcon size={16} className="inline mr-1.5" />
              Shareable link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg',
                  'bg-gray-50 dark:bg-gray-800/50',
                  'text-gray-600 dark:text-gray-400',
                  'border border-gray-200 dark:border-gray-700',
                  'font-mono text-sm',
                  'cursor-text select-all'
                )}
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={handleCopyLink}
                className={cn(
                  'px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2',
                  copied
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                )}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Anyone with this link can join your workspace
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendInvites}
            disabled={emailCount === 0}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              emailCount > 0
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
            )}
          >
            <Mail size={16} />
            Send {emailCount > 0 ? `${emailCount} ` : ''}Invite{emailCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
