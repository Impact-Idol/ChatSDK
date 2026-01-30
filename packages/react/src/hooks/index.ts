'use client';

/**
 * ChatSDK React Hooks
 * Export all hooks for easy importing
 */

// Provider and context
export {
  ChatProvider,
  useChatContext,
  useChatClient,
  useConnectionState,
  useCurrentUser,
  type ChatProviderProps,
} from './ChatProvider';

// Channels
export {
  useChannels,
  useChannel,
  type UseChannelsOptions,
  type UseChannelsResult,
} from './useChannels';

// Messages
export {
  useMessages,
  type UseMessagesOptions,
  type UseMessagesResult,
  type SendMessageOptions,
} from './useMessages';

// Typing indicators
export {
  useTypingIndicator,
  formatTypingText,
  type UseTypingIndicatorResult,
} from './useTypingIndicator';

// Read state
export {
  useReadState,
  useTotalUnreadCount,
  type ReadReceipt,
  type UseReadStateResult,
} from './useReadState';

// File uploads
export {
  useFileUpload,
  formatFileSize,
  isAllowedFileType,
  getFileCategory,
  type UploadProgress,
  type UploadedFile,
  type UseFileUploadOptions,
  type UseFileUploadResult,
} from './useFileUpload';

// Search
export {
  useSearch,
  type SearchResult,
  type UseSearchOptions,
  type UseSearchResult,
} from './useSearch';

// Presence
export {
  usePresence,
  useUserPresence,
  useChannelPresence,
  formatLastSeen,
  type UserPresence,
  type ChannelPresence,
  type UsePresenceOptions,
  type UsePresenceResult,
} from './usePresence';

// Threads
export {
  useThread,
  useThreadPreview,
  type ThreadMessage,
  type ThreadParent,
  type ThreadParticipant,
  type UseThreadOptions,
  type UseThreadResult,
} from './useThread';

// Reactions
export {
  useReactions,
  updateMessageReactions,
  formatReactionCount,
  QUICK_REACTIONS,
  type Reaction,
  type ReactionEvent,
  type UseReactionsOptions,
  type UseReactionsResult,
} from './useReactions';

// Read Receipts
export {
  useReadReceipts,
  formatReadReceipt,
  getReadReceiptStatus,
  type Reader,
  type MessageReceipt,
  type ChannelReadStatus,
  type UseReadReceiptsOptions,
  type UseReadReceiptsResult,
  type ReadReceiptStatus,
} from './useReadReceipts';

// Mentions
export {
  useMentions,
  useMentionSearch,
  parseMentions,
  formatMention,
  highlightMentions,
  type MentionUser,
  type Mention,
  type UseMentionsOptions,
  type UseMentionsResult,
  type UseMentionSearchOptions,
  type UseMentionSearchResult,
} from './useMentions';

// Polls
export {
  usePolls,
  type Poll,
  type PollOption,
  type UsePollsResult,
} from './usePolls';

// Workspaces
export {
  useWorkspaces,
  type Workspace,
  type UseWorkspacesResult,
  type CreateWorkspaceData,
} from './useWorkspaces';

// Channel Subscription
export {
  useChannelSubscription,
  isAlreadySubscribedError,
  type ChannelEvent,
  type UseChannelSubscriptionOptions,
  type UseChannelSubscriptionResult,
} from './useChannelSubscription';

// Workspace Subscription
export {
  useWorkspaceSubscription,
  type WorkspaceEvent,
  type UseWorkspaceSubscriptionOptions,
} from './useWorkspaceSubscription';
