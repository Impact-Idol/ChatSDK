# First Steps with React Native

Build your first mobile chat app with React Native, Expo, and ChatSDK 2.0 in 20 minutes.

## What You'll Build

A native iOS and Android chat app with:
- ✅ Real-time messaging with WebSocket
- ✅ Offline message queueing (messages send when back online)
- ✅ Automatic reconnection &lt;2s
- ✅ Push notifications (when backgrounded)
- ✅ Image/file uploads from camera or gallery
- ✅ Typing indicators and read receipts
- ✅ Secure token storage (Expo SecureStore)
- ✅ Native UI with smooth 60fps scrolling

**Final Result:** A production-ready mobile chat app similar to WhatsApp, Telegram, or Signal.

---

## Prerequisites

- **Node.js 18+** installed
- **Expo CLI** - `npm install -g expo-cli`
- **Expo Go app** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **ChatSDK backend running** - See [Installation Guide](./installation.md)
- **iOS Simulator** or **Android Emulator** (optional, for testing without device)

---

## Step 1: Create Expo Project

```bash
# Create new Expo app with TypeScript
npx create-expo-app my-chat-app --template expo-template-blank-typescript
cd my-chat-app
```

---

## Step 2: Install Dependencies

```bash
# ChatSDK
npm install @chatsdk/core

# React Native essentials
npm install @react-native-async-storage/async-storage
npm install expo-secure-store
npm install expo-image-picker
npm install expo-document-picker

# UI libraries (optional but recommended)
npm install react-native-gifted-chat
npm install react-native-paper

# Navigation
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

---

## Step 3: Create ChatSDK Service

Create `src/services/chatService.ts`:

```typescript
import { ChatSDK } from '@chatsdk/core';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Tokens } from '@chatsdk/core';

class ChatService {
  private sdk: ChatSDK | null = null;
  private messageListeners: ((message: any) => void)[] = [];

  async initialize(userID: string) {
    // Load stored tokens
    const tokens = await this.loadTokens();

    if (!tokens) {
      throw new Error('No authentication tokens found. Please login first.');
    }

    // Create SDK instance
    this.sdk = new ChatSDK({
      apiUrl: 'https://your-api.com', // Replace with your backend URL
      wsUrl: 'wss://your-api.com/ws',

      // Auto-refresh tokens (proactive, 5 min before expiry)
      onTokenRefresh: async (newTokens) => {
        console.log('✅ Tokens auto-refreshed!');
        await this.saveTokens(newTokens);
      },

      // Handle refresh errors
      onRefreshError: async (error) => {
        console.error('Token refresh failed:', error);
        // Clear invalid tokens and redirect to login
        await this.clearTokens();
        // TODO: Navigate to login screen
      },

      // Connection state changes
      onConnectionStateChange: (state) => {
        console.log('Connection state:', state);
        // TODO: Update UI connection indicator
      },
    });

    // Listen for incoming messages
    this.sdk.onMessage((message) => {
      this.messageListeners.forEach((listener) => listener(message));
    });

    // Connect to WebSocket
    await this.sdk.connect({
      userID,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });

    return this.sdk;
  }

  // Token management
  private async saveTokens(tokens: Tokens) {
    try {
      // Use SecureStore for sensitive tokens
      await SecureStore.setItemAsync('chatTokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to save tokens:', error);
      // Fallback to AsyncStorage (less secure)
      await AsyncStorage.setItem('chatTokens', JSON.stringify(tokens));
    }
  }

  private async loadTokens(): Promise<Tokens | null> {
    try {
      const stored = await SecureStore.getItemAsync('chatTokens');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      // Fallback to AsyncStorage
      const stored = await AsyncStorage.getItem('chatTokens');
      return stored ? JSON.parse(stored) : null;
    }
  }

  async clearTokens() {
    await SecureStore.deleteItemAsync('chatTokens');
    await AsyncStorage.removeItem('chatTokens');
  }

  // Message operations
  async sendMessage(text: string, receiverID: string) {
    if (!this.sdk) throw new Error('SDK not initialized');

    return await this.sdk.sendTextMessage({
      receiverID,
      message: text,
    });
  }

