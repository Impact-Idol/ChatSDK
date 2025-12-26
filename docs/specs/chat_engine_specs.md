# Chat Engine Implementation Plan

## Goal Description
Build an incredibly modern, exceptional state of the art in dec 2025, scalable, embeddable chat product similar to GetStream.io or CometChat. The system will support multi-tenancy, real-time messaging, and native mobile experiences.
Build SDK, APIs, Sample apps in ios, android and react. 
**Tech Stack**:
- **Real-time Engine**: Centrifugo (High performance auth-aware pub/sub).
- **Async Workers**: Inngest (Reliable event processing for push notifications, webhooks).
- **Push Notifications**: OneSignal.
- **Backend/API**: Node.js/TypeScript (Recommended for Inngest compatibility) or Python.
- **Database**: PostgreSQL (Relational integrity for complex messaging states).

## Architecture Overview

### High-Level Data Flow
```mermaid
graph TD
    User[End User (Mobile/Web)] -->|REST API| API[API Gateway / Backend]
    User -->|WebSocket| Centrifugo[Centrifugo Real-time Engine]
    API -->|Publish| Centrifugo
    API -->|Trigger Event| Inngest[Inngest Event Bus]
    API -->|Read/Write| DB[(PostgreSQL)]
    
    Inngest -->|Process| Worker[Background Workers]
    Worker -->|Send Push| OneSignal[OneSignal]
    OneSignal -->|Push| User
    Worker -->|Webhook| External[External Platforms]
```

## Database Schema Design (Best-of-Breed)
We will adopt **Zulip's optimized schema pattern** for handling read states and unread counts efficiently at scale, combined with **Multi-tenancy (Realms)**.

