/**
 * Zod Validation Schemas for ChatSDK
 * Work Stream 20 - TIER 4
 *
 * All API request/response schemas with runtime validation
 */

import { z } from 'zod';

// ============================================================================
// User Schemas
// ============================================================================

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().url().optional().nullable(),
  custom: z.record(z.unknown()).optional().nullable(),
  lastActiveAt: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateUserSchema = z.object({
  userId: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  image: z.string().url().optional(),
  custom: z.record(z.unknown()).optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().url().optional().nullable(),
  custom: z.record(z.unknown()).optional(),
});

// ============================================================================
// Channel Schemas
// ============================================================================

export const ChannelSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['messaging', 'group', 'team']),
  name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().url().optional().nullable(),
  workspaceId: z.string().uuid().optional().nullable(),
  createdBy: z.string(),
  memberCount: z.number().int().min(0),
  messageCount: z.number().int().min(0),
  unreadCount: z.number().int().min(0).optional(),
  lastMessageAt: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateChannelSchema = z.object({
  type: z.enum(['messaging', 'group', 'team']),
  memberIds: z.array(z.string()).min(1).max(100),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  image: z.string().url().optional(),
  workspaceId: z.string().uuid().optional(),
});

export const UpdateChannelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  image: z.string().url().optional().nullable(),
});

// ============================================================================
// Message Schemas
// ============================================================================

export const AttachmentSchema = z.object({
  type: z.enum(['image', 'video', 'audio', 'file']),
  url: z.string().url(),
  name: z.string(),
  size: z.number().int().min(0),
  mimeType: z.string(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().optional(),
  thumbnailUrl: z.string().url().optional(),
  blurhash: z.string().optional(),
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().uuid(),
  userId: z.string(),
  seq: z.number().int().min(0),
  text: z.string().optional().nullable(),
  attachments: z.array(AttachmentSchema).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  replyToId: z.string().uuid().optional().nullable(),
  reactionCount: z.number().int().min(0),
  replyCount: z.number().int().min(0),
  pinned: z.boolean(),
  pinnedAt: z.string().datetime().optional().nullable(),
  pinnedBy: z.string().optional().nullable(),
  status: z.enum(['sending', 'sent', 'failed']),
  linkPreviews: z.array(z.record(z.unknown())).optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional().nullable(),
  user: UserSchema.optional(),
});

export const SendMessageSchema = z.object({
  text: z.string().min(1).max(5000).optional(),
  attachments: z.array(AttachmentSchema).max(10).optional(),
  parentId: z.string().uuid().optional(),
  replyToId: z.string().uuid().optional(),
  mentionedUserIds: z.array(z.string()).max(50).optional(),
  clientMsgId: z.string().optional(), // For offline sync
});

export const UpdateMessageSchema = z.object({
  text: z.string().min(1).max(5000),
});

// ============================================================================
// Reaction Schemas
// ============================================================================

export const ReactionSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  userId: z.string(),
  emoji: z.string().min(1).max(50),
  createdAt: z.string().datetime(),
  user: UserSchema.optional(),
});

export const AddReactionSchema = z.object({
  emoji: z.string().min(1).max(50).regex(/^([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|:[a-z0-9_-]+:)$/u),
});

// ============================================================================
// Workspace Schemas
// ============================================================================

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  imageUrl: z.string().url().optional().nullable(),
  config: z.record(z.unknown()),
  memberCount: z.number().int().min(0),
  channelCount: z.number().int().min(0),
  createdBy: z.string(),
  expiresAt: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['team', 'project', 'conference', 'chapter']).default('team'),
  imageUrl: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  imageUrl: z.string().url().optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

// ============================================================================
// Poll Schemas
// ============================================================================

export const PollOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(200),
  voteCount: z.number().int().min(0).default(0),
});

export const PollSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  question: z.string(),
  options: z.array(PollOptionSchema).min(2).max(10),
  isAnonymous: z.boolean(),
  isMultiChoice: z.boolean(),
  totalVotes: z.number().int().min(0),
  endsAt: z.string().datetime().optional().nullable(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});

export const CreatePollSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.object({
    id: z.string().optional(),
    text: z.string().min(1).max(200),
  })).min(2).max(10),
  isAnonymous: z.boolean().default(false),
  isMultiChoice: z.boolean().default(false),
  endsAt: z.string().datetime().optional(),
});

export const VoteSchema = z.object({
  optionId: z.string(),
});

// ============================================================================
// Search Schemas
// ============================================================================

export const SearchResultSchema = z.object({
  messages: z.array(MessageSchema),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
});

export const SearchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  channelId: z.string().uuid().optional(),
  userId: z.string().optional(),
  after: z.string().datetime().optional(),
  before: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// Presence Schemas
// ============================================================================

export const PresenceSchema = z.object({
  userId: z.string(),
  status: z.enum(['online', 'offline', 'away']),
  lastHeartbeatAt: z.string().datetime(),
  user: UserSchema.optional(),
});

export const UpdatePresenceSchema = z.object({
  status: z.enum(['online', 'offline', 'away']),
});

// ============================================================================
// Typing Indicator Schemas
// ============================================================================

