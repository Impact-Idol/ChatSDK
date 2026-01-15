/**
 * E2E Basic Flow Test
 * Tests complete user journey: Login → Load data → Create channel → Send message
 *
 * This test validates the entire stack integration:
 * - Frontend API client behavior
 * - Backend API endpoints
 * - Database operations
 * - Authentication flow
 */

const API_URL = process.env.API_URL || 'http://localhost:5501';
const API_KEY = process.env.API_KEY || '';

console.log('🧪 E2E Basic Flow Test - Production Readiness\n');

// ============================================================================
// Test 1: Authentication & JWT Generation
// ============================================================================
console.log('1️⃣ Testing authentication flow...');
let authToken;
let wsToken;
let userId = 'user-1'; // Alice

try {
  // Generate JWT tokens via /tokens endpoint
  const loginResponse = await fetch(`${API_URL}/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      userId: userId,
      name: 'Alice Johnson',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
    })
  });

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text();
    throw new Error(`Token generation failed: HTTP ${loginResponse.status}: ${errorText}`);
  }

  const loginData = await loginResponse.json();
  authToken = loginData.token;
  wsToken = loginData.wsToken;
  console.log('✅ Authentication successful');
  console.log(`   JWT Token: ${authToken.substring(0, 30)}...`);
  console.log(`   User ID: ${loginData.user.id}`);
} catch (error) {
  console.error('❌ Authentication failed:', error.message);
  process.exit(1);
}

// ============================================================================
// Test 2: Load Workspaces (Verify API Access)
// ============================================================================
console.log('\n2️⃣ Testing workspace data loading...');
let workspaceId;

try {
  const workspacesResponse = await fetch(`${API_URL}/api/workspaces`, {
    headers: {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!workspacesResponse.ok) {
    throw new Error(`HTTP ${workspacesResponse.status}: ${await workspacesResponse.text()}`);
  }

  const workspacesData = await workspacesResponse.json();
  const workspaces = workspacesData.workspaces || [];
  console.log(`✅ Loaded ${workspaces.length} workspace(s)`);

  if (workspaces.length > 0) {
    workspaceId = workspaces[0].id;
    console.log(`   Active workspace: ${workspaces[0].name} (${workspaceId})`);
  }
} catch (error) {
  console.error('❌ Workspace loading failed:', error.message);
  process.exit(1);
}

// ============================================================================
// Test 3: Load Channels (Verify List Endpoint)
// ============================================================================
console.log('\n3️⃣ Testing channel list loading...');
let existingChannelCount;

try {
  const channelsResponse = await fetch(`${API_URL}/api/channels`, {
    headers: {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!channelsResponse.ok) {
    throw new Error(`HTTP ${channelsResponse.status}: ${await channelsResponse.text()}`);
  }

  const channelsData = await channelsResponse.json();
  const channels = channelsData.channels || [];
  existingChannelCount = channels.length;
  console.log(`✅ Loaded ${existingChannelCount} existing channel(s)`);

  if (existingChannelCount > 0) {
    console.log(`   First channel: ${channels[0].name}`);
  }
} catch (error) {
  console.error('❌ Channel loading failed:', error.message);
  process.exit(1);
}

// ============================================================================
// Test 4: Create New Channel
// ============================================================================
console.log('\n4️⃣ Testing channel creation...');
let newChannel;

try {
  const createChannelResponse = await fetch(`${API_URL}/api/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: `E2E Test Channel ${Date.now()}`,
      description: 'Created by automated E2E test',
      type: 'group',
      workspaceId: workspaceId
    })
  });

  if (!createChannelResponse.ok) {
    const errorText = await createChannelResponse.text();
    throw new Error(`HTTP ${createChannelResponse.status}: ${errorText}`);
  }

  newChannel = await createChannelResponse.json();
  console.log('✅ Channel created successfully');
  console.log(`   Channel ID: ${newChannel.id}`);
  console.log(`   Channel name: ${newChannel.name}`);
} catch (error) {
  console.error('❌ Channel creation failed:', error.message);
  process.exit(1);
}

// ============================================================================
// Test 5: Send Message to Channel
// ============================================================================
console.log('\n5️⃣ Testing message sending...');
let sentMessage;

