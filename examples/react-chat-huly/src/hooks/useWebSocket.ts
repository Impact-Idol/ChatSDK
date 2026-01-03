/**
 * WebSocket Hook
 * Manages WebSocket connection lifecycle
 */

import { useEffect } from 'react';
import { wsClient } from '../lib/websocket-client';
import { getStoredTokens } from '../lib/auth';

const APP_ID = '00000000-0000-0000-0000-000000000001'; // Default app ID from seed data

/**
 * Initialize and manage WebSocket connection
 */
export function useWebSocket(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) {
      wsClient.disconnect();
      return;
    }

    const tokens = getStoredTokens();
    if (tokens?.wsToken) {
      wsClient.connect(tokens.wsToken, APP_ID);
    }

    return () => {
      wsClient.disconnect();
    };
  }, [isAuthenticated]);

  return wsClient;
}

/**
 * Subscribe to channel events
 */
export function useChannelSubscription(channelId: string | undefined) {
  useEffect(() => {
    if (!channelId) return;

    wsClient.subscribeToChannel(APP_ID, channelId);

    return () => {
      wsClient.unsubscribeFromChannel(APP_ID, channelId);
    };
  }, [channelId]);
}

/**
 * Subscribe to workspace events
 */
export function useWorkspaceSubscription(workspaceId: string | undefined) {
  useEffect(() => {
    if (!workspaceId) return;

    wsClient.subscribeToWorkspace(APP_ID, workspaceId);
  }, [workspaceId]);
}