export const TypingIndicatorSchema = z.object({
  userId: z.string(),
  channelId: z.string().uuid(),
  isTyping: z.boolean(),
  startedAt: z.string().datetime(),
  user: UserSchema.optional(),
});

// ============================================================================
// Read Receipt Schemas
// ============================================================================

export const ReadReceiptSchema = z.object({
  userId: z.string(),
  messageId: z.string().uuid(),
  readAt: z.string().datetime(),
  user: UserSchema.optional(),
});

// ============================================================================
// Mention Schemas
// ============================================================================

export const MentionSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  mentionedUserId: z.string(),
  mentionerUserId: z.string(),
  createdAt: z.string().datetime(),
  message: MessageSchema.optional(),
});

// ============================================================================
// Thread Schemas
// ============================================================================

export const ThreadSchema = z.object({
  parentMessage: MessageSchema,
  replies: z.array(MessageSchema),
  replyCount: z.number().int().min(0),
});

// ============================================================================
// Pagination Schemas
// ============================================================================

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
    limit: z.number().int(),
    offset: z.number().int(),
    hasMore: z.boolean(),
  });

// ============================================================================
// Error Schemas
// ============================================================================

export const ErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  }),
});

// ============================================================================
// WebSocket Event Schemas
// ============================================================================

export const WebSocketEventSchema = z.discriminatedUnion('type', [
  // Message events
  z.object({
    type: z.literal('message.new'),
    channelId: z.string().uuid(),
    message: MessageSchema,
  }),
  z.object({
    type: z.literal('message.updated'),
    channelId: z.string().uuid(),
    message: MessageSchema,
  }),
  z.object({
    type: z.literal('message.deleted'),
    channelId: z.string().uuid(),
    messageId: z.string().uuid(),
  }),

  // Reaction events
  z.object({
    type: z.literal('reaction.added'),
    channelId: z.string().uuid(),
    messageId: z.string().uuid(),
    reaction: ReactionSchema,
  }),
  z.object({
    type: z.literal('reaction.removed'),
    channelId: z.string().uuid(),
    messageId: z.string().uuid(),
    reactionId: z.string().uuid(),
  }),

  // Typing events
  z.object({
    type: z.literal('typing.start'),
    channelId: z.string().uuid(),
    userId: z.string(),
    user: UserSchema.optional(),
  }),
  z.object({
    type: z.literal('typing.stop'),
    channelId: z.string().uuid(),
    userId: z.string(),
  }),

  // Presence events
  z.object({
    type: z.literal('presence.changed'),
    userId: z.string(),
    status: z.enum(['online', 'offline', 'away']),
    user: UserSchema.optional(),
  }),

  // Read receipt events
  z.object({
    type: z.literal('message.read'),
    channelId: z.string().uuid(),
    messageId: z.string().uuid(),
    userId: z.string(),
  }),
]);

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export type Channel = z.infer<typeof ChannelSchema>;
export type CreateChannel = z.infer<typeof CreateChannelSchema>;
export type UpdateChannel = z.infer<typeof UpdateChannelSchema>;

export type Attachment = z.infer<typeof AttachmentSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type SendMessage = z.infer<typeof SendMessageSchema>;
export type UpdateMessage = z.infer<typeof UpdateMessageSchema>;

export type Reaction = z.infer<typeof ReactionSchema>;
export type AddReaction = z.infer<typeof AddReactionSchema>;

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspace = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof UpdateWorkspaceSchema>;

export type Poll = z.infer<typeof PollSchema>;
export type PollOption = z.infer<typeof PollOptionSchema>;
export type CreatePoll = z.infer<typeof CreatePollSchema>;
export type Vote = z.infer<typeof VoteSchema>;

export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export type Presence = z.infer<typeof PresenceSchema>;
export type UpdatePresence = z.infer<typeof UpdatePresenceSchema>;

export type TypingIndicator = z.infer<typeof TypingIndicatorSchema>;
export type ReadReceipt = z.infer<typeof ReadReceiptSchema>;
export type Mention = z.infer<typeof MentionSchema>;
export type Thread = z.infer<typeof ThreadSchema>;

export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;
export type ApiError = z.infer<typeof ErrorSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate and parse data with a schema
 * Throws ZodError with detailed validation errors
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Validate and parse data with a schema (safe version)
 * Returns { success: true, data } or { success: false, error }
 */
export function validateSafe<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.SafeParseReturnType<unknown, z.infer<T>> {
  return schema.safeParse(data);
}

/**
 * Create a type-safe API client method with validation
 */
export function createValidatedMethod<
  TInput extends z.ZodTypeAny,
  TOutput extends z.ZodTypeAny
>(
  inputSchema: TInput,
  outputSchema: TOutput,
  handler: (input: z.infer<TInput>) => Promise<unknown>
): (input: z.infer<TInput>) => Promise<z.infer<TOutput>> {
  return async (input: z.infer<TInput>) => {
    // Validate input
    const validatedInput = inputSchema.parse(input);

    // Execute handler
    const result = await handler(validatedInput);

    // Validate output
    return outputSchema.parse(result);
  };
}
