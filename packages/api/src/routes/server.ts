import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { createHash } from 'crypto';
import { db } from '../services/database';
import {
  assertBrokerScopeAllowsMembership,
  authenticateBrokerRequest,
  type BrokerAuthContext,
  BrokerAuthError,
  toBrokerHttpException,
  writeBrokerAudit,
} from '../services/broker-auth';
import {
  applyRateLimit,
  getClientIp,
  RATE_LIMIT_POLICIES,
} from '../services/rate-limit';
import { realtimeUserSubject } from '../services/tokens';
import { issueBrokerTokenBundle } from '../services/tokens';
import { chatChannel, triggerRealtimeOutboxDrainSafely } from '../services/realtime-events';

export const serverRoutes = new Hono();

const MAX_MEMBERSHIP_BODY_BYTES = 128 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const membershipSchema = z.object({
  version: z.string().min(1).max(255),
  revision: z.number().int().safe().nonnegative(),
  freshUntil: z.string().datetime(),
  stateHash: z.string().min(8).max(255),
  externalTenantId: z.string().min(1).max(255),
  displayName: z.string().max(255).optional(),
  avatarUrl: z.string().url().max(2048).optional(),
  memberships: z.array(z.object({
    type: z.literal('channel'),
    id: z.string().min(1).max(255),
    role: z.enum(['owner', 'admin', 'moderator', 'member']).default('member'),
  })).max(5000),
  status: z.enum(['active', 'disabled', 'suspended', 'removed']),
  metadata: z.record(z.unknown()).optional().refine(
    (metadata) => !metadata || JSON.stringify(metadata).length <= 4096,
    'metadata must be at most 4096 bytes'
  ),
});

const mintSchema = z.object({
  userId: z.string().min(1).max(255),
  externalTenantId: z.string().min(1).max(255),
  externalUserId: z.string().min(1).max(255).optional(),
  externalSessionId: z.string().min(1).max(255).optional(),
  deviceId: z.string().min(1).max(255).optional(),
  requestedScopes: z.array(z.string().min(1).max(64)).max(50).optional(),
  ttlSeconds: z.number().int().positive().max(3600).optional(),
});

