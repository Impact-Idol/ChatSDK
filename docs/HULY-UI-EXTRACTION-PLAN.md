# Huly UI Component Extraction Plan for ChatSDK React Demo

**Date:** 2026-01-02
**Status:** Design Specification
**Goal:** Create mobile-first React chat UI using Huly design patterns with ChatSDK backend

---

## Executive Summary

We will create a **mobile-first React chat application** that:
- Uses Huly's UI/UX design patterns as reference (NOT copying code)
- Integrates with existing ChatSDK backend (@chatsdk/core, @chatsdk/react)
- Implements all features from your comprehensive feature list
- Delivers a clickthrough prototype first, then full implementation
- Results in a production-ready mobile-first chat experience

**Key Constraints:**
- NO Svelte code copying (license restrictions)
- Only UI/UX patterns, layout structures, and design principles
- React + Tailwind CSS + shadcn/ui implementation
- Mobile-first responsive design

---

## Phase 1: Clickthrough Prototype Specification

### 1.1 Prototype Screens (Figma/HTML)

**Mobile Views (375px - 768px):**
1. **Login/Signup Screen**
   - Email/password form
   - Modern gradient background
   - ChatSDK branding

2. **Workspace Selector** (if multi-workspace)
   - List of workspaces
   - Create new workspace
   - Switch workspace

3. **Chat Navigator (Sidebar)**
   - Collapsible on mobile
   - Search bar at top
   - Special sections: Threads, DMs, Saved
   - Channel groups (collapsed/expanded)
   - Unread badges
   - "+" button for new channel/DM

4. **Channel View**
   - Header with channel name, description, members count
   - Message list (virtual scroll)
   - Message composer at bottom
   - Typing indicators
   - Date separators

5. **Direct Message View**
   - Similar to Channel but with user avatar/status
   - 1:1 DM header
   - Group DM header with participants

6. **Thread Panel (Right Sidebar)**
   - Parent message preview
   - Thread replies
   - Thread composer
   - Swipe-to-close on mobile

7. **Message Detail Actions**
   - Long-press menu (mobile)
   - Hover actions (desktop)
   - Reactions, Reply, Edit, Delete

8. **Channel/DM Settings Modal**
   - Edit name, description
   - Members list
   - Invite members
   - Privacy settings
   - Pin/Archive

9. **File Upload Preview**
   - Image thumbnails
   - File list
   - Upload progress
   - Remove attachment

10. **Emoji/Reaction Picker**
    - Categorized emojis
    - Search
    - Quick reactions

**Desktop Views (768px+):**
- 3-column layout: Navigator | Channel | Thread
- Resizable panels
- Keyboard shortcuts
- Hover states

### 1.2 Interaction Patterns from Huly

**Navigation:**
- Bottom nav on mobile (Channels, DMs, Threads, Settings)
- Slide-out sidebar on mobile
- Breadcrumb navigation
- Back button behavior

**Gestures:**
- Swipe right to open sidebar
- Swipe left to close thread
- Pull down to refresh
- Long-press for context menu

**Scrolling:**
- Virtual scrolling for 1000+ messages
- Smart auto-scroll (only if at bottom)
- "New messages" indicator when scrolled up
- Jump to date picker

**Visual Design:**
- Message grouping (same user within 5 min)
- Avatar colors based on user ID
- Unread badges with count
- Online/offline presence dots
- Typing indicator dots animation
- Skeleton loaders

---

## Phase 2: Huly Component Mapping

### 2.1 All 71 Huly Components (Organized by Function)

#### **Layout & Container (3 components)**
```
✅ Chat.svelte                          → ChatLayout (React)
✅ ChannelView.svelte                   → ChannelView (React)
✅ BlankView.svelte                     → EmptyState (React)
```

