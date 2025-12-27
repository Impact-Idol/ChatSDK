/**
 * Import from Stream Chat command
 */

import { StreamChatClient } from '../stream/client.js';
import { Database, type DatabaseConfig } from '../utils/database.js';
import { IdMappingCache } from '../utils/id-mapping.js';
import { ProgressTracker } from '../utils/progress.js';
import { UserImporter } from '../importers/users.js';
import { ChannelImporter } from '../importers/channels.js';
import { MessageImporter } from '../importers/messages.js';
import { ReactionImporter } from '../importers/reactions.js';

export interface ImportOptions {
  apiKey: string;
  secret: string;
  targetAppId: string;
  dbHost?: string;
  dbPort?: number;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
  dbSsl?: boolean;
  dryRun?: boolean;
  resume?: string;
  channels?: string[]; // Optional: import specific channels only
  userBatchSize?: number;
  channelBatchSize?: number;
  messageBatchSize?: number;
}

export async function importFromStream(
  options: ImportOptions
): Promise<void> {
  console.log('🚀 ChatSDK Migration Tool - Stream Chat Importer');
  console.log('================================================\n');

  // Database configuration
  const dbConfig: DatabaseConfig = {
    host: options.dbHost || process.env.DB_HOST || 'localhost',
    port: options.dbPort || parseInt(process.env.DB_PORT || '5432'),
    database: options.dbName || process.env.DB_NAME || 'chatsdk',
    user: options.dbUser || process.env.DB_USER || 'chatsdk',
    password: options.dbPassword || process.env.DB_PASSWORD || 'chatsdk_dev',
    ssl: options.dbSsl || process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };

  // Initialize services
  const streamClient = new StreamChatClient(options.apiKey, options.secret);
  const db = new Database(dbConfig);
  const cacheDir = options.resume || `.migration-cache/${Date.now()}`;
  const idMapping = new IdMappingCache(cacheDir);
  const progress = new ProgressTracker(cacheDir);

  // Load resume state if exists
  if (options.resume) {
    await idMapping.load();
    await progress.loadProgress();
    console.log(`📂 Resuming migration from: ${options.resume}\n`);
  } else {
    console.log(`📁 Cache directory: ${cacheDir}\n`);
  }

  // Initialize importers
  const userImporter = new UserImporter(
    db,
    options.targetAppId,
    idMapping,
    progress
  );
  const channelImporter = new ChannelImporter(
    db,
    options.targetAppId,
    idMapping,
    progress
  );
  const messageImporter = new MessageImporter(
    db,
    options.targetAppId,
    idMapping,
    progress
  );
  const reactionImporter = new ReactionImporter(
    db,
    options.targetAppId,
    idMapping,
    progress
  );

  try {
    // Connect to database
    await db.connect();
    console.log('✅ Connected to ChatSDK database\n');

    // Verify target app exists
    const appResult = await db.query('SELECT id, name FROM app WHERE id = $1', [
      options.targetAppId,
    ]);
    if (appResult.rows.length === 0) {
      throw new Error(`App not found: ${options.targetAppId}`);
    }
    console.log(`🎯 Target app: ${appResult.rows[0].name}\n`);

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be written\n');
    }

    // Step 1: Import Users
    console.log('👥 Importing users...');
    const userBar = progress.createBar('users', 1000, 'Users');
    let totalUsers = 0;

    for await (const users of streamClient.getUsers(
      options.userBatchSize || 500
    )) {
      const count = await userImporter.import(users, options.dryRun);
      totalUsers += count;
      userBar.increment(count);
      await idMapping.save();
      await progress.saveProgress();
    }

    userBar.stop();
    console.log(`✅ Imported ${totalUsers} users\n`);

    // Step 2: Import Channels
    console.log('📢 Importing channels...');
    const channelBar = progress.createBar('channels', 1000, 'Channels');
    let totalChannels = 0;

    const channelFilter = options.channels
      ? { id: { $in: options.channels } }
      : {};

    for await (const channels of streamClient.getChannels(
      channelFilter,
      options.channelBatchSize || 100
    )) {
      const count = await channelImporter.import(channels, options.dryRun);
      totalChannels += count;
      channelBar.increment(count);
      await idMapping.save();
      await progress.saveProgress();
    }

    channelBar.stop();
    console.log(`✅ Imported ${totalChannels} channels\n`);

    // Step 3: Import Messages & Reactions
    console.log('💬 Importing messages and reactions...');
    const messageBar = progress.createBar('messages', 10000, 'Messages');
    const reactionBar = progress.createBar('reactions', 5000, 'Reactions');
    let totalMessages = 0;
    let totalReactions = 0;

    // Get all channels with their CIDs
    const channelResult = await db.query(
      'SELECT id, cid FROM channel WHERE app_id = $1',
      [options.targetAppId]
    );

    for (const channel of channelResult.rows) {
      const cid = channel.cid;
      const [channelType, channelId] = cid.split(':');

      console.log(`  📥 Channel: ${cid}`);

      for await (const messages of streamClient.getChannelMessages(
        channelId,
        channelType,
        options.messageBatchSize || 1000
      )) {
        // Import messages
        const messageCount = await messageImporter.import(
          cid,
          messages,
          options.dryRun
        );
        totalMessages += messageCount;
        messageBar.increment(messageCount);

        // Import reactions
        const reactionCount = await reactionImporter.import(
          cid,
          messages,
          options.dryRun
        );
        totalReactions += reactionCount;
        reactionBar.increment(reactionCount);

        await idMapping.save();
        await progress.saveProgress();
      }
    }

    messageBar.stop();
    reactionBar.stop();
    console.log(`✅ Imported ${totalMessages} messages\n`);
    console.log(`✅ Imported ${totalReactions} reactions\n`);

    // Final summary
    console.log('================================================');
    console.log('📊 Migration Summary:');
    console.log(`  Users:     ${totalUsers}`);
    console.log(`  Channels:  ${totalChannels}`);
    console.log(`  Messages:  ${totalMessages}`);
    console.log(`  Reactions: ${totalReactions}`);
    console.log('================================================\n');

    if (options.dryRun) {
      console.log('✅ Dry run completed successfully!');
      console.log('   Run without --dry-run to perform the actual migration.\n');
    } else {
      console.log('✅ Migration completed successfully!');
      console.log(`   Cache saved to: ${cacheDir}\n`);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error(`   Cache saved to: ${cacheDir}`);
    console.error(`   Resume with: --resume ${cacheDir}\n`);
    throw error;
  } finally {
    await db.close();
    progress.stop();
  }
}