serverRoutes.post(
  '/apps/:appId/tokens/mint',
  async (c, next) => {
    const preAuthLimit = await applyRateLimit(c, RATE_LIMIT_POLICIES.brokerPreAuth, {
      appId: 'broker',
      ip: getClientIp(c),
    });
    if (preAuthLimit) return preAuthLimit;

    const appId = c.req.param('appId');
    if (!UUID_RE.test(appId)) {
      return c.json({ error: { message: 'Invalid appId' } }, 400);
    }

    await next();
  },
  bodyLimit({
    maxSize: 32 * 1024,
    onError: (c) => c.json({ error: { message: 'Token mint payload is too large' } }, 413),
  }),
  async (c, next) => {
    try {
      const broker = await authenticateBrokerRequest(c, c.req.param('appId'));
      c.set('brokerAuth' as never, broker as never);

      const brokerLimit = await applyRateLimit(c, RATE_LIMIT_POLICIES.brokerTokenMint, {
        appId: c.req.param('appId'),
        ip: getClientIp(c),
        key: broker.credentialId,
      });
      if (brokerLimit) return brokerLimit;

      await next();
    } catch (error) {
      if (error instanceof BrokerAuthError) {
        throw toBrokerHttpException(error);
      }
      throw error;
    }
  },
  zValidator('json', mintSchema, async (result, c) => {
    if (result.success) {
      return;
    }
    const broker = c.get('brokerAuth' as never) as BrokerAuthContext | undefined;
    if (broker) {
      await writeBrokerAudit(c, {
        clientId: broker.clientId,
        credentialId: broker.credentialId,
        clientSlug: broker.clientSlug,
        credentialKid: broker.credentialKid,
        appId: c.req.param('appId'),
        tokenJti: broker.tokenJti,
        status: 'denied',
        denialReason: 'invalid_token_mint_payload',
      });
    }
    return c.json({ error: { message: 'Invalid token mint payload' } }, 400);
  }),
  async (c) => {
    const appId = c.req.param('appId');
    const body = c.req.valid('json');
    const broker = c.get('brokerAuth' as never) as BrokerAuthContext;

    try {
      const requestedScopes = body.requestedScopes ?? broker.defaultScopes;
      const disallowedScopes = requestedScopes.filter(
        (scope) => !broker.allowedScopes.includes(scope)
      );
      if (disallowedScopes.length > 0) {
        throw new BrokerAuthError('BROKER_SCOPE_DENIED', 'Requested token scopes are not allowed', 403);
      }
      assertBrokerScopeAllowsMembership(broker, {
        externalTenantId: body.externalTenantId,
        userId: body.userId,
        channelIds: [],
      });

      const membership = await db.withBrokerSystemContext(async () => {
        const result = await db.query<{
          version: string;
          revision: string;
          fresh_until: Date;
          status: string;
        }>(
          `SELECT version, revision, fresh_until, status
           FROM broker_membership_state
           WHERE app_id = $1
             AND user_id = $2
             AND external_tenant_id = $3`,
          [appId, body.userId, body.externalTenantId]
        );
        return result.rows[0] ?? null;
      });

      if (!membership || membership.status !== 'active' || new Date(membership.fresh_until) <= new Date()) {
        throw new BrokerAuthError('BROKER_MEMBERSHIP_STALE', 'Broker membership is missing or stale', 403);
      }

      const ttlSeconds = body.ttlSeconds ?? broker.maxTokenTtlSeconds;
      if (ttlSeconds > broker.maxTokenTtlSeconds) {
        throw new BrokerAuthError('BROKER_TTL_DENIED', 'Requested token TTL exceeds broker scope', 403);
      }
      const tokens = await issueBrokerTokenBundle({
        appId,
        userId: body.userId,
        expiresInSeconds: ttlSeconds,
        brokerClientId: broker.clientId,
        brokerCredentialId: broker.credentialId,
        externalTenantId: body.externalTenantId,
        externalUserId: body.externalUserId,
        externalSessionHash: hashExternalSessionId(body.externalSessionId),
        deviceId: body.deviceId,
        membershipVersion: membership.version,
        scopes: requestedScopes,
      });

      await writeBrokerAudit(c, {
        clientId: broker.clientId,
        credentialId: broker.credentialId,
        clientSlug: broker.clientSlug,
        credentialKid: broker.credentialKid,
        appId,
        userId: body.userId,
        externalTenantId: body.externalTenantId,
        requestedScopes,
        grantedScopes: requestedScopes,
        tokenJti: broker.tokenJti,
        sessionId: tokens.sessionId,
        status: 'success',
      });

      return c.json({
        token: tokens.token,
        expiresIn: tokens.expiresIn,
        sessionId: tokens.sessionId,
        user: {
          id: body.userId,
          externalTenantId: body.externalTenantId,
          membershipVersion: membership.version,
          membershipRevision: Number(membership.revision),
        },
        _internal: {
          wsToken: tokens.wsToken,
        },
      });
    } catch (error) {
      if (error instanceof BrokerAuthError) {
        if (!error.audited) {
          await writeBrokerAudit(c, {
            clientId: broker.clientId,
            credentialId: broker.credentialId,
            clientSlug: broker.clientSlug,
            credentialKid: broker.credentialKid,
            appId,
            userId: body.userId,
            externalTenantId: body.externalTenantId,
            requestedScopes: body.requestedScopes,
            tokenJti: broker.tokenJti,
            status: 'denied',
            denialReason: error.code,
          });
        }
        throw toBrokerHttpException(error);
      }

      await writeBrokerAudit(c, {
        clientId: broker.clientId,
        credentialId: broker.credentialId,
        clientSlug: broker.clientSlug,
        credentialKid: broker.credentialKid,
        appId,
        userId: body.userId,
        externalTenantId: body.externalTenantId,
        requestedScopes: body.requestedScopes,
        tokenJti: broker.tokenJti,
        status: 'error',
        denialReason: 'unexpected_token_mint_error',
      });
      throw error;
    }
  }
);

