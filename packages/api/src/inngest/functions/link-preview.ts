/**
 * Link Preview Inngest Function
 * Generates link previews for messages in the background
 */

import { createHash } from 'crypto';
import { inngest } from '../client';
import { db } from '../../services/database';
import { generateLinkPreviews } from '../../services/link-preview';
import {
  chatChannel,
  enqueueDomainRealtimeEvent,
} from '../../services/realtime-events';

export const generateLinkPreview = inngest.createFunction(
  {
    id: 'generate-link-preview',
    name: 'Generate Link Preview',
  },
  { event: 'chat/message.created' },
  async ({ event, step }) => {
    const { messageId, appId, text } = event.data;

    // Skip if no text content
    if (!text || text.trim().length === 0) {
      return { skipped: true, reason: 'No text content' };
    }

    // Generate previews in a separate step for retry-ability
    const previews = await step.run('generate-previews', async () => {
      return await generateLinkPreviews(text);
    });

    // Skip if no previews generated
    if (previews.length === 0) {
      return { skipped: true, reason: 'No URLs found or all preview generation failed' };
    }

    // Update message and enqueue realtime update in one DB transaction.
    const updatedMessage = await step.run('update-message', async () => {
      const previewHash = createHash('sha256')
        .update(JSON.stringify(previews))
        .digest('hex')
        .slice(0, 32);

      return db.transaction(async (client) => {
        const result = await client.query(
          `UPDATE message
           SET link_previews = $1, edited_at = NOW()
           WHERE id = $2 AND app_id = $3
           RETURNING id, channel_id, app_id, link_previews`,
          [JSON.stringify(previews), messageId, appId]
        );
        const message = result.rows[0];
        if (!message) {
          return null;
        }

        await enqueueDomainRealtimeEvent(client, {
          appId: message.app_id,
          aggregateType: 'message',
          aggregateId: messageId,
          eventType: 'message.updated',
          channels: [chatChannel(message.app_id, message.channel_id)],
          payload: {
            channelId: message.channel_id,
            message: {
              id: messageId,
              channelId: message.channel_id,
              linkPreviews: previews,
            },
          },
          idempotencyKey: `message.updated:${message.app_id}:${messageId}:link_preview:${previewHash}`,
        });

        return message;
      });
    });

    return {
      success: Boolean(updatedMessage),
      messageId,
      previewCount: previews.length,
      previews: previews.map((p) => ({ url: p.url, title: p.title })),
    };
  }
);