#### **Navigation (12 components)**
```
✅ ChatNavigator.svelte                 → ChatSidebar (React)
✅ ChatNavGroup.svelte                  → ChannelGroup (React)
✅ ChatNavItem.svelte                   → ChannelListItem (React)
✅ ChatNavSection.svelte                → NavSection (React)
✅ ChatSpecialElement.svelte            → SpecialNavItem (React)
✅ NavItem.svelte                       → NavItem (React)
✅ ChannelSidebarView.svelte            → ChannelSidebar (React)
✅ WorkbenchTabExtension.svelte         → (skip - not needed)
✅ ChunterBrowser.svelte                → ChannelBrowser (React)
✅ MessagesBrowser.svelte               → MessageSearch (React)
✅ SavedMessages.svelte                 → SavedMessages (React)
✅ DirectMessageButton.svelte           → NewDMButton (React)
```

#### **Channel Components (13 components)**
```
✅ Channel.svelte                       → Channel (React)
✅ ChannelHeader.svelte                 → ChannelHeader (React)
✅ ChannelIcon.svelte                   → ChannelIcon (React)
✅ ChannelInput.svelte                  → (use ChatMessageInput)
✅ ChannelMembers.svelte                → ChannelMembers (React)
✅ ChannelMessagesFilter.svelte         → MessageFilter (React)
✅ ChannelMessagesSeparator.svelte      → DateSeparator (React)
✅ ChannelPanel.svelte                  → ChannelPanel (React)
✅ ChannelPresenter.svelte              → ChannelListItem (React)
✅ ChannelPreview.svelte                → ChannelPreview (React)
✅ ChannelTypingInfo.svelte             → TypingIndicator (React)
✅ ChannelEmbeddedContent.svelte        → (skip - not needed)
✅ ChannelAside.svelte                  → ChannelSidebar (React)
```

#### **Message Components (8 components)**
```
✅ ChatMessageHeader.svelte             → MessageHeader (React)
✅ ChatMessageInput.svelte              → MessageComposer (React) ⭐
✅ ChatMessagePopup.svelte              → MessageActionsMenu (React)
✅ ChatMessagePresenter.svelte          → MessageItem (React) ⭐
✅ ChatMessagePreview.svelte            → MessagePreview (React)
✅ ChatMessagesPresenter.svelte         → MessageList (React)
✅ ReverseChannelScrollView.svelte      → VirtualMessageList (React) ⭐
✅ BaseChatScroller.svelte              → ScrollContainer (React)
```

#### **Direct Message Components (6 components)**
```
✅ DirectIcon.svelte                    → DMIcon (React)
✅ DmHeader.svelte                      → DMHeader (React)
✅ DmPresenter.svelte                   → DMListItem (React)
✅ ConvertDmToPrivateChannel.svelte     → ConvertDMModal (React)
✅ ChunterEmployeePresenter.svelte      → UserPresenter (React)
✅ CreateDirectChat.svelte              → CreateDMModal (React)
```

#### **Thread Components (9 components)**
```
✅ ThreadView.svelte                    → ThreadPanel (React) ⭐
✅ ThreadViewPanel.svelte               → ThreadViewPanel (React)
✅ ThreadContent.svelte                 → ThreadContent (React)
✅ ThreadMessagePresenter.svelte        → ThreadMessage (React)
✅ ThreadMessagePreview.svelte          → ThreadPreview (React)
✅ ThreadParentPresenter.svelte         → ThreadParent (React)
✅ ThreadSidebarView.svelte             → ThreadSidebar (React)
✅ Threads.svelte                       → ThreadsList (React)
✅ InlineCommentThread.svelte           → (skip - not needed)
```

#### **Modal & Settings (4 components)**
```
✅ EditChannel.svelte                   → EditChannelModal (React)
✅ EditChannelDescriptionTab.svelte     → ChannelDescriptionTab (React)
✅ EditChannelDescriptionAttachments    → ChannelAttachmentsTab (React)
✅ EditChannelSettingsTab.svelte        → ChannelSettingsTab (React)
✅ CreateChannel.svelte                 → CreateChannelModal (React)
```

