/**
 * User Importer
 */

import { Database } from '../utils/database.js';
import { IdMappingCache } from '../utils/id-mapping.js';
import { ProgressTracker } from '../utils/progress.js';
import type { UserResponse } from 'stream-chat';

export class UserImporter {
  constructor(
    private db: Database,
    private appId: string,
    private idMapping: IdMappingCache,
    private progress: ProgressTracker
  ) {}

  /**
   * Import users
   */
  async import(users: UserResponse[], dryRun: boolean = false): Promise<number> {
    if (users.length === 0) return 0;

    const rows: any[][] = [];

    for (const user of users) {
      // Use Stream Chat user ID as ChatSDK user ID for consistency
      const userId = user.id;

      // Map Stream Chat user to ChatSDK app_user
      rows.push([
        this.appId,
        userId,
        user.name || user.id,
        user.image || null,
        JSON.stringify(user.custom || {}),
        user.last_active ? new Date(user.last_active) : null,
        user.created_at ? new Date(user.created_at) : new Date(),
        new Date(),
      ]);

      // Store mapping
      this.idMapping.addUser(user.id, userId);
    }

    if (!dryRun) {
      await this.db.batchInsert(
        'app_user',
        [
          'app_id',
          'id',
          'name',
          'image_url',
          'custom_data',
          'last_active_at',
          'created_at',
          'updated_at',
        ],
        rows,
        'ON CONFLICT (app_id, id) DO NOTHING'
      );
    }

    // Update progress
    this.progress.updateProgress({
      usersImported: this.progress.getProgress().usersImported + rows.length,
    });

    return rows.length;
  }
}
