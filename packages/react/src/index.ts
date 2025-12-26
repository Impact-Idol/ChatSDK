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
} from './hooks';

// Re-export core types for convenience
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

// Onboarding Components
export { AppSetupWizard } from './components/onboarding/AppSetupWizard';
export { ThemeBuilder } from './components/onboarding/ThemeBuilder';

// Admin Components
export { Dashboard } from './components/admin/Dashboard';
export { Sidebar } from './components/admin/Sidebar';
export { UsersTable } from './components/admin/UsersTable';
export { UserProfile } from './components/admin/UserProfile';
export { ChannelsTable } from './components/admin/ChannelsTable';
export { ModerationQueue } from './components/admin/ModerationQueue';
export { APIKeysManager } from './components/admin/APIKeysManager';
export { WebhooksManager } from './components/admin/WebhooksManager';
export { AuditLog } from './components/admin/AuditLog';

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
export type { ChannelListProps, Channel } from './components/sdk/ChannelList';
export type { MessageListProps, Message, MessageUser, Reaction } from './components/sdk/MessageList';
export type { MessageInputProps, ReplyingTo } from './components/sdk/MessageInput';
export type { ThreadProps } from './components/sdk/Thread';
export type { ChatLayoutProps } from './components/sdk/ChatLayout';
export type { VoiceMessageProps } from './components/sdk/VoiceMessage';
export type { VoiceRecorderProps } from './components/sdk/VoiceRecorder';
export type { MemberListProps, Member } from './components/sdk/MemberList';
export type { MediaGalleryProps, MediaItem } from './components/sdk/MediaGallery';
export type { SearchResultsProps, SearchResult } from './components/sdk/SearchResults';
export type { EmojiPickerProps, Emoji } from './components/sdk/EmojiPicker';
export type { ThreadViewProps, ThreadMessage } from './components/sdk/ThreadView';
export type { TypingIndicatorProps, TypingUser } from './components/sdk/TypingIndicator';
export type { ReadReceiptsProps, ReadReceiptUser } from './components/sdk/ReadReceipts';

// Types - Onboarding
export type { AppSetupWizardProps, AppConfig, WizardStep } from './components/onboarding/AppSetupWizard';
export type { ThemeBuilderProps, ThemeConfig } from './components/onboarding/ThemeBuilder';

// Types - Admin
export type { DashboardProps } from './components/admin/Dashboard';
export type { UsersTableProps, User } from './components/admin/UsersTable';
export type { UserProfileProps, UserProfileData, UserActivity, UserDevice, LinkedAccount } from './components/admin/UserProfile';
export type { ChannelsTableProps, ChannelData } from './components/admin/ChannelsTable';
export type { ModerationQueueProps, ModerationItem, AIInsight } from './components/admin/ModerationQueue';
export type { APIKeysManagerProps, APIKey } from './components/admin/APIKeysManager';
export type { WebhooksManagerProps, Webhook, WebhookDelivery } from './components/admin/WebhooksManager';
export type { AuditLogProps, AuditLogEntry } from './components/admin/AuditLog';

// Types - User
export type { SettingsPageProps, UserProfile, NotificationSettings, AppearanceSettings, PrivacySettings } from './components/user/SettingsPage';
