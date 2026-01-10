# Channels & Workspaces

Learn how to create and manage channels and workspaces for team collaboration in ChatSDK 2.0.

## Overview

ChatSDK supports a **Slack-style hierarchy**:

```
Workspace (Organization)
  └── Channels (Rooms/Conversations)
      └── Messages
          └── Threads
```

**Use Cases:**
- **Team Messaging** - Slack/Teams clone with workspaces and channels
- **Customer Support** - Separate workspace per customer account
- **Gaming** - Workspace per game server, channels per room
- **Healthcare** - Workspace per hospital, channels per department

---

## Workspace Basics

### Create Workspace

```typescript
import { ChatSDK } from '@chatsdk/core';

const sdk = await ChatSDK.connect({
  apiUrl: 'https://api.yourdomain.com',
  userId: 'user-123',
});

// Create workspace
const workspace = await sdk.createWorkspace({
  name: 'Acme Inc',
  slug: 'acme',  // URL-friendly identifier
  description: 'Company workspace',
  avatar: 'https://acme.com/logo.png',
  settings: {
    publicSignup: false,
    inviteOnly: true,
  },
});

console.log('Workspace ID:', workspace.id); // 'ws-abc123'
```

### List Workspaces

```typescript
// Get all workspaces for current user
const workspaces = await sdk.listWorkspaces();

workspaces.forEach((ws) => {
  console.log(`${ws.name} (${ws.memberCount} members)`);
});
```

### Get Workspace Details

```typescript
const workspace = await sdk.getWorkspace({ workspaceId: 'ws-abc123' });

console.log(workspace);
// {
//   id: 'ws-abc123',
//   name: 'Acme Inc',
//   slug: 'acme',
//   memberCount: 42,
//   channelCount: 15,
//   createdAt: '2024-01-09T...',
// }
```

### Update Workspace

```typescript
await sdk.updateWorkspace({
  workspaceId: 'ws-abc123',
  name: 'Acme Corporation',
  description: 'Updated description',
  settings: {
    publicSignup: true,
  },
});
```

### Delete Workspace

```typescript
await sdk.deleteWorkspace({ workspaceId: 'ws-abc123' });
// ⚠️ This deletes all channels and messages!
```

---

## Channel Basics

### Channel Types

ChatSDK supports 3 channel types:

| Type | Description | Use Case |
|------|-------------|----------|
| **public** | Anyone in workspace can join | #general, #random |
| **private** | Invite-only | #management, #hr |
| **dm** | Direct message (1-on-1) | User to user chat |

### Create Channel

```typescript
// Public channel
const general = await sdk.createChannel({
  workspaceId: 'ws-abc123',
  name: 'general',
  type: 'public',
  description: 'General discussion',
  topic: 'Welcome to Acme Inc! 👋',
});

// Private channel
const management = await sdk.createChannel({
  workspaceId: 'ws-abc123',
  name: 'management',
  type: 'private',
  description: 'Management team only',
  memberIds: ['user-123', 'user-456'], // Initial members
});

// Direct message
const dm = await sdk.createDirectMessage({
  userId: 'other-user-789',
});
```

### List Channels

```typescript
// All channels in workspace
const allChannels = await sdk.listChannels({
  workspaceId: 'ws-abc123',
});

// Only public channels
const publicChannels = await sdk.listChannels({
  workspaceId: 'ws-abc123',
  type: 'public',
});

// Channels I'm a member of
const myChannels = await sdk.listMyChannels({
  workspaceId: 'ws-abc123',
});
```

### Get Channel Details

```typescript
const channel = await sdk.getChannel({ channelId: 'ch-xyz789' });

console.log(channel);
// {
//   id: 'ch-xyz789',
//   name: 'general',
//   type: 'public',
//   memberCount: 42,
//   unreadCount: 5,
//   lastMessage: { ... },
//   createdAt: '2024-01-09T...',
// }
```

### Update Channel

```typescript
await sdk.updateChannel({
  channelId: 'ch-xyz789',
  name: 'general-chat',
  topic: 'Updated topic',
  description: 'Updated description',
});
```

### Archive Channel

```typescript
// Archive (soft delete)
await sdk.archiveChannel({ channelId: 'ch-xyz789' });

// Unarchive
await sdk.unarchiveChannel({ channelId: 'ch-xyz789' });

// Permanently delete
await sdk.deleteChannel({ channelId: 'ch-xyz789' });
// ⚠️ This deletes all messages!
```

---

## Channel Membership

### Join Channel

```typescript
// Join public channel
await sdk.joinChannel({ channelId: 'ch-xyz789' });

// Auto-join on message send
await sdk.sendMessage({
  channelId: 'ch-xyz789',
  text: 'Hello!',
  autoJoin: true, // Join automatically if not a member
});
```