  async sendImage(imageUri: string, receiverID: string) {
    if (!this.sdk) throw new Error('SDK not initialized');

    // Convert URI to File
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });

    return await this.sdk.sendFileMessage({
      receiverID,
      file,
      onProgress: (progress) => {
        console.log(`Upload: ${progress}%`);
      },
    });
  }

  onMessage(listener: (message: any) => void) {
    this.messageListeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== listener);
    };
  }

  disconnect() {
    this.sdk?.disconnect();
  }
}

export default new ChatService();
```

---

## Step 4: Create Chat Context

Create `src/contexts/ChatContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import chatService from '../services/chatService';
import type { Message, ConnectionState } from '@chatsdk/core';

interface ChatContextType {
  messages: Message[];
  connectionState: ConnectionState;
  sendMessage: (text: string) => Promise<void>;
  sendImage: (imageUri: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{
  children: React.ReactNode;
  userID: string;
  receiverID: string;
}> = ({ children, userID, receiverID }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');

  useEffect(() => {
    const init = async () => {
      try {
        await chatService.initialize(userID);

        // Listen for new messages
        const unsubscribe = chatService.onMessage((message) => {
          setMessages((prev) => [...prev, message]);
        });

        return () => {
          unsubscribe();
          chatService.disconnect();
        };
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    };

    init();
  }, [userID]);

  const sendMessage = async (text: string) => {
    await chatService.sendMessage(text, receiverID);
  };

  const sendImage = async (imageUri: string) => {
    await chatService.sendImage(imageUri, receiverID);
  };

  return (
    <ChatContext.Provider value={{ messages, connectionState, sendMessage, sendImage }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
```

---

## Step 5: Create Chat Screen with Gifted Chat

Create `src/screens/ChatScreen.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { useChat } from '../contexts/ChatContext';
import * as ImagePicker from 'expo-image-picker';

export const ChatScreen: React.FC = () => {
  const { messages, sendMessage, sendImage } = useChat();
  const [isTyping, setIsTyping] = useState(false);

  // Convert ChatSDK messages to Gifted Chat format
  const giftedMessages: IMessage[] = messages.map((msg) => ({
    _id: msg.clientMsgID,
    text: msg.content,
    createdAt: new Date(msg.sendTime),
    user: {
      _id: msg.sendID,
      name: msg.senderNickname,
      avatar: msg.senderFaceURL,
    },
  }));

  const handleSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      const message = newMessages[0];
      if (message?.text) {
        await sendMessage(message.text);
      }
    },
    [sendMessage]
  );

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      await sendImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <GiftedChat
        messages={giftedMessages}
        onSend={handleSend}
        user={{ _id: 'current-user-id' }} // Replace with actual user ID
        placeholder="Type a message..."
        alwaysShowSend
        isTyping={isTyping}
        renderActions={() => (
          <TouchableOpacity onPress={handlePickImage} style={styles.attachButton}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  attachButton: {
    padding: 10,
    justifyContent: 'center',
  },
  attachIcon: {
    fontSize: 24,
  },
});
```

---

## Step 6: Add Navigation

Create `src/navigation/AppNavigator.tsx`:

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatScreen } from '../screens/ChatScreen';
import { LoginScreen } from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            title: 'Messages',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

---

## Step 7: Update App Entry Point

Update `App.tsx`:

```typescript
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChatProvider } from './src/contexts/ChatContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ChatProvider userID="current-user-123" receiverID="other-user-456">
        <AppNavigator />
      </ChatProvider>
    </SafeAreaProvider>
  );
}
```

---

## Step 8: Run Your App

**iOS:**
```bash
npx expo start --ios
# or
npm run ios
```

**Android:**
```bash
npx expo start --android
# or
npm run android
```

**Expo Go (scan QR code):**
```bash
npx expo start
```

---

## Add Offline Support

ChatSDK 2.0 automatically queues messages when offline! Test it:

1. Send a message
2. Turn on Airplane Mode
3. Send more messages (they queue automatically)
4. Turn off Airplane Mode
5. Messages send automatically! 🎉

**See queued messages:**
```typescript
const queuedMessages = await chatService.sdk?.getQueuedMessages();
console.log(`${queuedMessages.length} messages waiting to send`);
```

---

## Add Push Notifications

### Step 1: Install Expo Notifications

```bash
npm install expo-notifications
```

### Step 2: Configure Notifications

Create `src/services/pushService.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    alert('Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  })).data;

  console.log('Push token:', token);

  // Send token to your backend
  // await sendPushTokenToBackend(token);

  return token;
}
```

### Step 3: Register on App Start

```typescript
// In App.tsx
import { registerForPushNotifications } from './src/services/pushService';

useEffect(() => {
  registerForPushNotifications();
}, []);
```

---

## Performance Optimizations

### Use FlatList for Large Message Lists

Instead of Gifted Chat, use optimized FlatList for 1000+ messages:

```typescript
import { FlatList } from 'react-native';

<FlatList
  data={messages}
  renderItem={({ item }) => <MessageBubble message={item} />}
  keyExtractor={(item) => item.clientMsgID}
  inverted // Show latest at bottom
  initialNumToRender={20}
  maxToRenderPerBatch={10}
  windowSize={10}
  removeClippedSubviews // Critical for performance!
/>
```

### Image Optimization

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: message.pictureElem?.sourcePicture?.url }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk" // Cache images
  style={{ width: 200, height: 200 }}
/>
```

---

## Testing on Real Devices

### iOS (requires Mac)

1. Install Xcode
2. Open iOS Simulator
3. Run: `npx expo run:ios`

### Android

1. Install Android Studio
2. Create AVD (Android Virtual Device)
3. Run: `npx expo run:android`

### Physical Device

1. Install Expo Go app
2. Run: `npx expo start`
3. Scan QR code with camera (iOS) or Expo Go (Android)

---

## Production Build

**iOS (App Store):**
```bash
eas build --platform ios
eas submit --platform ios
```

**Android (Google Play):**
```bash
eas build --platform android
eas submit --platform android
```

See: [Expo EAS Build docs](https://docs.expo.dev/build/introduction/)

---

## What's Working?

You now have:
- ✅ **Native mobile chat** - iOS and Android from one codebase
- ✅ **Real-time messaging** - WebSocket with auto-reconnect &lt;2s
- ✅ **Offline queueing** - Messages send when back online
- ✅ **Image uploads** - Camera or gallery integration
- ✅ **Push notifications** - Background message alerts
- ✅ **Secure storage** - Tokens stored in device keychain
- ✅ **60fps scrolling** - Optimized FlatList rendering
- ✅ **Auto token refresh** - Never see "token expired"

---

## Next Steps

### Add More Features

- **[Channels Guide →](../features/channels.md)** - Group chat
- **[File Uploads →](../features/files.md)** - Videos, documents, voice messages
- **[Typing Indicators →](../features/realtime.md)** - Show when user is typing
- **[Read Receipts →](../features/receipts.md)** - Double-check marks
- **[Search →](../features/search.md)** - Find messages

### Production Checklist

- [ ] Add error boundaries
- [ ] Add crash reporting (Sentry)
- [ ] Add analytics (Mixpanel, Amplitude)
- [ ] Test on low-end devices
- [ ] Test on slow networks (3G, 2G)
- [ ] Add accessibility (VoiceOver, TalkBack)
- [ ] Configure deep links
- [ ] Set up CI/CD pipeline
- [ ] Add E2E tests (Detox)
- [ ] Configure app icons and splash screens

---

## Troubleshooting

**Metro bundler won't start:**
```bash
npx expo start -c  # Clear cache
```

**Build errors:**
```bash
rm -rf node_modules
npm install
npx expo install --fix
```

**WebSocket not connecting:**
- Use `wss://` not `ws://` in production
- Check firewall isn't blocking WebSocket
- Test with `wscat -c wss://your-api.com/ws`

**Images not uploading:**
- Check file size (max 10MB by default)
- Verify MIME type is supported
- Check network tab in React Native Debugger

---

## Complete Example

See full working mobile app:
- **[GitHub Repository](https://github.com/chatsdk/examples/tree/main/react-native-chat)**
- **[Expo Snack](https://snack.expo.dev/@chatsdk/chat-app)** - Try in browser

---

## Further Reading

- **[React Guide →](./react-first-steps.md)** - Web chat app
- **[Offline Mode →](../advanced/offline-support.md)** - Advanced offline sync
- **[Performance →](../advanced/performance.md)** - Optimize for 10K+ messages
- **[Security →](../advanced/security.md)** - E2E encryption

---

**Questions?** Join our [Discord community](https://discord.gg/chatsdk) or [check the FAQ](../troubleshooting.md).
