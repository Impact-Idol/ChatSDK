# Video Tutorial Scripts

Complete scripts for 10 ChatSDK video tutorials (40 minutes total runtime).

---

## Video 1: Quickstart (2 minutes)

**Target Audience:** New developers
**Goal:** Send first message in 2 minutes

### Script

**[0:00 - 0:10] Introduction**
```
Hi! I'm going to show you how to build real-time chat in 2 minutes with ChatSDK 2.0.
Let's dive in!
```

**[0:10 - 0:30] Install**
```
[Terminal visible]
$ npx create-chatsdk-app demo --template nextjs

[Wait for installation progress bar]

That's it! Everything's set up - Docker services, database, API server.
```

**[0:30 - 0:50] Start Dev Server**
```
$ cd demo
$ npm run dev

[Browser opens to localhost:3000]

ChatSDK automatically started 6 Docker services and the API server.
Let's test it!
```

**[0:50 - 1:30] Send First Message**
```
[Open localhost:3000?user=alice in browser tab 1]
[Open localhost:3000?user=bob in browser tab 2]

I'll send a message as Alice...
[Type "Hello Bob!" and press enter]

And it appears instantly in Bob's chat! 🎉

[Send reply as Bob: "Hi Alice!"]
```

**[1:30 - 2:00] What Just Happened**
```
In 2 minutes, we:
✅ Created a Next.js app with ChatSDK
✅ Started PostgreSQL, Centrifugo, Redis, MinIO automatically
✅ Sent real-time WebSocket messages
✅ Got automatic offline queueing, retry logic, and connection recovery

All with zero configuration!

Check out docs.chatsdk.dev for more tutorials.
Happy chatting! 🚀
```

### Recording Notes
- Use 1080p resolution
- Show terminal and browser side-by-side
- Speed up installation process (2x)
- Add progress bar overlay during npm install
- Highlight key features with callout boxes

---

## Video 2: Building a Slack Clone (5 minutes)

**Target Audience:** Intermediate developers
**Goal:** Build a full Slack-like app

### Script

**[0:00 - 0:20] Introduction**
```
Today we're building a Slack clone with ChatSDK 2.0.
We'll add:
- Workspace sidebar
- Channel list
- Message history
- Real-time updates
- And deploy to Vercel!

Let's get started.
```

**[0:20 - 1:00] Project Setup**
```
[Terminal]
$ npx create-chatsdk-app slack-clone --template nextjs

[VS Code opens]

Our app structure:
- app/ - Next.js pages
- components/ - Reusable components
- hooks/ - ChatSDK hooks
- lib/ - Utilities

Let's start with the workspace sidebar.
```

**[1:00 - 2:00] Build Workspace Sidebar**
```typescript
// components/WorkspaceSidebar.tsx

[Show code being typed]

import { useWorkspaces } from '@chatsdk/react';

function WorkspaceSidebar() {
  const { workspaces } = useWorkspaces();

  return (
    <div className="sidebar">
      {workspaces.map((ws) => (
        <WorkspaceIcon key={ws.id} workspace={ws} />
      ))}
    </div>
  );
}

[Preview in browser - sidebar appears]
```

**[2:00 - 3:00] Build Channel List**
```typescript
// components/ChannelList.tsx

[Fast-forward through code]

function ChannelList({ workspaceId }) {
  const { channels } = useChannels({ workspaceId });

  return channels.map((channel) => (
    <div># {channel.name}</div>
  ));
}

[Browser shows #general, #random, #engineering]
```

**[3:00 - 4:00] Build Message View**
```typescript
// components/MessageView.tsx

[Show final component]

function MessageView({ channelId }) {
  const { messages } = useMessages({ channelId });
  const { send } = useSendMessage();

  return (
    <div>
      <MessageList messages={messages} />
      <MessageInput onSend={send} />
    </div>
  );
}

[Demo: Send messages, see them appear in real-time]
```

**[4:00 - 4:40] Deploy to Vercel**
```
[Terminal]
$ vercel --prod

[Wait for deployment]

✅ Deployed to: slack-clone-xyz.vercel.app

[Open in browser - fully working Slack clone]
```

**[4:40 - 5:00] Wrap Up**
```
And we're done! In 5 minutes we built:
✅ Workspace switcher
✅ Channel list
✅ Real-time messaging
✅ Deployed to production

All the code is on GitHub.
Next video: File uploads and attachments!
```

