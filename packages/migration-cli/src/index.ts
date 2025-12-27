#!/usr/bin/env node

/**
 * ChatSDK Migration CLI
 * Command-line tool for migrating data from Stream Chat to ChatSDK
 */

import { Command } from 'commander';
import { importFromStream } from './commands/import-stream.js';

const program = new Command();

program
  .name('chatsdk-migrate')
  .description('ChatSDK Migration Tool - Import data from other chat platforms')
  .version('1.0.0');

program
  .command('import-stream')
  .description('Import data from Stream Chat')
  .requiredOption('--api-key <key>', 'Stream Chat API key')
  .requiredOption('--secret <secret>', 'Stream Chat API secret')
  .requiredOption('--target-app-id <id>', 'Target ChatSDK app ID (UUID)')
  .option('--db-host <host>', 'Database host (default: localhost or DB_HOST env)')
  .option('--db-port <port>', 'Database port (default: 5432 or DB_PORT env)', parseInt)
  .option('--db-name <name>', 'Database name (default: chatsdk or DB_NAME env)')
  .option('--db-user <user>', 'Database user (default: chatsdk or DB_USER env)')
  .option('--db-password <password>', 'Database password (default: DB_PASSWORD env)')
  .option('--db-ssl', 'Use SSL for database connection')
  .option('--dry-run', 'Validate migration without writing data')
  .option('--resume <cacheDir>', 'Resume interrupted migration from cache directory')
  .option('--channels <channels...>', 'Import specific channels only (space-separated channel IDs)')
  .option('--user-batch-size <size>', 'User import batch size (default: 500)', parseInt)
  .option('--channel-batch-size <size>', 'Channel import batch size (default: 100)', parseInt)
  .option('--message-batch-size <size>', 'Message import batch size (default: 1000)', parseInt)
  .action(async (options) => {
    try {
      await importFromStream(options);
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Migration failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate Stream Chat credentials and connection')
  .requiredOption('--api-key <key>', 'Stream Chat API key')
  .requiredOption('--secret <secret>', 'Stream Chat API secret')
  .action(async (options) => {
    const { StreamChatClient } = await import('./stream/client.js');

    try {
      console.log('🔍 Validating Stream Chat credentials...\n');

      const client = new StreamChatClient(options.apiKey, options.secret);

      // Test connection by fetching a small batch of users
      console.log('  📡 Fetching users...');
      const usersGen = client.getUsers(10);
      const firstBatch = await usersGen.next();

      if (firstBatch.done) {
        console.log('  ⚠️  No users found (empty workspace)\n');
      } else {
        console.log(`  ✅ Found ${firstBatch.value.length} users\n`);
      }

      // Fetch channels
      console.log('  📡 Fetching channels...');
      const channelsGen = client.getChannels({}, 10);
      const firstChannelBatch = await channelsGen.next();

      if (firstChannelBatch.done) {
        console.log('  ⚠️  No channels found (empty workspace)\n');
      } else {
        console.log(`  ✅ Found ${firstChannelBatch.value.length} channels\n`);
      }

      console.log('✅ Stream Chat credentials are valid!\n');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Validation failed:', error instanceof Error ? error.message : error);
      console.error('   Please check your API key and secret.\n');
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
