/**
 * MessageInput - Mobile-optimized message input with attachments
 * Handles keyboard, voice messages, and rich media
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Animated,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useMessages, useTypingIndicator } from '@chatsdk/react';
import { useKeyboard } from '../hooks/useKeyboard';

export interface MessageInputProps {
  channelId: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  showAttachmentButton?: boolean;
  showVoiceButton?: boolean;
  onAttachmentPress?: () => void;
  onVoicePress?: () => void;
  onSend?: (text: string) => void;
  replyingTo?: { id: string; text: string; user: { name: string } } | null;
  onCancelReply?: () => void;
}

/**
 * MessageInput - Full-featured message input for mobile
 *
 * Features:
 * - Auto-growing text input
 * - Typing indicators
 * - Reply preview
 * - Attachment & voice buttons
 * - Send button with loading state
 *
 * @example
 * ```tsx
 * <MessageInput
 *   channelId={channel.id}
 *   placeholder="Type a message..."
 *   showAttachmentButton
 *   showVoiceButton
 *   onAttachmentPress={() => openImagePicker()}
 * />
 * ```
 */
export function MessageInput({
  channelId,
  placeholder = 'Type a message...',
  maxLength = 4000,
  disabled = false,
  showAttachmentButton = true,
  showVoiceButton = true,
  onAttachmentPress,
  onVoicePress,
  onSend,
  replyingTo,
  onCancelReply,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [inputHeight, setInputHeight] = useState(44);
  const inputRef = useRef<TextInput>(null);

  const { sendMessage } = useMessages(channelId);
  const { startTyping, stopTyping } = useTypingIndicator(channelId);
  const { isVisible: keyboardVisible } = useKeyboard();

  // Animation for send button
  const sendButtonScale = useRef(new Animated.Value(0)).current;
  const hasText = text.trim().length > 0;

  // Animate send button appearance
  useEffect(() => {
    Animated.spring(sendButtonScale, {
      toValue: hasText ? 1 : 0,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [hasText, sendButtonScale]);

  // Handle text change with typing indicator
  const handleChangeText = useCallback(
    (newText: string) => {
      setText(newText);
      if (newText.length > 0) {
        startTyping();
      }
    },
    [startTyping]
  );

  // Handle send
  const handleSend = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText || sending) return;

    setSending(true);
    stopTyping();

    try {
      if (onSend) {
        onSend(trimmedText);
      } else {
        await sendMessage(trimmedText, {
          parentId: replyingTo?.id,
        });
      }
      setText('');
      setInputHeight(44);
      onCancelReply?.();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Could show an error toast here
    } finally {
      setSending(false);
    }
  }, [text, sending, stopTyping, onSend, sendMessage, replyingTo, onCancelReply]);

  // Handle blur
  const handleBlur = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  // Handle content size change for auto-grow
  const handleContentSizeChange = useCallback(
    (e: any) => {
      const height = e.nativeEvent.contentSize.height;
      const newHeight = Math.min(Math.max(44, height), 120);
      setInputHeight(newHeight);
    },
    []
  );

  return (
    <View style={styles.container}>
      {/* Reply preview */}
      {replyingTo && (
        <View style={styles.replyPreview}>
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>
              Replying to {replyingTo.user.name}
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {replyingTo.text}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} style={styles.cancelReply}>
            <Text style={styles.cancelReplyText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        {/* Attachment button */}
        {showAttachmentButton && (
          <TouchableOpacity
            onPress={onAttachmentPress}
            style={styles.iconButton}
            disabled={disabled}
          >
            <Text style={styles.iconText}>📎</Text>
          </TouchableOpacity>
        )}

        {/* Text input */}
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { height: inputHeight }]}
            value={text}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            onContentSizeChange={handleContentSizeChange}
            placeholder={placeholder}
            placeholderTextColor="#999"
            maxLength={maxLength}
            multiline
            editable={!disabled}
            textAlignVertical="center"
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </View>

        {/* Voice or Send button */}
        {hasText ? (
          <Animated.View
            style={[
              styles.sendButton,
              {
                transform: [{ scale: sendButtonScale }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending || disabled}
              style={styles.sendButtonInner}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.sendIcon}>↑</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        ) : showVoiceButton ? (
          <TouchableOpacity
            onPress={onVoicePress}
            style={styles.iconButton}
            disabled={disabled}
          >
            <Text style={styles.iconText}>🎤</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 4,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  replyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cancelReply: {
    padding: 8,
  },
  cancelReplyText: {
    fontSize: 16,
    color: '#999',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: '#333',
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    marginLeft: 4,
  },
  sendButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
