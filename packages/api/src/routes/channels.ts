/**
 * Channel Routes
 * Channel/conversation management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { createHash } from 'crypto';
import { v7 as uuidv7 } from 'uuid';
import { db } from '../services/database';
import { requireApp, requireScope, requireUser } from '../middleware/auth';
import { getChannelAccess, isChannelMember, isWorkspaceMember } from '../services/authorization';
import { centrifugo } from '../services/centrifugo';
import {
  chatChannel,
  enqueueDomainRealtimeEvent,
  triggerRealtimeOutboxDrainSafely,
  userChannel,
} from '../services/realtime-events';
import { realtimeUserSubject } from '../services/tokens';
import { RATE_LIMIT_POLICIES, rateLimitUser } from '../services/rate-limit';
import { createDataExport } from '../services/data-lifecycle';

export const channelRoutes = new Hono();

const MAX_CHANNEL_ENSURE_BODY_BYTES = 32 * 1024;
const MAX_CHANNEL_CUSTOM_BYTES = 4096;

const createChannelSchema = z.object({
  // Support standard types + common aliases (public/private)
  type: z.enum(['messaging', 'group', 'team', 'livestream', 'public', 'private']).default('messaging'),
  name: z.string().optional(),
  image: z.string().url().optional(),
  memberIds: z.array(z.string()).default([]), // Allow empty for group channels
  workspaceId: z.string().uuid().optional(), // Associate channel with a workspace
  idempotencyKey: z.string().max(255).optional(), // Prevent duplicate group channel creation on retry/race
  config: z.object({
    typingEvents: z.boolean().optional(),
    readEvents: z.boolean().optional(),
    reactions: z.boolean().optional(),
    replies: z.boolean().optional(),
    private: z.boolean().optional(), // Channel privacy
  }).optional(),
}).refine(
  (data) => {
    // For DM channels, require exactly 1 member (the other person)
    if (data.type === 'messaging') {
      return data.memberIds.length === 1;
    }
    // For group channels, members are optional
    return true;
  },
  {
    message: 'Direct messages require exactly one member ID',
    path: ['memberIds'],
  }
);

const ensureDmSchema = z.object({
  requesterUserId: z.string().min(1).max(255),
  peerUserId: z.string().min(1).max(255),
  idempotencyKey: z.string().max(255).optional(),
  custom: z.record(z.unknown()).optional().refine(
    (custom) => !custom || JSON.stringify(custom).length <= MAX_CHANNEL_CUSTOM_BYTES,
    `custom must be at most ${MAX_CHANNEL_CUSTOM_BYTES} bytes`
  ),
});

type EnsureDmInput = z.infer<typeof ensureDmSchema>;

const ensureGroupChannelSchema = z.object({
  externalId: z.string().min(1).max(255).optional(),
  idempotencyKey: z.string().min(1).max(255).optional(),
  name: z.string().max(255).optional(),
  image: z.string().url().optional(),
  memberIds: z.array(z.string().min(1).max(255)).min(1).max(500),
  custom: z.record(z.unknown()).optional().refine(
    (custom) => !custom || JSON.stringify(custom).length <= MAX_CHANNEL_CUSTOM_BYTES,
    `custom must be at most ${MAX_CHANNEL_CUSTOM_BYTES} bytes`
  ),
}).refine((data) => data.externalId || data.idempotencyKey, {
  message: 'externalId or idempotencyKey is required',
  path: ['externalId'],
});

type EnsureGroupChannelInput = z.infer<typeof ensureGroupChannelSchema>;

async function ensureDirectMessageChannel(appId: string, input: EnsureDmInput) {
  if (input.requesterUserId === input.peerUserId) {
    return {
      status: 400,
      body: { error: { message: 'Direct messages require two distinct users' } },
    } as const;
  }

  const memberIds = [input.requesterUserId, input.peerUserId];
  const users = await db.query(
    `SELECT id FROM app_user WHERE app_id = $1 AND id = ANY($2)`,
    [appId, memberIds]
  );
  const existingUserIds = new Set(users.rows.map((row) => row.id));
  const missingUserIds = memberIds.filter((userId) => !existingUserIds.has(userId));

  if (missingUserIds.length > 0) {
    return {
      status: 404,
      body: {
        error: {
          message: 'User not found',
          missingUserIds,
        },
      },
    } as const;
  }

  const channelId = uuidv7();
  const cid = directMessageCid(memberIds);
  const existingChannel = await db.query(
    'SELECT * FROM channel WHERE app_id = $1 AND cid = $2',
    [appId, cid]
  );

  if (existingChannel.rows.length > 0) {
    return {
      status: 200,
      body: {
        action: 'existing',
        created: false,
        channel: formatChannel(existingChannel.rows[0]),
      },
    } as const;
  }

  const result = await db.transaction(async (client) => {
    const channelResult = await client.query(
      `INSERT INTO channel (id, app_id, cid, type, name, image_url, config, created_by, member_count, workspace_id, idempotency_key)
       VALUES ($1, $2, $3, 'messaging', NULL, NULL, '{}'::jsonb, $4, 2, NULL, NULL)
       ON CONFLICT (app_id, cid)
       DO NOTHING
       RETURNING *`,
      [
        channelId,
        appId,
        cid,
        input.requesterUserId,
      ]
    );

    if (channelResult.rows.length === 0) {
      const idempotent = await client.query(
        'SELECT * FROM channel WHERE app_id = $1 AND cid = $2',
        [appId, cid]
      );
      return { channel: idempotent.rows[0], created: false };
    }

    const channel = channelResult.rows[0];

    await client.query(
      `INSERT INTO channel_member (channel_id, app_id, user_id, role)
       VALUES ($1, $2, $3, 'member'), ($1, $2, $4, 'member')
       ON CONFLICT DO NOTHING`,
      [channelId, appId, input.requesterUserId, input.peerUserId]
    );

    await client.query(
      `INSERT INTO channel_seq (channel_id, app_id, current_seq)
       VALUES ($1, $2, 0)
       ON CONFLICT DO NOTHING`,
      [channelId, appId]
    );

    await enqueueDomainRealtimeEvent(client, {
      appId,
      aggregateType: 'channel',
      aggregateId: channelId,
      eventType: 'channel.created',
      channels: memberIds.map((userId) => userChannel(appId, userId)),
      payload: { channel: formatChannel(channel) },
      idempotencyKey: `channel.created:${appId}:${channelId}`,
    });

    return { channel, created: true };
  });

  if (!result.channel) {
    return {
      status: 409,
      body: { error: { message: 'Unable to resolve idempotent DM creation' } },
    } as const;
  }

  if (result.created) {
    triggerRealtimeOutboxDrainSafely();
  }

  return {
    status: result.created ? 201 : 200,
    body: {
      action: result.created ? 'created' : 'existing',
      created: result.created,
      channel: formatChannel(result.channel),
    },
  } as const;
}

async function ensureServerGroupChannel(
  appId: string,
  input: EnsureGroupChannelInput,
  routeKind: 'group' | 'squad'
) {
  const cid = input.externalId ?? input.idempotencyKey!;
  if (cid.startsWith('messaging:dm:')) {
    return {
      status: 400,
      body: { error: { message: 'externalId is reserved for direct messages' } },
    } as const;
  }

  const memberIds = [...new Set(input.memberIds)];
  const users = await db.query(
    `SELECT id FROM app_user WHERE app_id = $1 AND id = ANY($2)`,
    [appId, memberIds]
  );
  const existingUserIds = new Set(users.rows.map((row) => row.id));
  const missingUserIds = memberIds.filter((userId) => !existingUserIds.has(userId));

  if (missingUserIds.length > 0) {
    return {
      status: 404,
      body: {
        error: {
          message: 'User not found',
          missingUserIds,
        },
      },
    } as const;
  }

  const existingChannel = await db.query(
    'SELECT * FROM channel WHERE app_id = $1 AND cid = $2',
    [appId, cid]
  );

  if (existingChannel.rows.length > 0) {
    const channel = existingChannel.rows[0];
    if (channel.type !== 'group') {
      return {
        status: 409,
        body: { error: { message: 'Existing channel has incompatible type' } },
      } as const;
    }

    return {
      status: 200,
      body: {
        action: 'existing',
        created: false,
        channel: formatChannel(channel),
      },
    } as const;
  }

  const channelId = uuidv7();
  const createdBy = memberIds[0] ?? null;
  const config = input.custom
    ? { custom: input.custom, kind: routeKind, source: 'app-auth-ensure' }
    : { kind: routeKind, source: 'app-auth-ensure' };

  const result = await db.transaction(async (client) => {
    const channelResult = await client.query(
      `INSERT INTO channel (id, app_id, cid, type, name, image_url, config, created_by, member_count, workspace_id, idempotency_key)
       VALUES ($1, $2, $3, 'group', $4, $5, $6::jsonb, $7, $8, NULL, $9)
       ON CONFLICT (app_id, cid)
       DO NOTHING
       RETURNING *`,
      [
        channelId,
        appId,
        cid,
        input.name ?? null,
        input.image ?? null,
        JSON.stringify(config),
        createdBy,
        memberIds.length,
        input.idempotencyKey ?? cid,
      ]
    );

    if (channelResult.rows.length === 0) {
      const idempotent = await client.query(
        'SELECT * FROM channel WHERE app_id = $1 AND cid = $2',
        [appId, cid]
      );
      return { channel: idempotent.rows[0], created: false };
    }

    const channel = channelResult.rows[0];

    for (const memberId of memberIds) {
      await client.query(
        `INSERT INTO channel_member (channel_id, app_id, user_id, role)
         VALUES ($1, $2, $3, 'member')
         ON CONFLICT DO NOTHING`,
        [channelId, appId, memberId]
      );
    }

    await client.query(
      `INSERT INTO channel_seq (channel_id, app_id, current_seq)
       VALUES ($1, $2, 0)
       ON CONFLICT DO NOTHING`,
      [channelId, appId]
    );

    await enqueueDomainRealtimeEvent(client, {
      appId,
      aggregateType: 'channel',
      aggregateId: channelId,
      eventType: 'channel.created',
      channels: memberIds.map((userId) => userChannel(appId, userId)),
      payload: { channel: formatChannel(channel) },
      idempotencyKey: `channel.created:${appId}:${channelId}`,
    });

    return { channel, created: true };
  });

  if (!result.channel) {
    return {
      status: 409,
      body: { error: { message: 'Unable to resolve idempotent group creation' } },
    } as const;
  }

  if (result.channel.type !== 'group') {
    return {
      status: 409,
      body: { error: { message: 'Existing channel has incompatible type' } },
    } as const;
  }

  if (result.created) {
    triggerRealtimeOutboxDrainSafely();
  }

  return {
    status: result.created ? 201 : 200,
    body: {
      action: result.created ? 'created' : 'existing',
      created: result.created,
      channel: formatChannel(result.channel),
    },
  } as const;
}

/**
 * Server-side create/open direct message.
 * POST /api/channels/dm/ensure
 *
 * Vouch should enforce blocks, minor/account status, and eligibility before
 * calling this app-authenticated endpoint.
 */
