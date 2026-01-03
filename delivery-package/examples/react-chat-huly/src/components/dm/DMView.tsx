import { DMHeader } from './DMHeader'
import { MessageList } from '../channel/MessageList'
import { MessageComposer } from '../channel/MessageComposer'
import type { DirectMessage, Message } from '@/types'

interface DMViewProps {
  dm: DirectMessage
  messages: Message[]
  currentUserId?: string
  onSendMessage: (text: string, files?: File[]) => void
  onReply?: (message: Message) => void
  onEdit?: (message: Message) => void
  onDelete?: (message: Message) => void
  onReact?: (message: Message, emoji: string) => void
  onThreadClick?: (message: Message) => void
  onPin?: (message: Message) => void
  onSearchClick?: () => void
  onSettingsClick?: () => void
  onBackClick?: () => void
  typingUsers?: Array<{ userId: string; name: string }>
  highlightMessageId?: string
  isLoading?: boolean
}

export function DMView({
  dm,
  messages,
  currentUserId = 'user-1',
  onSendMessage,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onThreadClick,
  onPin,
  onSearchClick,
  onSettingsClick,
  onBackClick,
  typingUsers,
  highlightMessageId,
  isLoading = false,
}: DMViewProps) {
  const otherUsers = dm.participants.filter(p => p.id !== currentUserId)
  const displayUser = otherUsers[0]
  const isGroup = dm.type === 'group'

  // Defensive: handle case where participants are not loaded yet
  const placeholderText = isGroup
    ? `Message ${otherUsers.length > 0 ? otherUsers.map(u => u.name.split(' ')[0]).join(', ') : 'group'}`
    : `Message ${displayUser?.name?.split(' ')[0] || 'user'}`

  const handleSendMessage = (text: string, files?: File[]) => {
    onSendMessage(text, files)
  }

  return (
    <div className="flex flex-col h-full">
      {/* DM Header */}
      <DMHeader
        dm={dm}
        onSearchClick={onSearchClick}
        onSettingsClick={onSettingsClick}
        onCallClick={() => console.log('Start call')}
        onVideoClick={() => console.log('Start video')}
        onBackClick={onBackClick}
      />

      {/* Message List */}
      <MessageList
        messages={messages}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onReact={onReact}
        onThreadClick={onThreadClick}
        onPin={onPin}
        typingUsers={typingUsers}
        highlightMessageId={highlightMessageId}
        isLoading={isLoading}
      />

      {/* Message Composer */}
      <MessageComposer
        channelId={dm.id}
        onSendMessage={handleSendMessage}
        placeholder={placeholderText}
      />
    </div>
  )
}
