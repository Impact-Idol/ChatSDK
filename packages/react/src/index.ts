// ChatSDK React Components
// @chatsdk/react

// Hooks - Primary API
export {
  ChatProvider,
  useChatContext,
  useChatClient,
  useConnectionState,
  useCurrentUser,
  useChannels,
  useChannel,
  useMessages,
  useTypingIndicator,
  formatTypingText,
  useReadState,
  useTotalUnreadCount,
  useThread,
  useThreadPreview,
  useReactions,
  updateMessageReactions,
  formatReactionCount,
  QUICK_REACTIONS,
  usePresence,
  useUserPresence,
  useChannelPresence,
  formatLastSeen,
  useSearch,
  useFileUpload,
  isAllowedFileType,
  getFileCategory,
  useReadReceipts,
  formatReadReceipt,
  getReadReceiptStatus,
  useMentions,
  useMentionSearch,
  parseMentions,
  formatMention,
  highlightMentions,
  usePolls,
  useWorkspaces,
  useChannelSubscription,
} from './hooks';

export type {
  ChatProviderProps,
  UseChannelsOptions,
  UseChannelsResult,
  UseMessagesOptions,
  UseMessagesResult,
  SendMessageOptions,
  UseTypingIndicatorResult,
  ReadReceipt,
  UseReadStateResult,
  UploadProgress,
  UploadedFile,
  UseFileUploadOptions,
  UseFileUploadResult,
  SearchResult,
  UseSearchOptions,
  UseSearchResult,
  UserPresence,
  ChannelPresence,
  UsePresenceOptions,
  UsePresenceResult,
  ThreadMessage,
  ThreadParent,
  ThreadParticipant,
  UseThreadOptions,
  UseThreadResult,
  Reaction,
  ReactionEvent,
  UseReactionsOptions,
  UseReactionsResult,
  Reader,
  MessageReceipt,
  ChannelReadStatus,
  UseReadReceiptsOptions,
  UseReadReceiptsResult,
  ReadReceiptStatus,
  MentionUser,
  Mention,
  UseMentionsOptions,
  UseMentionsResult,
  UseMentionSearchOptions,
  UseMentionSearchResult,
  Poll,
  PollOption,
  UsePollsResult,
  Workspace,
  UseWorkspacesResult,
  CreateWorkspaceData,
  ChannelEvent,
  UseChannelSubscriptionOptions,
  UseChannelSubscriptionResult,
} from './hooks';

// Re-export core types for convenience
export type {
  User as CoreUser,
  Channel as CoreChannel,
  Message as CoreMessage,
  MessageWithSeq,
  Attachment,
  Reaction as CoreReaction,
  ReactionGroup,
  ChannelMember,
  ConnectionState,
  ChatClientOptions,
} from '@chatsdk/core';

// Shared Components
export { Avatar } from './components/shared/Avatar';
export { Button } from './components/shared/Button';
export { Input } from './components/shared/Input';
export { Badge } from './components/shared/Badge';

// SDK Components
export { ChannelList } from './components/sdk/ChannelList';
export { MessageList } from './components/sdk/MessageList';
export { MessageInput } from './components/sdk/MessageInput';
export { Thread } from './components/sdk/Thread';
export { ChatLayout } from './components/sdk/ChatLayout';
export { VoiceMessage } from './components/sdk/VoiceMessage';
export { VoiceRecorder } from './components/sdk/VoiceRecorder';
export { MemberList } from './components/sdk/MemberList';
export { MediaGallery } from './components/sdk/MediaGallery';
export { SearchResults } from './components/sdk/SearchResults';
export { EmojiPicker } from './components/sdk/EmojiPicker';
export { ThreadView } from './components/sdk/ThreadView';
export { TypingIndicator } from './components/sdk/TypingIndicator';
export { ReadReceipts } from './components/sdk/ReadReceipts';
export { PollMessage } from './components/sdk/PollMessage';
export { CreatePollDialog } from './components/sdk/CreatePollDialog';
export { WorkspaceSwitcher } from './components/sdk/WorkspaceSwitcher';

// Onboarding Components
export { AppSetupWizard } from './components/onboarding/AppSetupWizard';
export { ThemeBuilder } from './components/onboarding/ThemeBuilder';