### Core Tables
1.  **App/Realm**: Represents a tenant (a customer's app).
    -   `id`: UUID
    -   `api_key`: String
    -   `webhook_url`: String
2.  **User**: End-users within an App.
    -   `id`: String (Unique per App)
    -   `app_id`: FK -> App
    -   `name`, `image`, `online_status`
3.  **Channel**: A chat room.
    -   `id`: UUID
    -   `app_id`: FK -> App
    -   `type`: enum(messaging, livestream, team, commerce)
    -   `cid`: String (Unique ID, e.g., `messaging:general`)
    -   `config`: JSON (Freeze settings, slow mode, etc.)
4.  **Message**: The content.
    -   `id`: UUID (Time-sortable UUID v7 recommended)
    -   `cid`: FK -> Channel
    -   `user_id`: FK -> User
    -   `text`: Text
    -   `attachments`: JSONB
    -   `parent_id`: UUID (For threads)
    -   `reply_to_id`: UUID (For quoted replies)
    -   `shadowed`: Boolean (Soft moderation)
5.  **Reaction**: Emojis.
    -   `message_id`, `user_id`, `type` (e.g., ":like:")
6.  **ChannelMember**: Membership.
    -   `channel_id`, `user_id`, `role` (admin, member, moderator)
    -   `last_read_message_id`: Pointer to last read message.
7.  **UserMessage** (Zulip Pattern - **CRITICAL**):
    -   *Denormalized state for fast querying.*
    -   `user_id`: FK
    -   `message_id`: FK
    -   `flags`: Bitmask (IsRead, IsMentioned, IsStarred)
    -   *Why?* Allows querying "My Unread Messages" without scanning the main Message table join.

## Real-time Architecture (Centrifugo)
-   **Channels Pattern**:
    -   `chat:channel:{channel_id}`: Standard updates (new message, reaction).
    -   `chat:user:{user_id}`: Private notifications (system events, unseen counts).
-   **Authentication**:
    -   Backend generates JWT for Centrifugo connection.
    -   JWT contains user ID and channel permissions (capabilities).

## Async Worker Strategy (Inngest)
We will use Inngest to handle all side-effects reliability.

### Event: `chat/message.sent`
1.  **Step 1: Fan-out Push Notifications**
    -   Query `ChannelMembers` where `user_id != sender`.
    -   Filter by `online_status` (skip if user is active on socket).
    -   Batch send to **OneSignal**.
2.  **Step 2: Webhooks**
    -   If `App` has `webhook_url` configured, dispatch payload.
3.  **Step 3: Moderation (Optional)**
    -   Send text to AI service for auto-flagging.

## Premium & State-of-the-Art Experience (GetStream Parity)
To match GetStream's "exceptional" quality, we must implement:

### 1. Offline-First Architecture
-   **Local Database**: Mobile (Sqlite/Room/CoreData) and Web (IndexedDB/RxDB) must cache all channels/messages.
-   **Sync Engine**:
    -   On App Open: Fetch fast-forward diffs since `last_synced_at`.
    -   While Offline: Queue `sendMessage` actions locally with a temporary UUID.
    -   On Online: Replay queue.

### 2. "Snappy" Optimistic UI
-   **Rule**: UI *never* waits for the server.
-   **Messsages**: Append immediately to the list with `status: sending`. Update to `sent` on server ack.
-   **Reactions**: Toggle heart icon immediately. Revert if server fails.
-   **Channel List**: Re-sort immediately when a new message is sent locally.

### 3. Advanced Components (The "Wow" Factor)
-   **Virtualized Lists**: Use `react-virtuoso` (Web) / `LazyColumn` (Compose) / `UICollectionView` (iOS) for 10,000+ message threads without lag.
-   **Rich Input**: Support `@mentions` (with popup), `/commands`, and drag-and-drop file/video uploads.
-   **Smart Pagination**: ID-based cursor pagination (not offsets) to prevent message skipping/duplication.
-   **Indicators**: Real-time "Kevin is typing..." and "Read by Sarah at 10:05 AM" (seen state).

## Mobile & SDK Strategy
To compete with GetStream, we need **Native SDKs** that wrap the API and Socket logic.

### 1. iOS SDK (Swift) - "The Premium Kit"
-   **Core**: `ChatClient` (Singleton) managing the generic `OfflineStore`.
-   **UI Components** (SwiftUI):
    -   `ChannelListView`: Virtualized, swipable rows (mute/delete), online presence dots.
    -   `MessageListView`: Bubble grouping, gesture replies, reaction overlays.
    -   `AttachmentPreview`: Native galleries.
-   **Dependency**: Swift Package Manager (SPM).

### 2. Android SDK (Kotlin) - "Jetpack Compose First"
-   **Core**: `ChatClient` with Room Database persistence.
-   **UI Components**: fully composable functions `ChatTheme { ChannelList(...) }`.

### 3. React/Web SDK
-   **Architecture**: Context-based (`ChatProvider`) to avoid prop-drilling.
-   **Components**: `ChannelList`, `MessageList` (Virtualized), `MessageInput`, `Thread`.
-   **Hooks**: `useChatClient`, `useChannelState`, `useTyping`.

## Implementation Phases

### Phase 1: The Core Engine (Backend)
-   [ ] Setup DB (Postgres) & Prisma/TypeORM/Drizzle.
-   [ ] Implement Auth & Multi-tenancy middleware.
-   [ ] Build Basic CRUD APIs (Channels, Messages) with **Cursor Pagination**.
-   [ ] Integrate Centrifugo for publishing.

### Phase 2: The Logic Layer (Inngest)
-   [ ] Setup Inngest.
-   [ ] Implement `chat/message.sent` flow.
-   [ ] Integrate OneSignal.

### Phase 3: The Client SDKs (MVP)
-   [ ] Build JS SDK (Offline logic, Sync engine).
-   [ ] Build React UI Kit (Virtualized Lists, Optimistic UI).
-   [ ] Build Basic iOS Swift Client (Network layer + CoreData).

## Recommendations from Asset Review
1.  **Zulip**: Adopt their strict separation of "Message Content" vs "User State" (`UserMessage`). This is the secret to their performance.
2.  **Huly**: Copy their "Message -> Task" conversion flow concepts for the "Threads" implementation.
3.  **Ravenchat**: Use their module separation as a guide for our code structure (e.g., `messaging`, `channel_management`, `notifications`).

## Feature Catalog & Deep Dive Insights

### 1. Advanced Message Features (Derived from Zulip/Huly)
-   **Drafts**: Auto-save typed specific content to `local_storage` keyed by `channel_id`.
-   **Polls** (Raven Style): First-class message type `poll` with `options` and `vote` sub-collection.
-   **File Uploads** (Zulip Style):
    -   **Signed URLs**: Backend returns S3 Presigned URL. Client uploads directly to S3.
    -   **Quota**: Per-tenant storage limits.
-   **Presence**: Track `session_id` (mobile vs desktop). User is "online" if any session is active.

### 2. Moderation & Trust
-   **Shadow Banning**: Message stored with `shadowed: true`. Only visible to sender.
-   **Slow Mode**: `channel.config.slow_mode_interval` (e.g., 10s).

## Epics & User Stories (Product Backlog)

### Epic 1: Core Platform & Multi-Tenancy (The "Embeddable" Layer)
*   **Story 1.1**: As a Platform Admin, I can create a new `App` (Tenant) and generate API Keys (Public/Secret).
*   **Story 1.2**: As a Developer, I can register `Users` via API with a custom `id`, `name`, and `image`.
*   **Story 1.3**: As a System, I validate every API request against the App's Rate Limits (e.g., 100 req/sec).
*   **Story 1.4**: As a Developer, I can configure Webhook URLs for my App to receive `message.new` events.

### Epic 2: Real-time Message Infrastructure
*   **Story 2.1**: As a User, I can establish a WebSocket connection via Centrifugo using a generated JWT.
*   **Story 2.2**: As a System, I publish `message.new` events to `chat:channel:{cid}` within 50ms of creation.
*   **Story 2.3**: As a User, I receive a `health.check` ping every 30s to keep my connection alive.
*   **Story 2.4**: As a User, I automatically reconnect with exponential backoff if my network drops.

### Epic 3: Advanced Messaging Experience
*   **Story 3.1**: As a User, I can edit my own message text (marked as `(edited)`).
*   **Story 3.2**: As a User, I can soft-delete my message (showing "Message deleted").
*   **Story 3.3**: As a User, I can "Reply in Thread" to start a side-conversation (Zulip/Slack style).
*   **Story 3.4**: As a User, I can React with an emoji (👍) and see the count update instantly.
*   **Story 3.5**: As a User, I can "Quote Reply" to a specific message in the main timeline.
*   **Story 3.6**: As a User, I can type markdown (bold, italic, code blocks) and see it rendered.

### Epic 4: Channel Management & Moderation
*   **Story 4.1**: As a Moderator, I can "Freeze" a channel (no new messages allowed except from admins).
*   **Story 4.2**: As a System, I enforce "Slow Mode" (e.g., users can only message once every 30s) if configured.
*   **Story 4.3**: As a Moderator, I can Ban a user (shadow ban or hard ban) from the channel.
*   **Story 4.4**: As a Developer, I can query `QueryChannels` with filter operators (`type: 'messaging'`, `members: {$in: ['user_id']}`).

### Epic 5: Media, Files & Attachments
*   **Story 5.1**: As a User, I can upload an image/video. (System requests S3 Presigned URL -> Uploads directly to S3).
*   **Story 5.2**: As a System, I generate thumbnail variants (small, medium) for uploaded images triggered by S3 events.
*   **Story 5.3**: As a User, I see a placeholder/blurhash while the image is loading.
*   **Story 5.4**: As a User, I can view a gallery of all images shared in a channel headers.

### Epic 6: Offline-First Engine (Mobile & Web)
*   **Story 6.1**: As a Mobile User, I can view my channel list and messages while in "Airplane Mode" (Cached in SQLite/Room).
*   **Story 6.2**: As a Mobile User, I can send a message while offline. It appears as "Sending..." and auto-retries when connection is restored.
*   **Story 6.3**: As a System, I provide a `/sync` endpoint that accepts `last_synced_at` and returns only the diff (new messages, reaction updates).

### Epic 7: Smart Notifications & Push (Inngest)
*   **Story 7.1**: As a System, I check if a recipient is `online` before sending a Push Notification (avoid double-pinging).
*   **Story 7.2**: As a System, I bundle multiple unread messages into a single Push ("5 new messages from 2 chats") using Inngest debounce.
*   **Story 7.3**: As a User, I can set "Do Not Disturb" schedules which suppress generic notifications.
*   **Story 7.4**: As a User, I can click a Push Notification to deep-link directly into the relevant Thread/Channel.

### Epic 8: React Web SDK (Component Library)
*   **Story 8.1**: As a Developer, I can drop in `<ChannelList />` and `<MessageList />` components that just work.
*   **Story 8.2**: As a Developer, I can customize the `Message` component design via a `MessageUI` prop or slot.
*   **Story 8.3**: As a User, I experience "Infinite Scroll" (virtualized) up to 10k messages without browser lag.
*   **Story 8.4**: As a User, I see "Typing..." indicators when others are writing.

### Epic 9: iOS Native SDK (Swift)
*   **Story 9.1**: As an iOS Dev, I can install the SDK via Swift Package Manager (SPM).
*   **Story 9.2**: As an iOS Dev, I can instantiate `ChatClient.shared` and access `client.channel(id: "xc").watch()`.
*   **Story 9.3**: As an iOS User, I see native specialized keyboards for Emoji/Attachments.
*   **Story 9.4**: As an iOS User, I can long-press a message to see a native Context Menu (Reply, React, Delete).

### Epic 10: Android Native SDK (Kotlin/Compose)
*   **Story 10.1**: As an Android Dev, I can use Jetpack Compose components `ChatTheme { MessageList(...) }`.
*   **Story 10.2**: As an Android User, I can swipe-to-reply on a message row.
*   **Story 10.3**: As an Android User, my messages persist across App Force-Close (Room DB persistence).

## 🚀 Rockstar PM Strategy: The "State of the Art" Differentiators
*Thinking like a PM: How do we win? By focusing on Developer Experience (DX) and User Delight.*

### Epic 11: User Delight & Social Interactions (The "Sticky" Features)
*   **Story 11.1**: As a User, when I paste a link, I see a beautiful **OpenGraph Preview** (Image + Title) instantly.
*   **Story 11.2**: As a User, I can search and send **GIPHYs** via a `/giphy` command or button.
*   **Story 11.3**: As a User, I can see "Smart Reply" suggestions (AI-generated) to answer quickly (e.g., "Sounds good!", "On my way").
*   **Story 11.4**: As a User, my reactions animate (e.g., the "Need" module style in our Raven exploration).

### Epic 12: Developer Experience (The "Product" for our Customers)
*   **Story 12.1**: As a Dev, I can use a **CLI Tool** (`npx chat-init`) to scaffold a full working chat app in 30 seconds.
*   **Story 12.2**: As a Dev, I have access to a **UI Kit Playground** (Storybook) to copy-paste pre-styled component code.
*   **Story 12.3**: As a Dev, I can view **Usage Analytics** (MAU, Peak Concurrent Connections) in my Dashboard.

### Epic 13: Trust, Safety & AI Moderation
*   **Story 13.1**: As a Moderator, I can enable "Auto-Mod" which uses LLMs to flag toxic messages before they are published.
*   **Story 13.2**: As a Dev, I can export a "Transparency Report" of all moderation actions taken in a channel.

## Verification Plan

### Automated Tests
-   **API Integration**: Jest/Supertest calling API endpoints.
-   **Load Testing**: k6 scripts simulating 10k concurrent WebSocket connections to Centrifugo.
-   **Inngest Replay**: Use Inngest formatting to replay events and verify OneSignal calls mocked.

### Manual Verification
-   **End-to-End**: Open Web Client A and Mobile Client B. Send message from A. Verify:
    1.  B receives socket event immediately (latency < 100ms).
    2.  B (if backgrounded) receives Push Notification.
    3.  Database shows `UserMessage` row created for B.