#### **Utility Components (6 components)**
```
✅ JumpToDateSelector.svelte            → JumpToDate (React)
✅ LoadingHistory.svelte                → LoadingIndicator (React)
✅ PinnedMessages.svelte                → PinnedMessages (React)
✅ PinnedMessagesPopup.svelte           → PinnedMessagesModal (React)
✅ ChatWidget.svelte                    → (skip - we have different widget)
✅ ChatWidgetTab.svelte                 → (skip)
```

#### **Activity/Notification (7 components)**
```
✅ ChannelCreatedMessage.svelte         → SystemMessage (React)
✅ MembersChangedMessage.svelte         → SystemMessage (React)
✅ ChatMessageNotificationLabel.svelte  → NotificationLabel (React)
✅ JoinChannelNotificationPresenter     → JoinNotification (React)
✅ ThreadNotificationPresenter          → ThreadNotification (React)
✅ InlineCommentPresenter.svelte        → (skip)
✅ DocAside.svelte                      → (skip - document integration)
```

#### **Icons (2 components)**
```
✅ Lock.svelte                          → Use Lucide React icons
✅ (other icons)                        → Use Lucide React icons
```

---

### 2.2 Priority Mapping (P0, P1, P2)

#### **P0: Core Chat Experience (Build First)**
These are essential for basic chat functionality:

1. **ChatLayout** ← Chat.svelte
2. **ChatSidebar** ← ChatNavigator.svelte
3. **ChannelView** ← ChannelView.svelte
4. **VirtualMessageList** ← ReverseChannelScrollView.svelte (23KB!)
5. **MessageItem** ← ChatMessagePresenter.svelte
6. **MessageComposer** ← ChatMessageInput.svelte
7. **ChannelHeader** ← ChannelHeader.svelte
8. **ChannelListItem** ← ChannelPresenter.svelte
9. **DMListItem** ← DmPresenter.svelte
10. **ThreadPanel** ← ThreadView.svelte
11. **TypingIndicator** ← ChannelTypingInfo.svelte
12. **DateSeparator** ← ChannelMessagesSeparator.svelte

#### **P1: Enhanced Features (Build Second)**
13. **CreateChannelModal** ← CreateChannel.svelte
14. **CreateDMModal** ← CreateDirectChat.svelte
15. **MessageActionsMenu** ← ChatMessagePopup.svelte
16. **ChannelMembers** ← ChannelMembers.svelte
17. **JumpToDate** ← JumpToDateSelector.svelte
18. **ChannelSidebar** ← ChannelAside.svelte
19. **PinnedMessages** ← PinnedMessages.svelte
20. **EditChannelModal** ← EditChannel.svelte

#### **P2: Nice-to-Have (Build Third)**
21. **ChannelBrowser** ← ChunterBrowser.svelte
22. **MessageSearch** ← MessagesBrowser.svelte
23. **SavedMessages** ← SavedMessages.svelte
24. **SystemMessage** ← ChannelCreatedMessage.svelte
25. **ConvertDMModal** ← ConvertDmToPrivateChannel.svelte

---

## Phase 3: ChatSDK Integration Architecture

### 3.1 Existing ChatSDK Hooks (Available Now)

From your SDK, we already have:
```typescript
// From @chatsdk/react
import {
  useChatContext,        // Global context
  useChannels,           // Channel list
  useMessages,           // Message list with pagination
  useTypingIndicator,    // Typing state
  usePresence,           // User presence
  useFileUpload,         // File uploads
  useReactions,          // Message reactions
  useThreads,            // Thread messages
  // ... more
} from '@chatsdk/react';
```

### 3.2 Component Data Flow

**Example: ChannelView Component**

```typescript
// ChannelView.tsx
import { useMessages, useTypingIndicator } from '@chatsdk/react';

export function ChannelView({ channelId }: Props) {
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    sendMessage
  } = useMessages(channelId);

  const { typingUsers } = useTypingIndicator(channelId);

  return (
    <div className="flex flex-col h-full">
      <ChannelHeader channelId={channelId} />
      <VirtualMessageList
        messages={messages}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} />
      )}
      <MessageComposer onSend={sendMessage} />
    </div>
  );
}
```

