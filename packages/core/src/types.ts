/**
 * ChatSDK Core Types
 * Inspired by GetStream, Zulip's UserMessage pattern, and modern chat UX
 */

// ============================================================================
// User & Auth
// ============================================================================

export interface User {
  id: string;
  name: string;
  image?: string;
  custom?: Record<string, unknown>;
  online?: boolean;
  last_active?: string;
}

export interface UserToken {
  user_id: string;
  app_id: string;
  exp: number;
  iat: number;
}

// ============================================================================
// Channels
// ============================================================================

export type ChannelType = 'messaging' | 'livestream' | 'team' | 'commerce';

export interface Channel {
  id: string;
  cid: string; // e.g., "messaging:general"
  type: ChannelType;
  name?: string;
  image?: string;
  member_count: number;
  created_by?: User;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  frozen?: boolean;
  config?: ChannelConfig;
  members?: ChannelMember[];
  custom?: Record<string, unknown>;
}

export interface ChannelConfig {
  typing_events?: boolean;
  read_events?: boolean;
  connect_events?: boolean;
  reactions?: boolean;
  replies?: boolean;
  mutes?: boolean;
  uploads?: boolean;
  url_enrichment?: boolean;
  max_message_length?: number;
  slow_mode_interval?: number; // seconds
}

export interface ChannelMember {
  user_id: string;
  user?: User;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  invited?: boolean;
  banned?: boolean;
  shadow_banned?: boolean;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// Messages
// ============================================================================

export type MessageType = 'regular' | 'system' | 'error' | 'deleted';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  cid: string;
  type: MessageType;
  text?: string;
  html?: string;
  user?: User;
  attachments?: Attachment[];
  mentioned_users?: User[];
  reactions?: ReactionGroup[];
  reply_count?: number;
  parent_id?: string;
  quoted_message_id?: string;
  quoted_message?: Message;
  thread_participants?: User[];
  status?: MessageStatus;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  // Voice message fields (2025 table stakes)
  voice_url?: string;
  voice_duration_ms?: number;
  voice_waveform?: number[];
  // Video bubble fields
  video_url?: string;
  video_thumbnail_url?: string;
  video_duration_ms?: number;
  // AI features
  ai_generated?: boolean;
  custom?: Record<string, unknown>;
}

// ============================================================================
// Attachments
// ============================================================================

export type AttachmentType = 'image' | 'video' | 'audio' | 'file' | 'giphy' | 'voicenote';

export interface Attachment {
  type: AttachmentType;
  fallback?: string;
  title?: string;
  title_link?: string;
  text?: string;
  image_url?: string;
  thumb_url?: string;
  asset_url?: string;
  og_scrape_url?: string;
  mime_type?: string;
  file_size?: number;
  // Audio/Voice specific
  duration?: number;
  waveform?: number[];
  // Video specific
  width?: number;
  height?: number;
}

// ============================================================================
// Reactions
// ============================================================================

export interface Reaction {
  type: string; // emoji code
  user_id: string;
  user?: User;
  message_id: string;
  created_at: string;
}

export interface ReactionGroup {
  type: string;
  count: number;
  users: User[];
  own?: boolean; // Current user reacted
}

// ============================================================================
// Read State (Zulip's UserMessage pattern)
// ============================================================================

export interface ReadState {
  user: User;
  last_read_message_id?: string;
  unread_messages: number;
}

// ============================================================================
// Typing Indicators
// ============================================================================

export interface TypingEvent {
  channel_id: string;
  user: User;
  started_at: string;
}

// ============================================================================
// Events (Real-time)
// ============================================================================

export type ChatEventType =
  | 'message.new'
  | 'message.updated'
  | 'message.deleted'
  | 'message.read'
  | 'reaction.new'
  | 'reaction.deleted'
  | 'typing.start'
  | 'typing.stop'
  | 'member.added'
  | 'member.removed'
  | 'member.updated'
  | 'channel.updated'
  | 'channel.deleted'
  | 'connection.changed'
  | 'user.presence.changed';

export interface ChatEvent {
  type: ChatEventType;
  cid?: string;
  channel?: Channel;
  message?: Message;
  reaction?: Reaction;
  user?: User;
  member?: ChannelMember;
  received_at: string;
}

// ============================================================================
// API Query Types
// ============================================================================

export interface ChannelFilters {
  type?: ChannelType;
  id?: string | { $in: string[] };
  members?: { $in: string[] };
  frozen?: boolean;
  custom?: Record<string, unknown>;
}

export interface ChannelSort {
  last_message_at?: -1 | 1;
  created_at?: -1 | 1;
  updated_at?: -1 | 1;
  member_count?: -1 | 1;
}

export interface MessageQueryOptions {
  limit?: number;
  before?: string; // cursor (message ID)
  after?: string;
  around?: string; // For jumping to a message
}

// ============================================================================
// Component Props (GetStream parity)
// ============================================================================

export interface ChannelListProps {
  filters?: ChannelFilters;
  sort?: ChannelSort;
  options?: {
    limit?: number;
    presence?: boolean;
    state?: boolean;
    watch?: boolean;
  };
  Preview?: React.ComponentType<ChannelPreviewProps>;
  LoadingIndicator?: React.ComponentType;
  EmptyStateIndicator?: React.ComponentType;
  onChannelSelect?: (channel: Channel) => void;
}