channelRoutes.post(
  '/dm/ensure',
  requireApp,
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation),
  bodyLimit({
    maxSize: MAX_CHANNEL_ENSURE_BODY_BYTES,
    onError: (c) => c.json({ error: { message: 'DM ensure payload is too large' } }, 413),
  }),
  zValidator('json', ensureDmSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');
    const result = await ensureDirectMessageChannel(auth.appId, body);

    return c.json(result.body, result.status);
  }
);

/**
 * Server-side create/open group channel.
 * POST /api/channels/group/ensure
 *
 * Vouch should enforce membership, blocks, minor/account status, and
 * nonprofit/squad eligibility before calling this app-authenticated endpoint.
 */
channelRoutes.post(
  '/group/ensure',
  requireApp,
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation),
  bodyLimit({
    maxSize: MAX_CHANNEL_ENSURE_BODY_BYTES,
    onError: (c) => c.json({ error: { message: 'Group ensure payload is too large' } }, 413),
  }),
  zValidator('json', ensureGroupChannelSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');
    const result = await ensureServerGroupChannel(auth.appId, body, 'group');

    return c.json(result.body, result.status);
  }
);

/**
 * Server-side create/open squad channel.
 * POST /api/channels/squad/ensure
 *
 * This creates a ChatSDK group channel and records squad semantics in config.
 */