### Leave Channel

```typescript
await sdk.leaveChannel({ channelId: 'ch-xyz789' });
```

### Invite Members

```typescript
// Invite single user
await sdk.inviteToChannel({
  channelId: 'ch-xyz789',
  userId: 'user-456',
});

// Invite multiple users
await sdk.inviteToChannel({
  channelId: 'ch-xyz789',
  userIds: ['user-456', 'user-789', 'user-012'],
});
```

### Remove Members

```typescript
await sdk.removeFromChannel({
  channelId: 'ch-xyz789',
  userId: 'user-456',
});
```

### List Members

```typescript
const members = await sdk.listChannelMembers({
  channelId: 'ch-xyz789',
  limit: 50,
  offset: 0,
});

members.forEach((member) => {
  console.log(`${member.name} - ${member.role}`);
});
```

---

## Channel Roles & Permissions

### Assign Role

```typescript
// Make user a moderator
await sdk.assignChannelRole({
  channelId: 'ch-xyz789',
  userId: 'user-456',
  role: 'moderator',
});

// Available roles: 'owner', 'admin', 'moderator', 'member'
```

### Check Permissions

```typescript
const canDelete = await sdk.checkChannelPermission({
  channelId: 'ch-xyz789',
  userId: 'user-456',
  permission: 'messages.delete',
});

if (canDelete) {
  await sdk.deleteMessage({ messageId: 'msg-123' });
}
```

### Custom Permissions

```typescript
await sdk.updateChannelPermissions({
  channelId: 'ch-xyz789',
  permissions: {
    'messages.send': ['member', 'moderator', 'admin', 'owner'],
    'messages.delete': ['moderator', 'admin', 'owner'],
    'channels.invite': ['admin', 'owner'],
    'channels.settings': ['owner'],
  },
});
```

---

## Real-Time Channel Events

### Subscribe to Channel

```typescript
// Subscribe to new messages in channel
sdk.subscribeToChannel({ channelId: 'ch-xyz789' });

// Listen for new messages
sdk.on('message.new', (message) => {
  if (message.channelId === 'ch-xyz789') {
    console.log('New message in general:', message.text);
  }
});

// Unsubscribe
sdk.unsubscribeFromChannel({ channelId: 'ch-xyz789' });
```

### Channel Events

```typescript
// Member joined
sdk.on('channel.member_joined', ({ channelId, userId, userName }) => {
  console.log(`${userName} joined #${channelId}`);
});

// Member left
sdk.on('channel.member_left', ({ channelId, userId, userName }) => {
  console.log(`${userName} left #${channelId}`);
});

// Channel updated
sdk.on('channel.updated', ({ channelId, changes }) => {
  console.log('Channel updated:', changes);
});

// Typing indicator
sdk.on('typing.start', ({ channelId, userId, userName }) => {
  console.log(`${userName} is typing in #${channelId}...`);
});
```

---

## React Integration

### Channel List Component

```typescript
import { useChannels } from '@chatsdk/react';

function ChannelList({ workspaceId }) {
  const { channels, loading, error } = useChannels({ workspaceId });

  if (loading) return <div>Loading channels...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="channel-list">
      <h2>Channels</h2>
      {channels.map((channel) => (
        <ChannelItem
          key={channel.id}
          channel={channel}
          onClick={() => selectChannel(channel.id)}
        />
      ))}
    </div>
  );
}

function ChannelItem({ channel, onClick }) {
  return (
    <div onClick={onClick} className="channel-item">
      <span className="channel-icon">
        {channel.type === 'public' ? '#' : '🔒'}
      </span>
      <span className="channel-name">{channel.name}</span>
      {channel.unreadCount > 0 && (
        <span className="unread-badge">{channel.unreadCount}</span>
      )}
    </div>
  );
}
```

### Create Channel Form

```typescript
import { useState } from 'react';
import { useCreateChannel } from '@chatsdk/react';

