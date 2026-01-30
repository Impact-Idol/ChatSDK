/**
 * Tests for Part 5: ChatClient member management methods
 *
 * Tests updateWorkspaceMemberRole, updateChannelMemberRole,
 * addWorkspaceMembers, removeWorkspaceMember,
 * addChannelMembers, removeChannelMember
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock centrifuge before import
vi.mock('centrifuge', () => ({
  Centrifuge: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    state: 'connected',
    newSubscription: vi.fn().mockReturnValue({
      on: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    }),
    getSubscription: vi.fn().mockReturnValue(null),
  })),
}));

// Mock IndexedDB storage
vi.mock('../storage/IndexedDBStorage', () => ({
  IndexedDBStorage: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  })),
}));

import { ChatClient } from '../client/ChatClient';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createClient() {
  return new ChatClient({
    apiKey: 'test-key',
    apiUrl: 'http://localhost:5500',
    wsUrl: 'ws://localhost:8000/connection/websocket',
    debug: false,
  });
}

function mockFetchResponse(data: any, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers(),
  });
}

describe('ChatClient Member Operations (Part 5)', () => {
  let client: ChatClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = createClient();
    // Set token directly for testing
    (client as any).token = 'test-token';
  });

  describe('AC7: updateWorkspaceMemberRole', () => {
    it('should call PATCH /api/workspaces/:id/members/:userId with role', async () => {
      mockFetchResponse({ success: true, role: 'admin' });

      const result = await client.updateWorkspaceMemberRole('ws-1', 'user-1', 'admin');

      expect(result).toEqual({ success: true, role: 'admin' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5500/api/workspaces/ws-1/members/user-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ role: 'admin' }),
        }),
      );
    });
  });

  describe('AC8: updateChannelMemberRole', () => {
    it('should call PATCH /api/channels/:channelId/members/:userId with role', async () => {
      mockFetchResponse({ success: true, role: 'moderator' });

      const result = await client.updateChannelMemberRole('ch-1', 'user-1', 'moderator');

      expect(result).toEqual({ success: true, role: 'moderator' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5500/api/channels/ch-1/members/user-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ role: 'moderator' }),
        }),
      );
    });
  });

  describe('addWorkspaceMembers', () => {
    it('should call POST /api/workspaces/:id/members with userIds and role', async () => {
      mockFetchResponse({ added: ['u1', 'u2'], count: 2 });

      const result = await client.addWorkspaceMembers('ws-1', ['u1', 'u2'], 'member');

      expect(result).toEqual({ added: ['u1', 'u2'], count: 2 });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5500/api/workspaces/ws-1/members',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userIds: ['u1', 'u2'], role: 'member' }),
        }),
      );
    });
  });

  describe('removeWorkspaceMember', () => {
    it('should call DELETE /api/workspaces/:id/members/:userId', async () => {
      mockFetchResponse({ success: true });

      await client.removeWorkspaceMember('ws-1', 'user-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5500/api/workspaces/ws-1/members/user-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('addChannelMembers', () => {
    it('should call POST /api/channels/:channelId/members with userIds', async () => {
      mockFetchResponse({ success: true, addedCount: 2 });

      const result = await client.addChannelMembers('ch-1', ['u1', 'u2']);

      expect(result).toEqual({ success: true, addedCount: 2 });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5500/api/channels/ch-1/members',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userIds: ['u1', 'u2'] }),
        }),
      );
    });
  });

  describe('removeChannelMember', () => {
    it('should call DELETE /api/channels/:channelId/members/:userId', async () => {
      mockFetchResponse({ success: true });

      await client.removeChannelMember('ch-1', 'user-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5500/api/channels/ch-1/members/user-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
