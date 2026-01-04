'use client';

/**
 * @chatsdk/react-query hooks
 */

// Workspaces
export {
  useWorkspacesQuery,
  useWorkspaceQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  workspaceKeys,
} from './useWorkspacesQuery';
export type {
  Workspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from './useWorkspacesQuery';

// Channels
export {
  useChannelsQuery,
  useChannelQuery,
  useInfiniteChannelsQuery,
  useCreateChannelMutation,
  useJoinChannelMutation,
  useLeaveChannelMutation,
  channelKeys,
} from './useChannelsQuery';
export type { ChannelFilters } from './useChannelsQuery';

// Messages
export {
  useMessagesQuery,
  useInfiniteMessagesQuery,
  useSendMessageMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
  useReactionMutation,
  messageKeys,
} from './useMessagesQuery';
export type { MessagesResponse } from './useMessagesQuery';
