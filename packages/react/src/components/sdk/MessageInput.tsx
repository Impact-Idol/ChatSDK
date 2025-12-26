import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Avatar } from '../shared/Avatar';

export interface MessageUser {
  id: string;
  name: string;
  image?: string;
}

export interface ReplyingTo {
  id: string;
  text: string;
  user: MessageUser;
}

export interface MessageInputProps {
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  replyingTo?: ReplyingTo;
  onCancelReply?: () => void;
  onSend?: (content: { text: string; attachments?: File[] }) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  onAttachmentAdd?: (files: File[]) => void;
  mentionSuggestions?: MessageUser[];
  onMentionSearch?: (query: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 4000,
  replyingTo,
  onCancelReply,
  onSend,
  onTypingStart,
  onTypingStop,
  onAttachmentAdd,
  mentionSuggestions = [],
  onMentionSearch,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const recordingIntervalRef = useRef<NodeJS.Timeout>();

  const quickEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '✨', '🙌'];

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [text]);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      onTypingStart?.();
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop?.();
      typingTimeoutRef.current = undefined;
    }, 2000);
  }, [onTypingStart, onTypingStop]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setText(value);
      handleTyping();

      // Check for @ mentions
      const lastAtIndex = value.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const query = value.slice(lastAtIndex + 1);
        if (query.length > 0 && !query.includes(' ')) {
          setShowMentions(true);
          onMentionSearch?.(query);
        } else {
          setShowMentions(false);
        }
      } else {
        setShowMentions(false);
      }
    }
  };

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;

    onSend?.({ text: text.trim(), attachments });
    setText('');
    setAttachments([]);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
      onTypingStop?.();
    }

    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    onAttachmentAdd?.(files);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMentionSelect = (user: MessageUser) => {
    const lastAtIndex = text.lastIndexOf('@');
    const newText = text.slice(0, lastAtIndex) + `@${user.name} `;
    setText(newText);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const toggleRecording = () => {
    if (isRecording) {
      clearInterval(recordingIntervalRef.current);
      setIsRecording(false);
      setRecordingDuration(0);
      // TODO: Handle voice recording stop
    } else {
      setIsRecording(true);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
      // TODO: Handle voice recording start
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  return (
    <div className={clsx('chatsdk-message-input', disabled && 'chatsdk-message-input-disabled')}>
      {/* Reply Preview */}
      {replyingTo && (
        <div className="chatsdk-reply-bar">
          <div className="chatsdk-reply-indicator" />
          <div className="chatsdk-reply-content">
            <span className="chatsdk-reply-label">Replying to {replyingTo.user.name}</span>
            <span className="chatsdk-reply-text">{replyingTo.text}</span>
          </div>
          <button className="chatsdk-reply-close" onClick={onCancelReply} aria-label="Cancel reply">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="chatsdk-attachments-preview">
          {attachments.map((file, index) => (
            <div key={index} className="chatsdk-attachment-item">
              {file.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt={file.name} className="chatsdk-attachment-image" />
              ) : (
                <div className="chatsdk-attachment-file">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="chatsdk-attachment-name">{file.name}</span>
                </div>
              )}
              <button
                className="chatsdk-attachment-remove"
                onClick={() => removeAttachment(index)}
                aria-label="Remove attachment"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Voice Recording UI */}
      {isRecording && (
        <div className="chatsdk-recording-bar">
          <div className="chatsdk-recording-indicator">
            <span className="chatsdk-recording-dot" />
            Recording
          </div>
          <span className="chatsdk-recording-duration">{formatDuration(recordingDuration)}</span>
          <div className="chatsdk-recording-waveform">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="chatsdk-recording-bar-item"
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
          <button className="chatsdk-recording-cancel" onClick={toggleRecording}>
            Cancel
          </button>
          <button className="chatsdk-recording-send" onClick={toggleRecording}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      )}

      {/* Main Input Area */}
      {!isRecording && (
        <div className={clsx('chatsdk-input-container', isFocused && 'chatsdk-input-focused')}>
          {/* Left Actions */}
          <div className="chatsdk-input-actions-left">
            <button
              className="chatsdk-input-action"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              aria-label="Attach file"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
          </div>

          {/* Textarea */}
          <div className="chatsdk-textarea-wrapper">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="chatsdk-textarea"
            />

            {/* Mention Suggestions */}
            {showMentions && mentionSuggestions.length > 0 && (
              <div className="chatsdk-mention-popup">
                {mentionSuggestions.map((user) => (
                  <button
                    key={user.id}
                    className="chatsdk-mention-item"
                    onClick={() => handleMentionSelect(user)}
                  >
                    <Avatar src={user.image} name={user.name} size="sm" />
                    <span className="chatsdk-mention-name">{user.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="chatsdk-input-actions-right">
            {/* Emoji Picker */}
            <div className="chatsdk-emoji-container">
              <button
                className={clsx('chatsdk-input-action', showEmoji && 'chatsdk-input-action-active')}
                onClick={() => setShowEmoji(!showEmoji)}
                disabled={disabled}
                aria-label="Add emoji"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
              {showEmoji && (
                <div className="chatsdk-emoji-quick-picker">
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      className="chatsdk-emoji-quick-btn"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Voice Recording / Send */}
            {text.trim() || attachments.length > 0 ? (
              <button
                className="chatsdk-send-btn"
                onClick={handleSend}
                disabled={disabled}
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            ) : (
              <button
                className="chatsdk-input-action chatsdk-voice-btn"
                onClick={toggleRecording}
                disabled={disabled}
                aria-label="Record voice message"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Character Count */}
      {text.length > maxLength * 0.8 && (
        <div className={clsx('chatsdk-char-count', text.length >= maxLength && 'chatsdk-char-limit')}>
          {text.length} / {maxLength}
        </div>
      )}

      <style>{`
        .chatsdk-message-input {
          background: var(--chatsdk-background);
          border-top: 1px solid var(--chatsdk-border);
          padding: var(--chatsdk-space-3) var(--chatsdk-space-4);
        }

        .chatsdk-message-input-disabled {
          opacity: 0.6;
          pointer-events: none;
        }

        .chatsdk-reply-bar {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
          background: var(--chatsdk-muted);
          border-radius: var(--chatsdk-radius-lg);
          margin-bottom: var(--chatsdk-space-2);
          animation: chatsdk-slide-down 0.2s ease;
        }

        @keyframes chatsdk-slide-down {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chatsdk-reply-indicator {
          width: 3px;
          height: 32px;
          background: var(--chatsdk-primary);
          border-radius: 2px;
        }

        .chatsdk-reply-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .chatsdk-reply-label {
          font-size: var(--chatsdk-text-xs);
          font-weight: 600;
          color: var(--chatsdk-primary);
        }

        .chatsdk-reply-text {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chatsdk-reply-close {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--chatsdk-radius-md);
          cursor: pointer;
          color: var(--chatsdk-muted-foreground);
          transition: all 0.15s ease;
        }

        .chatsdk-reply-close:hover {
          background: var(--chatsdk-background);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-reply-close svg {
          width: 16px;
          height: 16px;
        }

        .chatsdk-attachments-preview {
          display: flex;
          gap: var(--chatsdk-space-2);
          padding: var(--chatsdk-space-2);
          overflow-x: auto;
          margin-bottom: var(--chatsdk-space-2);
        }

        .chatsdk-attachment-item {
          position: relative;
          flex-shrink: 0;
          animation: chatsdk-scale-in 0.2s ease;
        }

        @keyframes chatsdk-scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .chatsdk-attachment-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: var(--chatsdk-radius-lg);
        }

        .chatsdk-attachment-file {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--chatsdk-space-1);
          width: 80px;
          padding: var(--chatsdk-space-2);
          background: var(--chatsdk-muted);
          border-radius: var(--chatsdk-radius-lg);
        }

        .chatsdk-attachment-file svg {
          width: 24px;
          height: 24px;
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-attachment-name {
          font-size: 10px;
          color: var(--chatsdk-muted-foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .chatsdk-attachment-remove {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-destructive);
          color: white;
          border: 2px solid var(--chatsdk-background);
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .chatsdk-attachment-remove:hover {
          transform: scale(1.1);
        }

        .chatsdk-attachment-remove svg {
          width: 12px;
          height: 12px;
        }

        .chatsdk-recording-bar {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-3);
          background: var(--chatsdk-muted);
          border-radius: var(--chatsdk-radius-lg);
        }

        .chatsdk-recording-indicator {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          color: var(--chatsdk-destructive);
        }

        .chatsdk-recording-dot {
          width: 8px;
          height: 8px;
          background: var(--chatsdk-destructive);
          border-radius: 50%;
          animation: chatsdk-pulse 1s infinite;
        }

        @keyframes chatsdk-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .chatsdk-recording-duration {
          font-size: var(--chatsdk-text-sm);
          font-variant-numeric: tabular-nums;
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-recording-waveform {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          height: 32px;
        }

        .chatsdk-recording-bar-item {
          width: 3px;
          background: var(--chatsdk-primary);
          border-radius: 2px;
          animation: chatsdk-wave 0.5s infinite alternate;
        }

        @keyframes chatsdk-wave {
          from { height: 4px; }
          to { height: 24px; }
        }

        .chatsdk-recording-cancel {
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
          background: transparent;
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-md);
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chatsdk-recording-cancel:hover {
          background: var(--chatsdk-background);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-recording-send {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-primary);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chatsdk-recording-send:hover {
          transform: scale(1.1);
        }

        .chatsdk-recording-send svg {
          width: 20px;
          height: 20px;
        }

        .chatsdk-input-container {
          display: flex;
          align-items: flex-end;
          gap: var(--chatsdk-space-2);
          background: var(--chatsdk-muted);
          border-radius: var(--chatsdk-radius-2xl);
          padding: var(--chatsdk-space-2);
          transition: all 0.15s ease;
        }

        .chatsdk-input-focused {
          background: var(--chatsdk-background);
          box-shadow: 0 0 0 2px var(--chatsdk-primary);
        }

        .chatsdk-input-actions-left,
        .chatsdk-input-actions-right {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-1);
        }

        .chatsdk-input-action {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--chatsdk-radius-full);
          cursor: pointer;
          color: var(--chatsdk-muted-foreground);
          transition: all 0.15s ease;
        }

        .chatsdk-input-action:hover {
          background: var(--chatsdk-secondary);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-input-action-active {
          background: var(--chatsdk-secondary);
          color: var(--chatsdk-primary);
        }

        .chatsdk-input-action svg {
          width: 20px;
          height: 20px;
        }

        .chatsdk-textarea-wrapper {
          flex: 1;
          position: relative;
        }

        .chatsdk-textarea {
          width: 100%;
          min-height: 36px;
          max-height: 150px;
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
          background: transparent;
          border: none;
          font-family: var(--chatsdk-font-sans);
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
          resize: none;
          outline: none;
          line-height: 1.5;
        }

        .chatsdk-textarea::placeholder {
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-mention-popup {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          margin-bottom: var(--chatsdk-space-2);
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-lg);
          box-shadow: var(--chatsdk-shadow-lg);
          max-height: 200px;
          overflow-y: auto;
          animation: chatsdk-slide-up 0.15s ease;
        }

        @keyframes chatsdk-slide-up {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chatsdk-mention-item {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          width: 100%;
          padding: var(--chatsdk-space-2) var(--chatsdk-space-3);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .chatsdk-mention-item:hover {
          background: var(--chatsdk-muted);
        }

        .chatsdk-mention-name {
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-foreground);
        }

        .chatsdk-emoji-container {
          position: relative;
        }

        .chatsdk-emoji-quick-picker {
          position: absolute;
          bottom: 100%;
          right: 0;
          margin-bottom: var(--chatsdk-space-2);
          display: flex;
          gap: 2px;
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-lg);
          padding: var(--chatsdk-space-1);
          box-shadow: var(--chatsdk-shadow-lg);
          animation: chatsdk-slide-up 0.15s ease;
        }

        .chatsdk-emoji-quick-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--chatsdk-radius-md);
          cursor: pointer;
          font-size: 18px;
          transition: all 0.15s ease;
        }

        .chatsdk-emoji-quick-btn:hover {
          background: var(--chatsdk-muted);
          transform: scale(1.2);
        }

        .chatsdk-send-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-primary);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chatsdk-send-btn:hover {
          background: var(--chatsdk-primary-hover);
          transform: scale(1.05);
        }

        .chatsdk-send-btn:active {
          transform: scale(0.95);
        }

        .chatsdk-send-btn svg {
          width: 18px;
          height: 18px;
          margin-left: 2px;
        }

        .chatsdk-voice-btn:hover {
          color: var(--chatsdk-destructive);
        }

        .chatsdk-char-count {
          text-align: right;
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
          padding: var(--chatsdk-space-1) var(--chatsdk-space-2) 0;
        }

        .chatsdk-char-limit {
          color: var(--chatsdk-destructive);
        }
      `}</style>
    </div>
  );
};

export default MessageInput;