---

## Phase 4: Design System Extraction from Huly

### 4.1 Visual Design Patterns (Reference Only)

**Color System:**
- Primary: Modern indigo/purple (#6366f1)
- Surface: Clean whites/grays
- Text hierarchy: 3 levels (primary, secondary, muted)
- Status colors: Online (green), Away (yellow), Offline (gray)
- Danger: Red for destructive actions

**Typography:**
- System font stack (-apple-system, etc.)
- Font sizes: 11px, 12px, 13px, 14px, 16px, 18px
- Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Line heights: 1.4 for body, 1.2 for headings

**Spacing:**
- Base unit: 4px (0.25rem)
- Common: 4px, 8px, 12px, 16px, 20px, 24px
- Component padding: 12-16px
- Section gaps: 16-24px

**Border Radius:**
- Small: 4px (badges, small buttons)
- Medium: 6px (inputs, cards)
- Large: 8px (modals, panels)
- Full: 9999px (avatars, pills)

**Shadows:**
- sm: subtle for cards
- md: modals and popovers
- lg: dropdowns and overlays

### 4.2 Component Patterns

**Message Grouping:**
```
If (currentMsg.user === prevMsg.user &&
    currentMsg.time - prevMsg.time < 5min):
  - Hide avatar
  - Reduce top margin
  - Show compact timestamp on hover
Else:
  - Show avatar
  - Show username + timestamp
  - Add separator margin
```

**Virtual Scrolling:**
```
Huly's ReverseChannelScrollView.svelte (23KB):
- Reverse scroll (newest at bottom)
- 200px scroll threshold for load more
- Virtual rendering (only render visible + buffer)
- Scroll position restoration
- "Jump to bottom" FAB when scrolled up
- Date separators injected dynamically
```

**Typing Indicator:**
```
3 animated dots
"Alice is typing..."
"Alice and Bob are typing..."
"3 people are typing..."
Auto-hide after 3 seconds of no typing
```

**Presence Dots:**
```
8px circle, positioned bottom-right of avatar
Colors: Green (online), Yellow (away), Gray (offline)
Pulse animation for online state
```

---

## Phase 5: Tech Stack & Implementation

### 5.1 Technology Choices

**Core:**
- React 18 (with hooks, suspense)
- TypeScript (strict mode)
- Vite (build tool)

**Styling:**
- **Tailwind CSS 3.4** (mobile-first utilities)
- **shadcn/ui** (accessible components)
- **Radix UI** (primitives)
- **Framer Motion** (animations)

**State:**
- @chatsdk/react hooks (SDK integration)
- Zustand or Jotai (local UI state)
- React Query (if needed for caching)

**Utilities:**
- react-virtual (virtual scrolling)
- date-fns (date formatting)
- emoji-mart (emoji picker)
- lucide-react (icons)

### 5.2 File Structure

```
examples/react-chat-mobile/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ChatLayout.tsx           ← Chat.svelte
│   │   │   ├── ChatSidebar.tsx          ← ChatNavigator.svelte
│   │   │   └── MobileNav.tsx            (new)
│   │   ├── channel/
│   │   │   ├── ChannelView.tsx          ← ChannelView.svelte
│   │   │   ├── ChannelHeader.tsx        ← ChannelHeader.svelte
│   │   │   ├── ChannelList.tsx
│   │   │   ├── ChannelListItem.tsx      ← ChannelPresenter.svelte
│   │   │   └── CreateChannelModal.tsx   ← CreateChannel.svelte
│   │   ├── message/
│   │   │   ├── VirtualMessageList.tsx   ← ReverseChannelScrollView
│   │   │   ├── MessageItem.tsx          ← ChatMessagePresenter
│   │   │   ├── MessageComposer.tsx      ← ChatMessageInput
│   │   │   ├── MessageGroup.tsx
│   │   │   ├── MessageActions.tsx       ← ChatMessagePopup
│   │   │   └── DateSeparator.tsx        ← ChannelMessagesSeparator
│   │   ├── thread/
│   │   │   ├── ThreadPanel.tsx          ← ThreadView.svelte
│   │   │   ├── ThreadMessage.tsx
│   │   │   └── ThreadsList.tsx
│   │   ├── dm/
│   │   │   ├── DMList.tsx
│   │   │   ├── DMListItem.tsx           ← DmPresenter.svelte
│   │   │   └── CreateDMModal.tsx        ← CreateDirectChat.svelte
│   │   ├── ui/ (shadcn/ui components)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── dropdown.tsx
│   │   │   ├── avatar.tsx
│   │   │   └── ...
│   │   └── shared/
│   │       ├── TypingIndicator.tsx      ← ChannelTypingInfo
│   │       ├── PresenceDot.tsx
│   │       ├── UserAvatar.tsx
│   │       ├── EmojiPicker.tsx
│   │       └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useVirtualScroll.ts
│   │   ├── useMessageGrouping.ts
│   │   └── useMobileNav.ts
│   ├── utils/
│   │   ├── formatDate.ts
│   │   ├── groupMessages.ts
│   │   └── avatarColor.ts
│   ├── styles/
│   │   └── globals.css (Tailwind imports)
│   └── App.tsx
├── public/
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

---

## Phase 6: Feature Mapping (Your Docs → Components)

### 6.1 Backend Features → UI Components

| Backend Feature | React Components Needed | Huly Reference |
|----------------|------------------------|----------------|
| **Channels** | ChannelList, ChannelListItem, ChannelView | ChannelPresenter, ChannelView |
| **DMs** | DMList, DMListItem, DMHeader, CreateDMModal | DmPresenter, CreateDirectChat |
| **Messages** | MessageList, MessageItem, MessageComposer | ChatMessagePresenter, ChatMessageInput |
| **Threads** | ThreadPanel, ThreadMessage, ThreadsList | ThreadView, ThreadContent |
| **Reactions** | ReactionPicker, ReactionList | (use emoji-mart) |
| **Typing** | TypingIndicator | ChannelTypingInfo |
| **Presence** | PresenceDot, OnlineStatus | (Huly presence patterns) |
| **Search** | SearchInput, SearchResults | MessagesBrowser |
| **File Upload** | FileUpload, FilePreviews, ImageLightbox | (Huly upload patterns) |
| **Markdown** | MarkdownRenderer, MarkdownEditor | (use react-markdown) |
| **Pinned** | PinnedMessages, PinButton | PinnedMessages |

### 6.2 UI Features from Huly

| Huly Pattern | Implementation | Priority |
|-------------|----------------|----------|
| Virtual Scrolling | react-virtual + custom logic | P0 |
| Message Grouping | groupMessages() utility | P0 |
| Date Separators | DateSeparator component | P0 |
| Smart Auto-scroll | useAutoScroll hook | P0 |
| Pull-to-refresh | framer-motion drag | P1 |
| Swipe gestures | react-swipeable | P1 |
| Jump to date | DatePicker + scroll | P1 |
| Keyboard shortcuts | useHotkeys | P2 |
| Mobile bottom nav | MobileNav component | P0 |

---

## Phase 7: Mobile-First Responsive Strategy

### 7.1 Breakpoints (Tailwind)

```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // Small tablets
      'md': '768px',   // Tablets + Desktop
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
    }
  }
}
```

### 7.2 Layout Behavior

**Mobile (< 768px):**
- Single column view
- Bottom tab navigation (Channels, DMs, Threads, Settings)
- Sidebar slides in from left
- Thread panel slides in from right (full screen)
- FAB for new message/channel

**Tablet (768px - 1024px):**
- 2 column: Sidebar + Channel
- Thread opens as right panel (33% width)
- Hover states enabled

**Desktop (> 1024px):**
- 3 column: Sidebar | Channel | Thread (permanent)
- Resizable panels
- All hover/keyboard interactions
- Multi-select, drag-drop

### 7.3 Component Adaptation Examples

**ChannelHeader:**
```tsx
<div className="
  flex items-center justify-between p-3
  md:p-4 md:border-b
  border-gray-200 dark:border-gray-800