channelRoutes.post(
  '/squad/ensure',
  requireApp,
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation),
  bodyLimit({
    maxSize: MAX_CHANNEL_ENSURE_BODY_BYTES,
    onError: (c) => c.json({ error: { message: 'Squad ensure payload is too large' } }, 413),
  }),
  zValidator('json', ensureGroupChannelSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');
    const result = await ensureServerGroupChannel(auth.appId, body, 'squad');

    return c.json(result.body, result.status);
  }
);

/**
 * Create channel
 * POST /api/channels
 */
channelRoutes.post(
  '/',
  requireUser,
  requireScope('channel:create'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation),
  zValidator('json', createChannelSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    // Generate channel ID and CID
    const channelId = uuidv7();

    // For DM channels, create deterministic CID
    let cid: string;
    if (body.type === 'messaging' && body.memberIds.length === 1) {
      cid = directMessageCid([auth.userId!, body.memberIds[0]]);
    } else {
      cid = `${body.type}:${channelId}`;
    }

    // Check if channel with this CID already exists (for DMs)
    const existingChannel = await db.query(
      'SELECT id FROM channel WHERE app_id = $1 AND cid = $2',
      [auth.appId, cid]
    );

    if (existingChannel.rows.length > 0) {
      // Return existing channel
      const channelId = existingChannel.rows[0].id;
      return c.redirect(`/api/channels/${channelId}`, 303);
    }

    if (body.type === 'messaging') {
      const targetUserId = body.memberIds[0];
      const targetUser = await db.query(
        'SELECT id FROM app_user WHERE app_id = $1 AND id = $2',
        [auth.appId, targetUserId]
      );

      if (targetUser.rows.length === 0) {
        return c.json({ error: { message: 'User not found' } }, 404);
      }
    }

    if (body.workspaceId) {
      const workspaceAccess = await db.query(
        `SELECT w.id
         FROM workspace w
         JOIN workspace_member wm
           ON wm.app_id = w.app_id
          AND wm.workspace_id = w.id
          AND wm.user_id = $3
         WHERE w.id = $1 AND w.app_id = $2`,
        [body.workspaceId, auth.appId, auth.userId]
      );

      if (workspaceAccess.rows.length === 0) {
        return c.json({ error: { message: 'Workspace not found or no access' } }, 404);
      }

      const targetWorkspaceMembers = await db.query(
        `SELECT user_id FROM workspace_member
         WHERE app_id = $1 AND workspace_id = $2 AND user_id = ANY($3)`,
        [auth.appId, body.workspaceId, body.memberIds]
      );
      const workspaceMemberIds = new Set(targetWorkspaceMembers.rows.map((row) => row.user_id));
      const nonWorkspaceMemberIds = body.memberIds.filter(
        (memberId) => memberId !== auth.userId && !workspaceMemberIds.has(memberId)
      );

      if (nonWorkspaceMemberIds.length > 0) {
        return c.json({
          error: {
            message: 'All channel members must belong to the workspace',
            code: 'FORBIDDEN',
          },
        }, 403);
      }
    }

    // Create channel in transaction (uses ON CONFLICT for atomic idempotency)
    const result = await db.transaction(async (client) => {
      // Insert channel — ON CONFLICT handles concurrent requests with same idempotency_key
      const channelResult = await client.query(
        `INSERT INTO channel (id, app_id, cid, type, name, image_url, config, created_by, member_count, workspace_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (app_id, idempotency_key) WHERE idempotency_key IS NOT NULL
         DO NOTHING
         RETURNING *`,
        [
          channelId,
          auth.appId,
          cid,
          body.type,
          body.name,
          body.image,
          body.config ?? {},
          auth.userId,
          body.memberIds.length + 1, // +1 for creator
          body.workspaceId ?? null,
          body.idempotencyKey ?? null,
        ]
      );

      // ON CONFLICT DO NOTHING returns 0 rows — idempotency key already exists
      if (channelResult.rows.length === 0) {
        return null; // Signal that this is a duplicate
      }

      // Add creator as owner
      await client.query(
        `INSERT INTO channel_member (channel_id, app_id, user_id, role)
         VALUES ($1, $2, $3, 'owner')`,
        [channelId, auth.appId, auth.userId]
      );

      // Add other members
      for (const memberId of body.memberIds) {
        if (memberId !== auth.userId) {
          await client.query(
            `INSERT INTO channel_member (channel_id, app_id, user_id, role)
             VALUES ($1, $2, $3, 'member')
             ON CONFLICT DO NOTHING`,
            [channelId, auth.appId, memberId]
          );
        }
      }

      // Initialize channel sequence
      await client.query(
        `INSERT INTO channel_seq (channel_id, app_id, current_seq) VALUES ($1, $2, 0)`,
        [channelId, auth.appId]
      );

      // Update workspace channel_count if associated with a workspace
      if (body.workspaceId) {
        await client.query(
          `UPDATE workspace SET channel_count = channel_count + 1
           WHERE id = $1 AND app_id = $2`,
          [body.workspaceId, auth.appId]
        );
      }

      const channel = channelResult.rows[0];
      let userIds = [...new Set([auth.userId!, ...body.memberIds])];
      if (body.type === 'public' || body.type === 'team') {
        const visibleUsers = body.workspaceId
          ? await client.query(
            `SELECT user_id FROM workspace_member
             WHERE app_id = $1 AND workspace_id = $2`,
            [auth.appId, body.workspaceId]
          )
          : await client.query(
            `SELECT id AS user_id FROM app_user WHERE app_id = $1`,
            [auth.appId]
          );
        userIds = [...new Set([...userIds, ...visibleUsers.rows.map((row) => row.user_id)])];
      }
      await enqueueDomainRealtimeEvent(client, {
        appId: auth.appId,
        aggregateType: 'channel',
        aggregateId: channelId,
        eventType: 'channel.created',
        channels: userIds.map((userId) => userChannel(auth.appId, userId)),
        payload: { channel: formatChannel(channel) },
        idempotencyKey: `channel.created:${auth.appId}:${channelId}`,
      });

      return channel;
    });

    // Idempotency key conflict — return existing channel (200)
    if (result === null) {
      const existing = await db.query(
        'SELECT * FROM channel WHERE app_id = $1 AND idempotency_key = $2',
        [auth.appId, body.idempotencyKey]
      );
      return c.json(formatChannel(existing.rows[0]), 200);
    }

    triggerRealtimeOutboxDrainSafely();

    return c.json(formatChannel(result), 201);
  }
);

