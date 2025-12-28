/**
 * k6 Load Test - WebSocket Connections and Real-Time Messaging
 *
 * Tests the system's ability to handle many concurrent WebSocket connections
 * and real-time message broadcasting.
 *
 * Scenarios tested:
 * - 1000+ concurrent WebSocket connections
 * - Real-time message broadcasting to all connected clients
 * - Connection stability over time
 * - Reconnection handling
 *
 * Run with:
 * k6 run tests/load/websocket-connections.js
 */

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import http from 'k6/http';

// Custom metrics
const wsConnectionTime = new Trend('ws_connection_time');
const wsConnectionSuccess = new Rate('ws_connection_success');
const messageLatency = new Trend('message_latency');
const messagesReceived = new Counter('messages_received');
const activeConnections = new Gauge('active_ws_connections');
const reconnectionRate = new Rate('reconnection_success_rate');

// Test configuration
const WS_URL = __ENV.WS_URL || 'ws://localhost:5500/ws';
const API_URL = __ENV.API_URL || 'http://localhost:5500';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export const options = {
  stages: [
    // Ramp up to 100 connections
    { duration: '30s', target: 100 },

    // Ramp up to 500 connections
    { duration: '1m', target: 500 },

    // Ramp up to 1000 connections
    { duration: '1m', target: 1000 },

    // Hold at 1000 connections for 5 minutes
    { duration: '5m', target: 1000 },

    // Ramp down
    { duration: '1m', target: 0 },
  ],

  thresholds: {
    // 95% of WebSocket connections must succeed
    ws_connection_success: ['rate>0.95'],

    // 95% of connections must establish within 1 second
    ws_connection_time: ['p(95)<1000'],

    // Message latency must be below 200ms for 95% of messages
    message_latency: ['p(95)<200'],

    // Reconnection success rate must be above 90%
    reconnection_success_rate: ['rate>0.90'],
  },
};

// Setup
export function setup() {
  console.log('🔧 Setting up WebSocket load test...');

  // Create test channel
  const channelRes = http.post(
    `${API_URL}/api/channels`,
    JSON.stringify({
      workspace_id: 'ws-load-test-workspace',
      name: 'ws-load-test-channel',
      app_id: 'ws-load-test-app',
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
  console.log(`✅ Created test channel: ${channelData.id}`);

  return {
    channelId: channelData.id,
  };
}

// Main test
export default function (data) {
  const { channelId } = data;
  const userId = `ws-user-${__VU}`;

  let messagesReceivedCount = 0;
  let connectionStartTime = Date.now();

  // Connect to WebSocket
  const url = `${WS_URL}?channel_id=${channelId}&user_id=${userId}`;

  const response = ws.connect(url, {
    headers: {
      'X-API-Key': API_KEY,
    },
  }, function (socket) {
    // Connection established
    const connectionTime = Date.now() - connectionStartTime;
    wsConnectionTime.add(connectionTime);
    wsConnectionSuccess.add(true);
    activeConnections.add(1);

    console.log(`[VU ${__VU}] WebSocket connected in ${connectionTime}ms`);

    // Subscribe to channel
    socket.on('open', function () {
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel_id: channelId,
      }));
    });

    // Handle incoming messages
    socket.on('message', function (message) {
      messagesReceivedCount++;
      messagesReceived.add(1);

      try {
        const data = JSON.parse(message);

        // Calculate message latency (if timestamp is included)
        if (data.timestamp) {
          const latency = Date.now() - new Date(data.timestamp).getTime();
          messageLatency.add(latency);
        }

        // Log occasionally
        if (messagesReceivedCount % 100 === 0) {
          console.log(`[VU ${__VU}] Received ${messagesReceivedCount} messages`);
        }
      } catch (e) {
        console.error(`[VU ${__VU}] Failed to parse message:`, e);
      }
    });

    // Handle errors
    socket.on('error', function (e) {
      console.error(`[VU ${__VU}] WebSocket error:`, e);
      wsConnectionSuccess.add(false);
    });

    // Handle close
    socket.on('close', function () {
      console.log(`[VU ${__VU}] WebSocket closed after receiving ${messagesReceivedCount} messages`);
      activeConnections.add(-1);
    });

    // Send periodic messages
    const sendInterval = setInterval(function () {
      if (socket.readyState === ws.READY_STATE_OPEN) {
        socket.send(JSON.stringify({
          type: 'message',
          channel_id: channelId,
          user_id: userId,
          text: `Test message from VU ${__VU} at ${Date.now()}`,
          timestamp: new Date().toISOString(),
        }));
      }
    }, 5000); // Send message every 5 seconds

    // Test connection stability - keep connection open for 30-60 seconds
    const connectionDuration = Math.random() * 30000 + 30000;
    setTimeout(function () {
      clearInterval(sendInterval);
      socket.close();
    }, connectionDuration);

    // Test reconnection after random disconnect
    if (Math.random() < 0.1) { // 10% chance
      setTimeout(function () {
        console.log(`[VU ${__VU}] Testing reconnection...`);
        socket.close();

        // Attempt to reconnect
        sleep(1);
        const reconnectStart = Date.now();
        const reconnectResponse = ws.connect(url, {}, function (newSocket) {
          const reconnectTime = Date.now() - reconnectStart;
          console.log(`[VU ${__VU}] Reconnected in ${reconnectTime}ms`);
          reconnectionRate.add(true);
          newSocket.close();
        });

        if (!reconnectResponse) {
          reconnectionRate.add(false);
        }
      }, 15000);
    }
  });

  check(response, {
    'WebSocket connection opened': (r) => r && r.status === 101,
  });

  // Think time
  sleep(1);
}

// Teardown
export function teardown(data) {
  console.log('🧹 Cleaning up WebSocket load test data...');

  // Delete test channel
  http.del(`${API_URL}/api/channels/${data.channelId}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  console.log('✅ Cleanup complete');
}

// Custom summary
export function handleSummary(data) {
  const metrics = data.metrics;

  let summary = '\n';
  summary += 'WebSocket Load Test Summary:\n';
  summary += '===========================\n\n';

  summary += 'Connection Performance:\n';
  summary += `  Total Connections: ${metrics.ws_connection_success.values.count}\n`;
  summary += `  Success Rate: ${(metrics.ws_connection_success.values.rate * 100).toFixed(2)}%\n`;
  summary += `  Connection Time (avg): ${metrics.ws_connection_time.values.avg.toFixed(2)}ms\n`;
  summary += `  Connection Time (p95): ${metrics.ws_connection_time.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  Peak Active Connections: ${metrics.active_ws_connections.values.max}\n\n`;

  summary += 'Message Performance:\n';
  summary += `  Messages Received: ${metrics.messages_received.values.count}\n`;
  summary += `  Message Latency (avg): ${metrics.message_latency.values.avg.toFixed(2)}ms\n`;
  summary += `  Message Latency (p95): ${metrics.message_latency.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  Message Latency (p99): ${metrics.message_latency.values['p(99)'].toFixed(2)}ms\n\n`;

  summary += 'Reconnection Performance:\n';
  summary += `  Reconnection Success Rate: ${(metrics.reconnection_success_rate.values.rate * 100).toFixed(2)}%\n\n`;

  console.log(summary);

  return {
    'stdout': summary,
    'websocket-load-test-results.json': JSON.stringify(data, null, 2),
  };
}
