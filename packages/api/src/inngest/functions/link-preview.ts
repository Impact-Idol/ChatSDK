/**
 * Link Preview Inngest Function
 * Generates link previews for messages in the background
 */

import { inngest } from '../client';
import { db } from '../../services/database';
import { centrifugo } from '../../services/centrifugo';
import { generateLinkPreviews } from '../../services/link-preview';

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

    // Update message with link previews in another step
    const updatedMessage = await step.run('update-message', async () => {
      const result = await db.query(
        `UPDATE message SET link_previews = $1, edited_at = NOW() WHERE id = $2
         RETURNING id, channel_id, app_id, link_previews`,
        [JSON.stringify(previews), messageId]
      );
      return result.rows[0];
    });

    // Publish link preview update to Centrifugo for real-time updates
    if (updatedMessage) {
      await step.run('publish-update', async () => {
        await centrifugo.publishMessageUpdate(
          updatedMessage.app_id,
          updatedMessage.channel_id,
          {
            id: messageId,
            channelId: updatedMessage.channel_id,
            linkPreviews: previews,
          }
        );
      });
    }

    return {
      success: true,
      messageId,
      previewCount: previews.length,
      previews: previews.map((p) => ({ url: p.url, title: p.title })),
    };
  }
);
