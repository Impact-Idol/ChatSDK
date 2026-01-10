# Permissions & Roles

Fine-grained access control for channels, messages, and workspace features.

## Built-in Roles

ChatSDK provides 4 default roles:

| Role | Permissions | Use Case |
|------|-------------|----------|
| **owner** | Full control | Workspace/channel creator |
| **admin** | Manage settings, moderate | Team leads |
| **moderator** | Delete messages, ban users | Community moderators |
| **member** | Send messages, react | Regular users |

## Assign Roles

```typescript
// Channel role
await sdk.assignChannelRole({
  channelId: 'ch-abc123',
  userId: 'user-456',
  role: 'moderator',
});

// Workspace role
await sdk.assignWorkspaceRole({
  workspaceId: 'ws-abc123',
  userId: 'user-456',
  role: 'admin',
});
```

## Check Permissions

```typescript
const canDelete = await sdk.checkPermission({
  channelId: 'ch-abc123',
  userId: 'user-456',
  permission: 'messages.delete',
});

if (canDelete) {
  await sdk.deleteMessage({ messageId: 'msg-123' });
}
```

## Custom Permissions

```typescript
await sdk.updateChannelPermissions({
  channelId: 'ch-abc123',
  permissions: {
    'messages.send': ['member', 'moderator', 'admin', 'owner'],
    'messages.edit': ['owner_only'], // Only message owner
    'messages.delete': ['moderator', 'admin', 'owner'],
    'channels.invite': ['admin', 'owner'],
    'channels.settings': ['owner'],
  },
});
```

## Permission Middleware (React)

```typescript
function DeleteButton({ message, currentUserId }) {
  const { hasPermission } = usePermissions();
  
  const canDelete = hasPermission({
    permission: 'messages.delete',
    ownerId: message.senderId,
  });
  
  if (!canDelete) return null;
  
  return (
    <button onClick={() => sdk.deleteMessage({ messageId: message.id })}>
      Delete
    </button>
  );
}
```

---

## Next Steps

- **[Security →](./security.md)** - Security best practices
- **[Channels →](../features/channels.md)** - Channel management
