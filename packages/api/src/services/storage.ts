/**
 * Storage Service
 * MinIO S3-compatible object storage for file uploads
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  DeleteBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import { Readable } from 'node:stream';
import { config } from '../config/defaults.js';

const S3_ENDPOINT = config.s3.endpoint;
const S3_REGION = config.s3.region;
const S3_ACCESS_KEY = config.s3.accessKeyId;
const S3_SECRET_KEY = config.s3.secretAccessKey;
const S3_BUCKET = config.s3.bucket;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || process.env.MINIO_PUBLIC_URL || S3_ENDPOINT;
const storageConfigured = Boolean(
  S3_ENDPOINT && S3_REGION && S3_ACCESS_KEY && S3_SECRET_KEY && S3_BUCKET
);

// Determine if we need to force path style (required for MinIO, not for AWS S3)
const forcePathStyle = config.s3.forcePathStyle
  || S3_ENDPOINT.includes('localhost')
  || S3_ENDPOINT.includes('minio');

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!storageConfigured) {
    throw new Error('Storage is not configured');
  }

  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
      forcePathStyle,
    });
  }

  return s3Client;
}

export function getStorageConfig() {
  return {
    configured: storageConfigured,
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
    bucket: S3_BUCKET,
    publicUrl: S3_PUBLIC_URL,
    forcePathStyle,
    allowPublicRead: config.s3.allowPublicRead,
  };
}

export async function checkStorageHealth(): Promise<{ status: 'ok' | 'error'; message?: string }> {
  if (!storageConfigured) {
    return { status: 'error', message: 'Storage is not configured' };
  }

  try {
    await getS3Client().send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    return { status: 'ok' };
  } catch (error) {
    console.warn('Storage health check failed:', error);
    return { status: 'error', message: 'Storage bucket unavailable' };
  }
}

export interface UploadedFile {
  key: string;
  url: string;
  contentType: string;
  size: number;
  filename: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
}

export interface UploadOptions {
  contentType: string;
  filename: string;
  appId: string;
  channelId: string;
  userId: string;
  metadata?: Record<string, string>;
}

/**
 * Generate a unique key for file storage
 */
function generateKey(options: UploadOptions): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const nonce = randomBytes(16).toString('hex');
  const ext = options.filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';

  return `apps/${options.appId}/channels/${options.channelId}/${year}/${month}/${day}/${nonce}.${ext}`;
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
  buffer: Buffer,
  options: UploadOptions
): Promise<UploadedFile> {
  const key = generateKey(options);

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: options.contentType,
      Metadata: {
        'original-filename': options.filename,
        'app-id': options.appId,
        'uploaded-by': options.userId,
        'channel-id': options.channelId,
        ...options.metadata,
      },
    })
  );

  return {
    key,
    url: `${S3_PUBLIC_URL}/${S3_BUCKET}/${key}`,
    contentType: options.contentType,
    size: buffer.length,
    filename: options.filename,
  };
}

/**
 * Generate a presigned upload URL (for client-side uploads)
 */
export async function getPresignedUploadUrl(
  options: UploadOptions,
  expiresIn = 3600
): Promise<{
  key: string;
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
}> {
  const key = generateKey(options);
  const headers = {
    'Content-Type': options.contentType,
    'x-amz-meta-app-id': options.appId,
    'x-amz-meta-uploaded-by': options.userId,
    'x-amz-meta-channel-id': options.channelId,
  };

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: options.contentType,
    Metadata: {
      'original-filename': options.filename,
      'app-id': options.appId,
      'uploaded-by': options.userId,
      'channel-id': options.channelId,
    },
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn });

  return {
    key,
    uploadUrl,
    publicUrl: `${S3_PUBLIC_URL}/${S3_BUCKET}/${key}`,
    headers,
  };
}

/**
 * Generate a presigned download URL
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn });
}

export async function getFileObject(key: string): Promise<{
  body: BodyInit;
  contentType: string;
  contentLength?: number;
  metadata: Record<string, string>;
} | null> {
  try {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );

    if (!response.Body) {
      return null;
    }

    const body = response.Body instanceof Readable
      ? (Readable.toWeb(response.Body) as BodyInit)
      : (response.Body as BodyInit);

    return {
      body,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength,
      metadata: response.Metadata || {},
    };
  } catch {
    return null;
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );
}

/**
 * Check if a file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(key: string): Promise<{
  contentType: string;
  size: number;
  lastModified: Date;
  metadata: Record<string, string>;
} | null> {
  try {
    const response = await getS3Client().send(
      new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );

    return {
      contentType: response.ContentType || 'application/octet-stream',
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    };
  } catch {
    return null;
  }
}

/**
 * Initialize storage (create bucket if needed)
 */
export async function initStorage(): Promise<void> {
  if (!storageConfigured) {
    throw new Error('Storage is not configured');
  }

  try {
    // Check if bucket exists
    await getS3Client().send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    console.log(`Storage bucket "${S3_BUCKET}" exists`);
    await enforceBucketPolicyMode();
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      // Create bucket
      await getS3Client().send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
      console.log(`Created storage bucket "${S3_BUCKET}"`);
      await enforceBucketPolicyMode();
    } else {
      console.warn('Failed to check storage bucket:', error);
      throw error;
    }
  }
}

async function enforceBucketPolicyMode(): Promise<void> {
  if (config.s3.allowPublicRead) {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${S3_BUCKET}/*`],
        },
      ],
    };

    await getS3Client().send(
      new PutBucketPolicyCommand({
        Bucket: S3_BUCKET,
        Policy: JSON.stringify(policy),
      })
    );
    console.warn('Set storage bucket policy for public read access because S3_ALLOW_PUBLIC_READ is enabled');
    return;
  }

  try {
    await getS3Client().send(new DeleteBucketPolicyCommand({ Bucket: S3_BUCKET }));
    console.log('Removed storage bucket policy for private media mode');
  } catch (error: any) {
    if (
      error.name === 'NoSuchBucketPolicy'
      || error.name === 'NotFound'
      || error.$metadata?.httpStatusCode === 404
    ) {
      return;
    }

    if (config.isProduction) {
      throw error;
    }

    console.warn('Could not remove storage bucket policy in private media mode:', error);
  }
}

// Helper to get content type from extension
export function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    json: 'application/json',
    zip: 'application/zip',
  };
  return types[ext || ''] || 'application/octet-stream';
}
