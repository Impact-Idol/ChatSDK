import { issueMediaToken } from './media-tokens';
import { getStorageConfig } from './storage';
import { db } from './database';

export interface MediaUrlAuth {
  appId: string;
  userId: string;
}

export function buildUploadContentUrl(requestUrl: string, key: string, auth: MediaUrlAuth): string {
  const url = new URL(requestUrl);
  url.pathname = '/api/uploads/content';
  url.search = '';
  url.searchParams.set('key', key);
  url.searchParams.set('mediaToken', issueMediaToken({ ...auth, key }));
  url.hash = '';
  return url.toString();
}

export function buildCanonicalUploadContentUrl(requestUrl: string, key: string): string {
  const url = new URL(requestUrl);
  url.pathname = '/api/uploads/content';
  url.search = '';
  url.searchParams.set('key', key);
  url.hash = '';
  return url.toString();
}

export async function prepareMessageAttachments<T>(
  requestUrl: string,
  input: {
    appId: string;
    channelId: string;
    attachments: T;
  }
): Promise<T> {
  if (!Array.isArray(input.attachments)) {
    return input.attachments;
  }

  const prepared = [];
  for (const attachment of input.attachments) {
    if (!attachment || typeof attachment !== 'object') {
      prepared.push(attachment);
      continue;
    }

    const next = { ...(attachment as Record<string, unknown>) };
    for (const field of ['url', 'thumbnailUrl']) {
      const value = next[field];
      if (typeof value !== 'string') {
        continue;
      }

      const key = extractStorageKeyFromUrl(value, requestUrl);
      if (!key) {
        continue;
      }

      await assertUploadKeyBelongsToChannel(input.appId, input.channelId, key);
      next[field] = buildCanonicalUploadContentUrl(requestUrl, key);
    }

    prepared.push(next);
  }

  return prepared as T;
}

export function refreshAttachmentMediaUrls<T>(requestUrl: string, auth: MediaUrlAuth, attachments: T): T {
  if (!Array.isArray(attachments)) {
    return attachments;
  }

  return attachments.map((attachment) => {
    if (!attachment || typeof attachment !== 'object') {
      return attachment;
    }

    const next = { ...(attachment as Record<string, unknown>) };
    for (const field of ['url', 'thumbnailUrl']) {
      const value = next[field];
      if (typeof value !== 'string') {
        continue;
      }

      const key = extractStorageKeyFromUrl(value, requestUrl);
      if (key) {
        next[field] = buildUploadContentUrl(requestUrl, key, auth);
      }
    }

    return next;
  }) as T;
}

export function extractStorageKeyFromUrl(value: string, requestUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(value, requestUrl);
  } catch {
    return null;
  }

  const apiMatch = url.pathname.match(/^\/api\/uploads\/(.+)\/content$/);
  if (apiMatch?.[1]) {
    try {
      return decodeURIComponent(apiMatch[1]);
    } catch {
      return null;
    }
  }

  if (url.pathname === '/api/uploads/content') {
    return url.searchParams.get('key');
  }

  const storageConfig = getStorageConfig();
  if (!storageConfig.bucket) {
    return null;
  }

  const marker = `/${storageConfig.bucket}/`;
  const index = url.pathname.indexOf(marker);
  if (index === -1) {
    return null;
  }

  const key = url.pathname.slice(index + marker.length);
  return key ? decodeURIComponent(key) : null;
}

async function assertUploadKeyBelongsToChannel(
  appId: string,
  channelId: string,
  key: string
): Promise<void> {
  const result = await db.query(
    `SELECT channel_id
     FROM upload
     WHERE (storage_key = $1 OR thumbnail_storage_key = $1)
       AND app_id = $2
       AND status = 'completed'`,
    [key, appId]
  );

  if (result.rows.length === 0 || result.rows[0].channel_id !== channelId) {
    throw new Error('Attachment media is not available in this channel');
  }
}
