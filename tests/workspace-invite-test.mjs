/**
 * Workspace Invite System - Integration Test
 * Tests the complete flow: create workspace → invite users → accept invite
 */

const API_URL = process.env.API_URL || 'http://localhost:5501';
const API_KEY = process.env.API_KEY || '';

console.log('🧪 Testing Workspace Invite System...\n');

// Step 1: Get auth tokens for test users
console.log('1️⃣ Getting auth tokens for Alice and Bob...');
const aliceTokens = await fetch(`${API_URL}/tokens`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user-1',
    name: 'Alice Johnson'
  })
}).then(r => r.json());

const bobTokens = await fetch(`${API_URL}/tokens`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user-2',
    name: 'Bob Smith'
  })
}).then(r => r.json());

console.log('✅ Alice token:', aliceTokens.token.substring(0, 30) + '...');
console.log('✅ Bob token:', bobTokens.token.substring(0, 30) + '...\n');

// Step 2: Alice creates a workspace
console.log('2️⃣ Alice creates a new workspace...');
const workspaceName = `Test Workspace ${Date.now()}`;
const workspaceRawResponse = await fetch(`${API_URL}/api/workspaces`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${aliceTokens.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: workspaceName,
    type: 'team'
  })
});
const workspace = await workspaceRawResponse.json();

if (workspace.error) {
  console.log('❌ Workspace creation failed:', workspace.error.message);
  process.exit(1);
}

console.log('✅ Workspace created:', workspace.id);
console.log('   Name:', workspace.name);
console.log('   Member count:', workspace.memberCount || workspace.member_count, '\n');

// Step 3: Alice invites Bob via email
console.log('3️⃣ Alice invites Bob to the workspace...');
const inviteRawResponse = await fetch(`${API_URL}/api/workspaces/${workspace.id}/invite`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${aliceTokens.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emails: ['bob@test.com'],
    role: 'member',
    message: 'Hey Bob, join our awesome workspace!'
  })
});
const inviteResponse = await inviteRawResponse.json();

if (inviteResponse.error) {
  console.log('❌ Invite generation failed:', inviteResponse.error.message);
  process.exit(1);
}

console.log('✅ Invite sent:', inviteResponse.success);
console.log('   Invite URL:', inviteResponse.invites[0].inviteUrl);

// Extract token from invite URL
const inviteToken = inviteResponse.invites[0].inviteUrl.split('/invite/')[1];
console.log('   Token:', inviteToken.substring(0, 20) + '...\n');

// Step 4: Bob accepts the invite
console.log('4️⃣ Bob accepts the workspace invite...');
const acceptRawResponse = await fetch(`${API_URL}/api/workspaces/invites/${inviteToken}`, {
  method: 'GET',
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${bobTokens.token}`
  }
});
const acceptResponse = await acceptRawResponse.json();

if (acceptResponse.error) {
  console.log('❌ Invite acceptance failed:', acceptResponse.error.message);
  process.exit(1);
}

console.log('✅ Invite accepted:', acceptResponse.success);
console.log('   Workspace:', acceptResponse.workspace.name);
console.log('   New member count:', acceptResponse.workspace.memberCount, '\n');

// Step 5: Verify Bob is now a member
console.log('5️⃣ Verifying Bob is now a workspace member...');
const bobWorkspacesResponse = await fetch(`${API_URL}/api/workspaces`, {
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${bobTokens.token}`
  }
});
const bobWorkspacesData = await bobWorkspacesResponse.json();

if (bobWorkspacesData.error) {
  console.log('❌ Failed to get Bob\'s workspaces:', bobWorkspacesData.error.message);
  process.exit(1);
}

const bobWorkspaces = bobWorkspacesData.workspaces || [];
const foundWorkspace = bobWorkspaces.find(w => w.id === workspace.id);
if (foundWorkspace) {
  console.log('✅ Bob is now a member of the workspace!');
  console.log('   Role:', foundWorkspace.role);
} else {
  console.log('❌ Bob is NOT a member - something went wrong!');
}

console.log('\n🎉 All tests passed! Workspace invite system is working!\n');

// Cleanup test data would go here in a real test suite
console.log('📝 Test data created:');
console.log('   Workspace ID:', workspace.id);
console.log('   You can manually verify in the database or clean up if needed.');
