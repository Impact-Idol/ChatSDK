/**
 * Impact Idol Channel Page - ChatSDK Integration Example
 *
 * This is a complete example of a channel page using ChatSDK components.
 * Copy this to your Impact Idol project: app/channels/[channelId]/page.tsx
 */

'use client';

import { useState } from 'react';
import {
  MessageList,
  MessageInput,
  TypingIndicator,
  Thread,
  MemberList,
  EmojiPicker,
  CreatePollDialog,
  PollMessage,
  useMessages,
  useChannel,
  useChannelPresence,
  useTypingIndicator,
} from '@chatsdk/react';

interface ChannelPageProps {
  params: {
    channelId: string;
  };
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const { channelId } = params;

  // ChatSDK Hooks
  const { channel, loading: channelLoading } = useChannel(channelId);
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    loading: messagesLoading,
    hasMore,
    loadMore,
  } = useMessages(channelId);
  const { onlineUsers, totalMembers } = useChannelPresence(channelId);
  const { startTyping, stopTyping } = useTypingIndicator(channelId);

  // Local State
  const [showMemberList, setShowMemberList] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false);
  const [selectedMessageForPoll, setSelectedMessageForPoll] = useState<string | null>(null);

  // Handlers
  const handleSendMessage = async (text: string) => {
    await sendMessage(text);
  };

  const handleCreatePoll = (messageId: string) => {
    setSelectedMessageForPoll(messageId);
    setIsPollDialogOpen(true);
  };

  const handleOpenThread = (messageId: string) => {
    setSelectedThreadId(messageId);
    setShowThread(true);
  };

  if (channelLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Channel not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <header className="border-b border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">#{channel.name}</h1>
              <p className="text-sm text-gray-500">
                {onlineUsers.length} online • {totalMembers} members
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Search messages"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Members Button */}
              <button
                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => setShowMemberList(!showMemberList)}
                aria-label="Show members"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4">
          <MessageList
            channelId={channelId}
            messages={messages}
            loading={messagesLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onReply={handleOpenThread}
            onCreatePoll={handleCreatePoll}
            className="space-y-4"
          />

          {/* Typing Indicator */}
          <TypingIndicator channelId={channelId} />
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <MessageInput
            channelId={channelId}
            onSend={handleSendMessage}
            onTypingStart={startTyping}
            onTypingStop={stopTyping}
            placeholder={`Message #${channel.name}`}
            showFileUpload
            showEmojiPicker
            showFormatting
          />
        </div>
      </div>

      {/* Member List Sidebar */}
      {showMemberList && (
        <aside className="w-64 border-l border-gray-200 bg-white">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Members</h2>
            <MemberList
              channelId={channelId}
              onlineUsers={onlineUsers}
              showPresence
            />
          </div>
        </aside>
      )}

      {/* Thread Sidebar */}
      {showThread && selectedThreadId && (
        <aside className="w-96 border-l border-gray-200 bg-white">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Thread</h2>
            <button
              onClick={() => setShowThread(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close thread"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <Thread
            messageId={selectedThreadId}
            onClose={() => setShowThread(false)}
          />
        </aside>
      )}

      {/* Poll Creation Dialog */}
      {isPollDialogOpen && selectedMessageForPoll && (
        <CreatePollDialog
          messageId={selectedMessageForPoll}
          isOpen={isPollDialogOpen}
          onClose={() => {
            setIsPollDialogOpen(false);
            setSelectedMessageForPoll(null);
          }}
          onSuccess={() => {
            console.log('Poll created successfully');
          }}
        />
      )}
    </div>
  );
}