/**
 * Get total unread count across all channels
 * GET /api/channels/unread-count
 */
channelRoutes.get('/unread-count', requireUser, requireScope('chat:read'), rateLimitUser(RATE_LIMIT_POLICIES.channelRead), async (c) => {
  const auth = c.get('auth');

  const result = await db.query(
    `SELECT COALESCE(SUM(unread_count), 0) as total FROM channel_member
     WHERE app_id = $1 AND user_id = $2`,
    [auth.appId, auth.userId]
  );

  return c.json({
    count: parseInt(result.rows[0].total, 10),
  });
});

/**
 * Query channels
 * GET /api/channels
 *
 * Returns:
 * - All channels the user is a member of
 * - All public/team channels (visible to everyone in the app)
 */
channelRoutes.get('/', requireUser, requireScope('chat:read'), rateLimitUser(RATE_LIMIT_POLICIES.channelRead), async (c) => {
  const auth = c.get('auth');

  // Safe parsing with NaN fallback
  const rawLimit = parseInt(c.req.query('limit') || '50', 10);
  const limit = isNaN(rawLimit) ? 50 : Math.min(rawLimit, 100);

  const rawOffset = parseInt(c.req.query('offset') || '0', 10);
  const offset = isNaN(rawOffset) ? 0 : rawOffset;

  const type = c.req.query('type');
  const workspaceId = c.req.query('workspaceId');

  if (workspaceId && !(await isWorkspaceMember(auth.appId, auth.userId!, workspaceId))) {
    return c.json({ error: { message: 'Not a member of this workspace' } }, 403);
  }

  // Query combines:
  // 1. Channels where user is a member (with their membership data)
  // 2. Public/team channels user is NOT a member of (visible to discover)
  // Use subquery to deduplicate, then sort and paginate
  const params: any[] = [auth.appId, auth.userId];

  let innerWhere = `c.app_id = $1
      AND (
        cm.user_id IS NOT NULL  -- User is a member
        OR (
          c.type IN ('public', 'team')
          AND (c.workspace_id IS NULL OR wm.user_id IS NOT NULL)
        )
      )`;

  if (type) {
    innerWhere += ` AND c.type = $${params.length + 1}`;
    params.push(type);
  }

  if (workspaceId) {
    innerWhere += ` AND c.workspace_id = $${params.length + 1}`;
    params.push(workspaceId);
  }

  let query = `
    SELECT * FROM (
      SELECT DISTINCT ON (c.id) c.*, cm.last_read_seq, cm.unread_count, cm.muted, cm.starred, cm.role
      FROM channel c
      LEFT JOIN channel_member cm ON c.id = cm.channel_id AND cm.app_id = c.app_id AND cm.user_id = $2
      LEFT JOIN workspace_member wm ON wm.workspace_id = c.workspace_id AND wm.app_id = c.app_id AND wm.user_id = $2
      WHERE ${innerWhere}
      ORDER BY c.id
    ) sub
    ORDER BY last_message_at DESC NULLS LAST, created_at DESC
  `;

  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  // For messaging/DM and group channels, fetch members to include in response
  const channels = result.rows.map(formatChannel);
  const messagingChannelIds = result.rows
    .filter((row) => row.type === 'messaging' || row.type === 'group')
    .map((row) => row.id);

  if (messagingChannelIds.length > 0) {
    // Batch fetch members for all messaging and group channels
    const membersResult = await db.query(
      `SELECT cm.channel_id, cm.user_id, cm.role, u.name, u.image_url, u.custom_data
       FROM channel_member cm
       LEFT JOIN app_user u ON cm.user_id = u.id AND cm.app_id = u.app_id
       WHERE cm.app_id = $1 AND cm.channel_id = ANY($2)
       ORDER BY cm.joined_at ASC`,
      [auth.appId, messagingChannelIds]
    );

    // Group members by channel_id
    const membersByChannel: Record<string, any[]> = {};
    for (const member of membersResult.rows) {
      if (!membersByChannel[member.channel_id]) {
        membersByChannel[member.channel_id] = [];
      }
      membersByChannel[member.channel_id].push({
        id: member.user_id,
        name: member.name,
        image: member.image_url,
        email: typeof member.custom_data?.email === 'string' ? member.custom_data.email : null,
        custom: member.custom_data ?? {},
        role: member.role,
      });
    }

    // Attach members to messaging and group channels
    for (const channel of channels) {
      if ((channel.type === 'messaging' || channel.type === 'group') && membersByChannel[channel.id]) {
        (channel as any).members = membersByChannel[channel.id];
      }
    }
  }

  return c.json({
    channels,
  });
});

