# Push Notifications with Novu

ChatSDK integrates with [Novu](https://novu.co) for push notifications, supporting FCM (Android), APNs (iOS), and Expo Push.

## Quick Start

### 1. Set Environment Variables

```bash
# Required
NOVU_SECRET_KEY=your-novu-api-key
NOVU_API_URL=https://api.novu.co  # Or your self-hosted URL

# Optional: Multi-tenant isolation
NOVU_TENANT_ID=myapp-prod

# Optional: Custom workflow IDs (if integrating with existing Novu workflows)
NOVU_WORKFLOW_NEW_MESSAGE=new-message
NOVU_WORKFLOW_MENTION=mention
NOVU_WORKFLOW_CHANNEL_INVITE=channel-invite
NOVU_WORKFLOW_REACTION=reaction
NOVU_WORKFLOW_THREAD_REPLY=thread-reply
```

### 2. Create Novu Workflows

Run the setup script to create notification workflows:

```bash
cd packages/api
npx tsx src/scripts/setup-novu-workflows.ts
```

This creates 5 workflows in Novu:
- `new-message` - New message notifications
- `mention` - @mention notifications
- `channel-invite` - Channel invitation notifications
- `reaction` - Reaction notifications
- `thread-reply` - Thread reply notifications

### 3. Configure Push Providers in Novu

Open your Novu dashboard and configure the push providers:

**FCM (Android):**
1. Firebase Console → Project Settings → Cloud Messaging
2. Download the service account JSON
3. Novu: Integrations → FCM → Add service account

**APNs (iOS):**
1. Apple Developer → Certificates → Keys
2. Create a key with APNs enabled
3. Novu: Integrations → APNs → Add .p8 key file

**Expo (React Native):**
1. No additional setup required
2. Novu: Integrations → Expo → Enable

---

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NOVU_SECRET_KEY` | Yes | - | Novu API key |
| `NOVU_API_URL` | No | `http://localhost:3000` | Novu API URL |
| `NOVU_TENANT_ID` | No | - | Prefix for subscriber IDs (multi-tenant) |
| `NOVU_WORKFLOW_NEW_MESSAGE` | No | `new-message` | Workflow ID for new messages |
| `NOVU_WORKFLOW_MENTION` | No | `mention` | Workflow ID for mentions |
| `NOVU_WORKFLOW_CHANNEL_INVITE` | No | `channel-invite` | Workflow ID for invites |
| `NOVU_WORKFLOW_REACTION` | No | `reaction` | Workflow ID for reactions |
| `NOVU_WORKFLOW_THREAD_REPLY` | No | `thread-reply` | Workflow ID for thread replies |

---

## Multi-Tenant Support

For applications serving multiple tenants (e.g., SaaS), use `NOVU_TENANT_ID` to isolate subscribers:

```bash
# Production environment
NOVU_TENANT_ID=myapp-prod

# Staging environment
NOVU_TENANT_ID=myapp-staging
```

This prefixes subscriber IDs:
- Without tenant: `user-123`
- With tenant: `myapp-prod:user-123`

Benefits:
- Isolated subscriber data per environment
- Share Novu account across environments
- Prevent cross-environment notifications

---

## API Integration

### Register Device Token

```bash
POST /api/devices
Content-Type: application/json
Authorization: Bearer <token>

{
  "platform": "ios",
  "token": "device-push-token-from-native",
  "provider": "apns"
}
```

**Providers:**
- `fcm` - Firebase Cloud Messaging (Android)
- `apns` - Apple Push Notification service (iOS)
- `expo` - Expo Push (React Native)

### Get Notification Preferences

```bash
GET /api/devices/preferences
Authorization: Bearer <token>
```

**Response:**
```json
{
  "preferences": {
    "pushEnabled": true,
    "newMessages": true,
    "mentions": true,
    "reactions": false,
    "channelInvites": true,
    "threadReplies": true,
    "quietHoursEnabled": false,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00"
  },
  "novuPreferences": {
    "channels": [...],
    "workflows": [...]
  }
}
```

---

## Notification Types

### New Message

Triggered when a user receives a new message in a channel they haven't muted.

```json
{
  "workflowId": "new-message",
  "payload": {
    "senderId": "user-456",
    "senderName": "Alice",
    "senderAvatar": "https://...",
    "channelId": "channel-123",
    "channelName": "General",
    "messagePreview": "Hey, check this out!",
    "messageId": "msg-789"
  }
}
```

### Mention

Triggered when a user is @mentioned in a message.

```json
{
  "workflowId": "mention",
  "payload": {
    "mentionedBy": "user-456",
    "mentionedByName": "Alice",
    "channelId": "channel-123",
    "channelName": "General",
    "messagePreview": "Hey @john, check this out!",
    "messageId": "msg-789"
  }
}
```

### Channel Invite

Triggered when a user is invited to a channel.

```json
{
  "workflowId": "channel-invite",
  "payload": {
    "invitedBy": "user-456",
    "invitedByName": "Alice",
    "channelId": "channel-123",
    "channelName": "Project Alpha",
    "channelDescription": "Discussion for Project Alpha"
  }
}
```

### Reaction

Triggered when someone reacts to the user's message.

```json
{
  "workflowId": "reaction",
  "payload": {
    "reactorId": "user-456",
    "reactorName": "Alice",
    "emoji": "👍",
    "channelId": "channel-123",
    "messagePreview": "Great work on the...",
    "messageId": "msg-789"
  }
}
```

### Thread Reply

Triggered when someone replies to a thread the user is participating in.

```json
{
  "workflowId": "thread-reply",
  "payload": {
    "replierId": "user-456",
    "replierName": "Alice",
    "channelId": "channel-123",
    "channelName": "General",
    "threadId": "thread-123",
    "replyPreview": "I agree, we should..."
  }
}
```

---

## React Native Integration

### Expo

```typescript
import * as Notifications from 'expo-notifications';
import { ChatSDK } from '@chatsdk/core';

async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = await Notifications.getExpoPushTokenAsync();

  // Register with ChatSDK
  await fetch('/api/devices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${chatToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform: 'expo',
      token: token.data,
      provider: 'expo',
    }),
  });
}
```

### React Native Firebase

```typescript
import messaging from '@react-native-firebase/messaging';

async function registerForPushNotifications() {
  await messaging().requestPermission();
  const token = await messaging().getToken();

  // Register with ChatSDK
  await fetch('/api/devices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${chatToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform: 'android',
      token: token,
      provider: 'fcm',
    }),
  });
}
```

---

## User Lifecycle

### On User Creation

Users are automatically registered as Novu subscribers when they first authenticate.

### On User Deletion

When a user is deleted via `DELETE /api/users/:userId` or `POST /api/users/bulk-delete`, their Novu subscriber is automatically cleaned up.

---

## Debugging

### Check Novu Configuration

```typescript
import { getNovuConfig, isNovuConfigured } from './services/novu';

// Check if Novu is configured
console.log('Novu configured:', isNovuConfigured());

// Get full configuration
console.log('Config:', getNovuConfig());
// {
//   configured: true,
//   serverUrl: 'https://api.novu.co',
//   tenantId: 'myapp-prod',
//   workflows: { newMessage: 'new-message', ... }
// }
```

### Log Prefix

All Novu-related logs use the `[ChatSDK Novu]` prefix:

```
[ChatSDK Novu] Initialized { serverUrl: 'https://api.novu.co', tenantId: 'myapp-prod', workflows: '...' }
[ChatSDK Novu] Subscriber already exists: user-123
[ChatSDK Novu] Failed to send notification: ...
```

---

## Graceful Degradation

If Novu is not configured (`NOVU_SECRET_KEY` not set):
- All notification functions return immediately without errors
- Debug logs indicate notifications are disabled
- Application continues to function normally

This allows development without Novu configured.