### Recording Notes
- Use VS Code dark theme
- Show code completion in action
- Fast-forward through boilerplate
- Highlight key ChatSDK hooks
- Show network tab with WebSocket connection

---

## Video 3: File Uploads & Attachments (3 minutes)

**Target Audience:** All developers
**Goal:** Implement file uploads with progress

### Script

**[0:00 - 0:15] Introduction**
```
Let's add file uploads to our chat app.
Users will be able to upload images, videos, and documents
with real-time progress bars.
```

**[0:15 - 1:00] File Input Component**
```typescript
// components/FileUploader.tsx

function FileUploader({ channelId }) {
  const { upload, progress } = useFileUpload();

  const handleUpload = async (e) => {
    const file = e.target.files[0];

    await upload({
      file,
      channelId,
      onProgress: (percent) => {
        console.log(`Upload: ${percent}%`);
      },
    });
  };

  return (
    <>
      <input type="file" onChange={handleUpload} />
      {progress > 0 && <ProgressBar value={progress} />}
    </>
  );
}

[Demo: Select image, watch progress bar fill]
```

**[1:00 - 1:45] Image Preview**
```typescript
// components/MessageAttachment.tsx

function MessageAttachment({ attachment }) {
  if (attachment.type === 'image') {
    return (
      <img
        src={attachment.url}
        alt={attachment.name}
        loading="lazy"
      />
    );
  }

  return <a href={attachment.url}>{attachment.name}</a>;
}

[Show: Image appears inline, PDF shows download link]
```

**[1:45 - 2:30] Drag and Drop**
```typescript
// Add drag and drop support

const handleDrop = async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];

  await upload({ file, channelId });
};

<div
  onDrop={handleDrop}
  onDragOver={(e) => e.preventDefault()}
>
  Drop files here
</div>

[Demo: Drag image from desktop, drops and uploads]
```

**[2:30 - 3:00] React Native Bonus**
```typescript
// Mobile: Camera upload

import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
  });

  if (!result.canceled) {
    await upload({ uri: result.assets[0].uri });
  }
};

[Show: React Native app, tap camera button, take photo, uploads]

That's file uploads! Next: Threads and reactions.
```

---

## Video 4: Threads & Reactions (3 minutes)

**Goal:** Organize conversations with threads, add emoji reactions

### Script

**[0:00 - 0:15] Introduction**
```
Threads keep conversations organized.
Reactions let users respond without typing.
Let's implement both!
```

**[0:15 - 1:15] Start Thread**
```typescript
// Click reply button on message

const handleReply = async (parentMessage) => {
  await sdk.sendMessage({
    channelId: parentMessage.channelId,
    text: 'Reply in thread',
    parentId: parentMessage.id,
  });
};

[Demo: Click reply, thread panel opens]
```

**[1:15 - 2:00] Thread View**
```typescript
function ThreadView({ messageId }) {
  const { thread } = useThread({ messageId });

  return (
    <div className="thread-panel">
      <ParentMessage message={thread.parent} />
      <ThreadReplies replies={thread.replies} />
      <ThreadInput parentId={messageId} />
    </div>
  );
}

[Show: Thread with 5 replies]
```

**[2:00 - 2:45] Add Reactions**
```typescript
const handleReaction = async (messageId, emoji) => {
  await sdk.addReaction({ messageId, emoji });
};

<button onClick={() => handleReaction(msg.id, '👍')}>
  👍
</button>

[Demo: Click thumbs up, count increases, shows who reacted]
```

**[2:45 - 3:00] Wrap Up**
```
Threads: ✅
Reactions: ✅

Code on GitHub. Next: Real-time features!
```

---

## Video 5: Mobile App with React Native (5 minutes)

**Goal:** Build native iOS/Android chat app

### Script

**[0:00 - 0:20] Introduction**
```
Let's build a mobile chat app with React Native and Expo.
We'll support:
- iOS and Android
- Push notifications
- Offline mode
- Camera uploads

Let's go!
```

**[0:20 - 1:00] Setup**
```
[Terminal]
$ npx create-expo-app mobile-chat --template blank-typescript
$ cd mobile-chat
$ npm install @chatsdk/react-native

$ npx expo start

[QR code appears, scan with phone]
[App opens on iPhone simulator]
```