/**
 * Export channel chat data.
 * POST /api/channels/:channelId/export
 */
channelRoutes.post(
  '/:channelId/export',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.exportCreate, (c) => ({ channelId: c.req.param('channelId') })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');

    if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
      return c.json({ error: { message: 'Not a member of this channel' } }, 403);
    }

    const result = await createDataExport({
      appId: auth.appId,
      requestedBy: auth.userId!,
      scopeType: 'channel',
      scopeId: channelId,
    });

    return c.json(result, 201);
  }
);

/**
 * Get channel by ID
 * GET /api/channels/:channelId
 */
channelRoutes.get(
  '/:channelId',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.channelRead, (c) => ({ channelId: c.req.param('channelId') })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  const access = await getChannelAccess(auth.appId, auth.userId!, channelId);
  if (!access.exists) {
    return c.json({ error: { message: 'Channel not found' } }, 404);
  }
  if (!access.isMember && !access.isPublic) {
    return c.json({ error: { message: 'Not a member of this channel' } }, 403);
  }

  const result = await db.query(
    `SELECT c.*, cm.last_read_seq, cm.unread_count, cm.muted, cm.starred, cm.role
     FROM channel c
     LEFT JOIN channel_member cm ON c.id = cm.channel_id AND cm.app_id = c.app_id AND cm.user_id = $3
     WHERE c.app_id = $1 AND c.id = $2`,
    [auth.appId, channelId, auth.userId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'Channel not found' } }, 404);
  }

  const channel = result.rows[0];

  // Get members
  const membersResult = await db.query(
    `SELECT cm.user_id, cm.role, cm.joined_at, u.name, u.image_url, u.custom_data
     FROM channel_member cm
     JOIN app_user u ON cm.app_id = u.app_id AND cm.user_id = u.id
     WHERE cm.channel_id = $1 AND cm.app_id = $2
     LIMIT 100`,
    [channelId, auth.appId]
  );

    return c.json({
      ...formatChannel(channel),
      members: membersResult.rows.map((m) => ({
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
        user: {
          id: m.user_id,
          name: m.name,
          image: m.image_url,
          email: typeof m.custom_data?.email === 'string' ? m.custom_data.email : null,
          custom: m.custom_data ?? {},
        },
      })),
    });
  }
);

const updateChannelSchema = z.object({
  name: z.string().optional(),
  image: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
});

/**
 * Update channel
 * PATCH /api/channels/:channelId
 */
