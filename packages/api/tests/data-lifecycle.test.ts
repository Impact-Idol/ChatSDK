import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDecipheriv, createHash } from 'crypto';
import { config } from '../src/config/defaults';

const mockDbQuery = vi.fn();
const mockTransaction = vi.fn();
const mockWithIsolatedTenantContext = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockDbQuery(...args),
    transaction: (fn: any) => mockTransaction(fn),
    withIsolatedTenantContext: (...args: any[]) => mockWithIsolatedTenantContext(...args),
  },
}));

vi.mock('../src/services/storage', () => ({
  deleteFile: (...args: any[]) => mockDeleteFile(...args),
  getStorageConfig: vi.fn(() => ({
    bucket: 'chatsdk-uploads',
    publicUrl: 'http://localhost:9000',
  })),
}));

import {
  anonymizeUser,
  createDataExport,
  extractAttachmentStorageKeys,
  checkDataLifecyclePurgeHealth,
  hardPurgeMessage,
  processPendingStoragePurges,
  purgeStorageKeys,
  softDeleteMessage,
} from '../src/services/data-lifecycle';

const APP_ID = '00000000-0000-0000-0000-000000000001';
const CHANNEL_ID = '22222222-2222-4222-8222-222222222222';
const MESSAGE_ID = '11111111-1111-4111-8111-111111111111';

