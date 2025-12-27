/**
 * Storage Service
 * MinIO S3-compatible object storage for file uploads
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';

// Support both MINIO_* (dev) and S3_* (prod) environment variables
const S3_ENDPOINT = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9002';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || 'chatsdk';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY || 'chatsdk_dev_123';
const S3_BUCKET = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'chatsdk';
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || process.env.MINIO_PUBLIC_URL || 'http://localhost:9002';

// Determine if we need to force path style (required for MinIO, not for AWS S3)
const isMinIO = S3_ENDPOINT.includes('localhost') || S3_ENDPOINT.includes('minio');

// Initialize S3 client (compatible with AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2, etc.)
const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: isMinIO, // Required for MinIO and some S3-compatible services
});

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
  const hash = createHash('md5').update(`${Date.now()}-${options.filename}`).digest('hex').slice(0, 8);
  const ext = options.filename.split('.').pop() || '';

  return `channels/${options.channelId}/${year}/${month}/${day}/${hash}.${ext}`;
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
  buffer: Buffer,
  options: UploadOptions
): Promise<UploadedFile> {
  const key = generateKey(options);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: options.contentType,
      Metadata: {
        'original-filename': options.filename,
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
): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const key = generateKey(options);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: options.contentType,
    Metadata: {
      'original-filename': options.filename,
      'uploaded-by': options.userId,
      'channel-id': options.channelId,
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return {
    key,
    uploadUrl,
    publicUrl: `${S3_PUBLIC_URL}/${S3_BUCKET}/${key}`,
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

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from storage
 */
export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
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
    await s3Client.send(
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
    const response = await s3Client.send(
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
  const { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } = await import('@aws-sdk/client-s3');

  try {
    // Check if bucket exists
    await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    console.log(`Storage bucket "${S3_BUCKET}" exists`);
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      // Create bucket
      await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
      console.log(`Created storage bucket "${S3_BUCKET}"`);

      // Set bucket policy for public read access (only for MinIO/self-hosted S3)
      if (isMinIO) {
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

        await s3Client.send(
          new PutBucketPolicyCommand({
            Bucket: S3_BUCKET,
            Policy: JSON.stringify(policy),
          })
        );
        console.log('Set bucket policy for public read access');
      }
    } else {
      console.warn('Failed to check storage bucket:', error);
    }
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
