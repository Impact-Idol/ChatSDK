/**
 * ChatSDK React Native
 * Mobile-first chat SDK for React Native applications
 *
 * @packageDocumentation
 */

// Re-export everything from @chatsdk/react
// All hooks work in React Native
export {
  // Provider
  ChatProvider,
  useChatContext,
  useChatClient,
  useConnectionState,
  useCurrentUser,
  // Channels
  useChannels,
  useChannel,
  // Messages
  useMessages,
  // Typing
  useTypingIndicator,
  formatTypingText,
  // Read state
  useReadState,
  useTotalUnreadCount,
  // File uploads
  useFileUpload,
  formatFileSize,
  isAllowedFileType,
  getFileCategory,
  // Search
  useSearch,
  // Presence
  usePresence,
  useUserPresence,
  useChannelPresence,
  formatLastSeen,
  // Threads
  useThread,
  useThreadPreview,
  // Types
  type ChatProviderProps,
  type UseChannelsOptions,
  type UseChannelsResult,
  type UseMessagesOptions,
  type UseMessagesResult,
  type SendMessageOptions,
  type UseTypingIndicatorResult,
  type ReadReceipt,
  type UseReadStateResult,
  type UploadProgress,
  type UploadedFile,
  type UseFileUploadOptions,
  type UseFileUploadResult,
  type SearchResult,
  type UseSearchOptions,
  type UseSearchResult,
  type UserPresence,
  type ChannelPresence,
  type UsePresenceOptions,
  type UsePresenceResult,
  type ThreadMessage,
  type ThreadParent,
  type ThreadParticipant,
  type UseThreadOptions,
  type UseThreadResult,
} from '@chatsdk/react';

// Re-export core types
export type {
  User,
  Channel,
  Message,
  MessageWithSeq,
  Attachment,
  Reaction,
  ReactionGroup,
  ChannelMember,
  ConnectionState,
  ChatClientOptions,
} from '@chatsdk/core';

// Mobile-specific hooks
export {
  useAppState,
  useSyncOnForeground,
  useKeyboard,
  useKeyboardDismiss,
  useKeyboardAvoiding,
  usePushNotifications,
  useNotificationPreferences,
  getNotificationNavigationTarget,
  type UseAppStateResult,
  type KeyboardInfo,
  type UseKeyboardOptions,
  type PushNotificationConfig,
  type PushNotification,
  type UsePushNotificationsResult,
  type NotificationPreferences,
} from './hooks';

// Mobile-optimized components
export {
  MessageList,
  MessageInput,
  ChannelList,
  type MessageListProps,
  type MessageInputProps,
  type ChannelListProps,
} from './components';
