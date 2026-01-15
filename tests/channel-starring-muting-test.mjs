/**
 * Channel Starring & Muting - Integration Test
 * Tests starring and muting functionality for channels
 */

const API_URL = process.env.API_URL || 'http://localhost:5501';
const API_KEY = process.env.API_KEY || '';

console.log('🧪 Testing Channel Starring & Muting...\n');

// Step 1: Get auth token for test user
console.log('1️⃣ Getting auth token for Alice...');
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

console.log('✅ Alice token:', aliceTokens.token.substring(0, 30) + '...\n');

// Step 2: Create a test channel
console.log('2️⃣ Alice creates a test channel...');
const channelName = `Test Channel ${Date.now()}`;
const channelResponse = await fetch(`${API_URL}/api/channels`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${aliceTokens.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'group',
    name: channelName,
    memberIds: []
  })
}).then(r => r.json());

if (channelResponse.error) {
  console.log('❌ Channel creation failed:', channelResponse.error.message);
  process.exit(1);
}

const channelId = channelResponse.id;
console.log('✅ Channel created:', channelId);
console.log('   Name:', channelResponse.name);
console.log('   Initial starred:', channelResponse.starred || false);
console.log('   Initial muted:', channelResponse.muted || false, '\n');

// Step 3: Star the channel
console.log('3️⃣ Alice stars the channel...');
const starResponse = await fetch(`${API_URL}/api/channels/${channelId}/star`, {
  method: 'PATCH',
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${aliceTokens.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ starred: true })
}).then(r => r.json());

if (starResponse.error) {
  console.log('❌ Starring failed:', starResponse.error.message);
  process.exit(1);
}

console.log('✅ Channel starred:', starResponse.starred);
console.log('   Success:', starResponse.success, '\n');

// Step 4: Verify channel is starred in GET request
console.log('4️⃣ Verifying channel is starred...');
const channelDetailsResponse = await fetch(`${API_URL}/api/channels/${channelId}`, {
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${aliceTokens.token}`
  }
}).then(r => r.json());

if (channelDetailsResponse.error) {
  console.log('❌ Failed to get channel details:', channelDetailsResponse.error.message);
  process.exit(1);
}

if (channelDetailsResponse.starred === true) {
  console.log('✅ Channel is starred in GET response!');
} else {
  console.log('❌ Channel is NOT starred - expected true, got:', channelDetailsResponse.starred);
  process.exit(1);
}

// Step 5: Mute the channel
console.log('\n5️⃣ Alice mutes the channel...');
const muteResponse = await fetch(`${API_URL}/api/channels/${channelId}/mute`, {
  method: 'PATCH',
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${aliceTokens.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ muted: true })
}).then(r => r.json());

if (muteResponse.error) {
  console.log('❌ Muting failed:', muteResponse.error.message);
  process.exit(1);
}

console.log('✅ Channel muted:', muteResponse.muted);
console.log('   Success:', muteResponse.success, '\n');

// Step 6: Verify channel is muted in GET request
console.log('6️⃣ Verifying channel is muted...');
const mutedChannelResponse = await fetch(`${API_URL}/api/channels/${channelId}`, {
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${aliceTokens.token}`
  }
}).then(r => r.json());

if (mutedChannelResponse.error) {
  console.log('❌ Failed to get channel details:', mutedChannelResponse.error.message);
  process.exit(1);
}

if (mutedChannelResponse.muted === true && mutedChannelResponse.starred === true) {
  console.log('✅ Channel is both starred AND muted!');
  console.log('   Starred:', mutedChannelResponse.starred);
  console.log('   Muted:', mutedChannelResponse.muted);
} else {
  console.log('❌ Unexpected state - starred:', mutedChannelResponse.starred, 'muted:', mutedChannelResponse.muted);
  process.exit(1);
}

// Step 7: Verify in channel list
console.log('\n7️⃣ Verifying in channel list...');
const channelsListResponse = await fetch(`${API_URL}/api/channels`, {
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${aliceTokens.token}`
  }
}).then(r => r.json());

if (channelsListResponse.error) {
  console.log('❌ Failed to get channels list:', channelsListResponse.error.message);
  process.exit(1);
}

const foundChannel = channelsListResponse.channels.find(c => c.id === channelId);
if (foundChannel && foundChannel.starred === true && foundChannel.muted === true) {
  console.log('✅ Channel appears correctly in list!');
  console.log('   Starred:', foundChannel.starred);
  console.log('   Muted:', foundChannel.muted);
} else if (!foundChannel) {
  console.log('❌ Channel not found in list!');
  process.exit(1);
} else {
  console.log('❌ Channel state incorrect in list - starred:', foundChannel.starred, 'muted:', foundChannel.muted);
  process.exit(1);
}

// Step 8: Unstar and unmute
console.log('\n8️⃣ Unstarring and unmuting channel...');
const unstarResponse = await fetch(`${API_URL}/api/channels/${channelId}/star`, {
  method: 'PATCH',
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${aliceTokens.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ starred: false })
}).then(r => r.json());

const unmuteResponse = await fetch(`${API_URL}/api/channels/${channelId}/mute`, {
  method: 'PATCH',
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${aliceTokens.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ muted: false })
}).then(r => r.json());

if (unstarResponse.starred === false && unmuteResponse.muted === false) {
  console.log('✅ Channel unstarred and unmuted successfully!');
  console.log('   Starred:', unstarResponse.starred);
  console.log('   Muted:', unmuteResponse.muted);
} else {
  console.log('❌ Failed to unstar/unmute');
  process.exit(1);
}

console.log('\n🎉 All tests passed! Channel starring & muting working perfectly!\n');

console.log('📝 Test data created:');
console.log('   Channel ID:', channelId);
console.log('   You can manually verify in the database or clean up if needed.');