serverRoutes.put(
  '/apps/:appId/memberships/:userId',
  async (c, next) => {
    const preAuthLimit = await applyRateLimit(c, RATE_LIMIT_POLICIES.brokerPreAuth, {
      appId: 'broker',
      ip: getClientIp(c),
    });
    if (preAuthLimit) return preAuthLimit;

    const appId = c.req.param('appId');
    if (!UUID_RE.test(appId)) {
      return c.json({ error: { message: 'Invalid appId' } }, 400);
    }
    if (c.req.param('userId').length > 255) {
      return c.json({ error: { message: 'Invalid userId' } }, 400);
    }

    await next();
  },
  bodyLimit({
    maxSize: MAX_MEMBERSHIP_BODY_BYTES,
    onError: (c) => c.json({ error: { message: 'Membership payload is too large' } }, 413),
  }),
  async (c, next) => {
    try {
      const broker = await authenticateBrokerRequest(c, c.req.param('appId'));
      c.set('brokerAuth' as never, broker as never);

      const brokerLimit = await applyRateLimit(c, RATE_LIMIT_POLICIES.brokerMembershipSync, {
        appId: c.req.param('appId'),
        ip: getClientIp(c),
        key: broker.credentialId,
      });
      if (brokerLimit) return brokerLimit;

      await next();
    } catch (error) {
      if (error instanceof BrokerAuthError) {
        throw toBrokerHttpException(error);
      }
      throw error;
    }
  },
  zValidator('json', membershipSchema, async (result, c) => {
    if (result.success) {
      return;
    }
    const broker = c.get('brokerAuth' as never) as BrokerAuthContext | undefined;
    if (broker) {
      await writeBrokerAudit(c, {
        clientId: broker.clientId,
        credentialId: broker.credentialId,
        clientSlug: broker.clientSlug,
        credentialKid: broker.credentialKid,
        appId: c.req.param('appId'),
        userId: c.req.param('userId'),
        tokenJti: broker.tokenJti,
        status: 'denied',
        denialReason: 'invalid_membership_payload',
      });
    }
    return c.json({ error: { message: 'Invalid membership payload' } }, 400);
  }),
  async (c) => {
    const appId = c.req.param('appId');
    const userId = c.req.param('userId');
    const body = c.req.valid('json');
    const broker = c.get('brokerAuth' as never) as BrokerAuthContext;

    try {
      const channelIds = [...new Set(body.memberships.map((membership) => membership.id))];
      assertBrokerScopeAllowsMembership(broker, {
        externalTenantId: body.externalTenantId,
        userId,
        channelIds,
      });

      const result = await db.withBrokerSystemContext(async () => {
        const existing = await db.query<{
          revision: string;
          status: string;
          version: string;
          state_hash: string;
          external_tenant_id: string;
          fresh_until: Date;
        }>(
          `SELECT revision, status, version, state_hash, external_tenant_id, fresh_until
           FROM broker_membership_state
           WHERE app_id = $1 AND user_id = $2
           FOR UPDATE`,
          [appId, userId]
        );

	        const current = existing.rows[0];
	        const existingRevision = current?.revision ? Number(current.revision) : null;
	        if (current && current.external_tenant_id !== body.externalTenantId) {
	          throw new BrokerAuthError(
	            'BROKER_TENANT_REASSIGN_DENIED',
	            'Broker membership external tenant reassignment denied',
	            409
	          );
	        }
	        if (existingRevision !== null && body.revision < existingRevision) {
	          throw new BrokerAuthError('BROKER_MEMBERSHIP_ROLLBACK', 'Membership revision rollback denied', 409);
	        }
        if (existingRevision !== null && body.revision === existingRevision) {
          if (
            current.status === body.status
            && current.version === body.version
            && current.state_hash === body.stateHash
            && current.external_tenant_id === body.externalTenantId
            && new Date(current.fresh_until).getTime() === new Date(body.freshUntil).getTime()
          ) {
            await writeSuccessAudit(c, broker, appId, userId, body.externalTenantId);
            const storedFreshUntil = new Date(current.fresh_until).toISOString();
            return {
              appId,
              userId,
              membershipVersion: body.version,
              membershipRevision: body.revision,
              stateHash: body.stateHash,
              freshUntil: storedFreshUntil,
              appliedAt: new Date().toISOString(),
              statusChanged: false,
              idempotent: true,
            };
          }
          throw new BrokerAuthError('BROKER_MEMBERSHIP_CONFLICT', 'Membership revision conflicts with stored state', 409);
        }

        const customData = JSON.stringify({
          ...(body.metadata ?? {}),
          externalTenantId: body.externalTenantId,
          brokerMembershipVersion: body.version,
          brokerMembershipRevision: body.revision,
        });

        await db.query(
          `INSERT INTO app_user (app_id, id, name, image_url, custom_data, last_active_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
           ON CONFLICT (app_id, id) DO UPDATE SET
             name = COALESCE($3, app_user.name, $2),
             image_url = COALESCE($4, app_user.image_url),
             custom_data = app_user.custom_data || $5::jsonb,
             updated_at = NOW()`,
          [appId, userId, body.displayName ?? null, body.avatarUrl ?? null, customData]
        );

        const tombstonedAt = body.status === 'active' ? null : new Date();
        const membershipResult = await db.query(
          `INSERT INTO broker_membership_state
             (
               app_id,
               user_id,
               external_tenant_id,
               version,
               revision,
               state_hash,
               fresh_until,
               status,
               profile_hash,
               synced_by_credential_id,
               tombstoned_at,
               revoke_epoch,
               metadata,
               updated_at
             )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12::jsonb, NOW())
           ON CONFLICT (app_id, user_id) DO UPDATE SET
             external_tenant_id = EXCLUDED.external_tenant_id,
             version = EXCLUDED.version,
             revision = EXCLUDED.revision,
             state_hash = EXCLUDED.state_hash,
             fresh_until = EXCLUDED.fresh_until,
             status = EXCLUDED.status,
             profile_hash = EXCLUDED.profile_hash,
             synced_by_credential_id = EXCLUDED.synced_by_credential_id,
             tombstoned_at = EXCLUDED.tombstoned_at,
             revoke_epoch = EXCLUDED.revoke_epoch,
             metadata = EXCLUDED.metadata,
             updated_at = NOW()
           WHERE broker_membership_state.revision < EXCLUDED.revision
           RETURNING revision, status`,
          [
            appId,
            userId,
            body.externalTenantId,
            body.version,
            body.revision,
            body.stateHash,
            new Date(body.freshUntil),
            body.status,
            body.stateHash,
            broker.credentialId,
            tombstonedAt,
            JSON.stringify(body.metadata ?? {}),
          ]
        );
        if (membershipResult.rows.length === 0) {
          throw new BrokerAuthError('BROKER_MEMBERSHIP_CONFLICT', 'Membership revision was not applied', 409);
        }

        const statusChanged = !current || current.status !== body.status;
        const enqueuedRealtimeCommands = await applyChannelSnapshot(
          appId,
          userId,
          body.memberships,
          body.status,
          body.revision
        );

        if (body.status !== 'active' && statusChanged) {
          await db.query(
            `UPDATE app_user
             SET tokens_valid_after = NOW(), updated_at = NOW()
             WHERE app_id = $1 AND id = $2`,
            [appId, userId]
          );
          await db.query(
            `UPDATE auth_session
             SET revoked_at = NOW(), revoke_reason = $3
             WHERE app_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
            [appId, userId, `broker_membership_${body.status}`]
          );
          await enqueueDisconnect(appId, userId, body.revision);
        }

        await writeSuccessAudit(c, broker, appId, userId, body.externalTenantId);

        return {
          appId,
          userId,
          membershipVersion: body.version,
          membershipRevision: body.revision,
          stateHash: body.stateHash,
          freshUntil: body.freshUntil,
          appliedAt: new Date().toISOString(),
          statusChanged,
          enqueuedRealtimeCommands,
        };
      });

      if ((body.status !== 'active' && result.statusChanged) || result.enqueuedRealtimeCommands) {
        triggerRealtimeOutboxDrainSafely();
      }

      return c.json(result);
    } catch (error) {
      if (error instanceof BrokerAuthError) {
        if (!error.audited) {
          await writeBrokerAudit(c, {
            clientId: broker.clientId,
            credentialId: broker.credentialId,
            clientSlug: broker.clientSlug,
            credentialKid: broker.credentialKid,
            appId,
            userId,
            externalTenantId: body.externalTenantId,
            tokenJti: broker.tokenJti,
            status: 'denied',
            denialReason: error.code,
          });
        }
        throw toBrokerHttpException(error);
      }

      await writeBrokerAudit(c, {
        clientId: broker.clientId,
        credentialId: broker.credentialId,
        clientSlug: broker.clientSlug,
        credentialKid: broker.credentialKid,
        appId,
        userId,
        externalTenantId: body.externalTenantId,
        tokenJti: broker.tokenJti,
        status: 'error',
        denialReason: 'unexpected_membership_sync_error',
      });
      throw error;
    }
  }
);

async function applyChannelSnapshot(
  appId: string,
  userId: string,
  memberships: Array<{ id: string; role: 'owner' | 'admin' | 'moderator' | 'member' }>,
  status: 'active' | 'disabled' | 'suspended' | 'removed',
  revision: number
): Promise<boolean> {
  const desiredChannelCids = [...new Set(memberships.map((membership) => membership.id))];
  const existingMemberships = await db.query<{ channel_id: string; cid: string }>(
    `SELECT cm.channel_id, c.cid
     FROM channel_member cm
     JOIN channel c ON c.id = cm.channel_id AND c.app_id = cm.app_id
     WHERE cm.app_id = $1 AND cm.user_id = $2`,
    [appId, userId]
  );
  const existingChannelIdsByCid = new Map(
    existingMemberships.rows.map((row) => [row.cid, row.channel_id])
  );
  const existingChannelIds = existingMemberships.rows.map((row) => row.channel_id);
  const existingChannelCids = existingMemberships.rows.map((row) => row.cid);
  const desiredSet = new Set(desiredChannelCids);
  const removedChannelIds = status === 'active'
    ? existingChannelCids.filter((channelCid) => !desiredSet.has(channelCid))
    : existingChannelIds;
  const removedChannels = removedChannelIds.map((channelKey) => {
    if (status === 'active') {
      return {
        id: existingChannelIdsByCid.get(channelKey)!,
        cid: channelKey,
      };
    }
    const existing = existingMemberships.rows.find((row) => row.channel_id === channelKey);
    return {
      id: channelKey,
      cid: existing?.cid ?? channelKey,
    };
  });
  const desiredChannelsByCid = new Map<string, string>();

  if (status === 'active') {
    if (desiredChannelCids.length > 0) {
      const existingChannels = await db.query<{ id: string; cid: string }>(
        `SELECT id, cid FROM channel WHERE app_id = $1 AND cid = ANY($2)`,
        [appId, desiredChannelCids]
      );
      for (const row of [...existingChannels.rows].sort((a, b) => a.id.localeCompare(b.id))) {
        desiredChannelsByCid.set(row.cid, row.id);
      }
      const missing = desiredChannelCids.filter((channelCid) => !desiredChannelsByCid.has(channelCid));
      if (missing.length > 0) {
        throw new BrokerAuthError('BROKER_CHANNEL_NOT_FOUND', 'One or more membership channels do not exist', 400);
      }
    }

    const desiredMembershipsByCid = new Map<string, { channelId: string; role: string }>();
    for (const membership of memberships) {
      const channelId = desiredChannelsByCid.get(membership.id);
      if (!channelId) {
        throw new BrokerAuthError('BROKER_CHANNEL_NOT_FOUND', 'One or more membership channels do not exist', 400);
      }
      desiredMembershipsByCid.set(membership.id, {
        channelId,
        role: membership.role,
      });
    }

    if (desiredMembershipsByCid.size > 0) {
      const desiredMemberships = [...desiredMembershipsByCid.values()]
        .sort((a, b) => a.channelId.localeCompare(b.channelId));
      await db.query(
        `INSERT INTO channel_member (channel_id, app_id, user_id, role)
         SELECT channel_id, $2, $3, role
         FROM unnest($1::uuid[], $4::text[]) AS rows(channel_id, role)
         ON CONFLICT (channel_id, app_id, user_id) DO UPDATE SET
           role = EXCLUDED.role`,
        [
          desiredMemberships.map((membership) => membership.channelId),
          appId,
          userId,
          desiredMemberships.map((membership) => membership.role),
        ]
      );
    }

    if (desiredChannelCids.length > 0) {
      await db.query(
        `DELETE FROM channel_member
         WHERE app_id = $1
           AND user_id = $2
           AND NOT (channel_id = ANY($3))`,
        [appId, userId, Array.from(desiredChannelsByCid.values())]
      );
    } else {
      await db.query(
        `DELETE FROM channel_member WHERE app_id = $1 AND user_id = $2`,
        [appId, userId]
      );
    }
  } else {
    await db.query(
      `DELETE FROM channel_member WHERE app_id = $1 AND user_id = $2`,
      [appId, userId]
    );
  }

  const affectedChannelIds = new Set([
    ...existingChannelIds,
    ...desiredChannelsByCid.values(),
  ]);
  if (affectedChannelIds.size > 0) {
    await db.query(
      `WITH affected AS (
         SELECT unnest($2::uuid[]) AS channel_id
       )
       UPDATE channel c
       SET member_count = (
         SELECT COUNT(*)
         FROM channel_member cm
         WHERE cm.channel_id = c.id AND cm.app_id = c.app_id
       )
       WHERE c.app_id = $1
         AND c.id IN (SELECT channel_id FROM affected)`,
      [appId, [...affectedChannelIds].sort()]
    );
  }

  if (removedChannels.length > 0) {
    await enqueueUnsubscribes(
      appId,
      userId,
      [...removedChannels].sort((a, b) => a.id.localeCompare(b.id)),
      revision
    );
  }

  return removedChannels.length > 0;
}

async function enqueueDisconnect(appId: string, userId: string, revision: number): Promise<void> {
  await db.query(
    `INSERT INTO event_outbox (
       app_id,
       aggregate_type,
       aggregate_id,
       event_type,
       channels,
       payload,
       idempotency_key
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`,
    [
      appId,
      'auth_session',
      userId,
      'realtime.disconnect_user',
      [],
      JSON.stringify({ user: realtimeUserSubject(appId, userId) }),
      `broker.disconnect:${appId}:${userId}:${revision}`,
    ]
  );
}

async function enqueueUnsubscribes(
  appId: string,
  userId: string,
  channels: Array<{ id: string; cid: string }>,
  revision: number
): Promise<void> {
  await db.query(
    `INSERT INTO event_outbox (
       app_id,
       aggregate_type,
       aggregate_id,
       event_type,
       channels,
       payload,
       idempotency_key
     )
     SELECT
       $1,
       'channel_member',
       aggregate_id,
       'realtime.unsubscribe_user',
       ARRAY[]::text[],
       payload::jsonb,
       idempotency_key
     FROM unnest($2::text[], $3::jsonb[], $4::text[]) AS rows(aggregate_id, payload, idempotency_key)
     ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`,
    [
      appId,
      channels.map((channel) => `${channel.id}:${userId}`),
      channels.map((channel) => JSON.stringify({
        user: realtimeUserSubject(appId, userId),
        channel: chatChannel(appId, channel.id),
      })),
      channels.map((channel) => `broker.unsubscribe:${appId}:${userId}:${channel.cid}:${revision}`),
    ]
  );
}

async function writeSuccessAudit(
  c: Parameters<typeof writeBrokerAudit>[0],
  broker: BrokerAuthContext,
  appId: string,
  userId: string,
  externalTenantId: string
): Promise<void> {
  await writeBrokerAudit(c, {
    clientId: broker.clientId,
    credentialId: broker.credentialId,
    clientSlug: broker.clientSlug,
    credentialKid: broker.credentialKid,
    appId,
    userId,
    externalTenantId,
    tokenJti: broker.tokenJti,
    status: 'success',
  });
}

function hashExternalSessionId(externalSessionId?: string): string | undefined {
  if (!externalSessionId) {
    return undefined;
  }
  return createHash('sha256').update(externalSessionId).digest('hex');
}
