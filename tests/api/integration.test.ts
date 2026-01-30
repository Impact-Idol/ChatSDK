/**
 * ChatSDK API Integration Tests
 *
 * Tests all major API endpoints including:
 * - Workspace CRUD operations
 * - Poll creation and voting
 * - Message reporting and moderation
 * - User blocking
 * - Webhooks
 *
 * Run with: npm run test:api
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// Test configuration
const API_URL = process.env.TEST_API_URL || 'http://localhost:5500';
const TEST_APP_ID = 'test-app-' + Date.now();
let TEST_API_KEY = '';
let testWorkspaceId = '';
let testChannelId = '';
let testUserId = '';
let testMessageId = '';
let testPollId = '';

// Helper function to make API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(TEST_API_KEY && { 'X-API-Key': TEST_API_KEY }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  return { response, data };
}

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

beforeAll(async () => {
  console.log('🔧 Setting up test environment...');

  // Create test API key
  const { data } = await apiCall('/api/auth/api-keys', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Integration Test Key',
      app_id: TEST_APP_ID,
      scopes: [
        'workspaces:read',
        'workspaces:write',
        'channels:read',
        'channels:write',
        'messages:read',
        'messages:write',
        'polls:read',
        'polls:write',
        'moderation:read',
        'moderation:write',
      ],
    }),
  });

  TEST_API_KEY = data.api_key;
  console.log('✅ Test API key created');

  // Create test user
  const userResponse = await apiCall('/api/users', {
    method: 'POST',
    body: JSON.stringify({
      app_id: TEST_APP_ID,
      user_id: 'test-user-1',
      name: 'Test User',
      email: 'test@example.com',
    }),
  });

  testUserId = userResponse.data.id;
  console.log('✅ Test user created');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test data...');

  // Clean up test workspace (cascades to channels, messages, etc.)
  if (testWorkspaceId) {
    await apiCall(`/api/workspaces/${testWorkspaceId}`, {
      method: 'DELETE',
    });
    console.log('✅ Test workspace deleted');
  }

  // Clean up test user
  if (testUserId) {
    await apiCall(`/api/users/${testUserId}`, {
      method: 'DELETE',
    });
    console.log('✅ Test user deleted');
  }

  console.log('✅ Cleanup complete');
});

// ============================================================================
// WORKSPACE TESTS
// ============================================================================

describe('Workspace CRUD Operations', () => {
  it('should create a workspace', async () => {
    const { response, data } = await apiCall('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Workspace',
        type: 'team',
        app_id: TEST_APP_ID,
      }),
    });

    expect(response.status).toBe(201);
    expect(data.name).toBe('Test Workspace');
    expect(data.type).toBe('team');
    expect(data.id).toBeTruthy();

    testWorkspaceId = data.id;
  });

  it('should list workspaces', async () => {
    const { response, data } = await apiCall('/api/workspaces');

    expect(response.status).toBe(200);
    expect(data.workspaces).toBeInstanceOf(Array);
    expect(data.workspaces.length).toBeGreaterThan(0);

    const testWorkspace = data.workspaces.find(
      (ws: any) => ws.id === testWorkspaceId
    );
    expect(testWorkspace).toBeTruthy();
  });

  it('should get a specific workspace', async () => {
    const { response, data } = await apiCall(`/api/workspaces/${testWorkspaceId}`);

    expect(response.status).toBe(200);
    expect(data.id).toBe(testWorkspaceId);
    expect(data.name).toBe('Test Workspace');
  });

  it('should update a workspace', async () => {
    const { response, data } = await apiCall(`/api/workspaces/${testWorkspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Updated Test Workspace',
      }),
    });

    expect(response.status).toBe(200);
    expect(data.name).toBe('Updated Test Workspace');
  });

  it('should get workspace stats', async () => {
    const { response, data } = await apiCall(
      `/api/workspaces/${testWorkspaceId}/stats`
    );

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('member_count');
    expect(data).toHaveProperty('channel_count');
    expect(data).toHaveProperty('message_count');
  });
});

// ============================================================================
// WORKSPACE MEMBER MANAGEMENT WITH API KEY TESTS
// ============================================================================

describe('Workspace Member Management with API Key', () => {
  let regularUserId = 'regular-user-' + Date.now();
  let regularUserToken = '';

  beforeAll(async () => {
    // Create a regular user and get their token via POST /tokens
    const { data } = await apiCall('/tokens', {
      method: 'POST',
      body: JSON.stringify({
        userId: regularUserId,
        name: 'Regular User',
      }),
    });

    regularUserToken = data.token;
  });

  it('should allow adding members to workspace when API key is present, even if Bearer token user is not a workspace member', async () => {
    // This reproduces the Impact Idol bug:
    // The Bearer token belongs to a user who is NOT a workspace member/owner,
    // but the request includes a valid X-API-Key which should authorize the operation.
    const { response, data } = await apiCall(
      `/api/workspaces/${testWorkspaceId}/members`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${regularUserToken}`,
        },
        body: JSON.stringify({
          userIds: [regularUserId],
          role: 'member',
        }),
      }
    );

    // With a valid API key, this should succeed regardless of the Bearer token user's role
    expect(response.status).toBe(200);
    expect(data.added).toContain(regularUserId);
  });

  afterAll(async () => {
    // Clean up: remove the regular user from workspace
    if (testWorkspaceId && regularUserId) {
      await apiCall(
        `/api/workspaces/${testWorkspaceId}/members/${regularUserId}`,
        { method: 'DELETE' }
      );
    }
  });
});

// ============================================================================
// CHANNEL TESTS
// ============================================================================

describe('Channel Operations', () => {
  it('should create a channel in workspace', async () => {
    const { response, data } = await apiCall('/api/channels', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: testWorkspaceId,
        name: 'test-channel',
        is_private: false,
        app_id: TEST_APP_ID,
      }),
    });

    expect(response.status).toBe(201);
    expect(data.name).toBe('test-channel');
    expect(data.workspace_id).toBe(testWorkspaceId);

    testChannelId = data.id;
  });

  it('should list channels in workspace', async () => {
    const { response, data } = await apiCall(
      `/api/workspaces/${testWorkspaceId}/channels`
    );

    expect(response.status).toBe(200);
    expect(data.channels).toBeInstanceOf(Array);
    expect(data.channels.length).toBeGreaterThan(0);
  });

  it('should add member to channel', async () => {
    const { response, data } = await apiCall(
      `/api/channels/${testChannelId}/members`,
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: testUserId,
          role: 'member',
        }),
      }
    );

    expect(response.status).toBe(201);
    expect(data.user_id).toBe(testUserId);
    expect(data.channel_id).toBe(testChannelId);
  });
});

// ============================================================================
// MESSAGE TESTS
// ============================================================================

describe('Message Operations', () => {
  it('should send a message', async () => {
    const { response, data } = await apiCall('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        channel_id: testChannelId,
        user_id: testUserId,
        text: 'Test message',
        app_id: TEST_APP_ID,
      }),
    });

    expect(response.status).toBe(201);
    expect(data.text).toBe('Test message');
    expect(data.channel_id).toBe(testChannelId);

    testMessageId = data.id;
  });

  it('should get messages in channel', async () => {
    const { response, data } = await apiCall(
      `/api/channels/${testChannelId}/messages`
    );

    expect(response.status).toBe(200);
    expect(data.messages).toBeInstanceOf(Array);
    expect(data.messages.length).toBeGreaterThan(0);
  });

  it('should add reaction to message', async () => {
    const { response, data } = await apiCall(
      `/api/messages/${testMessageId}/reactions`,
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: testUserId,
          emoji: '👍',
        }),
      }
    );

    expect(response.status).toBe(201);
    expect(data.emoji).toBe('👍');
  });

  it('should get reactions on message', async () => {
    const { response, data } = await apiCall(
      `/api/messages/${testMessageId}/reactions`
    );

    expect(response.status).toBe(200);
    expect(data.reactions).toBeInstanceOf(Array);
    expect(data.reactions.length).toBeGreaterThan(0);
    expect(data.reactions[0].emoji).toBe('👍');
  });
});

// ============================================================================
// POLL TESTS
// ============================================================================

describe('Poll Creation and Voting', () => {
  it('should create a poll on a message', async () => {
    const { response, data } = await apiCall(
      `/api/messages/${testMessageId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'What is your favorite color?',
          options: [
            { id: 'opt1', text: 'Red' },
            { id: 'opt2', text: 'Blue' },
            { id: 'opt3', text: 'Green' },
          ],
          is_anonymous: false,
          is_multi_choice: false,
          ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      }
    );

    expect(response.status).toBe(201);
    expect(data.question).toBe('What is your favorite color?');
    expect(data.options).toHaveLength(3);
    expect(data.is_anonymous).toBe(false);

    testPollId = data.id;
  });

  it('should get poll results', async () => {
    const { response, data } = await apiCall(`/api/polls/${testPollId}/results`);

    expect(response.status).toBe(200);
    expect(data.id).toBe(testPollId);
    expect(data.total_votes).toBe(0);
    expect(data.options).toHaveLength(3);
  });

  it('should vote on a poll (single choice)', async () => {
    const { response, data } = await apiCall(`/api/polls/${testPollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: testUserId,
        option_ids: ['opt1'],
      }),
    });

    expect(response.status).toBe(201);
    expect(data.poll_id).toBe(testPollId);
    expect(data.option_ids).toContain('opt1');
  });

  it('should get updated poll results after vote', async () => {
    const { response, data } = await apiCall(`/api/polls/${testPollId}/results`);

    expect(response.status).toBe(200);
    expect(data.total_votes).toBe(1);

    const votedOption = data.options.find((opt: any) => opt.id === 'opt1');
    expect(votedOption.vote_count).toBe(1);
  });

  it('should remove vote from poll', async () => {
    const { response, data } = await apiCall(`/api/polls/${testPollId}/vote`, {
      method: 'DELETE',
      body: JSON.stringify({
        user_id: testUserId,
      }),
    });

    expect(response.status).toBe(200);
  });

  it('should verify vote was removed', async () => {
    const { response, data } = await apiCall(`/api/polls/${testPollId}/results`);

    expect(response.status).toBe(200);
    expect(data.total_votes).toBe(0);
  });
});

// ============================================================================
// MESSAGE REPORTING & MODERATION TESTS
// ============================================================================

describe('Message Reporting and Moderation', () => {
  let reportId = '';

  it('should report a message', async () => {
    const { response, data } = await apiCall(
      `/api/messages/${testMessageId}/report`,
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: testUserId,
          reason: 'spam',
          details: 'This is a spam message',
        }),
      }
    );

    expect(response.status).toBe(201);
    expect(data.message_id).toBe(testMessageId);
    expect(data.reason).toBe('spam');
    expect(data.status).toBe('pending');

    reportId = data.id;
  });

  it('should list pending reports', async () => {
    const { response, data } = await apiCall('/api/moderation/reports?status=pending');

    expect(response.status).toBe(200);
    expect(data.reports).toBeInstanceOf(Array);

    const testReport = data.reports.find((r: any) => r.id === reportId);
    expect(testReport).toBeTruthy();
  });

  it('should resolve a report', async () => {
    const { response, data } = await apiCall(`/api/moderation/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'resolved',
        action_taken: 'removed',
        moderator_notes: 'Spam confirmed and removed',
      }),
    });

    expect(response.status).toBe(200);
    expect(data.status).toBe('resolved');
    expect(data.action_taken).toBe('removed');
  });

  it('should get moderation stats', async () => {
    const { response, data } = await apiCall('/api/moderation/stats');

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('total_reports');
    expect(data).toHaveProperty('pending_reports');
    expect(data).toHaveProperty('resolved_reports');
  });
});

// ============================================================================
// USER BLOCKING TESTS
// ============================================================================

describe('User Blocking', () => {
  let blockedUserId = '';

  beforeEach(async () => {
    // Create another test user to block
    const { data } = await apiCall('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        app_id: TEST_APP_ID,
        user_id: 'test-user-2',
        name: 'Test User 2',
        email: 'test2@example.com',
      }),
    });
    blockedUserId = data.id;
  });

  it('should block a user', async () => {
    const { response, data } = await apiCall(`/api/users/${testUserId}/blocks`, {
      method: 'POST',
      body: JSON.stringify({
        blocked_user_id: blockedUserId,
      }),
    });

    expect(response.status).toBe(201);
    expect(data.user_id).toBe(testUserId);
    expect(data.blocked_user_id).toBe(blockedUserId);
  });

  it('should list blocked users', async () => {
    const { response, data } = await apiCall(`/api/users/${testUserId}/blocks`);

    expect(response.status).toBe(200);
    expect(data.blocks).toBeInstanceOf(Array);
    expect(data.blocks).toHaveLength(1);
    expect(data.blocks[0].blocked_user_id).toBe(blockedUserId);
  });

  it('should unblock a user', async () => {
    const { response } = await apiCall(
      `/api/users/${testUserId}/blocks/${blockedUserId}`,
      {
        method: 'DELETE',
      }
    );

    expect(response.status).toBe(200);
  });

  it('should verify user is unblocked', async () => {
    const { response, data } = await apiCall(`/api/users/${testUserId}/blocks`);

    expect(response.status).toBe(200);
    expect(data.blocks).toHaveLength(0);
  });
});

// ============================================================================
// WEBHOOK TESTS
// ============================================================================

describe('Webhook Management', () => {
  let webhookId = '';

  it('should create a webhook', async () => {
    const { response, data } = await apiCall('/api/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        app_id: TEST_APP_ID,
        url: 'https://example.com/webhook',
        events: ['message.created', 'message.updated', 'poll.voted'],
        is_active: true,
      }),
    });

    expect(response.status).toBe(201);
    expect(data.url).toBe('https://example.com/webhook');
    expect(data.events).toContain('message.created');
    expect(data.is_active).toBe(true);

    webhookId = data.id;
  });

  it('should list webhooks', async () => {
    const { response, data } = await apiCall('/api/webhooks');

    expect(response.status).toBe(200);
    expect(data.webhooks).toBeInstanceOf(Array);

    const testWebhook = data.webhooks.find((wh: any) => wh.id === webhookId);
    expect(testWebhook).toBeTruthy();
  });

  it('should update webhook', async () => {
    const { response, data } = await apiCall(`/api/webhooks/${webhookId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: false,
      }),
    });

    expect(response.status).toBe(200);
    expect(data.is_active).toBe(false);
  });

  it('should delete webhook', async () => {
    const { response } = await apiCall(`/api/webhooks/${webhookId}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
  });
});

// ============================================================================
// AUTO-ENROLLMENT TESTS
// ============================================================================

describe('Auto-Enrollment Rules', () => {
  let ruleId = '';

  it('should create auto-enrollment rule', async () => {
    const { response, data } = await apiCall('/api/auto-enrollment/rules', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: testWorkspaceId,
        name: 'Auto-enroll all users to general',
        conditions: {
          user_role: 'member',
        },
        actions: {
          add_to_channels: [testChannelId],
        },
        is_active: true,
      }),
    });

    expect(response.status).toBe(201);
    expect(data.name).toBe('Auto-enroll all users to general');
    expect(data.is_active).toBe(true);

    ruleId = data.id;
  });

  it('should list auto-enrollment rules', async () => {
    const { response, data } = await apiCall(
      `/api/workspaces/${testWorkspaceId}/auto-enrollment/rules`
    );

    expect(response.status).toBe(200);
    expect(data.rules).toBeInstanceOf(Array);
    expect(data.rules.length).toBeGreaterThan(0);
  });

  it('should delete auto-enrollment rule', async () => {
    const { response } = await apiCall(`/api/auto-enrollment/rules/${ruleId}`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
  });
});

// ============================================================================
// SEARCH TESTS
// ============================================================================

describe('Search Functionality', () => {
  it('should search messages by text', async () => {
    const { response, data } = await apiCall(
      `/api/channels/${testChannelId}/search?q=Test`
    );

    expect(response.status).toBe(200);
    expect(data.results).toBeInstanceOf(Array);
  });

  it('should search messages by user', async () => {
    const { response, data } = await apiCall(
      `/api/channels/${testChannelId}/search?user_id=${testUserId}`
    );

    expect(response.status).toBe(200);
    expect(data.results).toBeInstanceOf(Array);
  });

  it('should search with date range', async () => {
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = new Date().toISOString();

    const { response, data } = await apiCall(
      `/api/channels/${testChannelId}/search?from=${fromDate}&to=${toDate}`
    );

    expect(response.status).toBe(200);
    expect(data.results).toBeInstanceOf(Array);
  });
});

console.log('\n✅ All API integration tests completed!\n');
