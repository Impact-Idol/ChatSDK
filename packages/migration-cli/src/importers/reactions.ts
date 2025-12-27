/**
 * Reaction Importer
 */

import { v4 as uuidv4 } from 'uuid';
import { Database } from '../utils/database.js';
import { IdMappingCache } from '../utils/id-mapping.js';
import { ProgressTracker } from '../utils/progress.js';
import type { MessageResponse } from 'stream-chat';

export class ReactionImporter {
  constructor(
    private db: Database,
    private appId: string,
    private idMapping: IdMappingCache,
    private progress: ProgressTracker
  ) {}

  /**
   * Import reactions from messages
   */
  async import(
    streamCid: string,
    messages: MessageResponse[],
    dryRun: boolean = false
  ): Promise<number> {
    const channelId = this.idMapping.getChannel(streamCid);
    if (!channelId) {
      console.warn(`Channel not found for CID: ${streamCid}`);
      return 0;
    }

    const reactionRows: any[][] = [];

    for (const message of messages) {
      if (!message.latest_reactions || message.latest_reactions.length === 0) {
        continue;
      }

      const messageId = this.idMapping.getMessage(message.id);
      if (!messageId) {
        console.warn(`Message not found for Stream ID: ${message.id}`);
        continue;
      }

      // Import all reactions for this message
      for (const reaction of message.latest_reactions) {
        const reactionId = uuidv4();

        // Map user ID
        const userId =
          this.idMapping.getUser(reaction.user?.id || '') || reaction.user?.id;

        reactionRows.push([
          reactionId,
          messageId,
          channelId,
          this.appId,
          userId,
          reaction.type || '👍', // Default to thumbs up if type is missing
          reaction.created_at ? new Date(reaction.created_at) : new Date(),
        ]);
      }

      // Also check for reaction_groups (aggregated reactions)
      if (message.reaction_groups) {
        for (const [emoji, group] of Object.entries(message.reaction_groups)) {
          // Type assertion for group structure
          const reactionGroup = group as { count: number };

          // Skip if we already imported these reactions via latest_reactions
          if (reactionGroup.count === 0) continue;

          // If we don't have detailed reactions, create placeholders
          if (!message.latest_reactions?.find((r: any) => r.type === emoji)) {
            // Create anonymous reactions for the count
            const existingCount = reactionRows.filter(
              (row) => row[1] === messageId && row[5] === emoji
            ).length;

            for (let i = existingCount; i < reactionGroup.count; i++) {
              const reactionId = uuidv4();
              reactionRows.push([
                reactionId,
                messageId,
                channelId,
                this.appId,
                message.user?.id || 'unknown', // Fallback to message author
                emoji,
                new Date(),
              ]);
            }
          }
        }
      }
    }

    if (!dryRun && reactionRows.length > 0) {
      // Insert reactions
      await this.db.batchInsert(
        'reaction',
        [
          'id',
          'message_id',
          'channel_id',
          'app_id',
          'user_id',
          'emoji',
          'created_at',
        ],
        reactionRows,
        'ON CONFLICT DO NOTHING'
      );

      // Update reaction counts on messages
      const messageIds = [...new Set(reactionRows.map((row) => row[1]))];

      for (const msgId of messageIds) {
        await this.db.query(
          `UPDATE message
           SET reaction_count = (SELECT COUNT(*) FROM reaction WHERE message_id = $1)
           WHERE id = $1`,
          [msgId]
        );
      }
    }

    // Update progress
    this.progress.updateProgress({
      reactionsImported:
        this.progress.getProgress().reactionsImported + reactionRows.length,
    });

    return reactionRows.length;
  }
}
