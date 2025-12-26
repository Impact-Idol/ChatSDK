/**
 * Chats Tab - Channel List
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useChannels,
  useUserPresence,
  formatLastSeen,
} from '@chatsdk/react-native';
import type { Channel } from '@chatsdk/core';

export default function ChatsScreen() {
  const { channels, loading, refresh, hasMore, loadMore } = useChannels();

  const handleChannelPress = (channel: Channel) => {
    router.push(`/channel/${channel.id}`);
  };

  const handleSearch = () => {
    router.push('/search');
  };

  const renderChannel = ({ item }: { item: Channel }) => (
    <ChannelRow channel={item} onPress={() => handleChannelPress(item)} />
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={handleSearch} style={styles.headerButton}>
              <Ionicons name="search" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        renderItem={renderChannel}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#fff"
          />
        }
        onEndReached={() => hasMore && loadMore()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptyHint}>
                Start a new chat to get started
              </Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function ChannelRow({
  channel,
  onPress,
}: {
  channel: Channel;
  onPress: () => void;
}) {
  // For DMs, get the other user's presence
  const otherUserId = channel.type === 'dm' ? channel.members?.[0]?.id : null;
  const { online } = useUserPresence(otherUserId);

  const lastMessage = channel.lastMessage;
  const hasUnread = (channel.unreadCount || 0) > 0;

  return (
    <TouchableOpacity style={styles.channelRow} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {channel.image ? (
          <Image source={{ uri: channel.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {(channel.name || 'C').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {channel.type === 'dm' && (
          <View
            style={[
              styles.presenceIndicator,
              online ? styles.online : styles.offline,
            ]}
          />
        )}
      </View>

      <View style={styles.channelInfo}>
        <View style={styles.channelHeader}>
          <Text style={styles.channelName} numberOfLines={1}>
            {channel.name || 'Unnamed Channel'}
          </Text>
          {lastMessage && (
            <Text style={styles.timestamp}>
              {formatTime(lastMessage.createdAt)}
            </Text>
          )}
        </View>

        <View style={styles.channelPreview}>
          {lastMessage ? (
            <Text
              style={[styles.lastMessage, hasUnread && styles.unreadMessage]}
              numberOfLines={1}
            >
              {lastMessage.user?.name && `${lastMessage.user.name}: `}
              {lastMessage.text || 'Sent an attachment'}
            </Text>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}

          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {channel.unreadCount! > 99 ? '99+' : channel.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerButton: {
    padding: 8,
  },
  list: {
    flexGrow: 1,
  },
  channelRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  presenceIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#000',
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#666',
  },
  channelInfo: {
    flex: 1,
    justifyContent: 'center',
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
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 13,
    color: '#666',
  },
  channelPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    color: '#fff',
    fontWeight: '500',
  },
  noMessages: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyHint: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
