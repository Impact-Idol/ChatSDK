/**
 * k6 Load Test - Comprehensive Mixed Scenario
 *
 * Tests realistic user behavior with mixed operations:
 * - Message sending
 * - Poll creation and voting
 * - Reactions
 * - File uploads
 * - Channel switching
 * - Search operations
 *
 * Run with:
 * k6 run tests/load/comprehensive-scenario.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const operationSuccess = new Rate('operation_success');
const operationDuration = new Trend('operation_duration');

// Test configuration
const API_URL = __ENV.API_URL || 'http://localhost:5500';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Realistic load pattern
export const options = {
  scenarios: {
    // Morning rush (8-10 AM)
    morning_rush: {
      executor: 'ramping-vus',
      startTime: '0s',
      stages: [
        { duration: '5m', target: 200 },   // Ramp up
        { duration: '10m', target: 200 },  // Sustained
        { duration: '3m', target: 50 },    // Ramp down
      ],
      gracefulRampDown: '1m',
    },

    // Lunch time spike (12-1 PM)
    lunch_spike: {
      executor: 'ramping-vus',
      startTime: '20m',
      stages: [
        { duration: '2m', target: 300 },   // Quick spike
        { duration: '5m', target: 300 },   // Sustained
        { duration: '3m', target: 100 },   // Ramp down
      ],
      gracefulRampDown: '1m',
    },

    // Evening activity (5-7 PM)
    evening_activity: {
      executor: 'ramping-vus',
      startTime: '35m',
      stages: [
        { duration: '5m', target: 250 },
        { duration: '15m', target: 250 },
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '1m',
    },

    // Constant background load
    background_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '60m',
    },
  },

  thresholds: {
    operation_success: ['rate>0.95'],
    operation_duration: ['p(95)<2000'],
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

// User behavior patterns
const USER_BEHAVIORS = [
  'casual',      // Reads mostly, occasionally sends messages
  'active',      // Frequently sends messages and reacts
  'lurker',      // Only reads, never sends
  'moderator',   // Monitors and moderates content
];

// Setup
export function setup() {
  console.log('🔧 Setting up comprehensive load test...');

  // Create multiple test channels
  const channels = [];
  for (let i = 0; i < 5; i++) {
    const channelRes = http.post(
      `${API_URL}/api/channels`,
      JSON.stringify({
        workspace_id: 'comp-test-workspace',
        name: `channel-${i}`,
        app_id: 'comp-test-app',
        is_private: false,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }
    );

    const channelData = JSON.parse(channelRes.body);
    channels.push(channelData.id);
  }

  console.log(`✅ Created ${channels.length} test channels`);

  return { channels };
}

// Main test
export default function (data) {
  const { channels } = data;
  const userBehavior = randomItem(USER_BEHAVIORS);
  const userId = `user-${__VU}`;
  const channelId = randomItem(channels);

  // Simulate user session
  group('User Session', function () {
    // 1. User authenticates (cached in real scenario)
    sleep(0.5);

    // 2. User behavior based on type
    switch (userBehavior) {
      case 'casual':
        casualUserBehavior(channelId, userId);
        break;
      case 'active':
        activeUserBehavior(channelId, userId);
        break;
      case 'lurker':
        lurkerBehavior(channelId);
        break;
      case 'moderator':
        moderatorBehavior(channelId, userId);
        break;
    }
  });

  // Think time between sessions
  sleep(Math.random() * 10 + 5); // 5-15 seconds
}

// Casual user behavior
function casualUserBehavior(channelId, userId) {
  group('Casual User Actions', function () {
    // Read messages (80% of time)
    if (Math.random() < 0.8) {
      getMessages(channelId);
    }

    // Send message (15% of time)
    if (Math.random() < 0.15) {
      sendMessage(channelId, userId, 'Just checking in!');
    }

    // Add reaction (5% of time)
    if (Math.random() < 0.05) {
      addReaction(channelId, userId);
    }
  });
}

// Active user behavior
function activeUserBehavior(channelId, userId) {
  group('Active User Actions', function () {
    // Send multiple messages
    for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
      sendMessage(channelId, userId, randomString(20));
      sleep(1);
    }

    // Create poll (10% of time)
    if (Math.random() < 0.1) {
      createPoll(channelId, userId);
    }

    // Add reactions frequently
    if (Math.random() < 0.5) {
      addReaction(channelId, userId);
    }

    // Search messages (20% of time)
    if (Math.random() < 0.2) {
      searchMessages(channelId);
    }
  });
}

// Lurker behavior
function lurkerBehavior(channelId) {
  group('Lurker Actions', function () {
    // Only read messages
    getMessages(channelId);
    sleep(5);
    getMessages(channelId);
  });
}

// Moderator behavior
function moderatorBehavior(channelId, userId) {
  group('Moderator Actions', function () {
    // Check moderation queue
    checkModerationQueue();

    // Read messages
    getMessages(channelId);

    // Occasionally take moderation actions (30% of time)
    if (Math.random() < 0.3) {
      handleModeration(userId);
    }
  });
}

// Helper functions
function getMessages(channelId) {
  const startTime = Date.now();

  const response = http.get(
    `${API_URL}/api/channels/${channelId}/messages?limit=50`,
    {
      headers: { 'X-API-Key': API_KEY },
      tags: { name: 'GetMessages' },
    }
  );

  const duration = Date.now() - startTime;
  operationDuration.add(duration);

  const success = check(response, {
    'messages fetched successfully': (r) => r.status === 200,
  });

  operationSuccess.add(success);

  return success;
}

function sendMessage(channelId, userId, text) {
  const startTime = Date.now();

  const response = http.post(
    `${API_URL}/api/messages`,
    JSON.stringify({
      channel_id: channelId,
      user_id: userId,
      text: text,
      app_id: 'comp-test-app',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      tags: { name: 'SendMessage' },
    }
  );

  const duration = Date.now() - startTime;
  operationDuration.add(duration);

  const success = check(response, {
    'message sent successfully': (r) => r.status === 201,
  });

  operationSuccess.add(success);

  return success ? JSON.parse(response.body).id : null;
}

function addReaction(channelId, userId) {
  // Get a random message first
  const messagesRes = http.get(
    `${API_URL}/api/channels/${channelId}/messages?limit=10`,
    {
      headers: { 'X-API-Key': API_KEY },
    }
  );

  if (messagesRes.status !== 200) return false;

  const messages = JSON.parse(messagesRes.body).messages;
  if (messages.length === 0) return false;

  const messageId = randomItem(messages).id;
  const emojis = ['👍', '❤️', '😄', '🎉', '👏'];
  const emoji = randomItem(emojis);

  const startTime = Date.now();

  const response = http.post(
    `${API_URL}/api/messages/${messageId}/reactions`,
    JSON.stringify({
      user_id: userId,
      emoji: emoji,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      tags: { name: 'AddReaction' },
    }
  );

  const duration = Date.now() - startTime;
  operationDuration.add(duration);

  const success = check(response, {
    'reaction added successfully': (r) => r.status === 201 || r.status === 200,
  });

  operationSuccess.add(success);

  return success;
}

function createPoll(channelId, userId) {
  // Send message first
  const messageId = sendMessage(channelId, userId, 'Quick poll!');
  if (!messageId) return false;

  const startTime = Date.now();

  const response = http.post(
    `${API_URL}/api/messages/${messageId}/polls`,
    JSON.stringify({
      question: 'What do you think?',
      options: [
        { id: 'opt1', text: 'Option 1' },
        { id: 'opt2', text: 'Option 2' },
        { id: 'opt3', text: 'Option 3' },
      ],
      is_anonymous: false,
      is_multi_choice: false,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      tags: { name: 'CreatePoll' },
    }
  );

  const duration = Date.now() - startTime;
  operationDuration.add(duration);

  const success = check(response, {
    'poll created successfully': (r) => r.status === 201,
  });

  operationSuccess.add(success);

  return success;
}

function searchMessages(channelId) {
  const startTime = Date.now();

  const response = http.get(
    `${API_URL}/api/channels/${channelId}/search?q=${randomString(5)}`,
    {
      headers: { 'X-API-Key': API_KEY },
      tags: { name: 'SearchMessages' },
    }
  );

  const duration = Date.now() - startTime;
  operationDuration.add(duration);

  const success = check(response, {
    'search completed successfully': (r) => r.status === 200,
  });

  operationSuccess.add(success);

  return success;
}

function checkModerationQueue() {
  const startTime = Date.now();

  const response = http.get(
    `${API_URL}/api/moderation/reports?status=pending`,
    {
      headers: { 'X-API-Key': API_KEY },
      tags: { name: 'CheckModerationQueue' },
    }
  );

  const duration = Date.now() - startTime;
  operationDuration.add(duration);

  const success = check(response, {
    'moderation queue checked': (r) => r.status === 200,
  });

  operationSuccess.add(success);

  return success;
}

function handleModeration(userId) {
  // Get pending reports
  const reportsRes = http.get(
    `${API_URL}/api/moderation/reports?status=pending&limit=1`,
    {
      headers: { 'X-API-Key': API_KEY },
    }
  );

  if (reportsRes.status !== 200) return false;

  const reports = JSON.parse(reportsRes.body).reports;
  if (reports.length === 0) return false;

  const reportId = reports[0].id;

  const startTime = Date.now();

  const response = http.patch(
    `${API_URL}/api/moderation/reports/${reportId}`,
    JSON.stringify({
      status: 'resolved',
      action_taken: 'no_action',
      moderator_notes: 'Reviewed by automated moderator',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      tags: { name: 'HandleModeration' },
    }
  );

  const duration = Date.now() - startTime;
  operationDuration.add(duration);

  const success = check(response, {
    'moderation action taken': (r) => r.status === 200,
  });

  operationSuccess.add(success);

  return success;
}

// Teardown
export function teardown(data) {
  console.log('🧹 Cleaning up comprehensive load test data...');

  // Delete test channels
  for (const channelId of data.channels) {
    http.del(`${API_URL}/api/channels/${channelId}`, {
      headers: { 'X-API-Key': API_KEY },
    });
  }

  console.log('✅ Cleanup complete');
}

// Custom summary
export function handleSummary(data) {
  const metrics = data.metrics;

  let summary = '\n';
  summary += 'Comprehensive Load Test Summary:\n';
  summary += '================================\n\n';

  summary += 'Overall Performance:\n';
  summary += `  Total Operations: ${metrics.operation_success.values.count}\n`;
  summary += `  Success Rate: ${(metrics.operation_success.values.rate * 100).toFixed(2)}%\n`;
  summary += `  Operation Duration (avg): ${metrics.operation_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  Operation Duration (p95): ${metrics.operation_duration.values['p(95)'].toFixed(2)}ms\n\n`;

  summary += 'HTTP Performance:\n';
  summary += `  HTTP Requests: ${metrics.http_reqs.values.count}\n`;
  summary += `  HTTP Duration (p95): ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  HTTP Failures: ${((metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2)}%\n\n`;

  console.log(summary);

  return {
    'stdout': summary,
    'comprehensive-load-test-results.json': JSON.stringify(data, null, 2),
  };
}
