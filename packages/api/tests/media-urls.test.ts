import { describe, expect, it } from 'vitest';
import { extractStorageKeyFromUrl, refreshAttachmentMediaUrls } from '../src/services/media-urls';
import { verifyMediaToken } from '../src/services/media-tokens';

const auth = {
  appId: '00000000-0000-0000-0000-000000000001',
  userId: 'user-123',
};

describe('media URL helpers', () => {
  it('extracts storage keys from authenticated API media URLs', () => {
    expect(extractStorageKeyFromUrl(
      'http://localhost/api/uploads/content?key=apps%2Fapp%2Fchannels%2Ffile.png&mediaToken=old',
      'http://localhost/api/channels/channel/messages'
    )).toBe('apps/app/channels/file.png');
  });

  it('extracts storage keys from legacy public bucket URLs', () => {
    expect(extractStorageKeyFromUrl(
      'http://localhost:9000/chatsdk-uploads/channels/channel/2026/06/08/file.png',
      'http://localhost/api/channels/channel/messages'
    )).toBe('channels/channel/2026/06/08/file.png');
  });

  it('refreshes attachment media URLs with short-lived scoped tokens', () => {
    const attachments = refreshAttachmentMediaUrls(
      'http://localhost/api/channels/channel/messages',
      auth,
      [{
        type: 'image',
        url: 'http://localhost:9000/chatsdk-uploads/apps/app/channels/file.png',
        thumbnailUrl: 'http://localhost/api/uploads/apps%2Fapp%2Fchannels%2Fthumb.jpg/content?mediaToken=old',
      }]
    );

    const url = new URL(attachments[0].url);
    const thumbnailUrl = new URL(attachments[0].thumbnailUrl);
    const token = url.searchParams.get('mediaToken');
    const thumbnailToken = thumbnailUrl.searchParams.get('mediaToken');

    expect(url.pathname).toBe('/api/uploads/content');
    expect(url.searchParams.get('key')).toBe('apps/app/channels/file.png');
    expect(thumbnailUrl.pathname).toBe('/api/uploads/content');
    expect(thumbnailUrl.searchParams.get('key')).toBe('apps/app/channels/thumb.jpg');
    expect(token).toBeTruthy();
    expect(thumbnailToken).toBeTruthy();
    expect(verifyMediaToken(token!, 'apps/app/channels/file.png')).toEqual({
      ...auth,
      key: 'apps/app/channels/file.png',
    });
  });
});
