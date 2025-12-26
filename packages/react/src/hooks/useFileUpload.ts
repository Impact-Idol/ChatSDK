/**
 * useFileUpload - Hook for uploading files to chat
 */

import { useState, useCallback, useRef } from 'react';
import { useChatClient } from './ChatProvider';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadedFile {
  id: string;
  key: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface UseFileUploadOptions {
  channelId: string;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (file: UploadedFile) => void;
  onError?: (error: Error) => void;
}

export interface UseFileUploadResult {
  upload: (file: File) => Promise<UploadedFile>;
  uploadMultiple: (files: File[]) => Promise<UploadedFile[]>;
  uploading: boolean;
  progress: UploadProgress | null;
  error: Error | null;
  cancel: () => void;
}

/**
 * useFileUpload - Upload files to a channel
 *
 * @example
 * ```tsx
 * const { upload, uploading, progress } = useFileUpload({
 *   channelId,
 *   onComplete: (file) => {
 *     sendMessage('', { attachments: [file] });
 *   },
 * });
 *
 * const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const file = e.target.files?.[0];
 *   if (file) {
 *     await upload(file);
 *   }
 * };
 * ```
 */
export function useFileUpload(options: UseFileUploadOptions): UseFileUploadResult {
  const { channelId, onProgress, onComplete, onError } = options;
  const client = useChatClient();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadedFile> => {
      setUploading(true);
      setProgress({ loaded: 0, total: file.size, percent: 0 });
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        // Get presigned upload URL
        const presigned = await client.fetch<{
          key: string;
          uploadUrl: string;
          publicUrl: string;
        }>('/api/uploads/presigned', {
          method: 'POST',
          body: JSON.stringify({
            channelId,
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        });

        // Upload directly to storage
        const xhr = new XMLHttpRequest();

        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progressData = {
                loaded: e.loaded,
                total: e.total,
                percent: Math.round((e.loaded / e.total) * 100),
              };
              setProgress(progressData);
              onProgress?.(progressData);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
          });

          xhr.open('PUT', presigned.uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);

          // Store xhr for cancellation
          abortControllerRef.current!.signal.addEventListener('abort', () => {
            xhr.abort();
          });
        });

        // Confirm upload
        const result = await client.fetch<{ id: string; key: string; url: string }>(
          `/api/uploads/${encodeURIComponent(presigned.key)}/confirm`,
          { method: 'POST' }
        );

        const uploadedFile: UploadedFile = {
          id: result.id,
          key: result.key,
          url: presigned.publicUrl,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        };

        setProgress({ loaded: file.size, total: file.size, percent: 100 });
        onComplete?.(uploadedFile);

        return uploadedFile;
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setUploading(false);
        abortControllerRef.current = null;
      }
    },
    [client, channelId, onProgress, onComplete, onError]
  );

  const uploadMultiple = useCallback(
    async (files: File[]): Promise<UploadedFile[]> => {
      const results: UploadedFile[] = [];

      for (const file of files) {
        try {
          const result = await upload(file);
          results.push(result);
        } catch {
          // Continue with other files
        }
      }

      return results;
    },
    [upload]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    upload,
    uploadMultiple,
    uploading,
    progress,
    error,
    cancel,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(
  file: File,
  allowedTypes?: string[]
): boolean {
  if (!allowedTypes || allowedTypes.length === 0) return true;

  return allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.slice(0, -1));
    }
    return file.type === type;
  });
}

/**
 * Get file type category
 */
export function getFileCategory(contentType: string): 'image' | 'video' | 'audio' | 'file' {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  return 'file';
}