channelRoutes.patch(
  '/:channelId',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation, (c) => ({ channelId: c.req.param('channelId') })),
  zValidator('json', updateChannelSchema),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const body = c.req.valid('json');

    // Check if user is admin/owner
    const memberResult = await db.query(
      `SELECT role FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }

    const role = memberResult.rows[0].role;
    if (!['owner', 'admin'].includes(role)) {
      return c.json({ error: { message: 'Permission denied' } }, 403);
    }

    const updatedChannel = await db.transaction(async (client) => {
      const result = await client.query(
        `UPDATE channel
         SET name = COALESCE($3, name),
             image_url = COALESCE($4, image_url),
             config = COALESCE($5, config),
             updated_at = NOW()
         WHERE app_id = $1 AND id = $2
         RETURNING *`,
        [auth.appId, channelId, body.name, body.image, body.config]
      );

      const channel = formatChannel(result.rows[0]);
      await enqueueDomainRealtimeEvent(client, {
        appId: auth.appId,
        aggregateType: 'channel',
        aggregateId: channelId,
        eventType: 'channel.updated',
        channels: [chatChannel(auth.appId, channelId)],
        payload: { channel },
      });

      return channel;
    });

    triggerRealtimeOutboxDrainSafely();

    return c.json(updatedChannel);
  }
);

/**
 * Delete channel
 * DELETE /api/channels/:channelId
 */
channelRoutes.delete(
  '/:channelId',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation, (c) => ({ channelId: c.req.param('channelId') })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  // Check if user is owner
  const memberResult = await db.query(
    `SELECT role FROM channel_member
     WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
    [channelId, auth.appId, auth.userId]
  );

  if (memberResult.rows.length === 0) {
    return c.json({ error: { message: 'Channel not found' } }, 404);
  }

  if (memberResult.rows[0].role !== 'owner') {
    return c.json({ error: { message: 'Only owner can delete channel' } }, 403);
  }

  await db.transaction(async (client) => {
    const memberResult = await client.query(
      `SELECT user_id FROM channel_member
       WHERE channel_id = $1 AND app_id = $2`,
      [channelId, auth.appId]
    );

    await client.query(
      'DELETE FROM channel WHERE app_id = $1 AND id = $2',
      [auth.appId, channelId]
    );

    await enqueueDomainRealtimeEvent(client, {
      appId: auth.appId,
      aggregateType: 'channel',
      aggregateId: channelId,
      eventType: 'channel.deleted',
      channels: memberResult.rows.map((row) => userChannel(auth.appId, row.user_id)),
      payload: { channelId },
      idempotencyKey: `channel.deleted:${auth.appId}:${channelId}`,
    });
  });

  triggerRealtimeOutboxDrainSafely();

    return c.json({ success: true });
  }
);

/**
 * Get channel members
 * GET /api/channels/:channelId/members
 */
channelRoutes.get(
  '/:channelId/members',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.channelRead, (c) => ({ channelId: c.req.param('channelId') })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member
     WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
    [channelId, auth.appId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a member of this channel' } }, 403);
  }

  // Get all members
  const membersResult = await db.query(
    `SELECT cm.user_id, cm.role, cm.joined_at, u.name, u.image_url, u.custom_data
     FROM channel_member cm
     LEFT JOIN app_user u ON cm.user_id = u.id AND cm.app_id = u.app_id
     WHERE cm.channel_id = $1 AND cm.app_id = $2
     ORDER BY cm.joined_at ASC`,
    [channelId, auth.appId]
  );

    return c.json({
      members: membersResult.rows.map((m) => ({
        id: m.user_id,
        name: m.name,
        image: m.image_url,
        email: typeof m.custom_data?.email === 'string' ? m.custom_data.email : null,
        custom: m.custom_data ?? {},
        role: m.role,
        joinedAt: m.joined_at,
      })),
    });
  }
);

/**
 * Add member(s) to channel
 * POST /api/channels/:channelId/members
 * Accepts either { userId: string } or { userIds: string[] }
 */
channelRoutes.post(
  '/:channelId/members',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation, (c) => ({ channelId: c.req.param('channelId') })),
  zValidator(
    'json',
    z.object({
      userId: z.string().optional(),
      userIds: z.array(z.string()).optional(),
    }).refine((data) => data.userId || data.userIds, {
      message: 'Either userId or userIds must be provided',
    })
  ),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const body = c.req.valid('json');

    // Support both single userId and array of userIds
    const userIdsToAdd = body.userIds || (body.userId ? [body.userId] : []);

    if (userIdsToAdd.length === 0) {
      return c.json({ error: { message: 'No users to add' } }, 400);
    }

    // Check permission
    const memberResult = await db.query(
      `SELECT role FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }

    const role = memberResult.rows[0].role;
    if (!['owner', 'admin', 'moderator'].includes(role)) {
      return c.json({ error: { message: 'Permission denied' } }, 403);
    }

    const channelResult = await db.query(
      `SELECT type, workspace_id FROM channel WHERE id = $1 AND app_id = $2`,
      [channelId, auth.appId]
    );
    if (channelResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }

    if (channelResult.rows[0].type === 'messaging') {
      return c.json({ error: { message: 'Direct message membership is fixed' } }, 403);
    }

    const workspaceId = channelResult.rows[0].workspace_id;
    if (workspaceId) {
      const targetWorkspaceMembers = await db.query(
        `SELECT user_id FROM workspace_member
         WHERE app_id = $1 AND workspace_id = $2 AND user_id = ANY($3)`,
        [auth.appId, workspaceId, userIdsToAdd]
      );
      const workspaceMemberIds = new Set(targetWorkspaceMembers.rows.map((row) => row.user_id));
      const nonWorkspaceMemberIds = userIdsToAdd.filter((userId) => !workspaceMemberIds.has(userId));

      if (nonWorkspaceMemberIds.length > 0) {
        return c.json({
          error: {
            message: 'All channel members must belong to the workspace',
            code: 'FORBIDDEN',
          },
        }, 403);
      }
    }

    const added = await db.transaction(async (client) => {
      const addedUserIds: string[] = [];

      for (const userId of userIdsToAdd) {
        const insertResult = await client.query(
          `INSERT INTO channel_member (channel_id, app_id, user_id, role)
           VALUES ($1, $2, $3, 'member')
           ON CONFLICT DO NOTHING
           RETURNING user_id`,
          [channelId, auth.appId, userId]
        );

        if (insertResult.rows.length === 0) {
          continue;
        }

        addedUserIds.push(userId);
        await enqueueDomainRealtimeEvent(client, {
          appId: auth.appId,
          aggregateType: 'channel_member',
          aggregateId: channelId,
          eventType: 'channel.member_joined',
          channels: [
            chatChannel(auth.appId, channelId),
            userChannel(auth.appId, userId),
          ],
          payload: { channelId, userId },
        });
      }

      await client.query(
        `UPDATE channel SET member_count = (
          SELECT COUNT(*) FROM channel_member WHERE channel_id = $1 AND app_id = $2
        ) WHERE id = $1 AND app_id = $2`,
        [channelId, auth.appId]
      );

      return addedUserIds;
    });

    triggerRealtimeOutboxDrainSafely();

    return c.json({ success: true, addedCount: added.length });
  }
);

/** Role hierarchy levels: higher number = higher privilege */
const ROLE_LEVEL: Record<string, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };

const updateChannelMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'moderator', 'member']),
});

/**
 * Update channel member role
 * PATCH /api/channels/:channelId/members/:userId
 *
 * Note: Channel role updates always require per-user permission checks.
 * Unlike workspace routes, API-key auth does NOT bypass role checks here.
 */
channelRoutes.patch(
  '/:channelId/members/:userId',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation, (c) => ({ channelId: c.req.param('channelId') })),
  zValidator('json', updateChannelMemberRoleSchema),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const targetUserId = c.req.param('userId');
    const body = c.req.valid('json');

    // Check permission: caller must be owner, admin, or moderator
    const memberResult = await db.query(
      `SELECT role FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }

    const callerRole = memberResult.rows[0].role;
    if (!['owner', 'admin', 'moderator'].includes(callerRole)) {
      return c.json({ error: { message: 'Permission denied' } }, 403);
    }

    const channelResult = await db.query(
      `SELECT type FROM channel WHERE id = $1 AND app_id = $2`,
      [channelId, auth.appId]
    );
    if (channelResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }
    if (channelResult.rows[0].type === 'messaging') {
      return c.json({ error: { message: 'Direct message roles are fixed' } }, 403);
    }

    // Role hierarchy enforcement: callers can only assign roles at or below their own level
    if ((ROLE_LEVEL[body.role] ?? 0) > (ROLE_LEVEL[callerRole] ?? 0)) {
      return c.json({ error: { message: 'Cannot assign a role higher than your own' } }, 403);
    }

    // Verify target member exists
    const targetResult = await db.query(
      `SELECT role FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, targetUserId]
    );

    if (targetResult.rows.length === 0) {
      return c.json({ error: { message: 'Member not found' } }, 404);
    }

    const targetRole = targetResult.rows[0].role;
    if ((ROLE_LEVEL[targetRole] ?? 0) >= (ROLE_LEVEL[callerRole] ?? 0) && targetUserId !== auth.userId) {
      return c.json({ error: { message: 'Cannot modify a member with equal or higher role' } }, 403);
    }

    // Update role
    await db.query(
      `UPDATE channel_member SET role = $4
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, targetUserId, body.role]
    );

    return c.json({ success: true, role: body.role });
  }
);

