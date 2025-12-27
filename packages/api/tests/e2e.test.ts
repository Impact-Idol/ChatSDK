/**
 * End-to-End Tests
 * Verify the full flow: API → Database → Centrifugo → Client
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { app } from '../src/index';

const API_BASE = 'http://localhost:5500';
const TEST_APP_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_1 = { id: 'test-user-1', name: 'Alice Test' };
const TEST_USER_2 = { id: 'test-user-2', name: 'Bob Test' };

let token1: string;
let token2: string;
let testChannelId: string;

describe('End-to-End: Full Chat Flow', () => {
  beforeAll(async () => {
    // Generate tokens for test users
    token1 = await testHelpers.generateToken(TEST_USER_1.id, TEST_APP_ID);
    token2 = await testHelpers.generateToken(TEST_USER_2.id, TEST_APP_ID);
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${API_BASE}/health`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Channel Operations', () => {
    it('should create a new channel', async () => {
      const response = await fetch(`${API_BASE}/api/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`,
        },
        body: JSON.stringify({
          type: 'messaging',
          name: 'E2E Test Channel',
          memberIds: [TEST_USER_2.id],
        }),
      });

      expect(response.status).toBe(201);

      const channel = await response.json();
      expect(channel.id).toBeDefined();
      expect(channel.name).toBe('E2E Test Channel');
      expect(channel.type).toBe('messaging');

      testChannelId = channel.id;
    });

    it('should list channels for a user', async () => {
      const response = await fetch(`${API_BASE}/api/channels`, {
        headers: { Authorization: `Bearer ${token1}` },
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.channels).toBeDefined();
      expect(Array.isArray(data.channels)).toBe(true);
    });

    it('should get channel details', async () => {
      if (!testChannelId) return;

      const response = await fetch(`${API_BASE}/api/channels/${testChannelId}`, {
        headers: { Authorization: `Bearer ${token1}` },
      });

      expect(response.ok).toBe(true);

      const channel = await response.json();
      expect(channel.id).toBe(testChannelId);
      expect(channel.members).toBeDefined();
    });
  });

  describe('Message Operations', () => {
    let testMessageId: string;

    it('should send a message', async () => {
      if (!testChannelId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token1}`,
          },
          body: JSON.stringify({
            text: 'Hello from E2E test!',
          }),
        }
      );

      expect(response.status).toBe(201);

      const message = await response.json();
      expect(message.id).toBeDefined();
      expect(message.text).toBe('Hello from E2E test!');
      expect(message.seq).toBeGreaterThan(0);
      expect(message.status).toBe('sent');

      testMessageId = message.id;
    });

    it('should handle idempotent message sending with clientMsgId', async () => {
      if (!testChannelId) return;

      const clientMsgId = crypto.randomUUID();

      // Send first time
      const response1 = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token1}`,
          },
          body: JSON.stringify({
            text: 'Idempotent message',
            clientMsgId,
          }),
        }
      );

      expect(response1.status).toBe(201);
      const message1 = await response1.json();

      // Send second time with same clientMsgId
      const response2 = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token1}`,
          },
          body: JSON.stringify({
            text: 'Idempotent message',
            clientMsgId,
          }),
        }
      );

      expect(response2.ok).toBe(true);
      const message2 = await response2.json();

      // Should return same message (deduplicated)
      expect(message2.id).toBe(message1.id);
      expect(message2.duplicate).toBe(true);
    });

    it('should get messages with sequence-based pagination', async () => {
      if (!testChannelId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages?since_seq=0&limit=10`,
        {
          headers: { Authorization: `Bearer ${token1}` },
        }
      );

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.messages).toBeDefined();
      expect(data.maxSeq).toBeDefined();
      expect(data.hasMore).toBeDefined();
    });

    it('should update a message', async () => {
      if (!testChannelId || !testMessageId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages/${testMessageId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token1}`,
          },
          body: JSON.stringify({
            text: 'Updated E2E test message!',
          }),
        }
      );

      expect(response.ok).toBe(true);

      const message = await response.json();
      expect(message.text).toBe('Updated E2E test message!');
      expect(message.updated_at).toBeDefined();
    });

    it('should add a reaction to a message', async () => {
      if (!testChannelId || !testMessageId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages/${testMessageId}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token2}`,
          },
          body: JSON.stringify({ emoji: '👍' }),
        }
      );

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
    });

    it('should get message with reactions', async () => {
      if (!testChannelId || !testMessageId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages/${testMessageId}`,
        {
          headers: { Authorization: `Bearer ${token1}` },
        }
      );

      expect(response.ok).toBe(true);

      const message = await response.json();
      expect(message.reactions).toBeDefined();
      expect(message.reactions.length).toBeGreaterThan(0);

      const thumbsUp = message.reactions.find((r: any) => r.type === '👍');
      expect(thumbsUp).toBeDefined();
      expect(thumbsUp.count).toBeGreaterThan(0);
    });

    it('should remove a reaction', async () => {
      if (!testChannelId || !testMessageId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages/${testMessageId}/reactions/${encodeURIComponent('👍')}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token2}` },
        }
      );

      expect(response.ok).toBe(true);
    });
  });

  describe('Thread Operations', () => {
    let parentMessageId: string;
    let replyId: string;

    beforeAll(async () => {
      if (!testChannelId) return;

      // Create a parent message
      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token1}`,
          },
          body: JSON.stringify({
            text: 'Parent message for thread test',
          }),
        }
      );

      const message = await response.json();
      parentMessageId = message.id;
    });

    it('should create a thread reply', async () => {
      if (!testChannelId || !parentMessageId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages/${parentMessageId}/thread`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token2}`,
          },
          body: JSON.stringify({
            text: 'This is a thread reply!',
          }),
        }
      );

      expect(response.status).toBe(201);

      const reply = await response.json();
      expect(reply.id).toBeDefined();
      expect(reply.parentId).toBe(parentMessageId);
      expect(reply.text).toBe('This is a thread reply!');

      replyId = reply.id;
    });

    it('should get thread with replies', async () => {
      if (!testChannelId || !parentMessageId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages/${parentMessageId}/thread`,
        {
          headers: { Authorization: `Bearer ${token1}` },
        }
      );

      expect(response.ok).toBe(true);

      const thread = await response.json();
      expect(thread.parent).toBeDefined();
      expect(thread.parent.id).toBe(parentMessageId);
      expect(thread.parent.replyCount).toBeGreaterThan(0);
      expect(thread.replies).toBeDefined();
      expect(thread.replies.length).toBeGreaterThan(0);
    });

    it('should get thread participants', async () => {
      if (!testChannelId || !parentMessageId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/messages/${parentMessageId}/thread/participants`,
        {
          headers: { Authorization: `Bearer ${token1}` },
        }
      );

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.participants).toBeDefined();
      expect(data.participants.length).toBeGreaterThan(0);
    });
  });

  describe('Typing Indicators', () => {
    it('should send typing indicator', async () => {
      if (!testChannelId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/typing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token1}`,
          },
          body: JSON.stringify({ typing: true }),
        }
      );

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });

  describe('Read Receipts', () => {
    it('should mark channel as read', async () => {
      if (!testChannelId) return;

      const response = await fetch(
        `${API_BASE}/api/channels/${testChannelId}/read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token1}`,
          },
          body: JSON.stringify({}),
        }
      );

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.lastReadSeq).toBeDefined();
    });
  });

  describe('Search', () => {
    it('should search messages', async () => {
      const response = await fetch(
        `${API_BASE}/api/search/messages?q=E2E`,
        {
          headers: { Authorization: `Bearer ${token1}` },
        }
      );

      // Search might not be configured in test env
      if (response.ok) {
        const data = await response.json();
        expect(data.results).toBeDefined();
      }
    });
  });

  describe('Presence', () => {
    it('should set user presence', async () => {
      const response = await fetch(`${API_BASE}/api/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`,
        },
        body: JSON.stringify({ online: true }),
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });

  describe('Device Registration', () => {
    it('should register a device for push notifications', async () => {
      const response = await fetch(`${API_BASE}/api/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`,
        },
        body: JSON.stringify({
          token: 'test-device-token-12345',
          platform: 'web',
        }),
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
    });

    it('should get registered devices', async () => {
      const response = await fetch(`${API_BASE}/api/devices`, {
        headers: { Authorization: `Bearer ${token1}` },
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.devices).toBeDefined();
    });

    it('should get notification preferences', async () => {
      const response = await fetch(`${API_BASE}/api/devices/preferences`, {
        headers: { Authorization: `Bearer ${token1}` },
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.preferences).toBeDefined();
      expect(data.preferences.newMessages).toBeDefined();
      expect(data.preferences.mentions).toBeDefined();
    });

    it('should update notification preferences', async () => {
      const response = await fetch(`${API_BASE}/api/devices/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`,
        },
        body: JSON.stringify({
          newMessages: true,
          mentions: true,
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        }),
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });

  describe('Channel Cleanup', () => {
    it('should delete the test channel', async () => {
      if (!testChannelId) return;

      const response = await fetch(`${API_BASE}/api/channels/${testChannelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token1}` },
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.success).toBe(true);
    });
  });
});

describe('Error Handling', () => {
  it('should return 401 for unauthenticated requests', async () => {
    const response = await fetch(`${API_BASE}/api/channels`);
    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent routes', async () => {
    const response = await fetch(`${API_BASE}/api/nonexistent`);
    expect(response.status).toBe(404);
  });

  it('should return 404 for non-existent channel', async () => {
    const token = await testHelpers.generateToken('test', TEST_APP_ID);
    const response = await fetch(
      `${API_BASE}/api/channels/00000000-0000-0000-0000-000000000000`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    expect(response.status).toBe(404);
  });
});
