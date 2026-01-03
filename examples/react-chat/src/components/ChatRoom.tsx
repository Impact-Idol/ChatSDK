import { useState, useRef, useEffect, useCallback } from 'react';
import {
  useMessages,
  useTypingIndicator,
  useChatClient,
  useFileUpload,
  useChannelPresence,
  useThreadPreview,
  QUICK_REACTIONS,
  formatFileSize,
} from '@chatsdk/react';
import { EmojiPicker } from './EmojiPicker';
import type { Channel, Message, MessageWithSeq } from '@chatsdk/core';

interface ChatRoomProps {
  channel: Channel;
  onOpenThread?: (message: Message, channelId: string) => void;
}

export function ChatRoom({ channel, onOpenThread }: ChatRoomProps) {
  const client = useChatClient();
  const { messages, loading, hasMore, loadMore, sendMessage, addReaction, removeReaction } = useMessages(channel.id);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(channel.id);
  const { onlineUsers, totalOnline, totalMembers } = useChannelPresence(channel.id);
  const { upload, uploading, progress } = useFileUpload({ channelId: channel.id });

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showMemberList, setShowMemberList] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number>();
  const composerRef = useRef<HTMLDivElement>(null);
  const blobUrlsRef = useRef<Map<File, string>>(new Map());

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset state when channel changes
  useEffect(() => {
    setText('');
    setPendingFiles([]);
  }, [channel.id]);

  // Create and cleanup blob URLs for pending files
  useEffect(() => {
    const blobUrls = blobUrlsRef.current;

    // Create blob URLs for new files
    pendingFiles.forEach(file => {
      if (!blobUrls.has(file)) {
        const url = URL.createObjectURL(file);
        blobUrls.set(file, url);
      }
    });

    // Cleanup removed files
    const currentFiles = new Set(pendingFiles);
    Array.from(blobUrls.entries()).forEach(([file, url]) => {
      if (!currentFiles.has(file)) {
        URL.revokeObjectURL(url);
        blobUrls.delete(file);
      }
    });

    // Cleanup all on unmount
    return () => {
      Array.from(blobUrls.values()).forEach(url => URL.revokeObjectURL(url));
      blobUrls.clear();
    };
  }, [pendingFiles]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    startTyping();
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const handleSend = async () => {
    if ((!text.trim() && pendingFiles.length === 0) || sending) return;

    setSending(true);
    try {
      // Upload files first if any
      const attachments = [];
      for (const file of pendingFiles) {
        const uploaded = await upload(file);
        attachments.push({
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: uploaded.url,
          name: uploaded.filename,
          size: uploaded.size,
          mime_type: uploaded.contentType,
        });
      }

      await sendMessage(text.trim(), { attachments });
      setText('');
      setPendingFiles([]);
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReaction = async (messageId: string, emoji: string, own: boolean) => {
    try {
      if (own) {
        await removeReaction(messageId, emoji);
      } else {
        await addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenThread = (message: Message) => {
    onOpenThread?.(message, channel.id);
  };

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <div className="channel-title">
            <h2># {channel.name || 'Unnamed Channel'}</h2>
            {channel.description && (
              <p className="channel-description">{channel.description}</p>
            )}
          </div>
        </div>
        <div className="header-right">
          <button
            className="member-count"
            onClick={() => setShowMemberList(!showMemberList)}
          >
            <span className="online-dot" />
            <span>{totalOnline} online</span>
            <span className="divider">•</span>
            <span>{totalMembers} members</span>
          </button>
        </div>
      </div>

      {/* Member List Sidebar */}
      {showMemberList && (
        <div className="member-sidebar">
          <div className="member-sidebar-header">
            <h3>Members ({totalMembers})</h3>
            <button className="icon-btn" onClick={() => setShowMemberList(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="member-section">
            <h4>Online — {onlineUsers.length}</h4>
            {onlineUsers.map((user) => (
              <div key={user.userId} className="member-item">
                <div className="avatar small">
                  {user.user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="member-name">{user.user?.name}</span>
                <span className="status-dot online" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="messages-container">
        {hasMore && (
          <div className="load-more">
            <button onClick={loadMore} disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner small" />
                  Loading...
                </>
              ) : (
                'Load older messages'
              )}
            </button>
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="loading">
            <div className="spinner" />
            <p>Loading messages...</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="empty-messages">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h3>No messages yet</h3>
            <p>Send the first message to start the conversation!</p>
          </div>
        )}

        {messages.map((message, index) => {
          const showAvatar = index === 0 || messages[index - 1]?.user?.id !== message.user?.id;
          return (
            <MessageBubble
              key={message.id}
              message={message}
              channelId={channel.id}
              isOwn={message.user?.id === client.user?.id}
              showAvatar={showAvatar}
              onReaction={(emoji, own) => handleReaction(message.id, emoji, own)}
              onOpenThread={() => handleOpenThread(message)}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          <div className="typing-dots">
            <span /><span /><span />
          </div>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0].name} is typing...`
              : typingUsers.length === 2
              ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
              : `${typingUsers.length} people are typing...`}
          </span>
        </div>
      )}

      {/* Composer */}
      <div className="composer" ref={composerRef}>
        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="pending-files">
            {pendingFiles.map((file, index) => (
              <div key={index} className="pending-file">
                {file.type.startsWith('image/') ? (
                  <img src={blobUrlsRef.current.get(file) || ''} alt={file.name} />
                ) : (
                  <div className="file-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                )}
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
                <button className="remove-file" onClick={() => removeFile(index)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {uploading && progress && (
          <div className="upload-progress">
            <div className="progress-bar" style={{ width: `${progress.percent}%` }} />
            <span>Uploading... {progress.percent}%</span>
          </div>
        )}

        <div className="composer-row">
          {/* File upload button */}
          <button
            className="composer-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Text input */}
          <div className="composer-input-wrapper">
            <textarea
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={sending || uploading}
              rows={1}
            />
          </div>

          {/* Emoji button */}
          <button
            className="composer-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Add emoji"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>

          {/* Send button */}
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={(!text.trim() && pendingFiles.length === 0) || sending || uploading}
          >
            {sending ? (
              <div className="spinner small" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: MessageWithSeq;
  channelId: string;
  isOwn: boolean;
  showAvatar: boolean;
  onReaction: (emoji: string, own: boolean) => void;
  onOpenThread: () => void;
}

function MessageBubble({ message, channelId, isOwn, showAvatar, onReaction, onOpenThread }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const { replyCount } = useThreadPreview(channelId, message.id);

  if (message.type === 'deleted') {
    return (
      <div className={`message deleted ${isOwn ? 'own' : ''}`}>
        <div className="message-content">
          <div className="message-bubble deleted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <span>This message was deleted</span>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div
      className={`message ${isOwn ? 'own' : ''} ${showAvatar ? 'with-avatar' : 'grouped'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showAvatar && !isOwn && (
        <div className="message-avatar">
          {message.user?.name?.charAt(0).toUpperCase() || '?'}
        </div>
      )}
      {!showAvatar && !isOwn && <div className="avatar-placeholder" />}

      <div className="message-content">
        {showAvatar && (
          <div className="message-header">
            {!isOwn && <span className="message-sender">{message.user?.name}</span>}
            <span className="message-time">{formatTime(message.created_at)}</span>
            {message.status === 'sending' && (
              <span className="message-status sending">Sending...</span>
            )}
            {message.status === 'failed' && (
              <span className="message-status failed">Failed</span>
            )}
          </div>
        )}

        <div className="message-bubble">
          {message.text && <span className="message-text">{message.text}</span>}

          {/* Attachments */}
          {hasAttachments && (
            <div className="message-attachments">
              {message.attachments!.map((att, i) => (
                <div key={i} className={`attachment ${att.type}`}>
                  {att.type === 'image' ? (
                    <img src={att.url} alt={att.name || 'Image'} loading="lazy" />
                  ) : (
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="file-attachment">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span>{att.name}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="message-reactions">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.type}
                className={`reaction-badge ${reaction.own ? 'own' : ''}`}
                onClick={() => onReaction(reaction.type, reaction.own ?? false)}
              >
                <span className="emoji">{reaction.type}</span>
                <span className="count">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread preview */}
        {replyCount > 0 && (
          <button className="thread-preview" onClick={onOpenThread}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 17 4 12 9 7"/>
              <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
            </svg>
            <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
          </button>
        )}

        {/* Message actions */}
        {showActions && (
          <div className="message-actions">
            {QUICK_REACTIONS.slice(0, 4).map((emoji) => (
              <button key={emoji} onClick={() => onReaction(emoji, false)} title={`React with ${emoji}`}>
                {emoji}
              </button>
            ))}
            <button onClick={onOpenThread} title="Reply in thread">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 17 4 12 9 7"/>
                <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