// Admin Components
export { Dashboard } from './components/admin/Dashboard';
export { Sidebar } from './components/admin/Sidebar';
export { UsersTable } from './components/admin/UsersTable';
export { ChannelsTable } from './components/admin/ChannelsTable';
export { ModerationQueue } from './components/admin/ModerationQueue';
export { APIKeysManager } from './components/admin/APIKeysManager';
export { WebhooksManager } from './components/admin/WebhooksManager';
export { AuditLog } from './components/admin/AuditLog';
export { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';

// User Components
export { AuthLayout } from './components/user/AuthLayout';
export { LoginForm } from './components/user/LoginForm';
export { SettingsPage } from './components/user/SettingsPage';

// Types - Shared
export type { AvatarProps } from './components/shared/Avatar';
export type { ButtonProps } from './components/shared/Button';
export type { InputProps } from './components/shared/Input';
export type { BadgeProps } from './components/shared/Badge';

// Types - SDK
export type { ChannelListProps } from './components/sdk/ChannelList';
export type { MessageListProps, MessageUser } from './components/sdk/MessageList';
export type { MessageInputProps, ReplyingTo } from './components/sdk/MessageInput';
export type { ThreadProps } from './components/sdk/Thread';
export type { ChatLayoutProps } from './components/sdk/ChatLayout';
export type { VoiceMessageProps } from './components/sdk/VoiceMessage';
export type { VoiceRecorderProps } from './components/sdk/VoiceRecorder';
export type { MemberListProps } from './components/sdk/MemberList';
export type { MediaGalleryProps, MediaItem } from './components/sdk/MediaGallery';
export type { SearchResultsProps, SearchResult as SearchResultItem } from './components/sdk/SearchResults';
export type { EmojiPickerProps, Emoji } from './components/sdk/EmojiPicker';
export type { ThreadViewProps, ThreadMessage as ThreadMessageItem } from './components/sdk/ThreadView';
export type { TypingIndicatorProps, TypingUser } from './components/sdk/TypingIndicator';
export type { ReadReceiptsProps, ReadReceiptUser } from './components/sdk/ReadReceipts';
export type { PollMessageProps } from './components/sdk/PollMessage';
export type { CreatePollDialogProps } from './components/sdk/CreatePollDialog';
export type { WorkspaceSwitcherProps } from './components/sdk/WorkspaceSwitcher';

// Types - Onboarding
export type { AppSetupWizardProps, AppConfig, WizardStep } from './components/onboarding/AppSetupWizard';
export type { ThemeBuilderProps, ThemeConfig } from './components/onboarding/ThemeBuilder';

// Types - Admin
export type { DashboardProps } from './components/admin/Dashboard';
export type { UsersTableProps } from './components/admin/UsersTable';
export type { ChannelsTableProps } from './components/admin/ChannelsTable';
export type { ModerationQueueProps } from './components/admin/ModerationQueue';
export type { APIKeysManagerProps, APIKey } from './components/admin/APIKeysManager';
export type { WebhooksManagerProps, Webhook, WebhookDelivery } from './components/admin/WebhooksManager';
export type { AuditLogProps, AuditLogEntry } from './components/admin/AuditLog';

// Types - User
export type { SettingsPageProps, NotificationSettings, AppearanceSettings, PrivacySettings } from './components/user/SettingsPage';

// Theming
export {
  defaultTheme,
  impactIdolTheme,
  darkTheme,
  createTheme,
  themeToCSSVariables,
} from './styles/themes';
export type { ChatSDKTheme } from './styles/themes';

// Utility Functions
export {
  getInitials,
  getAvatarColor,
  formatFileSize,
  formatRelativeTime,
  formatMessageTime,
  formatMessageDate,
  truncate,
  isImageUrl,
  isVideoUrl,
  generateId,
  debounce,
  throttle,
  AVATAR_COLORS,
} from './utils';

// React Query Provider with ChatSDK-optimized defaults
export {
  ChatSDKQueryProvider,
  createChatSDKQueryClient,
} from './providers/ChatSDKQueryProvider';
export type { ChatSDKQueryProviderProps } from './providers/ChatSDKQueryProvider';
