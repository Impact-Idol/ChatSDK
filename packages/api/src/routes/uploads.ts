/**
 * Upload Routes
 * File upload endpoints for attachments
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireScope, requireUser } from '../middleware/auth';
import {
  uploadFile,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  getFileMetadata,
  getFileObject,
  deleteFile,
  getContentType,
} from '../services/storage';
import {
  processAndUploadImage,
} from '../services/image-processing';
import { db } from '../services/database';
import { getChannelAccess, getWorkspaceRole, isChannelMember } from '../services/authorization';
import { buildUploadContentUrl } from '../services/media-urls';
import { RATE_LIMIT_POLICIES, rateLimitUser } from '../services/rate-limit';
import { trackUploadAccepted, trackUploadOperation } from '../services/metrics';

export const uploadRoutes = new Hono();

// Max file sizes by type
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

type MediaResource = {
  filename: string;
  channelId?: string;
  workspaceId?: string;
};

function uploadMetricStart(): number {
  return Date.now();
}

function trackUpload(
  appId: string | undefined,
  operation: string,
  result: 'success' | 'failure',
  reason: string,
  startedAt: number
): void {
  trackUploadOperation(appId, operation, result, reason, (Date.now() - startedAt) / 1000);
}

async function runTrackedUpload<T>(
  appId: string | undefined,
  operation: string,
  startedAt: number,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    trackUpload(appId, operation, 'failure', 'exception', startedAt);
    throw error;
  }
}

function normalizeContentType(contentType: string | undefined, filename: string): string {
  return contentType || getContentType(filename);
}

function validateConfirmedObject(
  pending: { content_type: string; size: number | string; channel_id: string },
  metadata: {
    contentType: string;
    size: number;
    metadata: Record<string, string>;
  },
  auth: { appId: string; userId?: string | null }
): string | null {
  if (metadata.size !== Number(pending.size)) {
    return 'Uploaded object size does not match the requested upload';
  }

  if (metadata.contentType !== pending.content_type) {
    return 'Uploaded object content type does not match the requested upload';
  }

  if (metadata.metadata['app-id'] !== auth.appId) {
    return 'Uploaded object tenant metadata does not match the authenticated app';
  }

  if (metadata.metadata['uploaded-by'] !== auth.userId) {
    return 'Uploaded object owner metadata does not match the authenticated user';
  }

  if (metadata.metadata['channel-id'] !== pending.channel_id) {
    return 'Uploaded object channel metadata does not match the requested channel';
  }

  return null;
}

function contentDisposition(filename: string, contentType: string): string {
  const safeFilename = filename.replace(/["\r\n\\]/g, '_');
  const disposition = isSafeInlineContentType(contentType) ? 'inline' : 'attachment';
  return `${disposition}; filename="${safeFilename}"`;
}

function isSafeInlineContentType(contentType: string): boolean {
  return [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'application/pdf',
    'text/plain',
  ].includes(contentType.toLowerCase());
}

async function findMediaResource(appId: string, key: string): Promise<MediaResource | null> {
  const upload = await db.query(
    `SELECT channel_id, filename
     FROM upload
     WHERE (storage_key = $1 OR thumbnail_storage_key = $1)
       AND app_id = $2
       AND status = 'completed'`,
    [key, appId]
  );

  if (upload.rows.length > 0) {
    return {
      channelId: upload.rows[0].channel_id,
      filename: upload.rows[0].filename,
    };
  }

  const emoji = await db.query(
    `SELECT workspace_id, name
     FROM custom_emoji
     WHERE image_storage_key = $1 AND app_id = $2`,
    [key, appId]
  );

  if (emoji.rows.length > 0) {
    return {
      workspaceId: emoji.rows[0].workspace_id,
      filename: `${emoji.rows[0].name}.png`,
    };
  }

  return null;
}

async function canAccessMediaResource(
  appId: string,
  userId: string,
  resource: MediaResource
): Promise<boolean> {
  if (resource.channelId) {
    const access = await getChannelAccess(appId, userId, resource.channelId);
    return access.isMember || access.isPublic;
  }

  if (resource.workspaceId) {
    return Boolean(await getWorkspaceRole(appId, userId, resource.workspaceId));
  }

  return false;
}

/**
 * Request presigned URL for client-side upload
 * POST /api/uploads/presigned
 */