/**
 * Remove member from channel
 * DELETE /api/channels/:channelId/members/:userId
 */
channelRoutes.delete(
  '/:channelId/members/:userId',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation, (c) => ({ channelId: c.req.param('channelId') })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const userId = c.req.param('userId');

  const targetResult = await db.query(
    `SELECT role FROM channel_member
     WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
    [channelId, auth.appId, userId]
  );

  if (targetResult.rows.length === 0) {
    return c.json({ error: { message: 'Member not found' } }, 404);
  }

  // Check permission (can remove self, or admin can remove others)
  if (userId !== auth.userId) {
    const memberResult = await db.query(
      `SELECT role FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }

    const role = memberResult.rows[0].role;
    if (!['owner', 'admin', 'moderator'].includes(role)) {
      return c.json({ error: { message: 'Permission denied' } }, 403);
    }

    const targetRole = targetResult.rows[0].role;
    if ((ROLE_LEVEL[targetRole] ?? 0) >= (ROLE_LEVEL[role] ?? 0)) {
      return c.json({ error: { message: 'Cannot remove a member with equal or higher role' } }, 403);
    }
  }

  const deleteResult = await db.transaction(async (client) => {
    const result = await client.query(
      `DELETE FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, userId]
    );

    if (result.rowCount === 0) {
      return result;
    }

    await client.query(
      `UPDATE channel SET member_count = (
        SELECT COUNT(*) FROM channel_member WHERE channel_id = $1 AND app_id = $2
      ) WHERE id = $1 AND app_id = $2`,
      [channelId, auth.appId]
    );

    await enqueueDomainRealtimeEvent(client, {
      appId: auth.appId,
      aggregateType: 'channel_member',
      aggregateId: channelId,
      eventType: 'channel.member_left',
      channels: [
        chatChannel(auth.appId, channelId),
        userChannel(auth.appId, userId),
      ],
      payload: { channelId, userId },
    });

    return result;
  });

	  if (deleteResult.rowCount === 0) {
	    return c.json({ error: { message: 'Member not found' } }, 404);
	  }

	  unsubscribeRemovedChannelMember(auth.appId, channelId, userId);

	  triggerRealtimeOutboxDrainSafely();

	    return c.json({ success: true });
	  }
	);

function unsubscribeRemovedChannelMember(appId: string, channelId: string, userId: string): void {
  centrifugo
    .unsubscribe(chatChannel(appId, channelId), realtimeUserSubject(appId, userId))
    .catch((error) => {
      console.warn('[Channels] Failed to unsubscribe removed channel member:', error);
    });
}

/**
 * Send typing indicator
 * POST /api/channels/:channelId/typing
 */
channelRoutes.post(
  '/:channelId/typing',
  requireUser,
  requireScope('typing:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.typing, (c) => ({ channelId: c.req.param('channelId') })),
  zValidator('json', z.object({ typing: z.boolean() })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const { typing } = c.req.valid('json');

    if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
      return c.json({ error: { message: 'Not a member of this channel' } }, 403);
    }

    // Import here to avoid circular dependency
    const { centrifugo } = await import('../services/centrifugo');

    try {
      await centrifugo.publishTyping(auth.appId, channelId, auth.user!, typing);
    } catch (error) {
      console.warn('Failed to publish ephemeral typing event:', error);
    }

    return c.json({ success: true });
  }
);

/**
 * Mark channel as read
 * POST /api/channels/:channelId/read
 */
channelRoutes.post(
  '/:channelId/read',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation, (c) => ({ channelId: c.req.param('channelId') })),
  zValidator('json', z.object({ messageId: z.string().optional() }).optional()),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');

    if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
      return c.json({ error: { message: 'Not a member of this channel' } }, 403);
    }

    // Get current max seq
    const seqResult = await db.query(
      'SELECT current_seq FROM channel_seq WHERE channel_id = $1 AND app_id = $2',
      [channelId, auth.appId]
    );

    if (seqResult.rows.length === 0) {
      return c.json({ error: { message: 'Channel not found' } }, 404);
    }

    const maxSeq = seqResult.rows[0].current_seq;

    const totalUnread = await db.transaction(async (client) => {
      await client.query(
        `UPDATE channel_member
         SET last_read_seq = $4, unread_count = 0
         WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
        [channelId, auth.appId, auth.userId, maxSeq]
      );

      const totalResult = await client.query(
        `SELECT COALESCE(SUM(unread_count), 0) as total FROM channel_member
         WHERE app_id = $1 AND user_id = $2`,
        [auth.appId, auth.userId]
      );
      const totalUnread = parseInt(totalResult.rows[0].total, 10);

      await enqueueDomainRealtimeEvent(client, {
        appId: auth.appId,
        aggregateType: 'read_state',
        aggregateId: channelId,
        eventType: 'read.updated',
        channels: [chatChannel(auth.appId, channelId)],
        payload: { channelId, userId: auth.userId, lastReadSeq: maxSeq },
      });
      await enqueueDomainRealtimeEvent(client, {
        appId: auth.appId,
        aggregateType: 'channel_member',
        aggregateId: channelId,
        eventType: 'channel.unread_changed',
        channels: [userChannel(auth.appId, auth.userId!)],
        payload: { channelId, count: 0 },
      });
      await enqueueDomainRealtimeEvent(client, {
        appId: auth.appId,
        aggregateType: 'user_unread',
        aggregateId: auth.userId!,
        eventType: 'channel.total_unread_changed',
        channels: [userChannel(auth.appId, auth.userId!)],
        payload: { count: totalUnread },
      });

      return totalUnread;
    });

    triggerRealtimeOutboxDrainSafely();

    return c.json({ success: true, lastReadSeq: maxSeq });
  }
);