">
  {/* Mobile: Hamburger + Title + Actions */}
  <button className="md:hidden" onClick={openSidebar}>
    <MenuIcon />
  </button>

  {/* Title */}
  <h1 className="text-base md:text-lg font-semibold">
    #{channel.name}
  </h1>

  {/* Desktop: Extra info */}
  <div className="hidden md:flex items-center gap-4">
    <span className="text-sm text-gray-500">
      {memberCount} members
    </span>
    <ChannelActions />
  </div>
</div>
```

---

## Phase 8: Clickthrough Prototype Deliverables

### 8.1 Prototype Format

**Option A: Figma (Recommended)**
- High-fidelity mockups
- Interactive prototype with transitions
- Mobile + desktop flows
- Component library

**Option B: React Static Prototype**
- React components with mock data
- No backend integration
- Pure UI interactions
- Storybook showcase

**Option C: HTML/CSS/Vanilla JS**
- Static HTML pages
- Tailwind CSS styling
- Minimal JavaScript
- Fast iteration

### 8.2 User Flows to Prototype

1. **Login → Workspace → Channel → Send Message**
2. **Create New Channel → Invite Members → First Message**
3. **Start DM → Send Message → Add Reaction**
4. **Click Message → Open Thread → Reply**
5. **Upload File → Preview → Send with Message**
6. **Search Messages → Jump to Result**
7. **Pin Message → View Pinned Messages**
8. **Mobile: Swipe to Open Sidebar → Select Channel**
9. **Mobile: Long Press Message → Show Actions**
10. **Desktop: Keyboard Shortcuts → Navigate Channels**

### 8.3 Clickthrough Success Criteria

Before moving to implementation, prototype must demonstrate:
- ✅ All 10 user flows navigable
- ✅ Mobile (375px) and Desktop (1440px) responsive
- ✅ Animations feel smooth (60fps)
- ✅ Touch targets are 44px minimum
- ✅ Color contrast meets WCAG AA
- ✅ Resembles Huly's polish and UX quality

---

## Phase 9: Implementation Roadmap

### Week 1: Prototype + Setup
- [ ] Create Figma clickthrough prototype
- [ ] User testing with prototype
- [ ] Setup React project with Tailwind + shadcn/ui
- [ ] Install @chatsdk/react and test connection

### Week 2: Core UI (P0 - Part 1)
- [ ] ChatLayout component (3-column responsive)
- [ ] ChatSidebar with channel list
- [ ] ChannelView container
- [ ] Basic MessageList (non-virtual)
- [ ] MessageItem component
- [ ] MessageComposer component

### Week 3: Core UI (P0 - Part 2)
- [ ] VirtualMessageList (performance)
- [ ] Message grouping logic
- [ ] DateSeparator component
- [ ] TypingIndicator component
- [ ] PresenceDot and online status
- [ ] ChannelHeader component

### Week 4: Enhanced Features (P1)
- [ ] ThreadPanel component
- [ ] ThreadMessage and replies
- [ ] CreateChannelModal
- [ ] CreateDMModal
- [ ] MessageActionsMenu
- [ ] Reactions UI

### Week 5: Polish + P1
- [ ] File upload UI
- [ ] Image previews and lightbox
- [ ] JumpToDate picker
- [ ] PinnedMessages panel
- [ ] EditChannelModal
- [ ] Mobile gestures (swipe, pull-to-refresh)

### Week 6: Testing + Optimization
- [ ] Mobile testing (iOS/Android)
- [ ] Performance optimization (Lighthouse > 90)
- [ ] Accessibility audit (WCAG AA)
- [ ] Cross-browser testing
- [ ] Final UI polish

---

## Phase 10: Key Technical Challenges

### 10.1 Virtual Scrolling (Reverse)

**Challenge:** Huly's ReverseChannelScrollView is 23KB of complex logic.

**Solution:**
1. Use `@tanstack/react-virtual` for virtualization
2. Reverse array for bottom-up rendering
3. Implement scroll threshold (200px from edge)
4. Restore scroll position on new messages
5. Date separator injection in virtual rows

**Code Pattern:**
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualMessageList({ messages }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // average message height
    overscan: 5,
  });

  // Reverse rendering logic
  // Date separator injection
  // Auto-scroll logic
}
```

