/**
 * Image Processing Service with Blur Hash
 * Work Stream 19 - TIER 3
 */

import sharp from 'sharp';
import { encode } from 'blurhash';
import { uploadFile, type UploadOptions, type UploadedFile } from './storage';

export interface ProcessedImage extends UploadedFile {
  width: number;
  height: number;
  blurhash?: string;
  thumbnailUrl?: string;
}

export interface ImageProcessingOptions extends UploadOptions {
  generateThumbnail?: boolean;
  generateBlurhash?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Process and upload an image with blur hash and thumbnail generation
 */
export async function processAndUploadImage(
  buffer: Buffer,
  options: ImageProcessingOptions
): Promise<ProcessedImage> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image: missing dimensions');
  }

  let processedBuffer = buffer;
  let finalWidth = metadata.width;
  let finalHeight = metadata.height;

  // Resize if needed
  if (options.maxWidth || options.maxHeight) {
    const resized = image.resize({
      width: options.maxWidth,
      height: options.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    });

    if (options.quality) {
      resized.jpeg({ quality: options.quality });
    }

    processedBuffer = await resized.toBuffer();
    const resizedMetadata = await sharp(processedBuffer).metadata();
    finalWidth = resizedMetadata.width!;
    finalHeight = resizedMetadata.height!;
  }

  // Upload main image
  const uploaded = await uploadFile(processedBuffer, options);

  const result: ProcessedImage = {
    ...uploaded,
    width: finalWidth,
    height: finalHeight,
  };

  // Generate thumbnail (300x300 max)
  if (options.generateThumbnail !== false) {
    const thumbnail = await image
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailFilename = `thumb_${options.filename}`;
    const thumbnailUploaded = await uploadFile(thumbnail, {
      ...options,
      filename: thumbnailFilename,
      metadata: {
        ...options.metadata,
        'thumbnail-for': options.filename,
      },
    });

    result.thumbnailUrl = thumbnailUploaded.url;
  }

  // Generate blurhash
  if (options.generateBlurhash !== false) {
    const blurhash = await generateBlurhash(buffer, metadata.width, metadata.height);
    result.blurhash = blurhash;
  }

  return result;
}

/**
 * Generate blurhash for an image
 */
async function generateBlurhash(
  buffer: Buffer,
  width: number,
  height: number
): Promise<string> {
  // Resize to small size for blurhash (32x32 max for performance)
  const targetWidth = Math.min(width, 32);
  const targetHeight = Math.min(height, 32);

  const { data, info } = await sharp(buffer)
    .resize(targetWidth, targetHeight, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Generate blurhash with 4x4 components (good balance between size and quality)
  return encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    4
  );
}

/**
 * Process video file (extract thumbnail and metadata)
 */
export async function processVideoFile(
  buffer: Buffer,
  options: UploadOptions
): Promise<UploadedFile & { duration?: number; thumbnailUrl?: string }> {
  // Upload original video
  const uploaded = await uploadFile(buffer, options);

  // TODO: Integrate with FFmpeg to extract thumbnail and duration
  // For now, just return the upload result
  return uploaded;
}

/**
 * Get image dimensions without loading full file
 */
export async function getImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image: missing dimensions');
  }

  return {
    width: metadata.width,
    height: metadata.height,
  };
}

/**
 * Validate image file
 */
export function validateImageFile(
  contentType: string,
  size: number,
  maxSize: number = 10 * 1024 * 1024 // 10MB default
): { valid: boolean; error?: string } {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  if (!allowedTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Unsupported image type: ${contentType}. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  if (size > maxSize) {
    return {
      valid: false,
      error: `File size ${size} bytes exceeds maximum ${maxSize} bytes`,
    };
  }

  return { valid: true };
}

/**
 * Validate video file
 */
export function validateVideoFile(
  contentType: string,
  size: number,
  maxSize: number = 100 * 1024 * 1024 // 100MB default
): { valid: boolean; error?: string } {
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
  ];

  if (!allowedTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Unsupported video type: ${contentType}. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  if (size > maxSize) {
    return {
      valid: false,
      error: `File size ${size} bytes exceeds maximum ${maxSize} bytes`,
    };
  }

  return { valid: true };
}