/**
 * Star/unstar channel
 * PATCH /api/channels/:channelId/star
 */
channelRoutes.patch(
  '/:channelId/star',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation, (c) => ({ channelId: c.req.param('channelId') })),
  zValidator('json', z.object({ starred: z.boolean() })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const { starred } = c.req.valid('json');

    // Check if user is a member of the channel
    const memberCheck = await db.query(
      `SELECT 1 FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberCheck.rows.length === 0) {
      return c.json({ error: { message: 'Not a member of this channel' } }, 403);
    }

    // Update starred status
    await db.query(
      `UPDATE channel_member
       SET starred = $4
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId, starred]
    );

    return c.json({ success: true, starred });
  }
);

/**
 * Mute/unmute channel
 * PATCH /api/channels/:channelId/mute
 */
channelRoutes.patch(
  '/:channelId/mute',
  requireUser,
  requireScope('chat:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.channelMutation, (c) => ({ channelId: c.req.param('channelId') })),
  zValidator('json', z.object({ muted: z.boolean() })),
  async (c) => {
    const auth = c.get('auth');
    const channelId = c.req.param('channelId');
    const { muted } = c.req.valid('json');

    // Check if user is a member of the channel
    const memberCheck = await db.query(
      `SELECT 1 FROM channel_member
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId]
    );

    if (memberCheck.rows.length === 0) {
      return c.json({ error: { message: 'Not a member of this channel' } }, 403);
    }

    // Update muted status
    await db.query(
      `UPDATE channel_member
       SET muted = $4
       WHERE channel_id = $1 AND app_id = $2 AND user_id = $3`,
      [channelId, auth.appId, auth.userId, muted]
    );

    return c.json({ success: true, muted });
  }
);

function formatChannel(row: any) {
  return {
    id: row.id,
    cid: row.cid,
    type: row.type,
    name: row.name,
    image: row.image_url,
    memberCount: row.member_count,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    config: row.config,
    workspaceId: row.workspace_id,
    // User-specific fields
    lastReadSeq: row.last_read_seq,
    unreadCount: row.unread_count,
    muted: row.muted,
    starred: row.starred,
    role: row.role,
    idempotencyKey: row.idempotency_key ?? undefined,
  };
}

function directMessageCid(memberIds: [string, string] | string[]): string {
  const members = [...memberIds].sort();
  const digest = createHash('sha256')
    .update(JSON.stringify(members))
    .digest('hex');
  return `messaging:dm:${digest}`;
}