### 10.2 Message Grouping

**Logic from Huly:**
```typescript
function shouldGroupWithPrevious(
  currentMsg: Message,
  prevMsg: Message | undefined
): boolean {
  if (!prevMsg) return false;
  if (currentMsg.user.id !== prevMsg.user.id) return false;

  const timeDiff = new Date(currentMsg.created_at).getTime()
                 - new Date(prevMsg.created_at).getTime();

  return timeDiff < 5 * 60 * 1000; // 5 minutes
}
```

### 10.3 Mobile Gestures

**Swipe to Open Sidebar:**
```tsx
import { useDrag } from 'framer-motion';

function MobileSidebar() {
  const { x } = useDrag({
    axis: 'x',
    onDragEnd: (event, info) => {
      if (info.offset.x > 100) {
        openSidebar();
      }
    }
  });
}
```

### 10.4 Typing Indicator Real-time

**Pattern:**
```tsx
const { startTyping, stopTyping, typingUsers } = useTypingIndicator(channelId);

// On input change
const handleChange = (e) => {
  setText(e.target.value);
  startTyping();

  // Debounce stop typing
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    stopTyping();
  }, 3000);
};
```

---

## Phase 11: Success Metrics

### 11.1 Performance Targets

- **Lighthouse Mobile:** > 90
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Virtual Scroll FPS:** 60fps with 1000+ messages
- **Bundle Size:** < 500KB (gzipped)

