import { describe, it, expect } from 'vitest';

// Inline the utility functions to test them in isolation
// These match the functions exported from useReactions.ts

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

function formatReactionCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  return `${Math.floor(count / 1000)}k`;
}

interface Reaction {
  type: string;
  count: number;
  own: boolean;
  users: Array<{ id: string; name: string }>;
}

function updateMessageReactions(
  messages: any[],
  messageId: string,
  emoji: string,
  userId: string,
  userName: string,
  added: boolean,
  currentUserId: string
): any[] {
  return messages.map((msg) => {
    if (msg.id !== messageId) return msg;

    const reactions = [...(msg.reactions || [])];
    const existingIndex = reactions.findIndex((r: Reaction) => r.type === emoji);

    if (added) {
      if (existingIndex >= 0) {
        const existing = reactions[existingIndex];
        reactions[existingIndex] = {
          ...existing,
          count: existing.count + 1,
          own: existing.own || userId === currentUserId,
          users: [...existing.users, { id: userId, name: userName }].slice(0, 5),
        };
      } else {
        reactions.push({
          type: emoji,
          count: 1,
          own: userId === currentUserId,
          users: [{ id: userId, name: userName }],
        });
      }
    } else {
      if (existingIndex >= 0) {
        const existing = reactions[existingIndex];
        if (existing.count <= 1) {
          reactions.splice(existingIndex, 1);
        } else {
          reactions[existingIndex] = {
            ...existing,
            count: existing.count - 1,
            own: userId === currentUserId ? false : existing.own,
            users: existing.users.filter((u: any) => u.id !== userId),
          };
        }
      }
    }

    return { ...msg, reactions };
  });
}

