# Week 5: Documentation

**Goal:** Create best-in-class documentation that makes ChatSDK the easiest messaging SDK to learn and integrate.

**Timeline:** 5 days
**Team:** 1 engineer + 0.5 DevRel
**Dependencies:** Weeks 1-4 (all features complete)

## Overview

Week 5 transforms ChatSDK from "figure it out yourself" to "crystal clear documentation":
1. **Comprehensive Guides** - 20+ step-by-step tutorials
2. **Video Tutorials** - 10 screencast videos
3. **API Reference** - Complete SDK documentation
4. **Troubleshooting Guides** - Debug common issues in minutes

**Success Metrics:**
- Documentation pages: 10 → **20+** ✅
- Video tutorials: 0 → **10** ✅
- Time to debug common issues: 30 min → **5 min** ✅
- Documentation rating: N/A → **4.5/5 stars** ✅

## Daily Breakdown

### Day 1: Getting Started Guides (5 guides)
### Day 2: Feature Guides (8 guides)
### Day 3: Advanced Guides (7 guides)
### Day 4: Video Tutorials (10 videos)
### Day 5: API Reference & Troubleshooting

---

## Day 1: Getting Started Guides

### Guides to Create

#### 1. **Quickstart (5 minutes)**
```markdown
# 5-Minute Quickstart

From zero to first message in 5 minutes.

## Prerequisites
- Node.js 18+
- Docker Desktop running

## Step 1: Create App (30s)
npx create-chatsdk-app my-chat-app

## Step 2: Start Dev Server (10s)
cd my-chat-app
npm run dev

## Step 3: Send First Message (30s)
1. Open http://localhost:3000?user=alice
2. Open http://localhost:3000?user=bob in another tab
3. Type and send a message

🎉 Done! You built real-time chat in 5 minutes.
```

#### 2. **Installation & Setup**
- Installation methods (npm, yarn, pnpm, CDN)
- Environment setup
- Docker configuration
- Production deployment

#### 3. **Authentication**
- Single token authentication
- User management
- Custom user metadata
- Token refresh handling

#### 4. **First Steps with React**
- Project setup
- Connect to ChatSDK
- Send first message
- Display message list

#### 5. **First Steps with React Native**
- Expo setup
- iOS/Android configuration
- Mobile-specific features
- Push notifications setup

---

## Day 2: Feature Guides

### Guides to Create

#### 6. **Channels & Workspaces**
```typescript
// Create workspace
const workspace = await chat.createWorkspace({
  name: 'Acme Inc',
  slug: 'acme',
});

// Create channel
const channel = await chat.createChannel({
  workspaceId: workspace.id,
  name: 'general',
  type: 'public',
});

// List channels
const channels = await chat.listChannels({
  workspaceId: workspace.id,
});
```

#### 7. **Sending Messages**
- Text messages
- Rich text formatting
- Mentions (@user, @channel)
- Message attachments
- Link previews

#### 8. **File Uploads**
```typescript
// Upload file
const file = await chat.uploadFile({
  file: selectedFile,
  onProgress: (percent) => {
    console.log(`Upload: ${percent}%`);
  },
});

// Send message with attachment
await chat.sendMessage({
  channelId: '123',
  text: 'Check this out!',
  attachments: [file],
});
```

#### 9. **Reactions & Threads**
```typescript
// Add reaction
await chat.addReaction({
  messageId: '123',
  reaction: '👍',
});

// Start thread
await chat.sendMessage({
  channelId: '123',
  text: 'Reply in thread',
  parentId: '123', // Thread parent
});

// Get thread
const thread = await chat.getThread({ messageId: '123' });
```

#### 10. **Real-Time Updates**
```typescript
// Subscribe to new messages
chat.on('message.new', (message) => {
  console.log('New message:', message);
});

// Subscribe to typing indicators
chat.on('typing.start', ({ userId, channelId }) => {
  console.log(`${userId} is typing in ${channelId}`);
});

// Subscribe to presence
chat.on('user.presence', ({ userId, status }) => {
  console.log(`${userId} is ${status}`);
});
```

#### 11. **Search & Filters**
#### 12. **User Presence & Typing Indicators**
#### 13. **Read Receipts & Delivery Status**

---

## Day 3: Advanced Guides

### Guides to Create

#### 14. **Permissions & Roles**
```typescript
// Assign role
await chat.assignRole({
  userId: 'user123',
  channelId: 'channel456',
  role: 'moderator',
});

// Check permission
const canDelete = await chat.checkPermission({
  userId: 'user123',
  channelId: 'channel456',
  permission: 'messages.delete',
});
```

#### 15. **Custom UI Components**
- Theming system
- Custom message renderer
- Custom emoji picker
- Override default components

#### 16. **Offline Mode**
```typescript
// Enable offline queue
const chat = await ChatSDK.connect({
  apiKey: 'your-key',
  userId: 'user123',
  offline: {
    enabled: true,
    storage: 'indexeddb',
    syncOnReconnect: true,
  },
});

// Messages sent offline are queued
await chat.sendMessage({ text: 'Sent offline!' });
// ↑ Automatically sends when connection returns
```