export interface ChannelPreviewProps {
  channel: Channel;
  lastMessage?: Message;
  unreadCount: number;
  active?: boolean;
  onSelect?: () => void;
}

export interface MessageListProps {
  messages: Message[];
  loadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  Message?: React.ComponentType<MessageProps>;
  DateSeparator?: React.ComponentType<{ date: Date }>;
  EmptyStateIndicator?: React.ComponentType;
  messageActions?: MessageAction[];
}

export interface MessageProps {
  message: Message;
  isOwn?: boolean;
  showAvatar?: boolean;
  showName?: boolean;
  grouped?: boolean;
  onReactionSelect?: (emoji: string) => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface MessageAction {
  id: string;
  title: string;
  icon?: React.ReactNode;
  onClick: (message: Message) => void;
}

export interface MessageInputProps {
  placeholder?: string;
  disabled?: boolean;
  grow?: boolean;
  maxRows?: number;
  mentionTrigger?: string;
  onSend?: (message: { text: string; attachments?: Attachment[] }) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  additionalTextareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
}

export interface VoiceMessageProps {
  url: string;
  duration: number;
  waveform: number[];
  isPlaying?: boolean;
  currentTime?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
}

export interface AvatarProps {
  user?: User;
  name?: string;
  image?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  presence?: 'online' | 'offline' | 'busy' | 'away';
}

export interface ReactionSelectorProps {
  reactions?: string[];
  onSelect?: (emoji: string) => void;
  ownReactions?: string[];
}

// ============================================================================
// Theme Configuration
// ============================================================================

export interface ChatTheme {
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    border: string;
    messageBubble: string;
    messageBubbleOwn: string;
    messageText: string;
    messageTextOwn: string;
    onlineDot: string;
  };
  fonts: {
    sans: string;
    mono: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

// ============================================================================
// Sync Engine Types (OpenIMSDK Pattern)
// ============================================================================

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface SyncState {
  channelId: string;
  localMaxSeq: number;
  serverMaxSeq: number;
  lastSyncedAt: number;
  versionId?: string;
}

export interface SyncGap {
  channelId: string;
  fromSeq: number;
  toSeq: number;
}

export interface MessageWithSeq extends Message {
  seq: number;
  clientMsgId?: string;
}

// ============================================================================
// Offline Queue Types
// ============================================================================

export interface PendingMessage {
  clientMsgId: string;
  channelId: string;
  text: string;
  attachments?: Attachment[];
  status: 'pending' | 'sending' | 'failed';
  createdAt: number;
  retryCount: number;
  error?: string;
}

// ============================================================================
// Event Bus Types (OpenIMSDK Callback Pattern)
// ============================================================================

export interface EventMap {
  // Connection events
  'connection.connecting': void;
  'connection.connected': void;
  'connection.disconnected': { reason: string };
  'connection.reconnecting': { attempt: number };
  'connection.error': { error: Error };

  // Sync events
  'sync.start': { channelId?: string; isInitial: boolean };
  'sync.progress': { channelId: string; progress: number };
  'sync.complete': { channelId?: string; messageCount: number };
  'sync.error': { channelId?: string; error: Error };

  // Channel events
  'channel.created': { channel: Channel };
  'channel.updated': { channel: Channel };
  'channel.deleted': { channelId: string };
  'channel.unread_changed': { channelId: string; count: number };
  'channel.total_unread_changed': { count: number };

  // Message events
  'message.new': { channelId: string; message: MessageWithSeq };
  'message.updated': { channelId: string; message: MessageWithSeq };
  'message.deleted': { channelId: string; messageId: string };
  'message.status_changed': { channelId: string; messageId: string; status: MessageStatus };

  // Typing events
  'typing.start': { channelId: string; user: User };
  'typing.stop': { channelId: string; user: User };

  // Reaction events
  'reaction.added': { channelId: string; messageId: string; reaction: Reaction };
  'reaction.removed': { channelId: string; messageId: string; reaction: Reaction };

  // Presence events
  'presence.online': { userId: string };
  'presence.offline': { userId: string; lastSeen: string };

  // Read receipt events
  'read.updated': { channelId: string; userId: string; lastReadSeq: number };
  'read_receipt': { channelId: string; userId: string; messageId: string };

  // Thread events
  'thread.reply': { channelId: string; threadId: string; message: MessageWithSeq };

  // Mention events
  'mention': { channelId: string; messageId: string; mentionedUserId: string };
}

export type EventCallback<K extends keyof EventMap> = (data: EventMap[K]) => void;

// ============================================================================
// Client Configuration
// ============================================================================

export interface ChatClientOptions {
  apiKey: string;
  apiUrl?: string;
  wsUrl?: string;
  debug?: boolean;
  enableOfflineSupport?: boolean;
  reconnectIntervals?: number[];
}

export interface ConnectUserOptions {
  id: string;
  name?: string;
  image?: string;
  custom?: Record<string, unknown>;
}