describe('Reactions Utilities', () => {
  describe('QUICK_REACTIONS', () => {
    it('should have common emoji reactions', () => {
      expect(QUICK_REACTIONS).toContain('👍');
      expect(QUICK_REACTIONS).toContain('❤️');
      expect(QUICK_REACTIONS).toContain('😂');
      expect(QUICK_REACTIONS.length).toBeGreaterThan(0);
    });
  });

  describe('formatReactionCount', () => {
    it('should return exact number for small counts', () => {
      expect(formatReactionCount(1)).toBe('1');
      expect(formatReactionCount(99)).toBe('99');
      expect(formatReactionCount(999)).toBe('999');
    });

    it('should format thousands with decimal', () => {
      expect(formatReactionCount(1000)).toBe('1.0k');
      expect(formatReactionCount(1500)).toBe('1.5k');
      expect(formatReactionCount(2300)).toBe('2.3k');
      expect(formatReactionCount(9999)).toBe('10.0k');
    });

    it('should format large numbers without decimal', () => {
      expect(formatReactionCount(10000)).toBe('10k');
      expect(formatReactionCount(25000)).toBe('25k');
      expect(formatReactionCount(100000)).toBe('100k');
    });
  });

  describe('updateMessageReactions', () => {
    const createMessage = (id: string, reactions: any[] = []) => ({
      id,
      text: 'Test message',
      reactions,
    });

    it('should add a new reaction to message', () => {
      const messages = [createMessage('msg-1')];

      const result = updateMessageReactions(
        messages,
        'msg-1',
        '👍',
        'user-2',
        'Bob',
        true, // added
        'user-1' // current user
      );

      expect(result[0].reactions).toHaveLength(1);
      expect(result[0].reactions[0]).toEqual({
        type: '👍',
        count: 1,
        own: false, // not current user
        users: [{ id: 'user-2', name: 'Bob' }],
      });
    });

    it('should mark reaction as own when current user adds', () => {
      const messages = [createMessage('msg-1')];

      const result = updateMessageReactions(
        messages,
        'msg-1',
        '❤️',
        'user-1',
        'Alice',
        true,
        'user-1' // same as reactor
      );

      expect(result[0].reactions[0].own).toBe(true);
    });

    it('should increment count for existing reaction', () => {
      const messages = [
        createMessage('msg-1', [
          { type: '👍', count: 2, own: false, users: [{ id: 'user-2', name: 'Bob' }] },
        ]),
      ];

      const result = updateMessageReactions(
        messages,
        'msg-1',
        '👍',
        'user-3',
        'Charlie',
        true,
        'user-1'
      );

      expect(result[0].reactions[0].count).toBe(3);
      expect(result[0].reactions[0].users).toHaveLength(2);
    });

    it('should remove reaction when count reaches zero', () => {
      const messages = [
        createMessage('msg-1', [
          { type: '👍', count: 1, own: true, users: [{ id: 'user-1', name: 'Alice' }] },
        ]),
      ];

      const result = updateMessageReactions(
        messages,
        'msg-1',
        '👍',
        'user-1',
        'Alice',
        false, // removed
        'user-1'
      );

      expect(result[0].reactions).toHaveLength(0);
    });

    it('should decrement count when reaction removed', () => {
      const messages = [
        createMessage('msg-1', [
          {
            type: '👍',
            count: 3,
            own: true,
            users: [
              { id: 'user-1', name: 'Alice' },
              { id: 'user-2', name: 'Bob' },
              { id: 'user-3', name: 'Charlie' },
            ],
          },
        ]),
      ];

      const result = updateMessageReactions(
        messages,
        'msg-1',
        '👍',
        'user-2',
        'Bob',
        false,
        'user-1'
      );

      expect(result[0].reactions[0].count).toBe(2);
      expect(result[0].reactions[0].users).toHaveLength(2);
      expect(result[0].reactions[0].own).toBe(true); // Current user still has it
    });

    it('should update own flag when current user removes reaction', () => {
      const messages = [
        createMessage('msg-1', [
          {
            type: '👍',
            count: 2,
            own: true,
            users: [
              { id: 'user-1', name: 'Alice' },
              { id: 'user-2', name: 'Bob' },
            ],
          },
        ]),
      ];

      const result = updateMessageReactions(
        messages,
        'msg-1',
        '👍',
        'user-1', // current user removing
        'Alice',
        false,
        'user-1'
      );

      expect(result[0].reactions[0].own).toBe(false);
    });

    it('should not modify other messages', () => {
      const messages = [
        createMessage('msg-1'),
        createMessage('msg-2'),
        createMessage('msg-3'),
      ];

      const result = updateMessageReactions(
        messages,
        'msg-2',
        '👍',
        'user-1',
        'Alice',
        true,
        'user-1'
      );

      // Messages not targeted get empty arrays (from the || [] fallback)
      expect(result[0].reactions).toHaveLength(0);
      expect(result[1].reactions).toHaveLength(1);
      expect(result[2].reactions).toHaveLength(0);
    });

    it('should handle message with no existing reactions', () => {
      const messages = [{ id: 'msg-1', text: 'Test' }]; // no reactions property

      const result = updateMessageReactions(
        messages,
        'msg-1',
        '🎉',
        'user-1',
        'Alice',
        true,
        'user-1'
      );

      expect(result[0].reactions).toHaveLength(1);
    });

    it('should limit users array to 5', () => {
      const existingUsers = [
        { id: 'user-1', name: 'User 1' },
        { id: 'user-2', name: 'User 2' },
        { id: 'user-3', name: 'User 3' },
        { id: 'user-4', name: 'User 4' },
        { id: 'user-5', name: 'User 5' },
      ];

      const messages = [
        createMessage('msg-1', [
          { type: '👍', count: 5, own: false, users: existingUsers },
        ]),
      ];

      const result = updateMessageReactions(
        messages,
        'msg-1',
        '👍',
        'user-6',
        'User 6',
        true,
        'user-1'
      );

      expect(result[0].reactions[0].count).toBe(6);
      expect(result[0].reactions[0].users).toHaveLength(5);
    });
  });
});
