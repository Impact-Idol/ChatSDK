/**
 * Setup Novu Notification Workflows
 * Run this script once to create all notification workflows in Novu
 *
 * Usage: npx tsx src/scripts/setup-novu-workflows.ts
 */

import 'dotenv/config';

const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NOVU_API_URL = process.env.NOVU_API_URL || 'http://localhost:3000';

if (!NOVU_SECRET_KEY) {
  console.error('NOVU_SECRET_KEY is required');
  process.exit(1);
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  pushTitle: string;
  pushBody: string;
}

const workflows: WorkflowDefinition[] = [
  {
    id: 'new-message',
    name: 'New Message',
    description: 'Notification when a new message is received',
    pushTitle: '{{senderName}}',
    pushBody: '{{messagePreview}}',
  },
  {
    id: 'mention',
    name: 'Mention',
    description: 'Notification when user is @mentioned',
    pushTitle: '{{mentionedByName}} mentioned you',
    pushBody: '{{messagePreview}}',
  },
  {
    id: 'reaction',
    name: 'Reaction',
    description: 'Notification when someone reacts to your message',
    pushTitle: '{{reactorName}} reacted {{emoji}}',
    pushBody: '{{messagePreview}}',
  },
  {
    id: 'thread-reply',
    name: 'Thread Reply',
    description: 'Notification when someone replies to a thread',
    pushTitle: '{{replierName}} replied',
    pushBody: '{{replyPreview}}',
  },
  {
    id: 'channel-invite',
    name: 'Channel Invite',
    description: 'Notification when invited to a channel',
    pushTitle: 'Channel Invitation',
    pushBody: '{{invitedByName}} invited you to {{channelName}}',
  },
];

async function novuFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${NOVU_API_URL}/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `ApiKey ${NOVU_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
}

async function createWorkflow(workflow: WorkflowDefinition) {
  try {
    // Check if workflow already exists
    const existing = await novuFetch('/workflows');
    const found = existing.data?.find((w: any) =>
      w.triggers?.[0]?.identifier === workflow.id || w.name === workflow.name
    );

    if (found) {
      console.log(`✓ Workflow "${workflow.id}" already exists`);
      return;
    }

    // Create notification group first if needed
    let groupId: string;
    try {
      const groups = await novuFetch('/notification-groups');
      let generalGroup = groups.data?.find((g: any) => g.name === 'General');
      if (!generalGroup) {
        const newGroup = await novuFetch('/notification-groups', {
          method: 'POST',
          body: JSON.stringify({ name: 'General' }),
        });
        groupId = newGroup.data._id;
      } else {
        groupId = generalGroup._id;
      }
    } catch (e) {
      // Use default group
      groupId = '';
    }

    // Create new workflow using Novu v1 API format
    await novuFetch('/workflows', {
      method: 'POST',
      body: JSON.stringify({
        name: workflow.name,
        notificationGroupId: groupId,
        description: workflow.description,
        active: true,
        draft: false,
        critical: false,
        tags: ['chat'],
        steps: [
          {
            template: {
              type: 'push',
              content: workflow.pushBody,
              title: workflow.pushTitle,
            },
            active: true,
          },
        ],
        triggers: [
          {
            type: 'event',
            identifier: workflow.id,
            variables: [
              { name: 'senderName', type: 'String' },
              { name: 'messagePreview', type: 'String' },
              { name: 'channelId', type: 'String' },
              { name: 'messageId', type: 'String' },
            ],
            subscriberVariables: [],
          },
        ],
      }),
    });

    console.log(`✓ Created workflow "${workflow.id}"`);
  } catch (error: any) {
    console.error(`✗ Failed to create "${workflow.id}":`, error.message);
  }
}

async function setupPushProviders() {
  console.log('\n📱 Push Provider Setup Instructions:\n');
  console.log('To enable push notifications, configure providers in Novu dashboard:');
  console.log('');
  console.log('1. FCM (Firebase Cloud Messaging) for Android:');
  console.log('   - Go to Firebase Console → Project Settings → Cloud Messaging');
  console.log('   - Download the service account JSON');
  console.log('   - In Novu: Integrations → FCM → Add service account');
  console.log('');
  console.log('2. APNs (Apple Push Notification service) for iOS:');
  console.log('   - Go to Apple Developer → Certificates → Keys');
  console.log('   - Create a new key with APNs enabled');
  console.log('   - In Novu: Integrations → APNs → Add .p8 key file');
  console.log('');
  console.log('3. Expo Push (for Expo React Native apps):');
  console.log('   - No additional setup required for Expo');
  console.log('   - In Novu: Integrations → Expo → Enable');
  console.log('');
}

async function main() {
  console.log('🚀 Setting up Novu notification workflows...\n');
  console.log(`API URL: ${NOVU_API_URL}`);
  console.log('');

  for (const workflow of workflows) {
    await createWorkflow(workflow);
  }

  await setupPushProviders();

  console.log('\n✅ Novu setup complete!');
  console.log('\nNext steps:');
  console.log('1. Open Novu dashboard: http://localhost:4200');
  console.log('2. Configure push providers (FCM, APNs, or Expo)');
  console.log('3. Test notifications by sending a message');
}

main().catch(console.error);