function fakeClient(rowsBySql: Array<[string, any]> = []) {
  return {
    query: vi.fn((sql: string) => {
      for (const [needle, result] of rowsBySql) {
        if (sql.includes(needle)) {
          return Promise.resolve(result);
        }
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }),
  };
}

describe('data lifecycle service', () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
    mockTransaction.mockReset();
    mockWithIsolatedTenantContext.mockReset();
    mockDeleteFile.mockReset();
    mockWithIsolatedTenantContext.mockImplementation((_tenant, fn) => fn());
    delete process.env.DATA_LIFECYCLE_PURGE_MAX_PENDING_SECONDS;
    delete process.env.DATA_LIFECYCLE_PURGE_MAX_FAILED;
    delete process.env.DATA_LIFECYCLE_PURGE_MAX_REJECTED;
  });

  it('extracts storage keys from canonical attachment URLs', () => {
    const keys = extractAttachmentStorageKeys([
      {
        url: 'http://localhost:5500/api/uploads/content?key=apps/app-a/channels/c/file.png',
        thumbnailUrl: 'http://localhost:5500/api/uploads/content?key=apps/app-a/channels/c/thumb.png',
      },
    ]);

    expect(keys).toEqual([
      'apps/app-a/channels/c/file.png',
      'apps/app-a/channels/c/thumb.png',
    ]);
  });

  it('soft deletes messages as tombstones and records attachment purge ledger rows', async () => {
    const client = fakeClient([
      ['SELECT attachments', {
        rows: [{
          attachments: [{
            url: `http://localhost:5500/api/uploads/content?key=apps/${APP_ID}/channels/c/file.png`,
          }],
          legal_hold_until: null,
        }],
      }],
      ['UPDATE message', { rows: [{ deleted_at: '2026-06-08T00:00:00.000Z' }], rowCount: 1 }],
    ]);

    const result = await softDeleteMessage(client as any, {
      appId: APP_ID,
      channelId: CHANNEL_ID,
      messageId: MESSAGE_ID,
      deletedBy: 'alice',
    });

    expect(result.storageKeys).toEqual([`apps/${APP_ID}/channels/c/file.png`]);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("text = NULL"),
      expect.any(Array)
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("attachments = '[]'::jsonb"),
      expect.any(Array)
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO data_purge_ledger'),
      expect.arrayContaining(['pending'])
    );
  });

  it('blocks soft delete while legal hold is active', async () => {
    const client = fakeClient([
      ['SELECT attachments', {
        rows: [{
          attachments: [],
          legal_hold_until: new Date(Date.now() + 60_000).toISOString(),
        }],
      }],
    ]);

    await expect(softDeleteMessage(client as any, {
      appId: APP_ID,
      channelId: CHANNEL_ID,
      messageId: MESSAGE_ID,
      deletedBy: 'alice',
    })).rejects.toThrow('LEGAL_HOLD_ACTIVE');
  });

  it('blocks hard purge while legal hold is active', async () => {
    const client = fakeClient([
      ['SELECT channel_id, attachments', {
        rows: [{
          channel_id: CHANNEL_ID,
          attachments: [],
          legal_hold_until: new Date(Date.now() + 60_000).toISOString(),
        }],
      }],
    ]);
    mockTransaction.mockImplementation((fn) => fn(client));

    await expect(hardPurgeMessage({
      appId: APP_ID,
      messageId: MESSAGE_ID,
      purgedBy: 'admin',
    })).rejects.toThrow('LEGAL_HOLD_ACTIVE');
  });

  it('records missing object failures without throwing during storage purge', async () => {
    mockDeleteFile.mockRejectedValue(new Error('missing'));

    await purgeStorageKeys(APP_ID, [`apps/${APP_ID}/channels/c/missing.png`]);

    expect(mockWithIsolatedTenantContext).toHaveBeenCalledWith(
      { appId: APP_ID, system: true },
      expect.any(Function)
    );
    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining('WITH updated AS'),
      [
        APP_ID,
        `apps/${APP_ID}/channels/c/missing.png`,
        'pending',
        'Retryable object delete failure: missing',
      ]
    );
  });

  it('processes pending storage purge ledger rows', async () => {
    mockDbQuery.mockResolvedValue({ rows: [{ storage_key: `apps/${APP_ID}/channels/c/file.png` }] });
    mockDeleteFile.mockResolvedValue(undefined);

    const result = await processPendingStoragePurges(APP_ID);

    expect(result).toEqual({ processed: 1 });
    expect(mockDeleteFile).toHaveBeenCalledWith(`apps/${APP_ID}/channels/c/file.png`);
    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining('WITH updated AS'),
      [APP_ID, `apps/${APP_ID}/channels/c/file.png`, 'completed', null]
    );
  });

  it('reports lifecycle purge health from aggregate ledger state', async () => {
    mockDbQuery.mockResolvedValue({
      rows: [{
        pending: '4',
        failed: '0',
        rejected: '0',
        oldest_pending_seconds: '12.8',
      }],
    });

    const health = await checkDataLifecyclePurgeHealth();

    expect(health).toEqual({
      status: 'ok',
      pending: 4,
      failed: 0,
      rejected: 0,
      oldestPendingSeconds: 12,
    });
  });

  it('fails lifecycle purge health when purge rows failed or were rejected', async () => {
    mockDbQuery.mockResolvedValue({
      rows: [{
        pending: '0',
        failed: '1',
        rejected: '1',
        oldest_pending_seconds: null,
      }],
    });

    const health = await checkDataLifecyclePurgeHealth();

    expect(health.status).toBe('error');
    expect(health.failed).toBe(1);
    expect(health.rejected).toBe(1);
    expect(health.message).toContain('Lifecycle purge unhealthy');
  });

  it('falls back to strict lifecycle readiness thresholds when env values are invalid', async () => {
    process.env.DATA_LIFECYCLE_PURGE_MAX_PENDING_SECONDS = 'not-a-number';
    process.env.DATA_LIFECYCLE_PURGE_MAX_FAILED = 'not-a-number';
    process.env.DATA_LIFECYCLE_PURGE_MAX_REJECTED = 'not-a-number';
    mockDbQuery.mockResolvedValue({
      rows: [{
        pending: '1',
        failed: '1',
        rejected: '1',
        oldest_pending_seconds: '901',
      }],
    });

    const health = await checkDataLifecyclePurgeHealth();

    expect(health.status).toBe('error');
    expect(health.message).toContain('Lifecycle purge unhealthy');
  });

  it('fails lifecycle purge health when pending purge work is stale', async () => {
    mockDbQuery.mockResolvedValue({
      rows: [{
        pending: '4',
        failed: '0',
        rejected: '0',
        oldest_pending_seconds: '901.1',
      }],
    });

    const health = await checkDataLifecyclePurgeHealth();

    expect(health.status).toBe('error');
    expect(health.message).toContain('Lifecycle purge unhealthy');
  });

  it('creates scoped export artifacts with manifest counts and checksum', async () => {
    mockDbQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM message')) {
        return {
          rows: [{
            id: MESSAGE_ID,
            channel_id: CHANNEL_ID,
            user_id: 'alice',
            seq: 1,
            text: 'legacy deleted body',
            attachments: [{ url: `http://localhost:5500/api/uploads/content?key=apps/${APP_ID}/channels/c/file.png` }],
            deleted_at: '2026-06-08T00:00:00.000Z',
            deleted_by: null,
            delete_reason: null,
            hard_deleted_at: null,
            created_at: '2026-06-08T00:00:00.000Z',
            edited_at: null,
          }],
        };
      }
      if (sql.includes('FROM upload')) {
        return {
          rows: [{
            id: 'upload-1',
            channel_id: CHANNEL_ID,
            user_id: 'alice',
            filename: 'file.png',
            content_type: 'image/png',
            size: 123,
            storage_key: 'apps/app/channels/c/file.png',
            thumbnail_storage_key: null,
            status: 'completed',
            purged_at: null,
            created_at: '2026-06-08T00:00:00.000Z',
          }],
        };
      }
      if (sql.includes('INSERT INTO data_export')) {
        return { rows: [{ id: 'export-1', expires_at: '2026-06-15T00:00:00.000Z' }] };
      }
      return { rows: [] };
    });

    const result = await createDataExport({
      appId: APP_ID,
      requestedBy: 'alice',
      scopeType: 'channel',
      scopeId: CHANNEL_ID,
    });

    expect(result.id).toBe('export-1');
    expect(result.manifest.counts).toEqual({ messages: 1, deletions: 1, attachments: 1 });
    expect(result.artifact).toMatchObject({ encrypted: true, alg: 'A256GCM' });
    expect(result.artifact.ciphertext).toEqual(expect.any(String));
    const decrypted = decryptArtifact(result.artifact as any);
    expect(decrypted.messages[0].text).toBeNull();
    expect(decrypted.messages[0].attachments).toEqual([]);
    expect(decrypted.attachments[0].storageKey).toBeNull();
    expect(decrypted.attachments[0].thumbnailStorageKey).toBeNull();
    expect(decrypted.attachments[0].filename).toBeNull();
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO data_export'),
      expect.arrayContaining([APP_ID, 'alice', 'channel', CHANNEL_ID])
    );
  });

  it('anonymizes user profile fields instead of deleting user rows', async () => {
    const client = fakeClient([
      ['UPDATE app_user', { rowCount: 1, rows: [] }],
      ['DELETE FROM device_token', { rowCount: 2, rows: [] }],
    ]);
    mockTransaction.mockImplementation((fn) => fn(client));

    const result = await anonymizeUser({
      appId: APP_ID,
      userId: 'alice',
      deletedBy: 'app',
    });

    expect(result).toBe(true);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE app_user'),
      expect.arrayContaining([APP_ID, 'alice'])
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM device_token'),
      [APP_ID, 'alice']
    );
    expect(String((client.query as any).mock.calls[0][0])).not.toContain('DELETE FROM app_user');
  });
});

function decryptArtifact(artifact: {
  iv: string;
  tag: string;
  ciphertext: string;
}): any {
  const key = createHash('sha256').update(config.jwt.secret).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(artifact.iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(artifact.tag, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(artifact.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plaintext);
}
