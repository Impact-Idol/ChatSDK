import { useState } from 'react'
import { ChannelHeader } from './ChannelHeader'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import type { Channel, Message, User } from '@/types'

interface ChannelViewProps {
  channel: Channel
  messages: Message[]
  onSendMessage: (text: string, files?: File[]) => void
  onReply?: (message: Message) => void
  onEdit?: (message: Message) => void
  onDelete?: (message: Message) => void
  onReact?: (message: Message, emoji: string) => void
  onThreadClick?: (message: Message) => void
  onPin?: (message: Message) => void
  onSearchClick?: () => void
  onMembersClick?: () => void
  onPinnedMessagesClick?: () => void
  onSettingsClick?: () => void
  onBackClick?: () => void
  typingUsers?: Array<{ userId: string; name: string }>
  highlightMessageId?: string
  isLoading?: boolean
  users?: User[]
}

export function ChannelView({
  channel,
  messages,
  onSendMessage,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onThreadClick,
  onPin,
  onSearchClick,
  onMembersClick,
  onPinnedMessagesClick,
  onSettingsClick,
  onBackClick,
  typingUsers,
  highlightMessageId,
  isLoading = false,
  users = [],
}: ChannelViewProps) {
  const handleSendMessage = (text: string, files?: File[]) => {
    onSendMessage(text, files)
  }

  // Calculate pinned message count
  const pinnedMessageCount = messages.filter(msg => msg.isPinned).length

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <ChannelHeader
        channel={channel}
        memberCount={channel.memberCount}
        pinnedMessageCount={pinnedMessageCount}
        onSearchClick={onSearchClick}
        onMembersClick={onMembersClick}
        onPinnedMessagesClick={onPinnedMessagesClick}
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
        channelId={channel.id}
        onSendMessage={handleSendMessage}
        placeholder={`Message #${channel.name}`}
        users={users}
      />
    </div>
  )
}
