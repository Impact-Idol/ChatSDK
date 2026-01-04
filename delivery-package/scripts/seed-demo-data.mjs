#!/usr/bin/env node
/**
 * ChatSDK Demo Data Seeder
 *
 * Creates a complete demo environment with:
 * - Multiple workspaces
 * - Sample users
 * - Channels with realistic names
 * - Sample messages
 * - Direct messages
 *
 * Usage:
 *   node scripts/seed-demo-data.mjs
 *   node scripts/seed-demo-data.mjs --clean  # Remove existing demo data first
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5500';

// Demo data
const DEMO_USERS = [
  { id: 'demo-alice', name: 'Alice Chen', email: 'alice@demo.chat', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' },
  { id: 'demo-bob', name: 'Bob Smith', email: 'bob@demo.chat', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob' },
  { id: 'demo-carol', name: 'Carol Davis', email: 'carol@demo.chat', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol' },
  { id: 'demo-david', name: 'David Lee', email: 'david@demo.chat', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david' },
  { id: 'demo-emma', name: 'Emma Wilson', email: 'emma@demo.chat', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma' },
];

const DEMO_WORKSPACES = [
  { id: 'demo-engineering', name: 'Engineering Team', type: 'team' },
  { id: 'demo-marketing', name: 'Marketing', type: 'team' },
  { id: 'demo-general', name: 'Company Hub', type: 'team' },
];

const DEMO_CHANNELS = {
  'demo-engineering': [
    { id: 'ch-general-eng', name: 'general', description: 'Engineering team discussions' },
    { id: 'ch-frontend', name: 'frontend', description: 'React, Vue, and UI discussions' },
    { id: 'ch-backend', name: 'backend', description: 'API and server-side development' },
    { id: 'ch-devops', name: 'devops', description: 'Infrastructure and deployments' },
    { id: 'ch-bugs', name: 'bugs', description: 'Bug tracking and fixes' },
  ],
  'demo-marketing': [
    { id: 'ch-general-mkt', name: 'general', description: 'Marketing team updates' },
    { id: 'ch-campaigns', name: 'campaigns', description: 'Campaign planning and results' },
    { id: 'ch-social', name: 'social-media', description: 'Social media strategy' },
  ],
  'demo-general': [
    { id: 'ch-announcements', name: 'announcements', description: 'Company-wide announcements' },
    { id: 'ch-random', name: 'random', description: 'Water cooler chat' },
    { id: 'ch-introductions', name: 'introductions', description: 'Say hello!' },
  ],
};

const DEMO_MESSAGES = [
  // Engineering general
  { channelId: 'ch-general-eng', userId: 'demo-alice', text: 'Hey team! Ready to ship the new feature? 🚀' },
  { channelId: 'ch-general-eng', userId: 'demo-bob', text: 'Almost there! Just finishing up the tests.' },
  { channelId: 'ch-general-eng', userId: 'demo-carol', text: 'The code review looks good. Nice work on the refactor!' },
  { channelId: 'ch-general-eng', userId: 'demo-david', text: 'Thanks Carol! Bob, let me know when you\'re ready for the deploy.' },
  { channelId: 'ch-general-eng', userId: 'demo-alice', text: 'Great teamwork everyone! 🎉' },

  // Frontend channel
  { channelId: 'ch-frontend', userId: 'demo-carol', text: 'Has anyone tried the new React 19 features?' },
  { channelId: 'ch-frontend', userId: 'demo-emma', text: 'Yes! The Actions API is really nice for form handling.' },
  { channelId: 'ch-frontend', userId: 'demo-carol', text: 'I\'ll check it out. We should discuss migrating our forms.' },

  // Backend channel
  { channelId: 'ch-backend', userId: 'demo-bob', text: 'The new API endpoint is live. Documentation is updated.' },
  { channelId: 'ch-backend', userId: 'demo-david', text: 'Perfect! I\'ll update the client SDK today.' },

  // Announcements
  { channelId: 'ch-announcements', userId: 'demo-alice', text: '📢 Welcome to the ChatSDK demo! Feel free to explore.' },
  { channelId: 'ch-announcements', userId: 'demo-alice', text: 'This is a fully functional chat environment. Try sending messages, creating channels, and more!' },

  // Random
  { channelId: 'ch-random', userId: 'demo-emma', text: 'Anyone up for lunch?' },
  { channelId: 'ch-random', userId: 'demo-bob', text: 'Count me in! 🍕' },
  { channelId: 'ch-random', userId: 'demo-carol', text: 'Same here!' },
];

// ============================================================================
// Helper Functions
// ============================================================================

async function getApiKey() {
  const secretsPath = join(__dirname, '..', 'credentials', 'secrets.json');

  if (existsSync(secretsPath)) {
    try {
      const secrets = JSON.parse(await readFile(secretsPath, 'utf-8'));
      return secrets.app?.api_key;
    } catch (e) {
      // Fall through to env var
    }
  }

  return process.env.APP_API_KEY;
}

async function apiRequest(endpoint, options = {}) {
  const apiKey = await getApiKey();

  if (!apiKey) {
    throw new Error('No API key found. Run instant-setup.sh first or set APP_API_KEY env var.');
  }

  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`API Error (${response.status}): ${data.error?.message || 'Unknown error'}`);
  }

  return data;
}

async function createToken(user) {
  return apiRequest('/tokens', {
    method: 'POST',
    body: JSON.stringify({
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    }),
  });
}

async function createWorkspace(token, workspace) {
  return fetch(`${API_URL}/api/workspaces`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workspace),
  }).then(r => r.json());
}

async function createChannel(token, workspaceId, channel) {
  return fetch(`${API_URL}/api/workspaces/${workspaceId}/channels`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(channel),
  }).then(r => r.json());
}

async function joinChannel(token, channelId) {
  return fetch(`${API_URL}/api/channels/${channelId}/join`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }).then(r => r.json());
}

async function sendMessage(token, channelId, text) {
  return fetch(`${API_URL}/api/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  }).then(r => r.json());
}

async function addWorkspaceMember(token, workspaceId, userId, role = 'member') {
  return fetch(`${API_URL}/api/workspaces/${workspaceId}/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, role }),
  }).then(r => r.json());
}

// ============================================================================
// Main Seeding Logic
// ============================================================================

async function seedDemoData() {
  console.log('🌱 ChatSDK Demo Data Seeder\n');
  console.log('This will create sample workspaces, users, channels, and messages.\n');

  // Check if API is reachable
  console.log('1️⃣  Checking API connection...');
  try {
    await fetch(`${API_URL}/health`);
    console.log(`   ✅ API reachable at ${API_URL}\n`);
  } catch (e) {
    console.error(`   ❌ Cannot reach API at ${API_URL}`);
    console.error('   Make sure the API server is running (./instant-setup.sh)');
    process.exit(1);
  }

  // Create tokens for all users
  console.log('2️⃣  Creating demo users...');
  const userTokens = {};

  for (const user of DEMO_USERS) {
    try {
      const result = await createToken(user);
      userTokens[user.id] = result.token;
      console.log(`   ✅ Created ${user.name}`);
    } catch (e) {
      console.log(`   ⚠️  ${user.name}: ${e.message}`);
    }
  }
  console.log('');

  // Use Alice as the admin (first user)
  const adminToken = userTokens['demo-alice'];

  if (!adminToken) {
    console.error('❌ Could not create admin user token');
    process.exit(1);
  }

  // Create workspaces
  console.log('3️⃣  Creating workspaces...');
  const workspaceIds = {};

  for (const ws of DEMO_WORKSPACES) {
    try {
      const result = await createWorkspace(adminToken, ws);
      workspaceIds[ws.id] = result.workspace?.id || result.id || ws.id;
      console.log(`   ✅ Created "${ws.name}"`);
    } catch (e) {
      console.log(`   ⚠️  ${ws.name}: ${e.message}`);
      workspaceIds[ws.id] = ws.id; // Use original ID as fallback
    }
  }
  console.log('');

  // Add users to workspaces
  console.log('4️⃣  Adding users to workspaces...');
  for (const wsKey of Object.keys(DEMO_WORKSPACES)) {
    const ws = DEMO_WORKSPACES.find(w => w.id === wsKey) || DEMO_WORKSPACES[wsKey];
    if (!ws) continue;

    for (const user of DEMO_USERS.slice(1)) { // Skip Alice (already owner)
      try {
        await addWorkspaceMember(adminToken, ws.id, user.id, 'member');
      } catch (e) {
        // Ignore - might already be a member
      }
    }
  }
  console.log('   ✅ Users added to workspaces\n');

  // Create channels
  console.log('5️⃣  Creating channels...');
  const channelIds = {};

  for (const [wsId, channels] of Object.entries(DEMO_CHANNELS)) {
    for (const ch of channels) {
      try {
        const result = await createChannel(adminToken, wsId, ch);
        channelIds[ch.id] = result.channel?.id || result.id || ch.id;
        console.log(`   ✅ #${ch.name} in ${wsId.replace('demo-', '')}`);
      } catch (e) {
        console.log(`   ⚠️  #${ch.name}: ${e.message}`);
        channelIds[ch.id] = ch.id;
      }
    }
  }
  console.log('');

  // Join users to channels
  console.log('6️⃣  Adding users to channels...');
  for (const [userId, token] of Object.entries(userTokens)) {
    for (const chId of Object.values(channelIds)) {
      try {
        await joinChannel(token, chId);
      } catch (e) {
        // Ignore - might already be a member
      }
    }
  }
  console.log('   ✅ Users joined channels\n');

  // Send messages
  console.log('7️⃣  Seeding sample messages...');
  let messageCount = 0;

  for (const msg of DEMO_MESSAGES) {
    const token = userTokens[msg.userId];
    const channelId = channelIds[msg.channelId] || msg.channelId;

    if (token) {
      try {
        await sendMessage(token, channelId, msg.text);
        messageCount++;
        // Small delay to ensure message ordering
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        // Ignore message errors
      }
    }
  }
  console.log(`   ✅ Sent ${messageCount} messages\n`);

  // Save demo credentials
  console.log('8️⃣  Saving demo credentials...');

  const demoCredentials = {
    generated_at: new Date().toISOString(),
    description: 'Demo user tokens for testing',
    users: DEMO_USERS.map(u => ({
      ...u,
      token: userTokens[u.id],
    })),
    workspaces: DEMO_WORKSPACES.map(ws => ({
      ...ws,
      actualId: workspaceIds[ws.id],
    })),
    channels: Object.entries(DEMO_CHANNELS).flatMap(([wsId, channels]) =>
      channels.map(ch => ({
        ...ch,
        workspaceId: wsId,
        actualId: channelIds[ch.id],
      }))
    ),
    quickTest: {
      loginAs: 'Alice Chen',
      token: userTokens['demo-alice'],
      defaultWorkspace: 'demo-engineering',
      defaultChannel: 'ch-general-eng',
    },
  };

  const { writeFile: writeFileAsync } = await import('fs/promises');
  await writeFileAsync(
    join(__dirname, '..', 'credentials', 'demo-users.json'),
    JSON.stringify(demoCredentials, null, 2)
  );
  console.log('   ✅ Saved to credentials/demo-users.json\n');

  // Summary
  console.log('═'.repeat(60));
  console.log('🎉 Demo Data Created Successfully!\n');
  console.log('═'.repeat(60));
  console.log('');
  console.log('📊 Summary:');
  console.log(`   • ${DEMO_USERS.length} users`);
  console.log(`   • ${DEMO_WORKSPACES.length} workspaces`);
  console.log(`   • ${Object.values(DEMO_CHANNELS).flat().length} channels`);
  console.log(`   • ${messageCount} messages`);
  console.log('');
  console.log('👤 Demo Users:');
  for (const user of DEMO_USERS) {
    console.log(`   • ${user.name} (${user.id})`);
  }
  console.log('');
  console.log('🔑 Quick Login (Alice):');
  console.log(`   Token: ${userTokens['demo-alice']?.substring(0, 50)}...`);
  console.log('');
  console.log('📁 Full credentials saved to: credentials/demo-users.json');
  console.log('');
  console.log('🚀 Open the Demo UI at: http://localhost:5501');
  console.log('');
}

// ============================================================================
// Run
// ============================================================================

seedDemoData().catch(error => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