const presignedSchema = z.object({
  channelId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  size: z.number().positive(),
});

uploadRoutes.post(
  '/presigned',
  requireUser,
  requireScope('upload:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.uploadPresign),
  zValidator('json', presignedSchema),
  async (c) => {
    const startedAt = uploadMetricStart();
    const auth = c.get('auth');
    return runTrackedUpload(auth.appId, 'presign', startedAt, async () => {
      const body = c.req.valid('json');

    // Verify user is member of channel
    if (!(await isChannelMember(auth.appId, auth.userId!, body.channelId))) {
      trackUpload(auth.appId, 'presign', 'failure', 'forbidden', startedAt);
      return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
    }

    // Validate file size based on type
    const contentType = normalizeContentType(body.contentType, body.filename);
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    const maxSize = isImage ? MAX_IMAGE_SIZE : isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;

    if (body.size > maxSize) {
      trackUpload(auth.appId, 'presign', 'failure', 'too_large', startedAt);
      return c.json({
        error: {
          message: `File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`,
          code: 'FILE_TOO_LARGE',
        },
      }, 400);
    }

    // Generate presigned URL
    const result = await getPresignedUploadUrl({
      appId: auth.appId,
      channelId: body.channelId,
      userId: auth.userId!,
      filename: body.filename,
      contentType,
    });

    // Store upload record for tracking
    await db.query(
      `INSERT INTO upload (id, app_id, channel_id, user_id, filename, content_type, size, storage_key, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [auth.appId, body.channelId, auth.userId, body.filename, contentType, body.size, result.key]
    );

    trackUploadAccepted(auth.appId, contentType, body.size);
    trackUpload(auth.appId, 'presign', 'success', 'ok', startedAt);
      return c.json({
        key: result.key,
        uploadUrl: result.uploadUrl,
        headers: result.headers,
        publicUrl: buildUploadContentUrl(c.req.url, result.key, { appId: auth.appId, userId: auth.userId! }),
        url: buildUploadContentUrl(c.req.url, result.key, { appId: auth.appId, userId: auth.userId! }),
        expiresIn: 3600,
      });
    });
  }
);

/**
 * Direct file upload (server-side)
 * POST /api/uploads/direct
 */
uploadRoutes.post(
  '/direct',
  requireUser,
  requireScope('upload:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.uploadDirect),
  async (c) => {
  const startedAt = uploadMetricStart();
  const auth = c.get('auth');
  return runTrackedUpload(auth.appId, 'direct', startedAt, async () => {
  const formData = await c.req.formData();

  const file = formData.get('file') as File | null;
  const channelId = formData.get('channelId') as string;

  if (!file) {
    trackUpload(auth.appId, 'direct', 'failure', 'bad_request', startedAt);
    return c.json({ error: { message: 'No file provided', code: 'BAD_REQUEST' } }, 400);
  }

  if (!channelId) {
    trackUpload(auth.appId, 'direct', 'failure', 'bad_request', startedAt);
    return c.json({ error: { message: 'channelId required', code: 'BAD_REQUEST' } }, 400);
  }

  // Verify user is member of channel
  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    trackUpload(auth.appId, 'direct', 'failure', 'forbidden', startedAt);
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  // Validate file size
  const contentType = normalizeContentType(file.type, file.name);
  const isImage = contentType.startsWith('image/');
  const isVideo = contentType.startsWith('video/');
  const maxSize = isImage ? MAX_IMAGE_SIZE : isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;

  if (file.size > maxSize) {
    trackUpload(auth.appId, 'direct', 'failure', 'too_large', startedAt);
    return c.json({
      error: {
        message: `File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`,
        code: 'FILE_TOO_LARGE',
      },
    }, 400);
  }

  // Upload file
  const buffer = Buffer.from(await file.arrayBuffer());

  // Process images with blurhash and thumbnail generation
  let result: any;
  let width: number | null = null;
  let height: number | null = null;
  let blurhash: string | null = null;
  let thumbnailUrl: string | null = null;

  if (isImage) {
    // Use image processing service for images
    const processed = await processAndUploadImage(buffer, {
      appId: auth.appId,
      channelId,
      userId: auth.userId!,
      filename: file.name,
      contentType,
      generateBlurhash: true,
      generateThumbnail: true,
      maxWidth: 1200,
      quality: 85,
    });

    result = processed;
    width = processed.width;
    height = processed.height;
    blurhash = processed.blurhash || null;
    thumbnailUrl = processed.thumbnailUrl || null;
  } else {
    // Use basic upload for non-images
    result = await uploadFile(buffer, {
      appId: auth.appId,
      channelId,
      userId: auth.userId!,
      filename: file.name,
      contentType,
    });
  }

  // Store upload record
  const accessUrl = buildUploadContentUrl(c.req.url, result.key, { appId: auth.appId, userId: auth.userId! });
  const thumbnailAccessUrl = result.thumbnailKey
    ? buildUploadContentUrl(c.req.url, result.thumbnailKey, { appId: auth.appId, userId: auth.userId! })
    : null;
  const uploadResult = await db.query(
    `INSERT INTO upload (id, app_id, channel_id, user_id, filename, content_type, size, storage_key, url, width, height, blurhash, thumbnail_url, thumbnail_storage_key, status)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'completed')
     RETURNING id`,
    [auth.appId, channelId, auth.userId, result.filename, result.contentType, result.size, result.key, accessUrl, width, height, blurhash, thumbnailAccessUrl, result.thumbnailKey || null]
  );

    trackUploadAccepted(auth.appId, result.contentType, result.size);
    trackUpload(auth.appId, 'direct', 'success', 'ok', startedAt);
    return c.json({
      id: uploadResult.rows[0].id,
      key: result.key,
      url: accessUrl,
      filename: result.filename,
      contentType: result.contentType,
      size: result.size,
      width,
      height,
      blurhash,
      thumbnailUrl: thumbnailAccessUrl,
    });
  });
  }
);

/**
 * Confirm presigned upload completed
 * POST /api/uploads/:key/confirm
 */
uploadRoutes.post(
  '/:key/confirm',
  requireUser,
  requireScope('upload:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.uploadConfirm, (c) => ({ key: decodeURIComponent(c.req.param('key')!) })),
  async (c) => {
  const startedAt = uploadMetricStart();
  const auth = c.get('auth');
  return runTrackedUpload(auth.appId, 'confirm', startedAt, async () => {
  const key = decodeURIComponent(c.req.param('key'));

  const pending = await db.query(
    `SELECT id, channel_id, content_type, size
     FROM upload
     WHERE storage_key = $1 AND app_id = $2 AND user_id = $3 AND status = 'pending'`,
    [key, auth.appId, auth.userId]
  );

  if (pending.rows.length === 0) {
    trackUpload(auth.appId, 'confirm', 'failure', 'not_found', startedAt);
    return c.json({ error: { message: 'Upload not found', code: 'NOT_FOUND' } }, 404);
  }

  if (!(await isChannelMember(auth.appId, auth.userId!, pending.rows[0].channel_id))) {
    trackUpload(auth.appId, 'confirm', 'failure', 'forbidden', startedAt);
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  const metadata = await getFileMetadata(key);
  if (!metadata) {
    trackUpload(auth.appId, 'confirm', 'failure', 'storage_missing', startedAt);
    return c.json({
      error: {
        message: 'Uploaded object was not found in storage',
        code: 'UPLOAD_NOT_FOUND',
      },
    }, 400);
  }

  const pendingUpload = pending.rows[0] as {
    content_type: string;
    size: number | string;
    channel_id: string;
  };
  const validationError = validateConfirmedObject(pendingUpload, metadata, auth);
  if (validationError) {
    trackUpload(auth.appId, 'confirm', 'failure', 'metadata_mismatch', startedAt);
    return c.json({
      error: {
        message: validationError,
        code: 'UPLOAD_METADATA_MISMATCH',
      },
    }, 400);
  }

  const accessUrl = buildUploadContentUrl(c.req.url, key, { appId: auth.appId, userId: auth.userId! });
  const result = await db.query(
    `UPDATE upload SET status = 'completed', url = $4, updated_at = NOW()
     WHERE id = $1 AND app_id = $2 AND user_id = $3 AND status = 'pending'
     RETURNING id, url`,
    [pending.rows[0].id, auth.appId, auth.userId, accessUrl]
  );

    trackUploadAccepted(auth.appId, pendingUpload.content_type, Number(pendingUpload.size));
    trackUpload(auth.appId, 'confirm', 'success', 'ok', startedAt);
    return c.json({
      id: result.rows[0].id,
      key,
      url: result.rows[0].url,
      contentType: pendingUpload.content_type,
      status: 'completed',
    });
  });
  }
);

async function streamUploadContent(c: any, key: string) {
  const startedAt = uploadMetricStart();
  const auth = c.get('auth');
  return runTrackedUpload(auth.appId, 'content', startedAt, async () => {

  if (auth.mediaKey && auth.mediaKey !== key) {
    trackUpload(auth.appId, 'content', 'failure', 'invalid_media_token', startedAt);
    return c.json({ error: { message: 'Invalid media token', code: 'INVALID_MEDIA_TOKEN' } }, 401);
  }

  const resource = await findMediaResource(auth.appId, key);
  if (!resource) {
    trackUpload(auth.appId, 'content', 'failure', 'not_found', startedAt);
    return c.json({ error: { message: 'Upload not found', code: 'NOT_FOUND' } }, 404);
  }

  if (!(await canAccessMediaResource(auth.appId, auth.userId!, resource))) {
    trackUpload(auth.appId, 'content', 'failure', 'forbidden', startedAt);
    return c.json({ error: { message: 'Not authorized for this media', code: 'FORBIDDEN' } }, 403);
  }

  const object = await getFileObject(key);
  if (!object) {
    trackUpload(auth.appId, 'content', 'failure', 'storage_missing', startedAt);
    return c.json({ error: { message: 'Stored object not found', code: 'STORAGE_NOT_FOUND' } }, 404);
  }

  const headers = new Headers({
    'Content-Type': object.contentType,
    'Cache-Control': 'private, max-age=300',
    'Content-Disposition': contentDisposition(resource.filename, object.contentType),
    'X-Content-Type-Options': 'nosniff',
  });
  if (object.contentLength !== undefined) {
    headers.set('Content-Length', String(object.contentLength));
  }

  trackUpload(auth.appId, 'content', 'success', 'ok', startedAt);
  return new Response(object.body, { headers });
  });
}

/**
 * Stream a file through authenticated API access
 * GET /api/uploads/content?key=...
 */
uploadRoutes.get(
  '/content',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.mediaRead, (c) => {
    const key = c.req.query('key');
    return key ? { key } : {};
  }),
  async (c) => {
  const key = c.req.query('key');
  if (!key) {
    const auth = c.get('auth');
    const startedAt = uploadMetricStart();
    trackUpload(auth.appId, 'content', 'failure', 'bad_request', startedAt);
    return c.json({ error: { message: 'key required', code: 'BAD_REQUEST' } }, 400);
  }

    return streamUploadContent(c, key);
  }
);

/**
 * Legacy encoded-key media route.
 * GET /api/uploads/:key/content
 */
uploadRoutes.get(
  '/:key/content',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.mediaRead, (c) => ({ key: decodeURIComponent(c.req.param('key')!) })),
  async (c) => {
    return streamUploadContent(c, decodeURIComponent(c.req.param('key')));
  }
);

/**
 * Get download URL for a file
 * GET /api/uploads/:key/download
 */
uploadRoutes.get(
  '/:key/download',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.mediaDownload, (c) => ({ key: decodeURIComponent(c.req.param('key')!) })),
  async (c) => {
  const startedAt = uploadMetricStart();
  const auth = c.get('auth');
  return runTrackedUpload(auth.appId, 'download', startedAt, async () => {
  const key = decodeURIComponent(c.req.param('key'));

  const resource = await findMediaResource(auth.appId, key);
  if (!resource) {
    trackUpload(auth.appId, 'download', 'failure', 'not_found', startedAt);
    return c.json({ error: { message: 'Upload not found', code: 'NOT_FOUND' } }, 404);
  }

  if (!(await canAccessMediaResource(auth.appId, auth.userId!, resource))) {
    trackUpload(auth.appId, 'download', 'failure', 'forbidden', startedAt);
    return c.json({ error: { message: 'Not authorized for this media', code: 'FORBIDDEN' } }, 403);
  }

  const downloadUrl = await getPresignedDownloadUrl(key);

    trackUpload(auth.appId, 'download', 'success', 'ok', startedAt);
    return c.json({
      url: downloadUrl,
      expiresIn: 3600,
    });
  });
  }
);

/**
 * Delete an upload
 * DELETE /api/uploads/:key
 */
uploadRoutes.delete(
  '/:key',
  requireUser,
  requireScope('upload:write'),
  rateLimitUser(RATE_LIMIT_POLICIES.appWrites, () => ({ global: true })),
  rateLimitUser(RATE_LIMIT_POLICIES.uploadConfirm, (c) => ({ key: decodeURIComponent(c.req.param('key')!) })),
  async (c) => {
  const startedAt = uploadMetricStart();
  const auth = c.get('auth');
  return runTrackedUpload(auth.appId, 'delete', startedAt, async () => {
  const key = decodeURIComponent(c.req.param('key'));

  // Verify ownership
  const upload = await db.query(
    `SELECT id, thumbnail_storage_key FROM upload WHERE storage_key = $1 AND app_id = $2 AND user_id = $3`,
    [key, auth.appId, auth.userId]
  );

  if (upload.rows.length === 0) {
    trackUpload(auth.appId, 'delete', 'failure', 'not_found', startedAt);
    return c.json({ error: { message: 'Upload not found', code: 'NOT_FOUND' } }, 404);
  }

  // Delete from storage
  await deleteFile(key);
  if (upload.rows[0].thumbnail_storage_key) {
    await deleteFile(upload.rows[0].thumbnail_storage_key);
  }

  // Delete record
  await db.query(`DELETE FROM upload WHERE storage_key = $1 AND app_id = $2`, [key, auth.appId]);

    trackUpload(auth.appId, 'delete', 'success', 'ok', startedAt);
    return c.json({ success: true });
  });
  }
);

/**
 * List uploads for a channel
 * GET /api/channels/:channelId/uploads
 */
export const channelUploadsRoutes = new Hono();

channelUploadsRoutes.get(
  '/',
  requireUser,
  requireScope('chat:read'),
  rateLimitUser(RATE_LIMIT_POLICIES.mediaRead, (c) => ({ channelId: c.req.param('channelId')! })),
  async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId')!;
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const type = c.req.query('type'); // 'image', 'video', 'file'

  // Verify membership
  if (!(await isChannelMember(auth.appId, auth.userId!, channelId))) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  let typeFilter = '';
  if (type === 'image') {
    typeFilter = `AND content_type LIKE 'image/%'`;
  } else if (type === 'video') {
    typeFilter = `AND content_type LIKE 'video/%'`;
  } else if (type === 'file') {
    typeFilter = `AND content_type NOT LIKE 'image/%' AND content_type NOT LIKE 'video/%'`;
  }

  const result = await db.query(
    `SELECT id, filename, content_type, size, storage_key, thumbnail_storage_key, created_at
     FROM upload
     WHERE channel_id = $1 AND app_id = $2 AND status = 'completed' ${typeFilter}
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [channelId, auth.appId, limit, offset]
  );

    return c.json({
      uploads: result.rows.map((u) => ({
        id: u.id,
        filename: u.filename,
        contentType: u.content_type,
        size: u.size,
        url: buildUploadContentUrl(c.req.url, u.storage_key, { appId: auth.appId, userId: auth.userId! }),
        thumbnailUrl: u.thumbnail_storage_key
          ? buildUploadContentUrl(c.req.url, u.thumbnail_storage_key, { appId: auth.appId, userId: auth.userId! })
          : null,
        createdAt: u.created_at,
      })),
    });
  }
);
