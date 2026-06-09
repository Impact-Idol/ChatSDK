import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatClient } from '@chatsdk/core';
import { ChatProvider } from '@chatsdk/react';
import { ChannelListScreen } from './src/screens/ChannelListScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import type { Channel } from '@chatsdk/core';

export type RootStackParamList = {
  ChannelList: undefined;
  Chat: { channel: Channel };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const API_URL = 'https://your-chatsdk-api.com';
const WS_URL = 'wss://your-chatsdk-api.com/connection/websocket';
const TOKEN_URL = 'https://your-app.com/api/chatsdk-token';

// Initialize client
const client = new ChatClient({
  apiUrl: API_URL,
  wsUrl: WS_URL,
  tokenProvider: () => fetchToken('demo-user', 'Demo User'),
  debug: true,
});

async function fetchToken(userId: string, displayName: string) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, displayName }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch ChatSDK token');
  }

  const data = await response.json();
  const expiresIn = typeof data.expiresIn === 'number' ? data.expiresIn : 900;

  return {
    token: data.token,
    wsToken: data.wsToken ?? data._internal?.wsToken ?? data.token,
    refreshToken: data.refreshToken,
    expiresIn,
  };
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connect = async () => {
      try {
        await client.connectUser(
          { id: 'demo-user', name: 'Demo User' }
        );
        setConnected(true);
      } catch (err: any) {
        setError(err.message || 'Failed to connect');
      } finally {
        setConnecting(false);
      }
    };

    connect();

    return () => {
      client.disconnect();
    };
  }, []);

  if (connecting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  if (error || !connected) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to connect</Text>
        <Text style={styles.errorSubtext}>{error || 'Unknown error'}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ChatProvider client={client}>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: '#6366f1' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '600' },
            }}
          >
            <Stack.Screen
              name="ChannelList"
              component={ChannelListScreen}
              options={{ title: 'Channels' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({
                title: route.params.channel.name || 'Chat',
              })}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ChatProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
  },
});
