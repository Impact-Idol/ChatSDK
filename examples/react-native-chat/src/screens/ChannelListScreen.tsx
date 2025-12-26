import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useChannels } from '@chatsdk/react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import type { Channel } from '@chatsdk/core';

type Props = NativeStackScreenProps<RootStackParamList, 'ChannelList'>;

export function ChannelListScreen({ navigation }: Props) {
  const { channels, loading, error, refresh } = useChannels();

  const renderChannel = ({ item: channel }: { item: Channel }) => (
    <TouchableOpacity
      style={styles.channelItem}
      onPress={() => navigation.navigate('Chat', { channel })}
    >
      <View style={styles.channelAvatar}>
        <Text style={styles.channelAvatarText}>
          {(channel.name || 'C').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.channelInfo}>
        <Text style={styles.channelName}>{channel.name || 'Unnamed Channel'}</Text>
        <Text style={styles.channelPreview} numberOfLines={1}>
          {channel.last_message?.text || 'No messages yet'}
        </Text>
      </View>
      {(channel.unread_count ?? 0) > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{channel.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && channels.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={channels}
        renderItem={renderChannel}
        keyExtractor={(channel) => channel.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No channels yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create a channel to get started
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  channelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  channelPreview: {
    fontSize: 14,
    color: '#6b7280',
  },
  unreadBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
