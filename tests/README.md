# ChatSDK Testing Guide

Comprehensive testing documentation for ChatSDK including API integration tests, E2E tests, and load tests.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [API Integration Tests](#api-integration-tests)
4. [E2E Tests (Playwright)](#e2e-tests)
5. [Load Tests (k6)](#load-tests)
6. [CI/CD Integration](#cicd-integration)
7. [Test Coverage](#test-coverage)
8. [Troubleshooting](#troubleshooting)

## Overview

ChatSDK has three levels of testing:

| Test Type | Tool | Purpose | Duration |
|-----------|------|---------|----------|
| **API Integration** | Vitest | Test API endpoints in isolation | ~2 min |
| **E2E** | Playwright | Test complete user workflows in browser | ~10 min |
| **Load** | k6 | Test system performance under load | ~15-60 min |

## Setup

### Prerequisites

```bash
# Install Node.js dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install

# Install k6 (for load tests)
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (via Chocolatey)
choco install k6
```

### Environment Variables

Create `.env.test`:

```bash
# API Configuration
TEST_API_URL=http://localhost:5500
TEST_API_KEY=your-test-api-key

# E2E Configuration
TEST_APP_URL=http://localhost:3000

# Load Test Configuration
LOAD_TEST_API_URL=http://localhost:5500
LOAD_TEST_WS_URL=ws://localhost:5500/ws
LOAD_TEST_API_KEY=your-load-test-api-key
```

## API Integration Tests

### Running API Tests

```bash
# Run all API integration tests
npm run test:api

# Run specific test file
npm run test:api -- tests/api/integration.test.ts

# Run with coverage
npm run test:api -- --coverage

# Run in watch mode
npm run test:api -- --watch
```

### What API Tests Cover

✅ **Workspace CRUD Operations**
- Create, read, update, delete workspaces
- Get workspace stats (members, channels, messages)

✅ **Channel Operations**
- Create channels in workspaces
- List channels
- Add members to channels

✅ **Message Operations**
- Send messages
- Get messages in channel
- Add/remove reactions

✅ **Poll Creation and Voting**
- Create polls on messages
- Vote on polls (single and multi-choice)
- Get poll results
- Remove votes

✅ **Message Reporting & Moderation**
- Report messages
- List pending reports
- Resolve reports
- Get moderation stats

✅ **User Blocking**
- Block users
- List blocked users
- Unblock users

✅ **Webhook Management**
- Create webhooks
- List webhooks
- Update webhooks
- Delete webhooks

✅ **Auto-Enrollment Rules**
- Create auto-enrollment rules
- List rules
- Delete rules

✅ **Search Functionality**
- Search messages by text
- Search by user
- Search with date range

### API Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('Workspace CRUD Operations', () => {
  it('should create a workspace', async () => {
    const { response, data } = await apiCall('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Workspace',
        type: 'team',
      }),
    });

    expect(response.status).toBe(201);
    expect(data.name).toBe('Test Workspace');
  });
});
```

### API Test Metrics

- **Total Tests**: 45+
- **Expected Duration**: ~2 minutes
- **Success Threshold**: 100%
- **Coverage Target**: >80%

## E2E Tests

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/chat-flow.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in UI mode (interactive)
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Generate test report
npx playwright test --reporter=html
```

### What E2E Tests Cover

✅ **Auto-Enrollment Flow**
- User joins workspace
- Auto-enrolled in channels based on rules
- Verify channel access

✅ **Real-Time Messaging**
- User sends message
- Other users see it in real-time
- Typing indicators work

✅ **Poll Creation and Voting**
- User creates poll
- Others vote on poll
- Results update in real-time
- Remove votes

✅ **Message Reporting & Moderation**
- User reports message
- Admin sees report in moderation queue
- Admin takes action
- Message removed from channel

✅ **User Blocking**
- User blocks another user
- Blocked user's messages are hidden
- New messages from blocked user not shown
- Unblock restores visibility

✅ **Guardian Monitoring (Parental Controls)**
- Guardian sets up monitoring for child
- Child's activity is visible in dashboard
- Content filters work
- Flagged content alerts guardian

✅ **File Upload and Media**
- Upload files
- Blurhash progressive loading
- Media gallery

✅ **Thread Conversations**
- Reply in thread
- Thread indicator on main message
- Thread message count updates

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('user sends message and other users see it in real-time', async ({ page, context }) => {
  // User 1 logs in
  await login(page, USER1.email, USER1.password);
  await navigateToChannel(page, 'general');

  // User 2 logs in (another tab)
  const user2Page = await context.newPage();
  await login(user2Page, USER2.email, USER2.password);
  await navigateToChannel(user2Page, 'general');

  // User 1 sends message
  const testMessage = `Test message ${Date.now()}`;
  await sendMessage(page, testMessage);

  // Verify User 2 sees it in real-time
  await expect(user2Page.locator(`text=${testMessage}`)).toBeVisible({
    timeout: 5000,
  });
});
```

### E2E Test Metrics

- **Total Tests**: 10+ complete user journeys
- **Expected Duration**: ~10 minutes
- **Success Threshold**: 100%
- **Browsers Tested**: Chromium, Firefox, WebKit

## Load Tests

### Running Load Tests

```bash
# Message sending performance
k6 run tests/load/message-sending.js

# WebSocket connections
k6 run tests/load/websocket-connections.js

# Comprehensive mixed scenario
k6 run tests/load/comprehensive-scenario.js

# Custom VUs and duration
k6 run --vus 500 --duration 10m tests/load/message-sending.js

# With specific environment variables
API_URL=http://prod.api k6 run tests/load/message-sending.js

# Output to InfluxDB (for monitoring)
k6 run --out influxdb=http://localhost:8086/k6 tests/load/message-sending.js
```

### Load Test Scenarios

#### 1. Message Sending Performance

**File**: `tests/load/message-sending.js`

**Stages**:
- Ramp up to 100 users over 1 minute
- Sustain 100 users for 5 minutes
- Spike to 500 users over 30 seconds
- Hold spike for 1 minute
- Ramp down to 0 over 1 minute

**Thresholds**:
- 95% of requests < 500ms
- 99% success rate
- Error rate < 1%

**Metrics**:
- Total messages sent
- Message success rate
- Send duration (avg, p95, p99)
- HTTP request performance

#### 2. WebSocket Connections

**File**: `tests/load/websocket-connections.js`

**Stages**:
- Ramp to 100 connections (30s)
- Ramp to 500 connections (1m)
- Ramp to 1000 connections (1m)
- Hold 1000 connections (5m)
- Ramp down (1m)

**Thresholds**:
- 95% connection success
- Connection time < 1s for 95%
- Message latency < 200ms for 95%
- Reconnection success > 90%

**Metrics**:
- Active WebSocket connections
- Connection time
- Message latency
- Reconnection success rate

#### 3. Comprehensive Scenario

**File**: `tests/load/comprehensive-scenario.js`

**Simulates**:
- Morning rush (8-10 AM): 200 users
- Lunch spike (12-1 PM): 300 users
- Evening activity (5-7 PM): 250 users
- Constant background: 50 users

**User Behaviors**:
- **Casual** (40%): Reads mostly, occasional messages
- **Active** (30%): Frequent messages, polls, reactions
- **Lurker** (20%): Only reads
- **Moderator** (10%): Monitors and moderates

**Operations Tested**:
- Message sending
- Poll creation and voting
- Reactions
- Search
- Moderation queue

### Load Test Example

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const response = http.post(
    `${API_URL}/api/messages`,
    JSON.stringify({
      channel_id: 'test-channel',
      text: 'Load test message',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    }
  );

  check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Load Test Metrics

- **Message Sending**: 100-500 concurrent users
- **WebSocket**: 1000+ concurrent connections
- **Comprehensive**: 300+ concurrent users with mixed operations
- **Expected Results**:
  - p95 response time < 500ms for API calls
  - p95 response time < 200ms for WebSocket messages
  - 99% success rate
  - < 1% error rate

## CI/CD Integration

### GitHub Actions Example

```yaml
name: ChatSDK Tests

on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start ChatSDK API
        run: |
          npm run build
          npm run start:api &
          sleep 10

      - name: Run API tests
        run: npm run test:api

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm ci
          npx playwright install --with-deps

      - name: Start services
        run: |
          npm run build
          npm run start:api &
          npm run start:app &
          sleep 20

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  load-tests:
    runs-on: ubuntu-latest
    # Only run on main branch
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Start services
        run: |
          npm run build
          npm run start:api &
          sleep 10

      - name: Run load tests
        run: k6 run tests/load/message-sending.js

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: load-test-results.json
```

## Test Coverage

### Current Coverage

| Component | Coverage | Tests |
|-----------|----------|-------|
| API Endpoints | 85% | 45+ tests |
| Core Client | 80% | Integration + E2E |
| React Components | 75% | E2E tests |
| Hooks | 80% | E2E tests |
| WebSocket | 90% | Load + E2E |

### Coverage Goals

- **API**: > 90%
- **Core**: > 85%
- **React**: > 80%
- **Overall**: > 80%

### Generate Coverage Report

```bash
# API tests with coverage
npm run test:api -- --coverage

# View coverage report
open coverage/index.html
```

## Troubleshooting

### API Tests Failing

**Issue**: Tests can't connect to API

**Solution**:
```bash
# Ensure API is running
cd packages/api
npm run dev

# Check API is responding
curl http://localhost:5500/api/health
```

**Issue**: Database not set up

**Solution**:
```bash
# Run database migrations
npm run db:migrate

# Seed test data
npm run db:seed:test
```

### E2E Tests Failing

**Issue**: Browser not found

**Solution**:
```bash
# Reinstall Playwright browsers
npx playwright install --force
```

**Issue**: Tests timing out

**Solution**:
```typescript
// Increase timeout in test
test.setTimeout(60000); // 60 seconds

// Or in config
export default {
  timeout: 60000,
};
```

**Issue**: Element not found

**Solution**:
- Verify test selectors match actual HTML
- Add explicit waits: `await page.waitForSelector('[data-testid="message"]')`
- Check if element is in iframe: `const frame = page.frame('iframe-name')`

### Load Tests Failing

**Issue**: Connection refused

**Solution**:
```bash
# Check API is running and accessible
curl http://localhost:5500/api/health

# Check firewall/network settings
```

**Issue**: Threshold violations

**Solution**:
- Optimize API performance
- Scale infrastructure
- Adjust thresholds if unrealistic:
  ```javascript
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Increase from 500ms
  }
  ```

**Issue**: Out of memory

**Solution**:
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" k6 run test.js

# Or reduce concurrent VUs
k6 run --vus 100 test.js # Instead of 1000
```

## Best Practices

### Writing Tests

1. **Use descriptive test names**
   ```typescript
   it('should create workspace and auto-enroll users', async () => {
     // Test code
   });
   ```

2. **Clean up test data**
   ```typescript
   afterAll(async () => {
     await deleteTestWorkspace(workspaceId);
   });
   ```

3. **Use test IDs for E2E**
   ```html
   <button data-testid="send-message">Send</button>
   ```

4. **Avoid hard-coded waits**
   ```typescript
   // Bad
   await page.waitForTimeout(5000);

   // Good
   await page.waitForSelector('[data-testid="message"]');
   ```

5. **Test edge cases**
   - Empty states
   - Error conditions
   - Network failures
   - Concurrent operations

### Running Tests Locally

```bash
# Run tests before committing
npm run test:all

# Quick sanity check
npm run test:api -- --run

# Full test suite (takes time)
npm run test:full
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [k6 Documentation](https://k6.io/docs/)
- [ChatSDK API Documentation](../docs/api/README.md)

## Support

For testing questions or issues:
- Review this documentation
- Check CI/CD logs
- Open an issue on GitHub
- Contact the development team

---

**Happy Testing!** 🧪
