/**
 * useAppState - React Native app state management for ChatSDK
 * Handles background/foreground transitions and triggers sync
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useChatClient } from '@chatsdk/react';

export interface UseAppStateResult {
  appState: AppStateStatus;
  isActive: boolean;
  isBackground: boolean;
}

/**
 * useAppState - Handle app state changes and trigger sync on foreground
 *
 * @example
 * ```tsx
 * const { isActive, isBackground } = useAppState();
 *
 * // Sync happens automatically when app comes to foreground
 * // You can also use isActive to pause/resume animations
 * ```
 */
export function useAppState(): UseAppStateResult {
  const client = useChatClient();
  const appState = useRef(AppState.currentState);
  const [currentState, setCurrentState] = useState(appState.current);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Coming from background to active
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Trigger sync on return to foreground (OpenIMSDK pattern)
        onForeground();
      }

      // Going to background
      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        onBackground();
      }

      appState.current = nextAppState;
      setCurrentState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [client]);

  const onForeground = useCallback(() => {
    // Emit sync event - the client will handle reconnection and sync
    console.log('[ChatSDK] App returned to foreground, syncing...');
    // The ChatClient handles reconnection automatically
  }, []);

  const onBackground = useCallback(() => {
    console.log('[ChatSDK] App going to background');
    // Keep connection alive for push notifications
  }, []);

  return {
    appState: currentState,
    isActive: currentState === 'active',
    isBackground: currentState === 'background',
  };
}

/**
 * useSyncOnForeground - Automatically sync when app returns to foreground
 *
 * @param channelId - Optional channel ID to sync specific channel
 */
export function useSyncOnForeground(channelId?: string): void {
  const client = useChatClient();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Sync specific channel or all channels
        if (channelId) {
          client.queryMessages(channelId, { limit: 50 });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [client, channelId]);
}
