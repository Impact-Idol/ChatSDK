/**
 * Thread View Screen
 * Shows a parent message and its replies
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThread } from '@chatsdk/react-native';
import type { ThreadMessage } from '@chatsdk/react-native';

export default function ThreadScreen() {
  const { channelId, messageId } = useLocalSearchParams<{
    channelId: string;
    messageId: string;
  }>();

  const flatListRef = useRef<FlatList>(null);
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const {
    parent,
    replies,
    participants,
    loading,
    hasMore,
    loadMore,
    sendReply,
  } = useThread(channelId, messageId);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    const replyText = text.trim();
    setText('');
    setSending(true);

    try {
      await sendReply(replyText);
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSending(false);
    }
  };

  const renderReply = ({ item }: { item: ThreadMessage }) => (
    <View style={styles.replyRow}>
      <View style={styles.avatarColumn}>
        {item.user?.image ? (
          <Image
            source={{ uri: item.user.image }}
            style={styles.replyAvatar}
          />
        ) : (
          <View style={[styles.replyAvatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {(item.user?.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.replyContent}>
        <View style={styles.replyHeader}>
          <Text style={styles.senderName}>{item.user?.name}</Text>
          <Text style={styles.replyTime}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        <Text style={styles.replyText}>{item.text}</Text>

        {item.status === 'sending' && (
          <Text style={styles.statusText}>Sending...</Text>
        )}
        {item.status === 'failed' && (
          <Text style={styles.statusTextError}>Failed to send</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#666" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: 'Thread',
          headerRight: () => (
            <Text style={styles.replyCountText}>
              {parent?.replyCount || 0} replies
            </Text>
          ),
        }}
      />

      <FlatList
        ref={flatListRef}
        data={replies}
        keyExtractor={(item) => item.id}
        renderItem={renderReply}
        contentContainerStyle={styles.listContent}
        onEndReached={() => hasMore && loadMore()}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          parent ? (
            <View style={styles.parentContainer}>
              {/* Parent Message */}
              <View style={styles.parentMessage}>
                <View style={styles.parentHeader}>
                  {parent.user?.image ? (
                    <Image
                      source={{ uri: parent.user.image }}
                      style={styles.parentAvatar}
                    />
                  ) : (
                    <View style={[styles.parentAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {(parent.user?.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.parentInfo}>
                    <Text style={styles.parentName}>{parent.user?.name}</Text>
                    <Text style={styles.parentTime}>
                      {formatTime(parent.createdAt)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.parentText}>{parent.text}</Text>
              </View>

              {/* Participants */}
              {participants.length > 0 && (
                <View style={styles.participantsSection}>
                  <Text style={styles.participantsTitle}>
                    {participants.length} participant
                    {participants.length !== 1 ? 's' : ''}
                  </Text>
                  <View style={styles.participantsList}>
                    {participants.slice(0, 5).map((p) => (
                      <View key={p.id} style={styles.participantBadge}>
                        {p.image ? (
                          <Image
                            source={{ uri: p.image }}
                            style={styles.participantAvatar}
                          />
                        ) : (
                          <View
                            style={[
                              styles.participantAvatar,
                              styles.avatarPlaceholder,
                            ]}
                          >
                            <Text style={styles.participantInitial}>
                              {(p.name || '?').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                    {participants.length > 5 && (
                      <View style={styles.moreBadge}>
                        <Text style={styles.moreText}>
                          +{participants.length - 5}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.divider} />
              <Text style={styles.repliesHeader}>
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyReplies}>
            <Text style={styles.emptyText}>No replies yet</Text>
            <Text style={styles.emptyHint}>Be the first to reply!</Text>
          </View>
        }
      />

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Reply..."
          placeholderTextColor="#666"
          multiline
          maxLength={10000}
        />

        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons
              name="arrow-up-circle"
              size={32}
              color={text.trim() ? '#007AFF' : '#333'}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  replyCountText: {
    color: '#666',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 16,
  },
  parentContainer: {
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  parentMessage: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  parentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  parentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  parentInfo: {
    flex: 1,
  },
  parentName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  parentTime: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  parentText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  participantsSection: {
    marginTop: 16,
  },
  participantsTitle: {
    color: '#666',
    fontSize: 13,
    marginBottom: 8,
  },
  participantsList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantBadge: {
    marginRight: -8,
  },
  participantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000',
  },
  participantInitial: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  moreBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  moreText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  repliesHeader: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarColumn: {
    width: 36,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  replyContent: {
    flex: 1,
    paddingLeft: 8,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  senderName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 8,
  },
  replyTime: {
    color: '#666',
    fontSize: 11,
  },
  replyText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  statusText: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  statusTextError: {
    color: '#ff4444',
    fontSize: 11,
    marginTop: 4,
  },
  emptyReplies: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  emptyHint: {
    color: '#444',
    fontSize: 14,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 0.5,
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    maxHeight: 120,
    marginRight: 8,
  },
  sendButton: {
    padding: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
