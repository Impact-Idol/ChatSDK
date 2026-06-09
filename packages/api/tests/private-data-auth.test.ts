/**
 * Private data authorization regression tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as jose from 'jose';

const mockQuery = vi.fn();
const mockGetPresignedDownloadUrl = vi.fn();
const mockGetFileMetadata = vi.fn();
const mockGetFileObject = vi.fn();
const mockDeleteFile = vi.fn();
const mockPublishChannelMemberLeft = vi.fn();

vi.mock('../src/services/database', () => ({
  db: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

vi.mock('../src/services/storage', () => ({
  initStorage: vi.fn(),
  uploadFile: vi.fn(),
  getPresignedUploadUrl: vi.fn(),
  getPresignedDownloadUrl: (...args: any[]) => mockGetPresignedDownloadUrl(...args),
  getFileMetadata: (...args: any[]) => mockGetFileMetadata(...args),
  getFileObject: (...args: any[]) => mockGetFileObject(...args),
  deleteFile: (...args: any[]) => mockDeleteFile(...args),
  getContentType: vi.fn(() => 'application/octet-stream'),
  getStorageConfig: vi.fn(() => ({
    bucket: 'chatsdk-uploads',
    publicUrl: 'http://localhost:9000',
  })),
}));

vi.mock('../src/services/centrifugo', () => ({
  initCentrifugo: vi.fn(),
  centrifugo: {
    publish: vi.fn().mockResolvedValue(undefined),
    publishMessage: vi.fn().mockResolvedValue(undefined),
    publishMessageUpdate: vi.fn().mockResolvedValue(undefined),
    publishMessageDelete: vi.fn().mockResolvedValue(undefined),
    publishReaction: vi.fn().mockResolvedValue(undefined),
    publishUnreadCount: vi.fn().mockResolvedValue(undefined),
    publishTotalUnreadCount: vi.fn().mockResolvedValue(undefined),
    publishReadReceipt: vi.fn().mockResolvedValue(undefined),
    publishChannelMemberLeft: (...args: any[]) => mockPublishChannelMemberLeft(...args),
  },
  getCentrifugo: vi.fn(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
    presence: vi.fn().mockResolvedValue({ clients: {} }),
  })),
}));

vi.mock('../src/services/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const mocked: Record<string, unknown> = {};
  for (const key of Object.keys(actual)) {
    const val = actual[key];
    if (typeof val === 'function') {
      mocked[key] = vi.fn();
    } else if (typeof val === 'object' && val !== null) {
      const obj: Record<string, unknown> = {};
      for (const method of Object.keys(val as Record<string, unknown>)) {
        obj[method] = vi.fn();
      }
      mocked[key] = obj;
    } else {
      mocked[key] = val;
    }
  }
  return mocked;
});

import { app } from '../src/index';
import { issueMediaToken, verifyMediaToken } from '../src/services/media-tokens';

const TEST_APP_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID = 'user-123';
const CHANNEL_ID = '22222222-2222-4222-8222-222222222222';
const WORKSPACE_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_USER_ID = 'user-456';

async function generateToken(): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test-secret-key-for-testing');
  return new jose.SignJWT({ user_id: TEST_USER_ID, app_id: TEST_APP_ID })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

function authMocks(sql: string) {
  if (sql.includes('SELECT id, name, settings FROM app WHERE id')) {
    return { rows: [{ id: TEST_APP_ID, name: 'Test App', settings: {} }] };
  }
  if (sql.includes('SELECT id, name, image_url FROM app_user')) {
    return { rows: [{ id: TEST_USER_ID, name: 'Test User', image_url: null }] };
  }
  return null;
}

function privateNonmemberChannel(sql: string) {
  if (sql.includes('SELECT c.id, c.type, c.workspace_id')) {
    return {
      rows: [{
        id: CHANNEL_ID,
        type: 'messaging',
        workspace_id: null,
        role: null,
        workspace_member_user_id: null,
      }],
    };
  }
  return null;
}

async function authedRequest(path: string, init?: RequestInit) {
  const token = await generateToken();
  return app.request(path, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  });
}

describe('private data authorization', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockGetPresignedDownloadUrl.mockReset();
    mockGetFileMetadata.mockReset();
    mockGetFileObject.mockReset();
    mockDeleteFile.mockReset();
    mockPublishChannelMemberLeft.mockReset();
  });

  it('rejects private channel message reads for nonmembers before querying messages', async () => {
    mockQuery.mockImplementation((sql: string) => {
      return authMocks(sql) ?? privateNonmemberChannel(sql) ?? { rows: [] };
    });

    const res = await authedRequest(`/api/channels/${CHANNEL_ID}/messages`);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('Not a member');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('FROM message m'))).toBe(false);
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('current_seq FROM channel_seq'))).toBe(false);
  });

  it('rejects workspace-scoped public channel message reads for users outside the workspace', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('SELECT c.id, c.type, c.workspace_id')) {
        return {
          rows: [{
            id: CHANNEL_ID,
            type: 'public',
            workspace_id: WORKSPACE_ID,
            role: null,
            workspace_member_user_id: null,
          }],
        };
      }
      return { rows: [] };
    });

    const res = await authedRequest(`/api/channels/${CHANNEL_ID}/messages`);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('Not a member');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('current_seq FROM channel_seq'))).toBe(false);
  });

  it('rejects public workspace channel auto-join for users outside the workspace', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT c.type, c.workspace_id')) {
        return {
          rows: [{
            type: 'public',
            workspace_id: WORKSPACE_ID,
            workspace_member_user_id: null,
          }],
        };
      }
      return { rows: [] };
    });

    const res = await authedRequest(`/api/channels/${CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'nope' }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('Not a member');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO channel_member'))).toBe(false);
  });

  it('rejects private channel metadata reads for nonmembers before listing members', async () => {
    mockQuery.mockImplementation((sql: string) => {
      return authMocks(sql) ?? privateNonmemberChannel(sql) ?? { rows: [] };
    });

    const res = await authedRequest(`/api/channels/${CHANNEL_ID}`);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('Not a member');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('FROM channel_member cm'))).toBe(false);
  });

  it('rejects completed upload downloads for nonmembers and does not mint a URL', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('FROM upload') && sql.includes('storage_key')) {
        return { rows: [{ channel_id: CHANNEL_ID }] };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/uploads/example-key/download');
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('Not authorized');
    expect(mockGetPresignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('rejects completed upload content streams for nonmembers and does not fetch the object', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('FROM upload') && sql.includes('thumbnail_storage_key')) {
        return { rows: [{ channel_id: CHANNEL_ID, filename: 'private.png' }] };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/uploads/apps%2Fapp%2Fchannels%2Fprivate.png/content');
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('Not authorized');
    expect(mockGetFileObject).not.toHaveBeenCalled();
  });

  it('rejects presigned upload confirmation when the object is missing', async () => {
    mockGetFileMetadata.mockResolvedValue(null);
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('FROM upload') && sql.includes("status = 'pending'")) {
        return {
          rows: [{
            id: 'upload-123',
            channel_id: CHANNEL_ID,
            content_type: 'image/png',
            size: 123,
          }],
        };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [{ '?column?': 1 }] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/uploads/apps%2Fapp%2Fchannels%2Fmissing.png/confirm', {
      method: 'POST',
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('UPLOAD_NOT_FOUND');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE upload SET status'))).toBe(false);
  });

  it('rejects presigned upload confirmation when storage metadata does not match the pending row', async () => {
    mockGetFileMetadata.mockResolvedValue({
      contentType: 'image/jpeg',
      size: 123,
      lastModified: new Date(),
      metadata: {
        'app-id': TEST_APP_ID,
        'uploaded-by': TEST_USER_ID,
        'channel-id': CHANNEL_ID,
      },
    });
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('FROM upload') && sql.includes("status = 'pending'")) {
        return {
          rows: [{
            id: 'upload-123',
            channel_id: CHANNEL_ID,
            content_type: 'image/png',
            size: 123,
          }],
        };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [{ '?column?': 1 }] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/uploads/apps%2Fapp%2Fchannels%2Fwrong-type.png/confirm', {
      method: 'POST',
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('UPLOAD_METADATA_MISMATCH');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE upload SET status'))).toBe(false);
  });

  it('rejects presigned upload confirmation when tenant metadata is missing', async () => {
    mockGetFileMetadata.mockResolvedValue({
      contentType: 'image/png',
      size: 123,
      lastModified: new Date(),
      metadata: {},
    });
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('FROM upload') && sql.includes("status = 'pending'")) {
        return {
          rows: [{
            id: 'upload-123',
            channel_id: CHANNEL_ID,
            content_type: 'image/png',
            size: 123,
          }],
        };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [{ '?column?': 1 }] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/uploads/apps%2Fapp%2Fchannels%2Fmissing-meta.png/confirm', {
      method: 'POST',
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('UPLOAD_METADATA_MISMATCH');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE upload SET status'))).toBe(false);
  });

  it('confirms matching presigned uploads with an authenticated API content URL', async () => {
    mockGetFileMetadata.mockResolvedValue({
      contentType: 'image/png',
      size: 123,
      lastModified: new Date(),
      metadata: {
        'app-id': TEST_APP_ID,
        'uploaded-by': TEST_USER_ID,
        'channel-id': CHANNEL_ID,
      },
    });
    mockQuery.mockImplementation((sql: string, params: any[]) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('FROM upload') && sql.includes("status = 'pending'")) {
        return {
          rows: [{
            id: 'upload-123',
            channel_id: CHANNEL_ID,
            content_type: 'image/png',
            size: 123,
          }],
        };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('UPDATE upload SET status')) {
        const accessUrl = new URL(params[3]);
        expect(accessUrl.pathname).toBe('/api/uploads/content');
        expect(accessUrl.searchParams.get('key')).toBe('apps/app/channels/ok.png');
        expect(verifyMediaToken(
          accessUrl.searchParams.get('mediaToken')!,
          'apps/app/channels/ok.png'
        )).toEqual({
          appId: TEST_APP_ID,
          userId: TEST_USER_ID,
          key: 'apps/app/channels/ok.png',
        });
        return { rows: [{ id: 'upload-123', url: params[3] }] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/uploads/apps%2Fapp%2Fchannels%2Fok.png/confirm', {
      method: 'POST',
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(new URL(data.url).pathname).toBe('/api/uploads/content');
    expect(data.url).not.toContain('chatsdk-uploads');
  });

  it('streams completed upload content for members through the API proxy', async () => {
    mockGetFileObject.mockResolvedValue({
      body: new Blob(['hello private media'], { type: 'image/png' }),
      contentType: 'image/png',
      contentLength: 19,
      metadata: {},
    });
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('FROM upload') && sql.includes('thumbnail_storage_key')) {
        return { rows: [{ channel_id: CHANNEL_ID, filename: 'private.png' }] };
      }
      if (sql.includes('SELECT c.id, c.type, c.workspace_id')) {
        return {
          rows: [{
            id: CHANNEL_ID,
            type: 'messaging',
            workspace_id: null,
            role: 'member',
            workspace_member_user_id: null,
          }],
        };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/uploads/apps%2Fapp%2Fchannels%2Fprivate.png/content');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe('private, max-age=300');
    expect(await res.text()).toBe('hello private media');
  });

  it('streams completed upload content with a scoped media token and no Authorization header', async () => {
    const key = 'apps/app/channels/private.png';
    mockGetFileObject.mockResolvedValue({
      body: new Blob(['hello signed media'], { type: 'image/png' }),
      contentType: 'image/png',
      contentLength: 18,
      metadata: {},
    });
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('FROM upload') && sql.includes('thumbnail_storage_key')) {
        return { rows: [{ channel_id: CHANNEL_ID, filename: 'private.png' }] };
      }
      if (sql.includes('SELECT c.id, c.type, c.workspace_id')) {
        return {
          rows: [{
            id: CHANNEL_ID,
            type: 'messaging',
            workspace_id: null,
            role: 'member',
            workspace_member_user_id: null,
          }],
        };
      }
      return { rows: [] };
    });

    const mediaToken = issueMediaToken({ appId: TEST_APP_ID, userId: TEST_USER_ID, key });
    const res = await app.request(
      `/api/uploads/${encodeURIComponent(key)}/content?mediaToken=${encodeURIComponent(mediaToken)}`
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('hello signed media');
  });

  it('allows public workspace channel media for workspace members without explicit channel membership', async () => {
    mockGetFileObject.mockResolvedValue({
      body: new Blob(['public workspace media'], { type: 'image/png' }),
      contentType: 'image/png',
      contentLength: 22,
      metadata: {},
    });
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('FROM upload') && sql.includes('thumbnail_storage_key')) {
        return { rows: [{ channel_id: CHANNEL_ID, filename: 'public.png' }] };
      }
      if (sql.includes('SELECT c.id, c.type, c.workspace_id')) {
        return {
          rows: [{
            id: CHANNEL_ID,
            type: 'public',
            workspace_id: WORKSPACE_ID,
            role: null,
            workspace_member_user_id: TEST_USER_ID,
          }],
        };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/uploads/apps%2Fapp%2Fchannels%2Fpublic.png/content');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('public workspace media');
  });

  it('rejects media tokens scoped to a different object key', async () => {
    const mediaToken = issueMediaToken({
      appId: TEST_APP_ID,
      userId: TEST_USER_ID,
      key: 'apps/app/channels/other.png',
    });

    const res = await app.request(
      `/api/uploads/${encodeURIComponent('apps/app/channels/private.png')}/content?mediaToken=${encodeURIComponent(mediaToken)}`
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.message).toContain('Invalid media token');
    expect(mockGetFileObject).not.toHaveBeenCalled();
  });

  it('forces unsafe content types to attachment with nosniff', async () => {
    mockGetFileObject.mockResolvedValue({
      body: new Blob(['<svg></svg>'], { type: 'image/svg+xml' }),
      contentType: 'image/svg+xml',
      contentLength: 11,
      metadata: {},
    });
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('FROM upload') && sql.includes('thumbnail_storage_key')) {
        return { rows: [{ channel_id: CHANNEL_ID, filename: 'unsafe.svg' }] };
      }
      if (sql.includes('SELECT c.id, c.type, c.workspace_id')) {
        return {
          rows: [{
            id: CHANNEL_ID,
            type: 'messaging',
            workspace_id: null,
            role: 'member',
            workspace_member_user_id: null,
          }],
        };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/uploads/apps%2Fapp%2Fchannels%2Funsafe.svg/content');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="unsafe.svg"');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('deletes thumbnails when deleting an image upload', async () => {
    mockQuery.mockImplementation((sql: string, params: any[]) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('SELECT id, thumbnail_storage_key FROM upload')) {
        expect(params).toEqual(['apps/app/channels/main.png', TEST_APP_ID, TEST_USER_ID]);
        return {
          rows: [{
            id: 'upload-123',
            thumbnail_storage_key: 'apps/app/channels/thumb_main.jpg',
          }],
        };
      }
      if (sql.includes('DELETE FROM upload')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/uploads/apps%2Fapp%2Fchannels%2Fmain.png', {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    expect(mockDeleteFile).toHaveBeenCalledWith('apps/app/channels/main.png');
    expect(mockDeleteFile).toHaveBeenCalledWith('apps/app/channels/thumb_main.jpg');
  });

  it('filters bulk presence queries to users who share a channel with the caller', async () => {
    const lastActive = new Date();
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('JOIN channel_member target_cm') && sql.includes('JOIN channel_member caller_cm')) {
        return {
          rows: [{
            id: OTHER_USER_ID,
            name: 'Shared User',
            image_url: null,
            last_active_at: lastActive,
            online: true,
          }],
        };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/presence/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [OTHER_USER_ID, 'unshared-user'] }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Object.keys(data.presence)).toEqual([OTHER_USER_ID]);
    expect(data.presence[OTHER_USER_ID].user.name).toBe('Shared User');
    expect(data.presence['unshared-user']).toBeUndefined();
  });

  it('rejects moderation reports for messages in channels the caller cannot access', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('FROM message m') && sql.includes('m.channel_id')) {
        return { rows: [{ id: 'message-123', user_id: OTHER_USER_ID, channel_id: CHANNEL_ID }] };
      }
      if (sql.includes('SELECT 1 FROM channel_member')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/moderation/message-123/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'spam' }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('Not a member');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO message_report'))).toBe(false);
  });

  it('rejects normal-user supervision creation before granting private activity access', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes("custom_data->>'is_admin'")) {
        return { rows: [{ is_admin: 'false' }] };
      }
      return { rows: [] };
    });

    const res = await authedRequest(`/api/users/${TEST_USER_ID}/supervise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supervisedUserId: OTHER_USER_ID }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('admin');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO supervised_user'))).toBe(false);
  });

  it('filters workspace channel lists to public/team channels or caller channel memberships', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('SELECT 1 FROM workspace_member')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sql.includes('FROM channel c') && sql.includes('LEFT JOIN channel_member cm')) {
        expect(sql).toContain("c.type IN ('public', 'team') OR cm.user_id IS NOT NULL");
        return {
          rows: [{
            id: 'public-channel',
            cid: 'public:public-channel',
            name: 'Public Channel',
            type: 'public',
            image_url: null,
            member_count: 2,
            last_message_at: null,
            unread_count: 0,
            last_read_seq: 0,
          }],
        };
      }
      return { rows: [] };
    });

    const res = await authedRequest(`/api/workspaces/${WORKSPACE_ID}/channels`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.channels).toHaveLength(1);
    expect(data.channels[0].id).toBe('public-channel');
  });

  it('rejects global channel discovery filtered by a workspace the caller does not belong to', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('SELECT role FROM workspace_member')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await authedRequest(`/api/channels?workspaceId=${WORKSPACE_ID}`);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('workspace');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('FROM channel c'))).toBe(false);
  });

  it('rejects channel creation inside workspaces the caller cannot access', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('SELECT id FROM channel WHERE app_id') && sql.includes('cid')) {
        return { rows: [] };
      }
      if (sql.includes('FROM workspace w') && sql.includes('JOIN workspace_member')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'group',
        name: 'Unauthorized Workspace Channel',
        memberIds: [],
        workspaceId: WORKSPACE_ID,
      }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.message).toContain('Workspace');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO channel'))).toBe(false);
  });

  it('rejects workspace channel creation when invited channel members are not workspace members', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('SELECT id FROM channel WHERE app_id') && sql.includes('cid')) {
        return { rows: [] };
      }
      if (sql.includes('FROM workspace w') && sql.includes('JOIN workspace_member')) {
        return { rows: [{ id: WORKSPACE_ID }] };
      }
      if (sql.includes('SELECT user_id FROM workspace_member')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'group',
        name: 'Workspace Channel',
        memberIds: [OTHER_USER_ID],
        workspaceId: WORKSPACE_ID,
      }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('workspace');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO channel'))).toBe(false);
  });

  it('rejects adding channel members to workspace channels unless targets belong to the workspace', async () => {
    let roleCall = 0;
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('SELECT role FROM channel_member')) {
        roleCall++;
        return roleCall === 1 ? { rows: [{ role: 'admin' }] } : { rows: [] };
      }
      if (sql.includes('SELECT workspace_id FROM channel')) {
        return { rows: [{ workspace_id: WORKSPACE_ID }] };
      }
      if (sql.includes('SELECT user_id FROM workspace_member')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await authedRequest(`/api/channels/${CHANNEL_ID}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: OTHER_USER_ID }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('workspace');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO channel_member'))).toBe(false);
  });

  it('rejects self-leave when the caller is not a channel member and does not publish', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('SELECT role FROM channel_member')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await authedRequest(`/api/channels/${CHANNEL_ID}/members/${TEST_USER_ID}`, {
      method: 'DELETE',
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.message).toContain('Member not found');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM channel_member'))).toBe(false);
    expect(mockPublishChannelMemberLeft).not.toHaveBeenCalled();
  });

  it('rejects enrollment rule creation for non-admin users', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes("custom_data->>'is_admin'")) {
        return { rows: [{ is_admin: 'false' }] };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/enrollment/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleType: 'all_users',
        conditions: { all: true },
        actions: { add_to_channel: CHANNEL_ID },
      }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('admin');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO enrollment_rule'))).toBe(false);
  });

  it('does not let enrollment add users to workspace channels unless they are workspace members', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes("custom_data->>'is_admin'")) {
        return { rows: [{ is_admin: 'true' }] };
      }
      if (sql.includes('SELECT * FROM app_user')) {
        return { rows: [{ id: OTHER_USER_ID, custom: {} }] };
      }
      if (sql.includes('SELECT * FROM enrollment_rule')) {
        return {
          rows: [{
            id: 'rule-1',
            rule_type: 'all_users',
            conditions: { all: true },
            actions: { add_to_channel: CHANNEL_ID },
          }],
        };
      }
      if (sql.includes('SELECT id, workspace_id FROM channel')) {
        return { rows: [{ id: CHANNEL_ID, workspace_id: WORKSPACE_ID }] };
      }
      if (sql.includes('SELECT 1 FROM workspace_member')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO enrollment_execution')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    });

    const res = await authedRequest('/api/enrollment/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: OTHER_USER_ID }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results[0].success).toBe(false);
    expect(data.results[0].error).toContain('workspace');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO channel_member'))).toBe(false);
  });

  it('rejects workspace emoji listing for nonmembers', async () => {
    mockQuery.mockImplementation((sql: string) => {
      const auth = authMocks(sql);
      if (auth) return auth;
      if (sql.includes('SELECT role FROM workspace_member')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const res = await authedRequest(`/api/emoji?workspaceId=${WORKSPACE_ID}`);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.message).toContain('workspace');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('FROM custom_emoji'))).toBe(false);
  });
});
