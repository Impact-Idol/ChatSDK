/**
 * ChatSDK Demo - Root Layout
 * Expo Router layout with ChatProvider
 */

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { ChatProvider } from '@chatsdk/react-native';
import * as SecureStore from 'expo-secure-store';
import { usePushNotifications } from '@chatsdk/react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5500';

export default function RootLayout() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved token
    const loadToken = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync('chat_token');
        setToken(savedToken);
      } catch {
        // Token not found
      } finally {
        setLoading(false);
      }
    };
    loadToken();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!token) {
    return (
      <>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
        </Stack>
      </>
    );
  }

  return (
    <ChatProvider
      apiUrl={API_URL}
      token={token}
      onTokenExpired={async () => {
        await SecureStore.deleteItemAsync('chat_token');
        setToken(null);
      }}
    >
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="channel/[id]"
          options={{ title: 'Chat' }}
        />
        <Stack.Screen
          name="thread/[channelId]/[messageId]"
          options={{ title: 'Thread', presentation: 'modal' }}
        />
        <Stack.Screen
          name="search"
          options={{ title: 'Search', presentation: 'modal' }}
        />
      </Stack>
      <PushNotificationHandler />
    </ChatProvider>
  );
}

// Handle push notification registration
function PushNotificationHandler() {
  usePushNotifications({
    onNotificationReceived: (notification) => {
      console.log('Notification received:', notification);
    },
    onNotificationTapped: (notification) => {
      console.log('Notification tapped:', notification);
    },
  });

  return null;
}
