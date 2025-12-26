/**
 * Channel Detail Screen
 * Full chat view with messages and input
 */

import { useEffect, useRef, useCallback } from 'react';
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
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  useChannel,
  useMessages,
  useTypingIndicator,
  formatTypingText,
  useChannelPresence,
  useFileUpload,
  useReadState,
} from '@chatsdk/react-native';
import type { Message } from '@chatsdk/core';

export default function ChannelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const flatListRef = useRef<FlatList>(null);

  const { channel } = useChannel(id);
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    sending,
  } = useMessages(id);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(id);
  const { onlineUsers, totalOnline } = useChannelPresence(id);
  const { markAsRead } = useReadState(id);
  const { upload, uploading } = useFileUpload();

  const [text, setText] = React.useState('');

  // Mark as read when viewing
  useEffect(() => {
    if (id) {
      markAsRead();
    }
  }, [id, messages.length, markAsRead]);

  // Handle typing
  const handleTextChange = (value: string) => {
    setText(value);
    if (value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Send message
  const handleSend = async () => {
    if (!text.trim() || sending) return;

    const messageText = text.trim();
    setText('');
    stopTyping();

    try {
      await sendMessage({ text: messageText });
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      console.error('Failed to send:', error);
    }
  };

  // Pick and send image
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const uploaded = await upload(result.assets[0].uri, {
          channelId: id,
          filename: 'image.jpg',
          contentType: 'image/jpeg',
        });

        await sendMessage({
          text: '',
          attachments: [
            {
              type: 'image',
              url: uploaded.url,
              mimeType: 'image/jpeg',
            },
          ],
        });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  // Open thread
  const handleOpenThread = (message: Message) => {
    router.push(`/thread/${id}/${message.id}`);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const prevMessage = index < messages.length - 1 ? messages[index + 1] : null;
    const showAvatar = !prevMessage || prevMessage.user?.id !== item.user?.id;

    return (
      <MessageBubble
        message={item}
        showAvatar={showAvatar}
        onOpenThread={() => handleOpenThread(item)}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: channel?.name || 'Chat',
          headerRight: () => (
            <View style={styles.headerRight}>
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineCount}>{totalOnline}</Text>
              </View>
            </View>
          ),
        }}
      />

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.messageList}
        onEndReached={() => hasMore && loadMore()}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          typingUsers.length > 0 ? (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>
                {formatTypingText(typingUsers)}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color="#666" />
          ) : null
        }
      />

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handlePickImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#666" />
          ) : (
            <Ionicons name="add-circle" size={28} color="#007AFF" />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder="Message"
          placeholderTextColor="#666"
          multiline
          maxLength={10000}
        />

        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Ionicons
            name="arrow-up-circle"
            size={32}
            color={text.trim() ? '#007AFF' : '#333'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Need to import React for useState
import React from 'react';

function MessageBubble({
  message,
  showAvatar,
  onOpenThread,
}: {
  message: Message;
  showAvatar: boolean;
  onOpenThread: () => void;
}) {
  const isDeleted = message.type === 'deleted';
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const hasThread = (message as any).replyCount > 0;

  return (
    <View style={styles.messageRow}>
      {showAvatar ? (
        <View style={styles.avatarColumn}>
          {message.user?.image ? (
            <Image
              source={{ uri: message.user.image }}
              style={styles.messageAvatar}
            />
          ) : (
            <View style={[styles.messageAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(message.user?.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.avatarColumn} />
      )}

      <View style={styles.messageContent}>
        {showAvatar && (
          <View style={styles.messageHeader}>
            <Text style={styles.senderName}>{message.user?.name}</Text>
            <Text style={styles.messageTime}>
              {formatMessageTime(message.createdAt)}
            </Text>
          </View>
        )}

        {isDeleted ? (
          <Text style={styles.deletedText}>This message was deleted</Text>
        ) : (
          <>
            {/* Attachments */}
            {hasAttachments &&
              message.attachments!.map((att, i) => (
                <View key={i} style={styles.attachment}>
                  {att.type === 'image' && att.url && (
                    <Image
                      source={{ uri: att.url }}
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                  )}
                </View>
              ))}

            {/* Text */}
            {message.text && (
              <Text style={styles.messageText}>{message.text}</Text>
            )}

            {/* Reactions */}
            {message.reactionGroups && message.reactionGroups.length > 0 && (
              <View style={styles.reactions}>
                {message.reactionGroups.map((group) => (
                  <View key={group.type} style={styles.reactionBadge}>
                    <Text style={styles.reactionEmoji}>{group.type}</Text>
                    <Text style={styles.reactionCount}>{group.count}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Thread indicator */}
            {hasThread && (
              <TouchableOpacity
                style={styles.threadIndicator}
                onPress={onOpenThread}
              >
                <Ionicons name="chatbubbles-outline" size={14} color="#007AFF" />
                <Text style={styles.threadText}>
                  {(message as any).replyCount} replies
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Message status */}
        {message.status === 'sending' && (
          <Text style={styles.statusText}>Sending...</Text>
        )}
        {message.status === 'failed' && (
          <Text style={styles.statusTextError}>Failed to send</Text>
        )}
      </View>
    </View>
  );
}

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  onlineCount: {
    color: '#fff',
    fontSize: 12,
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  avatarColumn: {
    width: 40,
    alignItems: 'center',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  messageContent: {
    flex: 1,
    paddingLeft: 8,
  },
  messageHeader: {
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
  messageTime: {
    color: '#666',
    fontSize: 11,
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  deletedText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 14,
  },
  attachment: {
    marginBottom: 8,
  },
  attachmentImage: {
    width: 240,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    color: '#888',
    fontSize: 12,
  },
  threadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  threadText: {
    color: '#007AFF',
    fontSize: 13,
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
  typingContainer: {
    paddingHorizontal: 52,
    paddingVertical: 8,
  },
  typingText: {
    color: '#888',
    fontSize: 13,
    fontStyle: 'italic',
  },
  loader: {
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 0.5,
    borderTopColor: '#333',
  },
  attachButton: {
    padding: 6,
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
    marginHorizontal: 8,
  },
  sendButton: {
    padding: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
