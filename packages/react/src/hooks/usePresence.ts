/**
 * usePresence - Hook for user presence/online status
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatClient } from './ChatProvider';

export interface UserPresence {
  userId: string;
  online: boolean;
  lastSeen: string | null;
  user?: {
    id: string;
    name: string;
    image: string | null;
  };
}

export interface ChannelPresence {
  online: UserPresence[];
  offline: UserPresence[];
  totalOnline: number;
  totalMembers: number;
}

export interface UsePresenceOptions {
  heartbeatInterval?: number; // ms, default 30000
  onOnline?: () => void;
  onOffline?: () => void;
}

export interface UsePresenceResult {
  isOnline: boolean;
  setOnline: () => Promise<void>;
  setOffline: () => Promise<void>;
  getUserPresence: (userId: string) => Promise<UserPresence | null>;
  getMultiplePresence: (userIds: string[]) => Promise<Record<string, UserPresence>>;
  getChannelPresence: (channelId: string) => Promise<ChannelPresence>;
}

/**
 * usePresence - Manage user online/offline status
 *
 * @example
 * ```tsx
 * const { isOnline, setOnline, setOffline, getChannelPresence } = usePresence();
 *
 * // When app opens
 * useEffect(() => {
 *   setOnline();
 *   return () => setOffline();
 * }, []);
 *
 * // Get channel presence
 * const { online, totalOnline } = await getChannelPresence(channelId);
 * ```
 */
export function usePresence(options: UsePresenceOptions = {}): UsePresenceResult {
  const { heartbeatInterval = 30000, onOnline, onOffline } = options;
  const client = useChatClient();
  const [isOnline, setIsOnline] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();

  // Start heartbeat when online
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(async () => {
      try {
        await client.fetch('/api/presence/heartbeat', { method: 'POST' });
      } catch {
        // Ignore heartbeat errors
      }
    }, heartbeatInterval);
  }, [client, heartbeatInterval]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = undefined;
    }
  }, []);

  // Set user online
  const setOnline = useCallback(async () => {
    try {
      await client.fetch('/api/presence/online', { method: 'POST' });
      setIsOnline(true);
      startHeartbeat();
      onOnline?.();
    } catch (error) {
      console.error('Failed to set online:', error);
    }
  }, [client, startHeartbeat, onOnline]);

  // Set user offline
  const setOffline = useCallback(async () => {
    stopHeartbeat();
    try {
      await client.fetch('/api/presence/offline', { method: 'POST' });
      setIsOnline(false);
      onOffline?.();
    } catch (error) {
      console.error('Failed to set offline:', error);
    }
  }, [client, stopHeartbeat, onOffline]);

  // Get single user presence
  const getUserPresence = useCallback(
    async (userId: string): Promise<UserPresence | null> => {
      const result = await getMultiplePresence([userId]);
      return result[userId] || null;
    },
    []
  );

  // Get multiple users presence
  const getMultiplePresence = useCallback(
    async (userIds: string[]): Promise<Record<string, UserPresence>> => {
      try {
        const response = await client.fetch<{
          presence: Record<string, UserPresence>;
        }>('/api/presence/query', {
          method: 'POST',
          body: JSON.stringify({ userIds }),
        });
        return response.presence;
      } catch {
        return {};
      }
    },
    [client]
  );

  // Get channel presence
  const getChannelPresence = useCallback(
    async (channelId: string): Promise<ChannelPresence> => {
      try {
        return await client.fetch<ChannelPresence>(
          `/api/channels/${channelId}/presence`
        );
      } catch {
        return { online: [], offline: [], totalOnline: 0, totalMembers: 0 };
      }
    },
    [client]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  // Listen for presence events
  useEffect(() => {
    const unsubOnline = client.on('presence.online', ({ userId }) => {
      if (userId === client.user?.id) {
        setIsOnline(true);
      }
    });

    const unsubOffline = client.on('presence.offline', ({ userId }) => {
      if (userId === client.user?.id) {
        setIsOnline(false);
      }
    });

    return () => {
      unsubOnline();
      unsubOffline();
    };
  }, [client]);

  return {
    isOnline,
    setOnline,
    setOffline,
    getUserPresence,
    getMultiplePresence,
    getChannelPresence,
  };
}

/**
 * useUserPresence - Get and subscribe to a specific user's presence
 */
export function useUserPresence(userId: string | null): {
  online: boolean;
  lastSeen: string | null;
  loading: boolean;
} {
  const client = useChatClient();
  const [online, setOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    const fetchPresence = async () => {
      try {
        const response = await client.fetch<{
          presence: Record<string, UserPresence>;
        }>('/api/presence/query', {
          method: 'POST',
          body: JSON.stringify({ userIds: [userId] }),
        });

        const presence = response.presence[userId];
        if (presence) {
          setOnline(presence.online);
          setLastSeen(presence.lastSeen);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPresence();

    // Subscribe to presence updates
    const unsubOnline = client.on('presence.online', ({ userId: uid }) => {
      if (uid === userId) {
        setOnline(true);
      }
    });

    const unsubOffline = client.on('presence.offline', ({ userId: uid, lastSeen: ls }) => {
      if (uid === userId) {
        setOnline(false);
        setLastSeen(ls);
      }
    });

    return () => {
      unsubOnline();
      unsubOffline();
    };
  }, [client, userId]);

  return { online, lastSeen, loading };
}

/**
 * useChannelPresence - Get and subscribe to channel presence
 */
export function useChannelPresence(channelId: string | null): {
  onlineUsers: UserPresence[];
  totalOnline: number;
  totalMembers: number;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const client = useChatClient();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [totalOnline, setTotalOnline] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!channelId) return;

    try {
      const response = await client.fetch<ChannelPresence>(
        `/api/channels/${channelId}/presence`
      );
      setOnlineUsers(response.online);
      setTotalOnline(response.totalOnline);
      setTotalMembers(response.totalMembers);
    } catch {
      // Ignore errors
    }
  }, [client, channelId]);

  useEffect(() => {
    if (!channelId) {
      setLoading(false);
      return;
    }

    refresh().finally(() => setLoading(false));

    // Subscribe to presence updates for this channel
    const unsubOnline = client.on('presence.online', async () => {
      await refresh();
    });

    const unsubOffline = client.on('presence.offline', async () => {
      await refresh();
    });

    return () => {
      unsubOnline();
      unsubOffline();
    };
  }, [client, channelId, refresh]);

  return { onlineUsers, totalOnline, totalMembers, loading, refresh };
}

/**
 * Format "last seen" time for display
 */
export function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return 'Never';

  const now = new Date();
  const then = new Date(lastSeen);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleDateString();
}
