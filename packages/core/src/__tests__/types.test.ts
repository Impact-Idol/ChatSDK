import { describe, it, expect } from 'vitest';
import type {
  User,
  Channel,
  Message,
  Attachment,
  Reaction,
  ReactionGroup,
  ChannelMember,
  MessageWithSeq,
  PendingMessage,
  SyncState,
  ChatClientOptions,
} from '../types';

describe('Core Types', () => {
  describe('User', () => {
    it('should have required properties', () => {
      const user: User = {
        id: 'user-1',
        name: 'Alice',
      };

      expect(user.id).toBe('user-1');
      expect(user.name).toBe('Alice');
    });

    it('should support optional properties', () => {
      const user: User = {
        id: 'user-1',
        name: 'Alice',
        image: 'https://example.com/alice.jpg',
        online: true,
        last_active: '2024-01-01T00:00:00Z',
        custom: { role: 'admin' },
      };

      expect(user.image).toBe('https://example.com/alice.jpg');
      expect(user.online).toBe(true);
      expect(user.custom?.role).toBe('admin');
    });
  });

  describe('Channel', () => {
    it('should have required properties', () => {
      const channel: Channel = {
        id: 'channel-1',
        cid: 'messaging:general',
        type: 'messaging',
        member_count: 5,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(channel.id).toBe('channel-1');
      expect(channel.cid).toBe('messaging:general');
      expect(channel.type).toBe('messaging');
      expect(channel.member_count).toBe(5);
    });

    it('should support all channel types', () => {
      const types: Channel['type'][] = ['messaging', 'livestream', 'team', 'commerce'];
      types.forEach((type) => {
        const channel: Channel = {
          id: 'test',
          cid: `${type}:test`,
          type,
          member_count: 1,
          created_at: '2024-01-01T00:00:00Z',
        };
        expect(channel.type).toBe(type);
      });
    });
  });

  describe('Message', () => {
    it('should have required properties', () => {
      const message: Message = {
        id: 'msg-1',
        cid: 'messaging:general',
        type: 'regular',
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(message.id).toBe('msg-1');
      expect(message.type).toBe('regular');
    });

    it('should support voice message fields', () => {
      const message: Message = {
        id: 'msg-1',
        cid: 'messaging:general',
        type: 'regular',
        created_at: '2024-01-01T00:00:00Z',
        voice_url: 'https://example.com/voice.m4a',
        voice_duration_ms: 5000,
        voice_waveform: [0.1, 0.5, 0.3, 0.8, 0.2],
      };

      expect(message.voice_url).toBe('https://example.com/voice.m4a');
      expect(message.voice_duration_ms).toBe(5000);
      expect(message.voice_waveform).toHaveLength(5);
    });

    it('should support all message types', () => {
      const types: Message['type'][] = ['regular', 'system', 'error', 'deleted'];
      types.forEach((type) => {
        const message: Message = {
          id: 'test',
          cid: 'test',
          type,
          created_at: '2024-01-01T00:00:00Z',
        };
        expect(message.type).toBe(type);
      });
    });

    it('should support all message statuses', () => {
      const statuses: Message['status'][] = ['sending', 'sent', 'delivered', 'read', 'failed'];
      statuses.forEach((status) => {
        const message: Message = {
          id: 'test',
          cid: 'test',
          type: 'regular',
          status,
          created_at: '2024-01-01T00:00:00Z',
        };
        expect(message.status).toBe(status);
      });
    });
  });

  describe('Attachment', () => {
    it('should support all attachment types', () => {
      const types: Attachment['type'][] = ['image', 'video', 'audio', 'file', 'giphy', 'voicenote'];
      types.forEach((type) => {
        const attachment: Attachment = { type };
        expect(attachment.type).toBe(type);
      });
    });

    it('should support image attachments', () => {
      const attachment: Attachment = {
        type: 'image',
        image_url: 'https://example.com/image.jpg',
        thumb_url: 'https://example.com/thumb.jpg',
        width: 800,
        height: 600,
      };

      expect(attachment.image_url).toBe('https://example.com/image.jpg');
      expect(attachment.width).toBe(800);
    });

    it('should support file attachments', () => {
      const attachment: Attachment = {
        type: 'file',
        title: 'document.pdf',
        asset_url: 'https://example.com/document.pdf',
        mime_type: 'application/pdf',
        file_size: 1024000,
      };

      expect(attachment.title).toBe('document.pdf');
      expect(attachment.file_size).toBe(1024000);
    });
  });

  describe('Reaction', () => {
    it('should have required properties', () => {
      const reaction: Reaction = {
        type: '👍',
        user_id: 'user-1',
        message_id: 'msg-1',
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(reaction.type).toBe('👍');
      expect(reaction.user_id).toBe('user-1');
    });
  });

  describe('ReactionGroup', () => {
    it('should group reactions by type', () => {
      const group: ReactionGroup = {
        type: '❤️',
        count: 5,
        users: [
          { id: 'user-1', name: 'Alice' },
          { id: 'user-2', name: 'Bob' },
        ],
        own: true,
      };

      expect(group.type).toBe('❤️');
      expect(group.count).toBe(5);
      expect(group.users).toHaveLength(2);
      expect(group.own).toBe(true);
    });
  });

  describe('ChannelMember', () => {
    it('should support all roles', () => {
      const roles: ChannelMember['role'][] = ['owner', 'admin', 'moderator', 'member'];
      roles.forEach((role) => {
        const member: ChannelMember = {
          user_id: 'user-1',
          role,
          created_at: '2024-01-01T00:00:00Z',
        };
        expect(member.role).toBe(role);
      });
    });

    it('should support moderation flags', () => {
      const member: ChannelMember = {
        user_id: 'user-1',
        role: 'member',
        banned: true,
        shadow_banned: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(member.banned).toBe(true);
      expect(member.shadow_banned).toBe(false);
    });
  });

  describe('MessageWithSeq', () => {
    it('should extend Message with sequence number', () => {
      const message: MessageWithSeq = {
        id: 'msg-1',
        cid: 'messaging:general',
        type: 'regular',
        seq: 42,
        clientMsgId: 'client-123',
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(message.seq).toBe(42);
      expect(message.clientMsgId).toBe('client-123');
    });
  });

  describe('PendingMessage', () => {
    it('should track offline message state', () => {
      const pending: PendingMessage = {
        clientMsgId: 'client-123',
        channelId: 'channel-1',
        text: 'Hello!',
        status: 'pending',
        createdAt: Date.now(),
        retryCount: 0,
      };

      expect(pending.status).toBe('pending');
      expect(pending.retryCount).toBe(0);
    });

    it('should track failed messages', () => {
      const pending: PendingMessage = {
        clientMsgId: 'client-123',
        channelId: 'channel-1',
        text: 'Hello!',
        status: 'failed',
        createdAt: Date.now(),
        retryCount: 3,
        error: 'Network error',
      };

      expect(pending.status).toBe('failed');
      expect(pending.retryCount).toBe(3);
      expect(pending.error).toBe('Network error');
    });
  });

  describe('SyncState', () => {
    it('should track sync progress', () => {
      const state: SyncState = {
        channelId: 'channel-1',
        localMaxSeq: 100,
        serverMaxSeq: 150,
        lastSyncedAt: Date.now(),
        versionId: 'abc123',
      };

      expect(state.localMaxSeq).toBe(100);
      expect(state.serverMaxSeq).toBe(150);
      expect(state.serverMaxSeq - state.localMaxSeq).toBe(50); // Gap of 50 messages
    });
  });

  describe('ChatClientOptions', () => {
    it('should have required apiKey', () => {
      const options: ChatClientOptions = {
        apiKey: 'test-key',
      };

      expect(options.apiKey).toBe('test-key');
    });

    it('should support all options', () => {
      const options: ChatClientOptions = {
        apiKey: 'test-key',
        apiUrl: 'https://api.example.com',
        wsUrl: 'wss://ws.example.com',
        debug: true,
        enableOfflineSupport: true,
        reconnectIntervals: [1000, 2000, 4000],
      };

      expect(options.debug).toBe(true);
      expect(options.enableOfflineSupport).toBe(true);
      expect(options.reconnectIntervals).toHaveLength(3);
    });
  });
});
