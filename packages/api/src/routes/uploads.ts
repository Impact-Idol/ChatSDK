/**
 * Upload Routes
 * File upload endpoints for attachments
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireUser } from '../middleware/auth';
import {
  uploadFile,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  deleteFile,
  getContentType,
} from '../services/storage';
import { db } from '../services/database';

export const uploadRoutes = new Hono();

// Max file sizes by type
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
  zValidator('json', presignedSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    // Verify user is member of channel
    const memberCheck = await db.query(
      `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
      [body.channelId, auth.userId]
    );

    if (memberCheck.rows.length === 0) {
      return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
    }

    // Validate file size based on type
    const isImage = body.contentType.startsWith('image/');
    const isVideo = body.contentType.startsWith('video/');
    const maxSize = isImage ? MAX_IMAGE_SIZE : isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;

    if (body.size > maxSize) {
      return c.json({
        error: {
          message: `File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`,
          code: 'FILE_TOO_LARGE',
        },
      }, 400);
    }

    // Generate presigned URL
    const result = await getPresignedUploadUrl({
      channelId: body.channelId,
      userId: auth.userId!,
      filename: body.filename,
      contentType: body.contentType,
    });

    // Store upload record for tracking
    await db.query(
      `INSERT INTO upload (id, app_id, channel_id, user_id, filename, content_type, size, storage_key, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [auth.appId, body.channelId, auth.userId, body.filename, body.contentType, body.size, result.key]
    );

    return c.json({
      key: result.key,
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
      expiresIn: 3600,
    });
  }
);

/**
 * Direct file upload (server-side)
 * POST /api/uploads/direct
 */
uploadRoutes.post('/direct', requireUser, async (c) => {
  const auth = c.get('auth');
  const formData = await c.req.formData();

  const file = formData.get('file') as File | null;
  const channelId = formData.get('channelId') as string;

  if (!file) {
    return c.json({ error: { message: 'No file provided', code: 'BAD_REQUEST' } }, 400);
  }

  if (!channelId) {
    return c.json({ error: { message: 'channelId required', code: 'BAD_REQUEST' } }, 400);
  }

  // Verify user is member of channel
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
    [channelId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
    return c.json({ error: { message: 'Not a member of this channel', code: 'FORBIDDEN' } }, 403);
  }

  // Validate file size
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const maxSize = isImage ? MAX_IMAGE_SIZE : isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;

  if (file.size > maxSize) {
    return c.json({
      error: {
        message: `File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`,
        code: 'FILE_TOO_LARGE',
      },
    }, 400);
  }

  // Upload file
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadFile(buffer, {
    channelId,
    userId: auth.userId!,
    filename: file.name,
    contentType: file.type || getContentType(file.name),
  });

  // Store upload record
  const uploadResult = await db.query(
    `INSERT INTO upload (id, app_id, channel_id, user_id, filename, content_type, size, storage_key, url, status)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'completed')
     RETURNING id`,
    [auth.appId, channelId, auth.userId, result.filename, result.contentType, result.size, result.key, result.url]
  );

  return c.json({
    id: uploadResult.rows[0].id,
    key: result.key,
    url: result.url,
    filename: result.filename,
    contentType: result.contentType,
    size: result.size,
  });
});

/**
 * Confirm presigned upload completed
 * POST /api/uploads/:key/confirm
 */
uploadRoutes.post('/:key/confirm', requireUser, async (c) => {
  const auth = c.get('auth');
  const key = decodeURIComponent(c.req.param('key'));

  // Update upload status
  const result = await db.query(
    `UPDATE upload SET status = 'completed', updated_at = NOW()
     WHERE storage_key = $1 AND user_id = $2 AND status = 'pending'
     RETURNING id, url`,
    [key, auth.userId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: { message: 'Upload not found', code: 'NOT_FOUND' } }, 404);
  }

  return c.json({
    id: result.rows[0].id,
    key,
    url: result.rows[0].url,
    status: 'completed',
  });
});

/**
 * Get download URL for a file
 * GET /api/uploads/:key/download
 */
uploadRoutes.get('/:key/download', requireUser, async (c) => {
  const key = decodeURIComponent(c.req.param('key'));

  const downloadUrl = await getPresignedDownloadUrl(key);

  return c.json({
    url: downloadUrl,
    expiresIn: 3600,
  });
});

/**
 * Delete an upload
 * DELETE /api/uploads/:key
 */
uploadRoutes.delete('/:key', requireUser, async (c) => {
  const auth = c.get('auth');
  const key = decodeURIComponent(c.req.param('key'));

  // Verify ownership
  const upload = await db.query(
    `SELECT id FROM upload WHERE storage_key = $1 AND user_id = $2`,
    [key, auth.userId]
  );

  if (upload.rows.length === 0) {
    return c.json({ error: { message: 'Upload not found', code: 'NOT_FOUND' } }, 404);
  }

  // Delete from storage
  await deleteFile(key);

  // Delete record
  await db.query(`DELETE FROM upload WHERE storage_key = $1`, [key]);

  return c.json({ success: true });
});

/**
 * List uploads for a channel
 * GET /api/channels/:channelId/uploads
 */
export const channelUploadsRoutes = new Hono();

channelUploadsRoutes.get('/', requireUser, async (c) => {
  const auth = c.get('auth');
  const channelId = c.req.param('channelId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const type = c.req.query('type'); // 'image', 'video', 'file'

  // Verify membership
  const memberCheck = await db.query(
    `SELECT 1 FROM channel_member WHERE channel_id = $1 AND user_id = $2`,
    [channelId, auth.userId]
  );

  if (memberCheck.rows.length === 0) {
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
    `SELECT id, filename, content_type, size, url, created_at
     FROM upload
     WHERE channel_id = $1 AND status = 'completed' ${typeFilter}
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [channelId, limit, offset]
  );

  return c.json({
    uploads: result.rows.map((u) => ({
      id: u.id,
      filename: u.filename,
      contentType: u.content_type,
      size: u.size,
      url: u.url,
      createdAt: u.created_at,
    })),
  });
});
