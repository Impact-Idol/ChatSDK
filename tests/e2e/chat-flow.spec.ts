/**
 * ChatSDK E2E Tests - Full User Journeys
 *
 * Tests complete user workflows including:
 * - User joins workspace → auto-enrolled in channels
 * - User sends message → appears in real-time
 * - User creates poll → others can vote
 * - User reports message → admin sees in moderation queue
 * - User blocks another user → messages filtered
 * - Guardian monitors supervised user → sees activity
 *
 * Run with: npm run test:e2e
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const APP_URL = process.env.TEST_APP_URL || 'http://localhost:3000';
const API_URL = process.env.TEST_API_URL || 'http://localhost:5500';

// Test users
const ADMIN_USER = {
  email: 'admin@test.com',
  password: 'admin123',
  name: 'Admin User',
};

const USER1 = {
  email: 'user1@test.com',
  password: 'user123',
  name: 'Test User 1',
};

const USER2 = {
  email: 'user2@test.com',
  password: 'user123',
  name: 'Test User 2',
};

// Helper functions
async function login(page: Page, email: string, password: string) {
  await page.goto(`${APP_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${APP_URL}/channels/**`);
}

async function navigateToChannel(page: Page, channelName: string) {
  await page.click(`[data-testid="channel-${channelName}"]`);
  await page.waitForSelector('[data-testid="message-list"]');
}

async function sendMessage(page: Page, text: string) {
  await page.fill('[data-testid="message-input"]', text);
  await page.click('[data-testid="send-message-button"]');
}

// ============================================================================
// AUTO-ENROLLMENT TEST
// ============================================================================

test.describe('Auto-Enrollment Flow', () => {
  test('user joins workspace and is auto-enrolled in channels', async ({
    page,
    context,
  }) => {
    // Step 1: Admin creates workspace and sets up auto-enrollment
    await login(page, ADMIN_USER.email, ADMIN_USER.password);

    // Create workspace
    await page.click('[data-testid="create-workspace-button"]');
    await page.fill('[data-testid="workspace-name-input"]', 'Test Workspace');
    await page.click('[data-testid="workspace-type-team"]');
    await page.click('[data-testid="create-workspace-submit"]');

    // Wait for workspace to be created
    await expect(page.locator('text=Test Workspace')).toBeVisible();

    // Create channel
    await page.click('[data-testid="create-channel-button"]');
    await page.fill('[data-testid="channel-name-input"]', 'general');
    await page.click('[data-testid="create-channel-submit"]');

    // Set up auto-enrollment rule
    await page.click('[data-testid="workspace-settings-button"]');
    await page.click('[data-testid="auto-enrollment-tab"]');
    await page.click('[data-testid="add-rule-button"]');

    await page.fill('[data-testid="rule-name-input"]', 'Auto-add to general');
    await page.click('[data-testid="channel-general-checkbox"]');
    await page.click('[data-testid="save-rule-button"]');

    // Step 2: New user joins workspace
    const user1Page = await context.newPage();
    await login(user1Page, USER1.email, USER1.password);

    // Accept workspace invitation
    await user1Page.click('[data-testid="workspace-invitation"]');
    await user1Page.click('[data-testid="accept-invitation-button"]');

    // Step 3: Verify user is auto-enrolled in general channel
    await expect(user1Page.locator('[data-testid="channel-general"]')).toBeVisible();

    // Verify user can access channel
    await user1Page.click('[data-testid="channel-general"]');
    await expect(user1Page.locator('[data-testid="message-list"]')).toBeVisible();

    await user1Page.close();
  });
});

// ============================================================================
// REAL-TIME MESSAGING TEST
// ============================================================================

test.describe('Real-Time Messaging', () => {
  test('user sends message and other users see it in real-time', async ({
    page,
    context,
  }) => {
    // Step 1: User 1 logs in and navigates to channel
    await login(page, USER1.email, USER1.password);
    await navigateToChannel(page, 'general');

    // Step 2: User 2 logs in (in another tab) and navigates to same channel
    const user2Page = await context.newPage();
    await login(user2Page, USER2.email, USER2.password);
    await navigateToChannel(user2Page, 'general');

    // Step 3: User 1 sends a message
    const testMessage = `Test message ${Date.now()}`;
    await sendMessage(page, testMessage);

    // Step 4: Verify message appears on User 1's screen
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();

    // Step 5: Verify message appears on User 2's screen in real-time
    await expect(user2Page.locator(`text=${testMessage}`)).toBeVisible({
      timeout: 5000,
    });

    // Step 6: Verify typing indicator
    await page.fill('[data-testid="message-input"]', 'Typing...');
    await expect(user2Page.locator('[data-testid="typing-indicator"]')).toContainText(
      USER1.name
    );

    await user2Page.close();
  });
});

// ============================================================================
// POLL CREATION AND VOTING TEST
// ============================================================================

test.describe('Poll Creation and Voting', () => {
  test('user creates poll and others can vote', async ({ page, context }) => {
    // Step 1: User 1 creates a poll
    await login(page, USER1.email, USER1.password);
    await navigateToChannel(page, 'general');

    // Send a message first
    await sendMessage(page, 'What should we have for lunch?');

    // Click poll button on the message
    await page.click('[data-testid="message-options-button"]:last-child');
    await page.click('[data-testid="create-poll-option"]');

    // Fill poll details
    await page.fill('[data-testid="poll-question-input"]', 'What should we have for lunch?');
    await page.fill('[data-testid="poll-option-1"]', 'Pizza');
    await page.fill('[data-testid="poll-option-2"]', 'Sushi');
    await page.click('[data-testid="add-poll-option"]');
    await page.fill('[data-testid="poll-option-3"]', 'Burgers');

    // Set poll settings
    await page.click('[data-testid="poll-multi-choice-checkbox"]'); // Allow multiple choices

    // Create poll
    await page.click('[data-testid="create-poll-button"]');

    // Step 2: Verify poll appears
    await expect(page.locator('[data-testid="poll-container"]')).toBeVisible();
    await expect(page.locator('text=What should we have for lunch?')).toBeVisible();

    // Step 3: User 2 votes on the poll
    const user2Page = await context.newPage();
    await login(user2Page, USER2.email, USER2.password);
    await navigateToChannel(user2Page, 'general');

    // Find the poll
    await expect(user2Page.locator('[data-testid="poll-container"]')).toBeVisible();

    // Vote for Pizza and Sushi (multi-choice)
    await user2Page.click('[data-testid="poll-option-pizza"]');
    await user2Page.click('[data-testid="poll-option-sushi"]');

    // Step 4: Verify vote is recorded
    await expect(user2Page.locator('[data-testid="poll-option-pizza"]')).toHaveClass(
      /selected/
    );
    await expect(user2Page.locator('[data-testid="poll-option-sushi"]')).toHaveClass(
      /selected/
    );

    // Step 5: Verify User 1 sees updated poll results in real-time
    await expect(page.locator('[data-testid="poll-option-pizza"] [data-testid="vote-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="poll-option-sushi"] [data-testid="vote-count"]')).toContainText('1');

    // Step 6: User 2 removes vote
    await user2Page.click('[data-testid="remove-vote-button"]');

    // Verify votes are removed
    await expect(user2Page.locator('[data-testid="poll-option-pizza"]')).not.toHaveClass(
      /selected/
    );

    await user2Page.close();
  });
});

// ============================================================================
// MESSAGE REPORTING AND MODERATION TEST
// ============================================================================

test.describe('Message Reporting and Moderation', () => {
  test('user reports message and admin sees it in moderation queue', async ({
    page,
    context,
  }) => {
    // Step 1: User 1 sends a potentially problematic message
    await login(page, USER1.email, USER1.password);
    await navigateToChannel(page, 'general');
    await sendMessage(page, 'This is a spam message!');

    // Step 2: User 2 reports the message
    const user2Page = await context.newPage();
    await login(user2Page, USER2.email, USER2.password);
    await navigateToChannel(user2Page, 'general');

    // Find the message
    await expect(user2Page.locator('text=This is a spam message!')).toBeVisible();

    // Report it
    await user2Page.click('[data-testid="message-options-button"]:last-child');
    await user2Page.click('[data-testid="report-message-option"]');

    // Fill report form
    await user2Page.click('[data-testid="report-reason-spam"]');
    await user2Page.fill(
      '[data-testid="report-details-textarea"]',
      'This message looks like spam'
    );
    await user2Page.click('[data-testid="submit-report-button"]');

    // Verify report was submitted
    await expect(user2Page.locator('text=Report submitted')).toBeVisible();

    // Step 3: Admin checks moderation queue
    const adminPage = await context.newPage();
    await login(adminPage, ADMIN_USER.email, ADMIN_USER.password);

    // Navigate to moderation queue
    await adminPage.click('[data-testid="admin-panel-button"]');
    await adminPage.click('[data-testid="moderation-queue-tab"]');

    // Verify report is in queue
    await expect(adminPage.locator('text=This is a spam message!')).toBeVisible();
    await expect(adminPage.locator('text=This message looks like spam')).toBeVisible();

    // Step 4: Admin takes action
    await adminPage.click('[data-testid="report-item"]:first-child');
    await adminPage.click('[data-testid="remove-message-button"]');
    await adminPage.fill(
      '[data-testid="moderator-notes-textarea"]',
      'Spam confirmed and removed'
    );
    await adminPage.click('[data-testid="resolve-report-button"]');

    // Step 5: Verify message is removed from channel
    await user2Page.reload();
    await expect(user2Page.locator('text=This is a spam message!')).not.toBeVisible();

    await user2Page.close();
    await adminPage.close();
  });
});

// ============================================================================
// USER BLOCKING TEST
// ============================================================================

test.describe('User Blocking', () => {
  test('user blocks another user and messages are filtered', async ({
    page,
    context,
  }) => {
    // Step 1: User 2 sends some messages
    const user2Page = await context.newPage();
    await login(user2Page, USER2.email, USER2.password);
    await navigateToChannel(user2Page, 'general');

    await sendMessage(user2Page, 'Message 1 from User 2');
    await sendMessage(user2Page, 'Message 2 from User 2');

    // Step 2: User 1 blocks User 2
    await login(page, USER1.email, USER1.password);
    await navigateToChannel(page, 'general');

    // Verify messages are visible before blocking
    await expect(page.locator('text=Message 1 from User 2')).toBeVisible();
    await expect(page.locator('text=Message 2 from User 2')).toBeVisible();

    // Block User 2
    await page.click(`[data-testid="user-avatar-${USER2.name}"]`);
    await page.click('[data-testid="block-user-button"]');
    await page.click('[data-testid="confirm-block-button"]');

    // Step 3: Verify User 2's messages are hidden
    await page.reload();
    await expect(page.locator('text=Message 1 from User 2')).not.toBeVisible();
    await expect(page.locator('text=Message 2 from User 2')).not.toBeVisible();

    // Step 4: User 2 sends a new message
    await sendMessage(user2Page, 'Message 3 from User 2');

    // Step 5: Verify User 1 doesn't see the new message
    await page.waitForTimeout(2000); // Wait for real-time update
    await expect(page.locator('text=Message 3 from User 2')).not.toBeVisible();

    // Step 6: User 1 unblocks User 2
    await page.click('[data-testid="settings-button"]');
    await page.click('[data-testid="blocked-users-tab"]');
    await page.click(`[data-testid="unblock-${USER2.name}-button"]`);

    // Step 7: Verify messages are visible again
    await navigateToChannel(page, 'general');
    await expect(page.locator('text=Message 1 from User 2')).toBeVisible();

    await user2Page.close();
  });
});

// ============================================================================
// GUARDIAN MONITORING TEST
// ============================================================================

test.describe('Guardian Monitoring (Parental Controls)', () => {
  const CHILD_USER = {
    email: 'child@test.com',
    password: 'child123',
    name: 'Child User',
  };

  const GUARDIAN_USER = {
    email: 'guardian@test.com',
    password: 'guardian123',
    name: 'Guardian User',
  };

  test('guardian monitors supervised user activity', async ({ page, context }) => {
    // Step 1: Guardian sets up monitoring for child
    await login(page, GUARDIAN_USER.email, GUARDIAN_USER.password);

    await page.click('[data-testid="settings-button"]');
    await page.click('[data-testid="parental-controls-tab"]');
    await page.click('[data-testid="add-supervised-user-button"]');

    await page.fill('[data-testid="supervised-email-input"]', CHILD_USER.email);
    await page.click('[data-testid="monitoring-level-moderate"]');
    await page.click('[data-testid="add-supervised-user-submit"]');

    // Step 2: Child sends messages
    const childPage = await context.newPage();
    await login(childPage, CHILD_USER.email, CHILD_USER.password);
    await navigateToChannel(childPage, 'general');

    await sendMessage(childPage, 'Hi everyone!');
    await sendMessage(childPage, 'Anyone want to play a game?');

    // Step 3: Guardian checks activity dashboard
    await page.click('[data-testid="parental-dashboard-button"]');

    // Verify child's activity is visible
    await expect(page.locator(`text=${CHILD_USER.name}'s Activity`)).toBeVisible();
    await expect(page.locator('text=Hi everyone!')).toBeVisible();
    await expect(page.locator('text=Anyone want to play a game?')).toBeVisible();

    // Verify message timestamps
    await expect(page.locator('[data-testid="message-timestamp"]')).toHaveCount(2);

    // Step 4: Guardian sets content filter
    await page.click('[data-testid="content-filters-button"]');
    await page.click('[data-testid="filter-inappropriate-language-checkbox"]');
    await page.click('[data-testid="save-filters-button"]');

    // Step 5: Child tries to send inappropriate content
    await sendMessage(childPage, 'This is a bad word!');

    // Verify message is flagged/blocked
    await expect(childPage.locator('[data-testid="content-filter-warning"]')).toBeVisible();

    // Step 6: Guardian sees flagged content alert
    await page.reload();
    await expect(page.locator('[data-testid="content-alert-badge"]')).toBeVisible();
    await page.click('[data-testid="content-alert-badge"]');
    await expect(page.locator('text=Flagged content detected')).toBeVisible();

    await childPage.close();
  });
});

// ============================================================================
// FILE UPLOAD AND MEDIA GALLERY TEST
// ============================================================================

test.describe('File Upload and Media', () => {
  test('user uploads file and it appears in media gallery', async ({ page }) => {
    await login(page, USER1.email, USER1.password);
    await navigateToChannel(page, 'general');

    // Upload an image
    const fileInput = await page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles('./tests/fixtures/test-image.jpg');

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-progress"]')).not.toBeVisible();

    // Verify image appears in message
    await expect(page.locator('[data-testid="message-image"]')).toBeVisible();

    // Verify blurhash placeholder is shown while loading
    await expect(page.locator('[data-testid="blurhash-canvas"]')).toBeVisible();

    // Open media gallery
    await page.click('[data-testid="media-gallery-button"]');

    // Verify image is in gallery
    await expect(page.locator('[data-testid="gallery-image"]')).toBeVisible();
  });
});

// ============================================================================
// THREAD CONVERSATION TEST
// ============================================================================

test.describe('Thread Conversations', () => {
  test('user replies in thread', async ({ page, context }) => {
    // Step 1: User 1 sends a message
    await login(page, USER1.email, USER1.password);
    await navigateToChannel(page, 'general');

    const mainMessage = `Main thread message ${Date.now()}`;
    await sendMessage(page, mainMessage);

    // Step 2: User 2 replies in thread
    const user2Page = await context.newPage();
    await login(user2Page, USER2.email, USER2.password);
    await navigateToChannel(user2Page, 'general');

    await user2Page.click(`text=${mainMessage}`);
    await user2Page.click('[data-testid="reply-in-thread-button"]');

    // Send thread reply
    await user2Page.fill('[data-testid="thread-message-input"]', 'This is a reply in thread');
    await user2Page.click('[data-testid="send-thread-message-button"]');

    // Step 3: Verify reply appears in thread
    await expect(user2Page.locator('text=This is a reply in thread')).toBeVisible();

    // Step 4: Verify User 1 sees thread indicator on main message
    await expect(page.locator('[data-testid="thread-reply-count"]')).toContainText('1');

    await user2Page.close();
  });
});

console.log('\n✅ All E2E tests completed!\n');