#### 17. **Performance Optimization**
- Message pagination
- Virtual scrolling
- Image lazy loading
- Bundle size optimization
- Caching strategies

#### 18. **Security Best Practices**
- Token storage
- XSS prevention
- CSRF protection
- Content sanitization
- Rate limiting

#### 19. **Production Deployment**
- Environment variables
- Database setup
- Scaling guidelines
- Monitoring & logging
- Backup strategies

#### 20. **HIPAA Compliance**
- Enable encryption
- Audit logging
- Data retention policies
- Access controls
- BAA requirements

---

## Day 4: Video Tutorials

### Videos to Record (2-5 minutes each)

#### Video 1: **Quickstart (2 minutes)**
```
Script:
- Show terminal: npx create-chatsdk-app demo
- Show browser: localhost:3000 with chat working
- Send messages between two users
- "That's it! Real-time chat in 2 minutes."
```

#### Video 2: **Building a Slack Clone (5 minutes)**
```
Topics:
- Create workspace & channels
- Implement sidebar
- Add message list
- Add message input
- Deploy to Vercel
```

#### Video 3: **File Uploads & Attachments (3 minutes)**
```
Topics:
- Upload file with progress bar
- Preview images inline
- Download attachments
- Handle large files
```

#### Video 4: **Threads & Reactions (3 minutes)**
```
Topics:
- Start a thread
- Reply in thread
- Add reactions
- Display thread UI
```

#### Video 5: **Mobile App with React Native (5 minutes)**
```
Topics:
- npx create-chatsdk-app mobile --template react-native-expo
- Run on iOS simulator
- Run on Android emulator
- Push notifications
```

#### Video 6: **Real-Time Features (4 minutes)**
```
Topics:
- Typing indicators
- User presence
- Read receipts
- Live updates
```

#### Video 7: **Custom UI Theming (3 minutes)**
```
Topics:
- Change colors
- Custom fonts
- Dark mode
- Brand logo
```

#### Video 8: **Production Deployment (5 minutes)**
```
Topics:
- Set environment variables
- Deploy to Vercel
- Configure database
- Set up S3 storage
```

#### Video 9: **Debugging Common Issues (4 minutes)**
```
Topics:
- Enable debug mode
- Check network tab
- Read error messages
- Use DevTools extension
```

#### Video 10: **Building a Support Chat Widget (5 minutes)**
```
Topics:
- Embed script tag
- Customize widget appearance
- Agent dashboard
- Customer conversation history
```

### Video Production Workflow

```bash
# Tools needed:
- Screen recorder: Loom / ScreenFlow / OBS
- Video editor: iMovie / DaVinci Resolve
- Thumbnail design: Figma / Canva

# Recording checklist:
1. Write script (bullet points)
2. Prepare demo environment
3. Record in 1080p (16:9)
4. Add captions (auto-generate)
5. Create thumbnail
6. Upload to YouTube
7. Add to docs

# YouTube playlist structure:
ChatSDK Tutorials
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
```

---

## Day 5: API Reference & Troubleshooting

### API Reference

Auto-generate from TypeScript types using TypeDoc:

```bash
# Install TypeDoc
npm install --save-dev typedoc

# Generate API docs
npx typedoc --out docs/api packages/core/src/index.ts

# Configure typedoc.json
{
  "entryPoints": ["packages/core/src/index.ts"],
  "out": "docs/api",
  "theme": "default",
  "includeVersion": true,
  "categorizeByGroup": true,
  "categoryOrder": [
    "Client",
    "Messages",
    "Channels",
    "Users",
    "Realtime",
    "*"
  ]
}
```

**API Reference Structure:**

```
API Reference
├── ChatSDK
│   ├── connect()
│   ├── connectDevelopment()
│   └── disconnect()
├── ChatClient
│   ├── sendMessage()
│   ├── updateMessage()
│   ├── deleteMessage()
│   ├── addReaction()
│   ├── uploadFile()
│   └── ...
├── Channel
│   ├── send()
│   ├── markRead()
│   ├── subscribe()
│   └── ...
├── Hooks (React)
│   ├── useChat()
│   ├── useMessages()
│   ├── useChannels()
│   ├── useSendMessage()
│   └── ...
└── Types
    ├── Message
    ├── Channel
    ├── User
    └── ...
```

### Troubleshooting Guide

**Common Issues & Solutions:**

#### Issue 1: "Cannot connect to database"
```
Error: Connection refused to localhost:5432

Solution:
1. Check Docker is running: docker ps
2. Start services: docker compose up -d
3. Verify connection: psql postgresql://postgres:postgres@localhost:5432/chatsdk
```

#### Issue 2: "WebSocket connection failed"
```
Error: WebSocket connection to 'ws://localhost:8000' failed

Solution:
1. Check Centrifugo is running: curl http://localhost:8000/connection
2. Verify CENTRIFUGO_API_KEY in .env.local
3. Check browser console for CORS errors
```

