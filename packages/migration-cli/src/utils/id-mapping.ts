/**
 * ID Mapping Cache
 * Maps Stream Chat IDs to ChatSDK UUIDs
 */

import fs from 'fs/promises';
import path from 'path';

export class IdMappingCache {
  private userMap: Map<string, string> = new Map();
  private channelMap: Map<string, string> = new Map();
  private messageMap: Map<string, string> = new Map();
  private cacheDir: string;

  constructor(cacheDir: string = '.migration-cache') {
    this.cacheDir = cacheDir;
  }

  /**
   * Initialize cache directory
   */
  async init() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  /**
   * Add user mapping
   */
  addUser(streamId: string, chatsdkId: string) {
    this.userMap.set(streamId, chatsdkId);
  }

  /**
   * Add channel mapping
   */
  addChannel(streamCid: string, chatsdkId: string) {
    this.channelMap.set(streamCid, chatsdkId);
  }

  /**
   * Add message mapping
   */
  addMessage(streamId: string, chatsdkId: string) {
    this.messageMap.set(streamId, chatsdkId);
  }

  /**
   * Get user mapping
   */
  getUser(streamId: string): string | undefined {
    return this.userMap.get(streamId);
  }

  /**
   * Get channel mapping
   */
  getChannel(streamCid: string): string | undefined {
    return this.channelMap.get(streamCid);
  }

  /**
   * Get message mapping
   */
  getMessage(streamId: string): string | undefined {
    return this.messageMap.get(streamId);
  }

  /**
   * Save cache to disk
   */
  async save() {
    const data = {
      users: Array.from(this.userMap.entries()),
      channels: Array.from(this.channelMap.entries()),
      messages: Array.from(this.messageMap.entries()),
    };

    await fs.writeFile(
      path.join(this.cacheDir, 'id-mapping.json'),
      JSON.stringify(data, null, 2)
    );
  }

  /**
   * Load cache from disk
   */
  async load() {
    try {
      const data = await fs.readFile(
        path.join(this.cacheDir, 'id-mapping.json'),
        'utf-8'
      );

      const parsed = JSON.parse(data);

      this.userMap = new Map(parsed.users);
      this.channelMap = new Map(parsed.channels);
      this.messageMap = new Map(parsed.messages);
    } catch (error) {
      // Cache file doesn't exist yet
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      users: this.userMap.size,
      channels: this.channelMap.size,
      messages: this.messageMap.size,
    };
  }
}
