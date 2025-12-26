/**
 * ChannelList - Mobile-optimized channel/conversation list
 * With swipe actions, pull-to-refresh, and unread indicators
 */

import React, { useCallback, useMemo, memo } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ListRenderItem,
} from 'react-native';
import type { Channel, User } from '@chatsdk/core';
import { useChannels } from '@chatsdk/react';

export interface ChannelListProps {
  type?: string;
  limit?: number;
  onChannelPress: (channel: Channel) => void;
  onChannelLongPress?: (channel: Channel) => void;
  selectedChannelId?: string;
  renderChannel?: (channel: Channel, isSelected: boolean) => React.ReactNode;
  ListHeaderComponent?: React.ComponentType | React.ReactElement;
  ListEmptyComponent?: React.ComponentType | React.ReactElement;
}

/**
 * ChannelList - Scrollable list of chat channels
 *
 * Features:
 * - Pull to refresh
 * - Infinite scroll
 * - Unread badges
 * - Last message preview
 * - Custom rendering
 *
 * @example
 * ```tsx
 * <ChannelList
 *   onChannelPress={(channel) => navigation.navigate('Chat', { channelId: channel.id })}
 *   selectedChannelId={activeChannelId}
 * />
 * ```
 */
export function ChannelList({
  type,
  limit = 50,
  onChannelPress,
  onChannelLongPress,
  selectedChannelId,
  renderChannel,
  ListHeaderComponent,
  ListEmptyComponent,
}: ChannelListProps) {
  const { channels, loading, error, refresh, loadMore, hasMore } = useChannels({
    type,
    limit,
  });

  const [refreshing, setRefreshing] = React.useState(false);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Load more on end reached
  const handleEndReached = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  // Render channel item
  const renderItem: ListRenderItem<Channel> = useCallback(
    ({ item }) => {
      const isSelected = item.id === selectedChannelId;

      if (renderChannel) {
        return <>{renderChannel(item, isSelected)}</>;
      }

      return (
        <ChannelPreview
          channel={item}
          isSelected={isSelected}
          onPress={() => onChannelPress(item)}
          onLongPress={() => onChannelLongPress?.(item)}
        />
      );
    },
    [selectedChannelId, renderChannel, onChannelPress, onChannelLongPress]
  );

  // Key extractor
  const keyExtractor = useCallback((item: Channel) => item.id, []);

  // Loading footer
  const ListFooterComponent = useMemo(
    () =>
      loading && hasMore ? (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      ) : null,
    [loading, hasMore]
  );

  // Empty state
  const EmptyComponent = useMemo(
    () =>
      ListEmptyComponent ?? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start a new chat!</Text>
        </View>
      ),
    [ListEmptyComponent]
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load channels</Text>
        <TouchableOpacity onPress={refresh} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={channels}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#6366F1"
          colors={['#6366F1']}
        />
      }
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={!loading ? EmptyComponent : null}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ============================================================================
// ChannelPreview Component
// ============================================================================

interface ChannelPreviewProps {
  channel: Channel;
  isSelected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

const ChannelPreview = memo(function ChannelPreview({
  channel,
  isSelected,
  onPress,
  onLongPress,
}: ChannelPreviewProps) {
  const unreadCount = (channel as any).unreadCount ?? 0;
  const lastMessage = (channel as any).lastMessage;

  // Get display name
  const displayName = channel.name || getChannelDisplayName(channel);

  // Format last message time
  const timeAgo = channel.last_message_at
    ? formatRelativeTime(channel.last_message_at)
    : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={[styles.channelItem, isSelected && styles.channelItemSelected]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
        {(channel as any).online && <View style={styles.onlineDot} />}
      </View>

      {/* Content */}
      <View style={styles.channelContent}>
        <View style={styles.channelHeader}>
          <Text style={styles.channelName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.channelTime}>{timeAgo}</Text>
        </View>

        <View style={styles.channelSubtitle}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage?.text || 'No messages yet'}
          </Text>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============================================================================
// Helper Functions
// ============================================================================

function getChannelDisplayName(channel: Channel): string {
  // For DM channels, show the other user's name
  if (channel.type === 'messaging' && channel.members) {
    const otherMember = channel.members.find(
      (m) => m.user_id !== (channel.created_by as any)?.id
    );
    return otherMember?.user?.name || 'Unknown';
  }

  return channel.cid || 'Unnamed Channel';
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  channelItemSelected: {
    backgroundColor: '#F0F0FF',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  channelContent: {
    flex: 1,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  channelTime: {
    fontSize: 12,
    color: '#999',
  },
  channelSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
