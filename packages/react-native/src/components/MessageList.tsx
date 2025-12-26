/**
 * MessageList - Optimized FlatList for chat messages
 * Mobile-first with inverted list, keyboard handling, and smooth scrolling
 */

import React, { useCallback, useRef, useMemo, memo } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ListRenderItem,
  ViewToken,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import type { MessageWithSeq, User } from '@chatsdk/core';
import { useMessages } from '@chatsdk/react';
import { useKeyboard } from '../hooks/useKeyboard';

export interface MessageListProps {
  channelId: string;
  onMessagePress?: (message: MessageWithSeq) => void;
  onMessageLongPress?: (message: MessageWithSeq) => void;
  onAvatarPress?: (user: User) => void;
  renderMessage?: (message: MessageWithSeq, isOwn: boolean) => React.ReactNode;
  ListHeaderComponent?: React.ComponentType | React.ReactElement;
  ListEmptyComponent?: React.ComponentType | React.ReactElement;
  contentContainerStyle?: any;
}

/**
 * MessageList - High-performance chat message list
 *
 * Features:
 * - Inverted FlatList for chat (newest at bottom)
 * - Automatic loading of older messages
 * - Keyboard-aware scrolling
 * - Optimized re-renders with memo
 * - Smooth scroll to bottom on new messages
 *
 * @example
 * ```tsx
 * <MessageList
 *   channelId={channel.id}
 *   onMessageLongPress={(msg) => showActions(msg)}
 *   onAvatarPress={(user) => showProfile(user)}
 * />
 * ```
 */
export function MessageList({
  channelId,
  onMessagePress,
  onMessageLongPress,
  onAvatarPress,
  renderMessage,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
}: MessageListProps) {
  const { messages, loading, hasMore, loadMore } = useMessages(channelId);
  const { isVisible: keyboardVisible, height: keyboardHeight } = useKeyboard();
  const flatListRef = useRef<FlatList>(null);
  const isLoadingMore = useRef(false);

  // Invert messages for inverted FlatList
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Current user ID from first message with matching user
  const currentUserId = useMemo(() => {
    // This would come from the ChatProvider context in real implementation
    return null;
  }, []);

  // Handle scroll to load more
  const handleEndReached = useCallback(() => {
    if (!isLoadingMore.current && hasMore && !loading) {
      isLoadingMore.current = true;
      loadMore().finally(() => {
        isLoadingMore.current = false;
      });
    }
  }, [hasMore, loading, loadMore]);

  // Scroll to bottom (for new message button)
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Render message item
  const renderItem: ListRenderItem<MessageWithSeq> = useCallback(
    ({ item, index }) => {
      const isOwn = item.user?.id === currentUserId;
      const previousMessage = invertedMessages[index + 1];
      const nextMessage = invertedMessages[index - 1];

      // Group messages from same user within 5 minutes
      const showAvatar =
        !isOwn &&
        (!nextMessage ||
          nextMessage.user?.id !== item.user?.id ||
          timeDiffMinutes(item.created_at, nextMessage.created_at) > 5);

      const showTimestamp =
        !previousMessage ||
        previousMessage.user?.id !== item.user?.id ||
        timeDiffMinutes(previousMessage.created_at, item.created_at) > 5;

      if (renderMessage) {
        return <>{renderMessage(item, isOwn)}</>;
      }

      return (
        <MessageBubble
          message={item}
          isOwn={isOwn}
          showAvatar={showAvatar}
          showTimestamp={showTimestamp}
          onPress={onMessagePress}
          onLongPress={onMessageLongPress}
          onAvatarPress={onAvatarPress}
        />
      );
    },
    [
      currentUserId,
      invertedMessages,
      renderMessage,
      onMessagePress,
      onMessageLongPress,
      onAvatarPress,
    ]
  );

  // Key extractor
  const keyExtractor = useCallback((item: MessageWithSeq) => item.id, []);

  // Get item layout for better performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 60, // Approximate message height
      offset: 60 * index,
      index,
    }),
    []
  );

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
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start the conversation!</Text>
        </View>
      ),
    [ListEmptyComponent]
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={invertedMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={ListFooterComponent}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={!loading ? EmptyComponent : null}
        contentContainerStyle={[
          styles.contentContainer,
          contentContainerStyle,
          { paddingBottom: keyboardVisible ? keyboardHeight : 0 },
        ]}
        // Performance optimizations
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
        // Smooth scrolling
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        // Maintain scroll position
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 100,
        }}
      />
    </View>
  );
}

// ============================================================================
// MessageBubble Component
// ============================================================================

interface MessageBubbleProps {
  message: MessageWithSeq;
  isOwn: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  onPress?: (message: MessageWithSeq) => void;
  onLongPress?: (message: MessageWithSeq) => void;
  onAvatarPress?: (user: User) => void;
}

const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  showAvatar,
  showTimestamp,
  onPress,
  onLongPress,
  onAvatarPress,
}: MessageBubbleProps) {
  const handlePress = useCallback(() => onPress?.(message), [onPress, message]);
  const handleLongPress = useCallback(
    () => onLongPress?.(message),
    [onLongPress, message]
  );
  const handleAvatarPress = useCallback(
    () => message.user && onAvatarPress?.(message.user),
    [onAvatarPress, message.user]
  );

  // Deleted message
  if (message.type === 'deleted') {
    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        <View style={[styles.bubble, styles.deletedBubble]}>
          <Text style={styles.deletedText}>This message was deleted</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
      {/* Avatar */}
      {!isOwn && (
        <TouchableOpacity
          onPress={handleAvatarPress}
          style={styles.avatarContainer}
        >
          {showAvatar && message.user ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {message.user.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
        </TouchableOpacity>
      )}

      {/* Message content */}
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={200}
        style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
      >
        {/* Sender name for group chats */}
        {!isOwn && showAvatar && message.user && (
          <Text style={styles.senderName}>{message.user.name}</Text>
        )}

        {/* Message text */}
        <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
          {message.text}
        </Text>

        {/* Timestamp and status */}
        <View style={styles.metaRow}>
          <Text style={[styles.timestamp, isOwn && styles.timestampOwn]}>
            {formatTime(message.created_at)}
          </Text>
          {isOwn && (
            <Text style={styles.status}>
              {message.status === 'sending' && '...' }
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && '✓✓'}
              {message.status === 'failed' && '!'}
            </Text>
          )}
        </View>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <View style={styles.reactions}>
            {message.reactions.map((reaction) => (
              <View key={reaction.type} style={styles.reaction}>
                <Text style={styles.reactionEmoji}>{reaction.type}</Text>
                <Text style={styles.reactionCount}>{reaction.count}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function timeDiffMinutes(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.abs(d1 - d2) / 60000;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2,
    maxWidth: '80%',
  },
  messageRowOwn: {
    alignSelf: 'flex-end',
  },
  avatarContainer: {
    width: 36,
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '100%',
  },
  bubbleOwn: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
  },
  deletedBubble: {
    backgroundColor: '#E5E5E5',
  },
  deletedText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 14,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  messageTextOwn: {
    color: '#FFF',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
  },
  timestampOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  status: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  reactions: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
});
