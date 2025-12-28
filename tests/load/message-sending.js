/**
 * k6 Load Test - Message Sending Performance
 *
 * Tests the system's ability to handle high-volume message sending.
 *
 * Scenarios tested:
 * - Ramping up to 100 concurrent users
 * - Sustained load of 100 users for 5 minutes
 * - Spike to 500 users
 * - Graceful ramp down
 *
 * Run with:
 * k6 run tests/load/message-sending.js
 *
 * Or with custom VUs:
 * k6 run --vus 200 --duration 10m tests/load/message-sending.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const messageSuccessRate = new Rate('message_success_rate');
const messageDuration = new Trend('message_send_duration');
const messagesPerSecond = new Counter('messages_per_second');
const wsConnectionRate = new Rate('websocket_connection_rate');

// Test configuration
const API_URL = __ENV.API_URL || 'http://localhost:5500';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Load test stages
export const options = {
  stages: [
    // Ramp up from 0 to 100 users over 1 minute
    { duration: '1m', target: 100 },

    // Stay at 100 users for 5 minutes
    { duration: '5m', target: 100 },

    // Spike to 500 users over 30 seconds
    { duration: '30s', target: 500 },

    // Hold spike for 1 minute
    { duration: '1m', target: 500 },

    // Ramp down to 0 over 1 minute
    { duration: '1m', target: 0 },
  ],

  thresholds: {
    // 95% of requests must complete within 500ms
    http_req_duration: ['p(95)<500'],

    // 99% of message sends must succeed
    message_success_rate: ['rate>0.99'],

    // Error rate must be below 1%
    http_req_failed: ['rate<0.01'],

    // 95% of WebSocket connections must succeed
    websocket_connection_rate: ['rate>0.95'],
  },
};

// Test data
let testChannelId;
let testUserId;

// Setup function - runs once before all VUs
export function setup() {
  console.log('🔧 Setting up load test...');

  // Create test channel
  const channelRes = http.post(
    `${API_URL}/api/channels`,
    JSON.stringify({
      workspace_id: 'load-test-workspace',
      name: 'load-test-channel',
      app_id: 'load-test-app',
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
  testChannelId = channelData.id;

  // Create test user
  const userRes = http.post(
    `${API_URL}/api/users`,
    JSON.stringify({
      app_id: 'load-test-app',
      user_id: `load-test-user-${Date.now()}`,
      name: 'Load Test User',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    }
  );

  const userData = JSON.parse(userRes.body);
  testUserId = userData.id;

  console.log(`✅ Created test channel: ${testChannelId}`);
  console.log(`✅ Created test user: ${testUserId}`);

  return {
    channelId: testChannelId,
    userId: testUserId,
  };
}

// Main test function - runs for each VU
export default function (data) {
  const { channelId, userId } = data;

  // Generate unique message content
  const messageText = `Load test message ${__VU}-${__ITER} at ${Date.now()}`;

  // Send message
  const startTime = Date.now();

  const response = http.post(
    `${API_URL}/api/messages`,
    JSON.stringify({
      channel_id: channelId,
      user_id: userId,
      text: messageText,
      app_id: 'load-test-app',
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

  // Record metrics
  const success = check(response, {
    'status is 201': (r) => r.status === 201,
    'response has id': (r) => JSON.parse(r.body).id !== undefined,
    'response time < 500ms': () => duration < 500,
  });

  messageSuccessRate.add(success);
  messageDuration.add(duration);
  messagesPerSecond.add(1);

  // Think time - simulate real user behavior
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

// Teardown function - runs once after all VUs
export function teardown(data) {
  console.log('🧹 Cleaning up load test data...');

  // Delete test channel
  http.del(`${API_URL}/api/channels/${data.channelId}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  // Delete test user
  http.del(`${API_URL}/api/users/${data.userId}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  console.log('✅ Cleanup complete');
}

// Handle summary - custom reporting
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors !== false;

  const metrics = data.metrics;

  let summary = '\n';
  summary += `${indent}Load Test Summary:\n`;
  summary += `${indent}==================\n\n`;

  // HTTP metrics
  summary += `${indent}HTTP Performance:\n`;
  summary += `${indent}  Total Requests: ${metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Failed Requests: ${metrics.http_req_failed.values.passes || 0}\n`;
  summary += `${indent}  Request Duration (avg): ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Request Duration (p95): ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  Request Duration (p99): ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;

  // Message metrics
  summary += `${indent}Message Performance:\n`;
  summary += `${indent}  Messages Sent: ${metrics.messages_per_second.values.count}\n`;
  summary += `${indent}  Success Rate: ${(metrics.message_success_rate.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}  Send Duration (avg): ${metrics.message_send_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Send Duration (p95): ${metrics.message_send_duration.values['p(95)'].toFixed(2)}ms\n\n`;

  // Thresholds
  summary += `${indent}Thresholds:\n`;
  const thresholds = data.root_group.checks;
  for (const [name, result] of Object.entries(thresholds)) {
    const status = result.passes === result.fails ? '✅ PASS' : '❌ FAIL';
    summary += `${indent}  ${status} ${name}\n`;
  }

  return summary;
}
