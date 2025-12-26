import { describe, it, expect } from 'vitest';

// Inline the utility functions to test them in isolation
// These match the functions exported from useMentions.ts

interface MentionUser {
  id: string;
  name: string;
  image?: string;
}

function parseMentions(text: string): string[] {
  const mentions: string[] = [];

  // Match @username
  const simplePattern = /@(\w+)/g;
  let match;
  while ((match = simplePattern.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  // Match @[User Name]
  const bracketPattern = /@\[([^\]]+)\]/g;
  while ((match = bracketPattern.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return [...new Set(mentions)]; // Remove duplicates
}

function formatMention(user: MentionUser): string {
  // Use brackets if name contains spaces
  if (user.name.includes(' ')) {
    return `@[${user.name}]`;
  }
  return `@${user.name}`;
}

function highlightMentions(
  text: string,
  currentUserId?: string
): Array<{ type: 'text' | 'mention'; content: string; isCurrentUser?: boolean }> {
  const parts: Array<{
    type: 'text' | 'mention';
    content: string;
    isCurrentUser?: boolean;
  }> = [];

  // Combined pattern for both mention formats
  const mentionPattern = /@(\w+)|@\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add mention
    const mentionName = match[1] || match[2];
    parts.push({
      type: 'mention',
      content: mentionName,
      isCurrentUser: mentionName === currentUserId,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

describe('Mentions Utilities', () => {
  describe('parseMentions', () => {
    it('should parse simple @username mentions', () => {
      const text = 'Hello @alice and @bob!';
      const mentions = parseMentions(text);

      expect(mentions).toContain('alice');
      expect(mentions).toContain('bob');
      expect(mentions).toHaveLength(2);
    });

    it('should parse bracket mentions with spaces', () => {
      const text = 'Hello @[John Doe] and @[Jane Smith]!';
      const mentions = parseMentions(text);

      expect(mentions).toContain('John Doe');
      expect(mentions).toContain('Jane Smith');
      expect(mentions).toHaveLength(2);
    });

    it('should parse mixed mention formats', () => {
      const text = 'Hey @alice and @[Bob Smith], check this out!';
      const mentions = parseMentions(text);

      expect(mentions).toContain('alice');
      expect(mentions).toContain('Bob Smith');
      expect(mentions).toHaveLength(2);
    });

    it('should remove duplicate mentions', () => {
      const text = '@alice said hi to @alice again @alice';
      const mentions = parseMentions(text);

      expect(mentions).toHaveLength(1);
      expect(mentions[0]).toBe('alice');
    });

    it('should return empty array for text without mentions', () => {
      const text = 'Just a regular message without any @ symbols';
      const mentions = parseMentions(text);

      expect(mentions).toHaveLength(0);
    });

    it('should parse @word in emails as mentions (known limitation)', () => {
      // Note: This is a known limitation - emails match the @word pattern
      const text = 'Email: user@example.com';
      const mentions = parseMentions(text);

      expect(mentions).toContain('example');
    });

    it('should handle @ at end of string', () => {
      const text = 'Hello @';
      const mentions = parseMentions(text);

      expect(mentions).toHaveLength(0);
    });

    it('should parse underscores in usernames', () => {
      const text = 'Hey @user_name and @another_user_123';
      const mentions = parseMentions(text);

      expect(mentions).toContain('user_name');
      expect(mentions).toContain('another_user_123');
    });
  });

  describe('formatMention', () => {
    it('should format simple username without brackets', () => {
      const result = formatMention({ id: '1', name: 'alice' });
      expect(result).toBe('@alice');
    });

    it('should format name with spaces using brackets', () => {
      const result = formatMention({ id: '1', name: 'John Doe' });
      expect(result).toBe('@[John Doe]');
    });

    it('should handle single character names', () => {
      const result = formatMention({ id: '1', name: 'x' });
      expect(result).toBe('@x');
    });
  });

  describe('highlightMentions', () => {
    it('should parse text with no mentions', () => {
      const result = highlightMentions('Hello world!');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', content: 'Hello world!' });
    });

    it('should highlight simple mentions', () => {
      const result = highlightMentions('Hello @alice!');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'text', content: 'Hello ' });
      expect(result[1]).toEqual({ type: 'mention', content: 'alice', isCurrentUser: false });
      expect(result[2]).toEqual({ type: 'text', content: '!' });
    });

    it('should highlight bracket mentions', () => {
      const result = highlightMentions('Hey @[John Doe], how are you?');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'text', content: 'Hey ' });
      expect(result[1]).toEqual({ type: 'mention', content: 'John Doe', isCurrentUser: false });
      expect(result[2]).toEqual({ type: 'text', content: ', how are you?' });
    });

    it('should mark current user mentions', () => {
      const result = highlightMentions('Hey @alice, @bob is here', 'alice');

      const aliceMention = result.find(
        (p) => p.type === 'mention' && p.content === 'alice'
      );
      const bobMention = result.find(
        (p) => p.type === 'mention' && p.content === 'bob'
      );

      expect(aliceMention?.isCurrentUser).toBe(true);
      expect(bobMention?.isCurrentUser).toBe(false);
    });

    it('should handle multiple consecutive mentions', () => {
      const result = highlightMentions('@alice @bob @charlie');

      const mentions = result.filter((p) => p.type === 'mention');
      expect(mentions).toHaveLength(3);
      expect(mentions.map((m) => m.content)).toEqual(['alice', 'bob', 'charlie']);
    });

    it('should handle mention at start of text', () => {
      const result = highlightMentions('@alice is here');

      expect(result[0]).toEqual({ type: 'mention', content: 'alice', isCurrentUser: false });
      expect(result[1]).toEqual({ type: 'text', content: ' is here' });
    });

    it('should handle mention at end of text', () => {
      const result = highlightMentions('Hello @alice');

      expect(result[0]).toEqual({ type: 'text', content: 'Hello ' });
      expect(result[1]).toEqual({ type: 'mention', content: 'alice', isCurrentUser: false });
    });

    it('should handle only a mention', () => {
      const result = highlightMentions('@alice');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'mention', content: 'alice', isCurrentUser: false });
    });

    it('should handle mixed mention formats', () => {
      const result = highlightMentions('@alice and @[Bob Smith] are here');

      // Verify we have the expected parts
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result[0]).toEqual({ type: 'mention', content: 'alice', isCurrentUser: false });
      expect(result[1]).toEqual({ type: 'text', content: ' and ' });
      expect(result[2]).toEqual({ type: 'mention', content: 'Bob Smith', isCurrentUser: false });
      // The remaining text should be at the end
      expect(result[result.length - 1].content).toContain('are here');
    });

    it('should handle empty string', () => {
      const result = highlightMentions('');

      expect(result).toHaveLength(0);
    });
  });
});
