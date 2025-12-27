/**
 * Link Preview Inngest Function
 * Generates link previews for messages in the background
 */

import { inngest } from '../client';
import { db } from '../../services/database';
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
    await step.run('update-message', async () => {
      await db.query(
        `UPDATE message SET link_previews = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(previews), messageId]
      );
    });

    return {
      success: true,
      messageId,
      previewCount: previews.length,
      previews: previews.map((p) => ({ url: p.url, title: p.title })),
    };
  }
);
