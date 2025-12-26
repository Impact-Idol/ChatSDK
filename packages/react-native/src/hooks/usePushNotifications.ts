/**
 * usePushNotifications - React Native push notification management
 * Handles token registration, permissions, and notification handling
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useChatClient } from '@chatsdk/react';

export interface PushNotificationConfig {
  // Called when a notification is received while app is in foreground
  onNotificationReceived?: (notification: PushNotification) => void;
  // Called when user taps a notification
  onNotificationOpened?: (notification: PushNotification) => void;
  // Called when token is updated
  onTokenRefresh?: (token: string) => void;
  // Request permission on mount
  requestPermissionOnMount?: boolean;
}

export interface PushNotification {
  id: string;
  title?: string;
  body?: string;
  data?: {
    type: 'new-message' | 'mention' | 'reaction' | 'thread-reply' | 'channel-invite';
    channelId?: string;
    messageId?: string;
    senderId?: string;
    [key: string]: any;
  };
}

export interface UsePushNotificationsResult {
  // Permission state
  permissionStatus: 'granted' | 'denied' | 'undetermined' | 'provisional';
  // Request permission manually
  requestPermission: () => Promise<boolean>;
  // Register current device token
  registerToken: (token: string, platform: 'ios' | 'android' | 'expo') => Promise<void>;
  // Unregister device (for logout)
  unregisterToken: (token: string) => Promise<void>;
  // Current registered token
  token: string | null;
  // Error if any
  error: Error | null;
}

/**
 * usePushNotifications - Manage push notifications for ChatSDK
 *
 * This hook provides the glue between your push notification library
 * (Expo Notifications, react-native-firebase, etc.) and ChatSDK.
 *
 * @example with Expo Notifications:
 * ```tsx
 * import * as Notifications from 'expo-notifications';
 *
 * function App() {
 *   const { registerToken, requestPermission } = usePushNotifications({
 *     onNotificationOpened: (notification) => {
 *       if (notification.data?.channelId) {
 *         navigation.navigate('Chat', { channelId: notification.data.channelId });
 *       }
 *     },
 *   });
 *
 *   useEffect(() => {
 *     async function setupPush() {
 *       const { status } = await Notifications.requestPermissionsAsync();
 *       if (status === 'granted') {
 *         const token = await Notifications.getExpoPushTokenAsync();
 *         await registerToken(token.data, 'expo');
 *       }
 *     }
 *     setupPush();
 *   }, []);
 *
 *   return <App />;
 * }
 * ```
 *
 * @example with Firebase Cloud Messaging:
 * ```tsx
 * import messaging from '@react-native-firebase/messaging';
 *
 * function App() {
 *   const { registerToken } = usePushNotifications();
 *
 *   useEffect(() => {
 *     messaging().requestPermission().then((status) => {
 *       if (status === messaging.AuthorizationStatus.AUTHORIZED) {
 *         messaging().getToken().then((token) => {
 *           registerToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
 *         });
 *       }
 *     });
 *
 *     // Listen for token refresh
 *     return messaging().onTokenRefresh((token) => {
 *       registerToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
 *     });
 *   }, []);
 *
 *   return <App />;
 * }
 * ```
 */
export function usePushNotifications(
  config: PushNotificationConfig = {}
): UsePushNotificationsResult {
  const client = useChatClient();
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'undetermined' | 'provisional'
  >('undetermined');
  const [error, setError] = useState<Error | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  // Register token with backend
  const registerToken = useCallback(
    async (pushToken: string, platform: 'ios' | 'android' | 'expo') => {
      try {
        await client.fetch('/api/devices', {
          method: 'POST',
          body: JSON.stringify({
            token: pushToken,
            platform,
          }),
        });

        setToken(pushToken);
        setError(null);

        if (configRef.current.onTokenRefresh) {
          configRef.current.onTokenRefresh(pushToken);
        }
      } catch (err) {
        setError(err as Error);
        console.error('Failed to register push token:', err);
      }
    },
    [client]
  );

  // Unregister token (for logout)
  const unregisterToken = useCallback(
    async (pushToken: string) => {
      try {
        await client.fetch(`/api/devices/${encodeURIComponent(pushToken)}`, {
          method: 'DELETE',
        });

        setToken(null);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to unregister push token:', err);
      }
    },
    [client]
  );

  // Placeholder for permission request
  // Actual implementation depends on the push library used
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // This is a placeholder - actual implementation depends on your push library
    // For Expo: Notifications.requestPermissionsAsync()
    // For Firebase: messaging().requestPermission()
    console.warn(
      'requestPermission is a placeholder. Implement with your push notification library.'
    );
    return false;
  }, []);

  // Re-register token when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && token) {
          // Re-register to update last_active_at
          registerToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [token, registerToken]);

  return {
    permissionStatus,
    requestPermission,
    registerToken,
    unregisterToken,
    token,
    error,
  };
}

/**
 * Handle notification navigation
 * Call this when a notification is tapped to navigate to the right screen
 */
export function getNotificationNavigationTarget(
  notification: PushNotification
): { screen: string; params: Record<string, any> } | null {
  const data = notification.data;
  if (!data) return null;

  switch (data.type) {
    case 'new-message':
    case 'mention':
    case 'reaction':
      if (data.channelId) {
        return {
          screen: 'Chat',
          params: {
            channelId: data.channelId,
            messageId: data.messageId,
          },
        };
      }
      break;

    case 'thread-reply':
      if (data.channelId && data.messageId) {
        return {
          screen: 'Thread',
          params: {
            channelId: data.channelId,
            parentMessageId: data.messageId,
          },
        };
      }
      break;

    case 'channel-invite':
      if (data.channelId) {
        return {
          screen: 'ChannelPreview',
          params: {
            channelId: data.channelId,
          },
        };
      }
      break;
  }

  return null;
}

/**
 * Notification preferences hook
 */
export interface NotificationPreferences {
  newMessages: boolean;
  mentions: boolean;
  reactions: boolean;
  threadReplies: boolean;
  channelInvites: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export function useNotificationPreferences() {
  const client = useChatClient();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load preferences
  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      try {
        const result = await client.fetch<{ preferences: NotificationPreferences }>(
          '/api/devices/preferences'
        );
        if (!cancelled) {
          setPreferences(result.preferences);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [client]);

  // Update preferences
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      try {
        const result = await client.fetch<{ preferences: NotificationPreferences }>(
          '/api/devices/preferences',
          {
            method: 'PATCH',
            body: JSON.stringify(updates),
          }
        );

        setPreferences((prev) => ({ ...prev!, ...result.preferences }));
        setError(null);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [client]
  );

  return {
    preferences,
    loading,
    error,
    updatePreferences,
  };
}
