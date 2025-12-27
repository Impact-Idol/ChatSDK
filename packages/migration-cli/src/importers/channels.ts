/**
 * Channel Importer
 */

import { v4 as uuidv4 } from 'uuid';
import { Database } from '../utils/database.js';
import { IdMappingCache } from '../utils/id-mapping.js';
import { ProgressTracker } from '../utils/progress.js';
import type { Channel } from 'stream-chat';

export class ChannelImporter {
  constructor(
    private db: Database,
    private appId: string,
    private idMapping: IdMappingCache,
    private progress: ProgressTracker
  ) {}

  /**
   * Import channels
   */
  async import(channels: Channel[], dryRun: boolean = false): Promise<number> {
    if (channels.length === 0) return 0;

    const channelRows: any[][] = [];
    const memberRows: any[][] = [];

    for (const channel of channels) {
      const channelId = uuidv4();
      const cid = channel.cid || `${channel.type}:${channel.id}`;

      // Map Stream Chat types to ChatSDK types
      let chatsdkType: string;
      switch (channel.type) {
        case 'messaging':
          chatsdkType = 'direct';
          break;
        case 'team':
          chatsdkType = 'team';
          break;
        default:
          chatsdkType = 'group';
      }

      // Store channel mapping
      this.idMapping.addChannel(cid, channelId);

      // Prepare channel row
      channelRows.push([
        channelId,
        this.appId,
        cid, // Store Stream CID for reference
        chatsdkType,
        channel.data?.name || null,
        channel.data?.image || null,
        channel.data?.description || null,
        (channel.data?.created_by as any)?.id || null,
        0, // member_count - will update after
        0, // message_count - will update after
        channel.data?.last_message_at ? new Date(channel.data.last_message_at as string) : null,
        channel.data?.created_at ? new Date(channel.data.created_at as string) : new Date(),
        new Date(),
      ]);

      // Prepare member rows
      const members = Object.keys(channel.state?.members || {});
      for (const memberId of members) {
        const member = channel.state?.members[memberId];
        const chatsdkUserId = this.idMapping.getUser(memberId) || memberId;

        memberRows.push([
          channelId,
          this.appId,
          chatsdkUserId,
          member?.role || 'member',
          member?.created_at ? new Date(member.created_at) : new Date(),
        ]);
      }
    }

    if (!dryRun) {
      // Insert channels
      await this.db.batchInsert(
        'channel',
        [
          'id',
          'app_id',
          'cid',
          'type',
          'name',
          'image_url',
          'description',
          'created_by',
          'member_count',
          'message_count',
          'last_message_at',
          'created_at',
          'updated_at',
        ],
        channelRows,
        'ON CONFLICT (app_id, cid) DO NOTHING'
      );

      // Insert members
      if (memberRows.length > 0) {
        await this.db.batchInsert(
          'channel_member',
          ['channel_id', 'app_id', 'user_id', 'role', 'joined_at'],
          memberRows,
          'ON CONFLICT (channel_id, app_id, user_id) DO NOTHING'
        );

        // Update member counts
        for (const channelRow of channelRows) {
          const channelId = channelRow[0];
          const memberCount = memberRows.filter((m) => m[0] === channelId).length;

          await this.db.query(
            'UPDATE channel SET member_count = $1 WHERE id = $2',
            [memberCount, channelId]
          );
        }
      }
    }

    // Update progress
    this.progress.updateProgress({
      channelsImported: this.progress.getProgress().channelsImported + channelRows.length,
    });

    return channelRows.length;
  }
}