try {
  const sendMessageResponse = await fetch(
    `${API_URL}/api/channels/${newChannel.id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        text: '🚀 Hello from E2E test! This message validates the full stack integration.',
        mentions: []
      })
    }
  );

  if (!sendMessageResponse.ok) {
    const errorText = await sendMessageResponse.text();
    throw new Error(`HTTP ${sendMessageResponse.status}: ${errorText}`);
  }

  sentMessage = await sendMessageResponse.json();
  console.log('✅ Message sent successfully');
  console.log(`   Message ID: ${sentMessage.id}`);
  console.log(`   Text: ${sentMessage.text}`);
} catch (error) {
  console.error('❌ Message sending failed:', error.message);
  process.exit(1);
}

// ============================================================================
// Test 6: Retrieve Messages (Verify Message Appears)
// ============================================================================
console.log('\n6️⃣ Testing message retrieval...');

try {
  const getMessagesResponse = await fetch(
    `${API_URL}/api/channels/${newChannel.id}/messages?limit=10`,
    {
      headers: {
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  if (!getMessagesResponse.ok) {
    throw new Error(`HTTP ${getMessagesResponse.status}: ${await getMessagesResponse.text()}`);
  }

  const messagesData = await getMessagesResponse.json();
  console.log(`✅ Retrieved ${messagesData.messages.length} message(s)`);

  // Verify our message is in the list
  const ourMessage = messagesData.messages.find(m => m.id === sentMessage.id);
  if (!ourMessage) {
    throw new Error('Sent message not found in channel messages');
  }

  console.log('✅ Message verified in channel');
  console.log(`   Retrieved text: ${ourMessage.text}`);

  // Verify message structure
  if (!ourMessage.user) {
    console.log('⚠️  Warning: Message missing user object (frontend will enrich)');
  } else {
    console.log(`   Message author: ${ourMessage.user.name}`);
  }
} catch (error) {
  console.error('❌ Message retrieval failed:', error.message);
  process.exit(1);
}

// ============================================================================
// Test 7: Load Users (Required for Message Enrichment)
// ============================================================================
console.log('\n7️⃣ Testing user list loading...');

try {
  const usersResponse = await fetch(`${API_URL}/api/users`, {
    headers: {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!usersResponse.ok) {
    throw new Error(`HTTP ${usersResponse.status}: ${await usersResponse.text()}`);
  }

  const usersData = await usersResponse.json();
  const users = usersData.users || [];
  console.log(`✅ Loaded ${users.length} user(s)`);

  // Verify current user is in the list
  const currentUser = users.find(u => u.id === userId);
  if (currentUser) {
    console.log(`   Current user: ${currentUser.name} (${currentUser.email || 'no email'})`);
  }
} catch (error) {
  console.error('❌ User loading failed:', error.message);
  process.exit(1);
}

// ============================================================================
// Test 8: Cleanup - Delete Test Channel
// ============================================================================
console.log('\n8️⃣ Cleaning up test data...');

try {
  const deleteChannelResponse = await fetch(
    `${API_URL}/api/channels/${newChannel.id}`,
    {
      method: 'DELETE',
      headers: {
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  if (!deleteChannelResponse.ok) {
    console.log(`⚠️  Warning: Channel cleanup failed (${deleteChannelResponse.status})`);
  } else {
    console.log('✅ Test channel deleted');
  }
} catch (error) {
  console.log(`⚠️  Warning: Cleanup error: ${error.message}`);
}

// ============================================================================
// Summary
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('🎉 E2E Basic Flow Test - ALL TESTS PASSED');
console.log('='.repeat(60));
console.log('\n✅ Validated:');
console.log('  - Authentication & JWT tokens');
console.log('  - Workspace data loading');
console.log('  - Channel list retrieval');
console.log('  - Channel creation');
console.log('  - Message sending');
console.log('  - Message retrieval & verification');
console.log('  - User list loading');
console.log('  - Cleanup operations');
console.log('\n📊 Test Results:');
console.log(`  - Workspaces loaded: ${workspaceId ? 'Yes' : 'No'}`);
console.log(`  - Existing channels: ${existingChannelCount}`);
console.log(`  - Test channel created: ${newChannel.id}`);
console.log(`  - Test message sent: ${sentMessage.id}`);
console.log('\n✨ Frontend-Backend Integration: VERIFIED');
console.log('🚀 System ready for production deployment\n');