**[1:00 - 2:30] Build Chat Screen**
```typescript
// screens/ChatScreen.tsx

import { GiftedChat } from 'react-native-gifted-chat';
import { useMessages, useSendMessage } from '@chatsdk/react-native';

function ChatScreen() {
  const { messages } = useMessages({ channelId });
  const { send } = useSendMessage();

  return (
    <GiftedChat
      messages={messages}
      onSend={send}
      user={{ _id: userId }}
    />
  );
}

[Show: Beautiful mobile chat interface]
```

**[2:30 - 3:30] Camera Upload**
```typescript
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    await sdk.uploadFile({
      uri: result.assets[0].uri,
      channelId,
    });
  }
};

[Demo: Tap camera icon, take photo, appears in chat]
```

**[3:30 - 4:15] Push Notifications**
```typescript
import * as Notifications from 'expo-notifications';

const registerPushToken = async () => {
  const { status } = await Notifications.requestPermissionsAsync();

  if (status === 'granted') {
    const token = await Notifications.getExpoPushTokenAsync();
    await sdk.setPushToken({ token: token.data });
  }
};

[Demo: Lock phone, send message from desktop, notification appears]
```

**[4:15 - 4:45] Offline Mode**
```
[Turn on airplane mode]
[Send message - shows "Sending..."]
[Turn off airplane mode]
[Message sends automatically!]

ChatSDK automatically queued the message and sent it when
online! No code needed.
```

**[4:45 - 5:00] Wrap Up**
```
We built a full mobile chat app with:
✅ iOS & Android support
✅ Camera uploads
✅ Push notifications
✅ Automatic offline queue

Ready for the App Store!
```

---

## Videos 6-10 (Shorter Scripts)

### Video 6: Real-Time Features (4 minutes)
- Typing indicators
- User presence (online/away/busy)
- Read receipts
- Live message updates

### Video 7: Custom UI Theming (3 minutes)
- Change colors and fonts
- Dark mode toggle
- Custom message bubbles
- Brand customization

### Video 8: Production Deployment (5 minutes)
- Set environment variables
- Deploy to Vercel
- Configure database (PostgreSQL)
- Set up S3 storage
- Enable monitoring

### Video 9: Debugging Common Issues (4 minutes)
- Enable debug mode
- Check WebSocket connection
- Inspect network requests
- Read error messages
- Use React DevTools

### Video 10: Support Chat Widget (5 minutes)
- Embed chat widget on website
- Customer view
- Agent dashboard
- Conversation history
- Auto-assignment

---

## Production Workflow

### Pre-Production
1. Write detailed script
2. Prepare demo environment
3. Test all code examples
4. Create assets (thumbnails, overlays)

### Recording
1. Clean desktop, close unnecessary apps
2. Set resolution to 1080p (1920x1080)
3. Record with Loom or ScreenFlow
4. Use clear, enthusiastic voice
5. Keep takes short (record in segments)

### Post-Production
1. Edit in iMovie or DaVinci Resolve
2. Add intro/outro (5s each)
3. Add callout boxes for key points
4. Generate captions (YouTube auto-captions)
5. Create thumbnail (Figma or Canva)
6. Export as 1080p MP4

### Publishing
1. Upload to YouTube
2. Write description with timestamps
3. Add tags: `chatsdk`, `real-time chat`, `websocket`, `react`
4. Add to playlist
5. Embed in docs
6. Share on Twitter/Discord

---

## YouTube Playlist Structure

```
ChatSDK 2.0 Tutorials
├── Getting Started
│   ├── Quickstart (2:00)
│   ├── Building a Slack Clone (5:00)
│   └── Mobile App with React Native (5:00)
├── Features
│   ├── File Uploads & Attachments (3:00)
│   ├── Threads & Reactions (3:00)
│   └── Real-Time Features (4:00)
└── Advanced
    ├── Custom UI Theming (3:00)
    ├── Production Deployment (5:00)
    ├── Debugging Common Issues (4:00)
    └── Support Chat Widget (5:00)

Total Runtime: 39 minutes
```

---

## Embedding in Docs

```markdown
# Quickstart Video

<iframe
  width="560"
  height="315"
  src="https://www.youtube.com/embed/VIDEO_ID"
  frameborder="0"
  allowfullscreen
></iframe>

**Duration:** 2 minutes
**Topics:** Installation, First Message, Real-time Updates
```

---

## Analytics Goals

Track video performance:
- Views: 10,000+ in first month
- Watch time: 50%+ average
- Engagement: 100+ likes per video
- Conversions: 5%+ viewers sign up for ChatSDK

---

**Next:** Create and publish videos during Week 5 Day 4.