### 11.2 UX Quality Metrics

- **Touch Target Size:** 44px minimum
- **Color Contrast:** WCAG AA (4.5:1)
- **Animation Duration:** 200-300ms
- **Load Time (3G):** < 5s
- **Offline Support:** ServiceWorker caching

### 11.3 Feature Completeness

✅ All features from your comprehensive docs
✅ Mobile-first responsive (375px to 1920px)
✅ Huly-level polish and UX
✅ ChatSDK backend integration
✅ Production-ready code quality

---

## Appendix A: Huly Design Tokens (Reference)

```css
/* Colors (Huly-inspired, not copied) */
--primary-50: #f5f3ff;
--primary-500: #6366f1;
--primary-900: #312e81;

/* Spacing */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */

/* Typography */
--font-xs: 0.6875rem;  /* 11px */
--font-sm: 0.75rem;    /* 12px */
--font-base: 0.875rem; /* 14px */
--font-lg: 1rem;       /* 16px */

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.15);

/* Border Radius */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-full: 9999px;
```

---

## Appendix B: Component Size Estimates

| Component | Lines of Code (est.) | Complexity |
|-----------|---------------------|------------|
| VirtualMessageList | 300-400 | High |
| MessageItem | 200-250 | Medium |
| MessageComposer | 250-300 | Medium |
| ChatLayout | 150-200 | Medium |
| ChatSidebar | 200-250 | Medium |
| ThreadPanel | 200-250 | Medium |
| ChannelHeader | 100-150 | Low |
| TypingIndicator | 50-80 | Low |
| DateSeparator | 30-50 | Low |
| **Total** | **~2500-3500** | - |

**Comparison:**
- Current React example: 3,500 lines
- New mobile-first: 2,500-3,000 lines (with Tailwind)
- Reduction: ~30% less CSS, cleaner code

---

## Next Steps

1. **Approve this plan** ✅
2. **Choose prototype format** (Figma vs React static)
3. **Start with mobile clickthrough** (5 key screens)
4. **Iterate based on feedback**
5. **Begin React implementation** (Week 2)

---

**End of Huly UI Extraction Plan**
**Ready to build an exceptional mobile-first chat experience! 🚀**