function CreateChannelForm({ workspaceId, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('public');
  const { createChannel, loading } = useCreateChannel();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const channel = await createChannel({
      workspaceId,
      name,
      type,
      description: '',
    });

    onCreated(channel);
    setName('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Channel name"
        required
      />

      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="public">Public Channel</option>
        <option value="private">Private Channel</option>
      </select>

      <button type="submit" disabled={loading || !name.trim()}>
        Create Channel
      </button>
    </form>
  );
}
```

---

## React Native Integration

```typescript
import { useChannels, useCreateChannel } from '@chatsdk/react-native';
import { FlatList, TouchableOpacity, Text, View } from 'react-native';

function ChannelListScreen({ workspaceId, navigation }) {
  const { channels, loading, refresh } = useChannels({ workspaceId });

  const handleSelectChannel = (channel) => {
    navigation.navigate('Chat', { channelId: channel.id });
  };

  return (
    <FlatList
      data={channels}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleSelectChannel(item)}>
          <View style={styles.channelItem}>
            <Text style={styles.channelName}>
              {item.type === 'public' ? '#' : '🔒'} {item.name}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id}
      refreshing={loading}
      onRefresh={refresh}
    />
  );
}
```

---

## Best Practices

### 1. Channel Naming

```typescript
// ✅ Good: lowercase, hyphenated
'general', 'random', 'engineering-team', 'product-feedback'

// ❌ Bad: spaces, special chars, uppercase
'General Discussion!', 'Engineering Team', 'product_feedback'
```

### 2. Default Channels

```typescript
// Create default channels when workspace is created
const workspace = await sdk.createWorkspace({ name: 'Acme Inc' });

// Auto-create #general
await sdk.createChannel({
  workspaceId: workspace.id,
  name: 'general',
  type: 'public',
  description: 'General discussion',
  isDefault: true, // Users auto-join on workspace join
});

// Auto-create #random
await sdk.createChannel({
  workspaceId: workspace.id,
  name: 'random',
  type: 'public',
  description: 'Random conversations',
  isDefault: true,
});
```

### 3. Channel Pagination

```typescript
// Load channels in batches for better performance
const loadChannels = async (workspaceId) => {
  let allChannels = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const batch = await sdk.listChannels({
      workspaceId,
      limit,
      offset,
    });

    allChannels = [...allChannels, ...batch];

    if (batch.length < limit) break; // No more channels
    offset += limit;
  }

  return allChannels;
};
```

### 4. Unread Count Management

```typescript
// Mark channel as read when user opens it
const handleOpenChannel = async (channelId) => {
  await sdk.markChannelAsRead({ channelId });

  // Unread count updates automatically via WebSocket
};
```

### 5. Channel Archiving

```typescript
// Archive old channels instead of deleting
const archiveInactiveChannels = async (workspaceId) => {
  const channels = await sdk.listChannels({ workspaceId });

  for (const channel of channels) {
    const lastActivity = new Date(channel.lastMessageAt);
    const daysSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);

    if (daysSinceActivity > 90) {
      await sdk.archiveChannel({ channelId: channel.id });
      console.log(`Archived inactive channel: ${channel.name}`);
    }
  }
};
```

---

## Advanced Features

### Channel Categories

```typescript
// Group channels into categories (like Discord)
await sdk.createChannelCategory({
  workspaceId: 'ws-abc123',
  name: 'Engineering',
  position: 1,
});

await sdk.updateChannel({
  channelId: 'ch-xyz789',
  categoryId: 'cat-123',
});
```

### Channel Templates

```typescript
// Create channel from template
await sdk.createChannelFromTemplate({
  workspaceId: 'ws-abc123',
  templateId: 'support-channel',
  name: 'customer-acme-corp',
  variables: {
    customerName: 'Acme Corp',
    assignedAgent: 'user-456',
  },
});
```

### Bulk Operations

```typescript
// Bulk invite users to multiple channels
await sdk.bulkInviteToChannels({
  userId: 'user-123',
  channelIds: ['ch-abc', 'ch-def', 'ch-ghi'],
});

// Bulk archive channels
await sdk.bulkArchiveChannels({
  channelIds: ['ch-old1', 'ch-old2', 'ch-old3'],
});
```

---

## Troubleshooting

**Channel not appearing in list:**
- Check user is a member: `await sdk.isMemberOf({ channelId })`
- Verify channel type (private channels need explicit membership)
- Check workspace ID matches

**Can't send messages to channel:**
- Join channel first: `await sdk.joinChannel({ channelId })`
- Check permissions: `await sdk.checkChannelPermission(...)`
- Verify channel is not archived

**Unread count not updating:**
- Ensure WebSocket is connected: `sdk.getConnectionState()`
- Subscribe to channel: `sdk.subscribeToChannel({ channelId })`
- Check browser console for errors

---

## Next Steps

- **[Messages →](./messages.md)** - Send and manage messages in channels
- **[Threads →](./threads.md)** - Organize conversations with threads
- **[Permissions →](../advanced/permissions.md)** - Fine-grained access control
- **[Real-Time →](./realtime.md)** - Events, typing indicators, presence

---

**Need help?** Join our [Discord community](https://discord.gg/chatsdk) or check the [API Reference](../../API_REFERENCE.md).
