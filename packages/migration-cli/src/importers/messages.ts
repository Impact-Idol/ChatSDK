/**
 * Message Importer
 */

import { v4 as uuidv4 } from 'uuid';
import { Database } from '../utils/database.js';
import { IdMappingCache } from '../utils/id-mapping.js';
import { ProgressTracker } from '../utils/progress.js';
import type { MessageResponse } from 'stream-chat';

export class MessageImporter {
  constructor(
    private db: Database,
    private appId: string,
    private idMapping: IdMappingCache,
    private progress: ProgressTracker
  ) {}

  /**
   * Import messages for a channel
   */
  async import(
    streamCid: string,
    messages: MessageResponse[],
    dryRun: boolean = false
  ): Promise<number> {
    if (messages.length === 0) return 0;

    const channelId = this.idMapping.getChannel(streamCid);
    if (!channelId) {
      console.warn(`Channel not found for CID: ${streamCid}`);
      return 0;
    }

    // Sort messages by created_at to assign sequence numbers correctly
    const sortedMessages = messages.sort((a, b) => {
      const timeA = new Date(a.created_at!).getTime();
      const timeB = new Date(b.created_at!).getTime();
      return timeA - timeB;
    });

    const messageRows: any[][] = [];
    const userMessageRows: any[][] = [];

    // Get current max sequence for this channel
    let currentSeq = 0;
    if (!dryRun) {
      const seqResult = await this.db.query(
        'SELECT COALESCE(MAX(seq), 0) as max_seq FROM message WHERE channel_id = $1',
        [channelId]
      );
      currentSeq = parseInt(seqResult.rows[0].max_seq);
    }

    for (const message of sortedMessages) {
      currentSeq++;

      // Generate UUID for message
      const messageId = uuidv4();

      // Store mapping
      this.idMapping.addMessage(message.id, messageId);

      // Get parent message ID if this is a thread reply
      let parentId = null;
      if (message.parent_id) {
        parentId = this.idMapping.getMessage(message.parent_id);
      }

      // Get reply-to message ID
      let replyToId = null;
      if (message.quoted_message_id) {
        replyToId = this.idMapping.getMessage(message.quoted_message_id);
      }

      // Map user ID
      const userId = this.idMapping.getUser(message.user?.id || '') || message.user?.id;

      // Prepare message row
      messageRows.push([
        messageId,
        channelId,
        this.appId,
        userId,
        currentSeq,
        message.text || null,
        JSON.stringify(message.attachments || []),
        parentId,
        replyToId,
        message.reaction_counts ? Object.keys(message.reaction_counts).length : 0,
        message.reply_count || 0,
        message.pinned || false,
        message.pinned_at ? new Date(message.pinned_at) : null,
        message.pinned_by?.id || null,
        'sent',
        message.created_at ? new Date(message.created_at) : new Date(),
        message.updated_at ? new Date(message.updated_at) : new Date(),
        message.deleted_at ? new Date(message.deleted_at) : null,
      ]);

      // Get all channel members for user_message table
      if (!dryRun) {
        const membersResult = await this.db.query(
          'SELECT user_id FROM channel_member WHERE channel_id = $1 AND app_id = $2',
          [channelId, this.appId]
        );

        for (const member of membersResult.rows) {
          userMessageRows.push([
            member.user_id,
            this.appId,
            messageId,
            member.user_id === userId ? 1 : 0, // Mark as read for sender
          ]);
        }
      }
    }

    if (!dryRun) {
      // Insert messages
      await this.db.batchInsert(
        'message',
        [
          'id',
          'channel_id',
          'app_id',
          'user_id',
          'seq',
          'text',
          'attachments',
          'parent_id',
          'reply_to_id',
          'reaction_count',
          'reply_count',
          'pinned',
          'pinned_at',
          'pinned_by',
          'status',
          'created_at',
          'updated_at',
          'deleted_at',
        ],
        messageRows,
        'ON CONFLICT DO NOTHING'
      );

      // Insert user_message records
      if (userMessageRows.length > 0) {
        await this.db.batchInsert(
          'user_message',
          ['user_id', 'app_id', 'message_id', 'flags'],
          userMessageRows,
          'ON CONFLICT DO NOTHING'
        );
      }

      // Update channel message count and last_message_at
      await this.db.query(
        `UPDATE channel
         SET message_count = (SELECT COUNT(*) FROM message WHERE channel_id = $1),
             last_message_at = (SELECT MAX(created_at) FROM message WHERE channel_id = $1)
         WHERE id = $1`,
        [channelId]
      );
    }

    // Update progress
    this.progress.updateProgress({
      messagesImported: this.progress.getProgress().messagesImported + messageRows.length,
    });

    return messageRows.length;
  }
}