#### Issue 3: "Token expired" / "401 Unauthorized"
```
Error: JWT token expired

Solution:
1. Token refresh should be automatic
2. Check refresh token is valid
3. Clear localStorage and reconnect
4. Enable debug mode: NEXT_PUBLIC_CHATSDK_DEBUG=true
```

#### Issue 4: "Messages not sending"
```
Error: Message fails with no error

Solution:
1. Check network tab in DevTools
2. Enable debug mode to see retries
3. Verify API key and permissions
4. Check circuit breaker status
```

#### Issue 5: "File upload fails"
```
Error: File upload returns 413 Payload Too Large

Solution:
1. Check file size limit (default 10MB)
2. Configure S3 bucket permissions
3. Increase Nginx body size if self-hosted
```

#### Issue 6: "Port already in use"
```
Error: Port 3000 is already allocated

Solution:
1. Find process: lsof -i :3000
2. Kill process: kill -9 <PID>
3. Or change port: npm run dev -- -p 3001
```

#### Issue 7: "npm install fails"
```
Error: EACCES permission denied

Solution:
1. Don't use sudo with npm
2. Fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors
3. Or use nvm: https://github.com/nvm-sh/nvm
```

#### Issue 8: "Real-time updates not working"
```
Error: Messages don't appear live

Solution:
1. Check WebSocket connection: chat.getState()
2. Verify channel subscription
3. Check Centrifugo logs: docker logs centrifugo
4. Test with two browser windows
```

#### Issue 9: "TypeScript errors after update"
```
Error: Property 'xyz' does not exist on type 'Message'

Solution:
1. Update SDK: npm install @chatsdk/react@latest
2. Clear node_modules: rm -rf node_modules && npm install
3. Check migration guide for breaking changes
```

#### Issue 10: "Docker containers won't start"
```
Error: docker compose up fails

Solution:
1. Check Docker disk space: docker system df
2. Prune unused images: docker system prune
3. Reset Docker Desktop (Settings → Reset)
4. Check docker-compose.yml syntax
```

---

## Documentation Site Structure

```
docs.chatsdk.dev/
├── Getting Started
│   ├── Quickstart (5 minutes)
│   ├── Installation & Setup
│   ├── Authentication
│   ├── React Tutorial
│   └── React Native Tutorial
├── Core Concepts
│   ├── Channels & Workspaces
│   ├── Messages & Threads
│   ├── Users & Presence
│   ├── Permissions & Roles
│   └── Real-Time Updates
├── Features
│   ├── File Uploads
│   ├── Reactions & Emoji
│   ├── Search & Filters
│   ├── Typing Indicators
│   ├── Read Receipts
│   └── Push Notifications
├── Advanced
│   ├── Custom UI Components
│   ├── Offline Mode
│   ├── Performance Optimization
│   ├── Security Best Practices
│   ├── Production Deployment
│   └── HIPAA Compliance
├── API Reference
│   ├── ChatSDK
│   ├── ChatClient
│   ├── Channel
│   ├── React Hooks
│   └── Types
├── Video Tutorials
│   └── [Embedded YouTube playlist]
├── Troubleshooting
│   ├── Common Issues
│   ├── Error Messages
│   ├── Debug Mode
│   └── FAQ
└── Examples
    ├── Slack Clone
    ├── Support Chat
    ├── Marketplace Messaging
    ├── Telehealth Platform
    └── Gaming Chat
```

---

## Documentation Platform

**Tech Stack:**
- Framework: **Nextra** (Next.js + MDX)
- Hosting: **Vercel**
- Search: **Algolia DocSearch**
- Analytics: **Plausible**

**Setup:**

```bash
# Create docs site
npx create-nextra-app docs --template docs

# Configure
{
  "title": "ChatSDK Documentation",
  "logo": "<Logo />",
  "project": {
    "link": "https://github.com/chatsdk/chatsdk"
  },
  "docsRepositoryBase": "https://github.com/chatsdk/chatsdk/tree/main/docs",
  "useNextSeoProps": () => ({
    titleTemplate: '%s – ChatSDK'
  }),
  "search": {
    "provider": "algolia"
  },
  "feedback": {
    "content": "Was this helpful?",
    "labels": "feedback"
  }
}
```

---

## Week 5 Summary

**Deliverables:**
- ✅ 20+ comprehensive guides (Getting Started → Advanced)
- ✅ 10 video tutorials (40 minutes total)
- ✅ Complete API reference (auto-generated)
- ✅ Troubleshooting guide (10 common issues)
- ✅ Documentation site deployed (docs.chatsdk.dev)

**Impact:**
- Time to find answer: 30 min → **<5 min**
- Developer satisfaction: **4.5/5 stars**
- Support tickets: **-70%** (self-service docs)

**Next Week Preview:**
Week 6 focuses on developer tools (debug mode, DevTools extension, error messages).
