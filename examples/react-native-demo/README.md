# ChatSDK React Native Demo

A full-featured mobile chat app demonstrating all ChatSDK capabilities.

## Features

- **Channel List**: View all conversations with unread badges
- **Real-time Messaging**: Send and receive messages instantly
- **Typing Indicators**: See when others are typing
- **User Presence**: Online/offline status for contacts
- **File Uploads**: Share images and files
- **Message Search**: Full-text search across all messages
- **Thread Replies**: Nested conversations on any message
- **Push Notifications**: Get notified of new messages
- **Dark Mode**: Beautiful dark theme

## Getting Started

### Prerequisites

1. Make sure the ChatSDK backend is running:
   ```bash
   cd ../../docker
   docker-compose up -d
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Create environment file:
   ```bash
   echo 'EXPO_PUBLIC_API_URL=http://localhost:5500' > .env
   ```

### Running the App

**iOS Simulator:**
```bash
yarn ios
```

**Android Emulator:**
```bash
yarn android
```

**Expo Go (Physical Device):**
```bash
yarn start
```

## Project Structure

```
app/
├── _layout.tsx          # Root layout with ChatProvider
├── login.tsx            # Login screen
├── search.tsx           # Search modal
├── (tabs)/
│   ├── _layout.tsx      # Tab navigation
│   ├── index.tsx        # Chats tab (channel list)
│   ├── contacts.tsx     # Contacts tab
│   └── settings.tsx     # Settings tab
├── channel/
│   └── [id].tsx         # Chat view
└── thread/
    └── [channelId]/
        └── [messageId].tsx  # Thread view

components/              # Reusable components
lib/                    # Utility functions
assets/                 # Images and icons
```

## SDK Usage Examples

### Basic Setup
```tsx
import { ChatProvider, useMessages } from '@chatsdk/react-native';

function App() {
  return (
    <ChatProvider apiUrl="http://localhost:5500" token={userToken}>
      <ChatScreen />
    </ChatProvider>
  );
}
```

### Sending Messages
```tsx
const { sendMessage } = useMessages(channelId);

await sendMessage({
  text: 'Hello!',
  attachments: [{ type: 'image', url: 'https://...' }],
});
```

### Typing Indicators
```tsx
const { typingUsers, startTyping } = useTypingIndicator(channelId);

<TextInput onChangeText={(text) => {
  if (text) startTyping();
}} />
```

### User Presence
```tsx
const { online, lastSeen } = useUserPresence(userId);

<Badge color={online ? 'green' : 'gray'} />
```

### Thread Replies
```tsx
const { parent, replies, sendReply } = useThread(channelId, messageId);

await sendReply('Thanks for explaining!');
```

## Building for Production

**iOS:**
```bash
yarn build:ios
```

**Android:**
```bash
yarn build:android
```

## License

MIT
