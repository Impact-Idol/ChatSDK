import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Avatar } from '../shared/Avatar';
export const MessageInput = ({ placeholder = 'Type a message...', disabled = false, maxLength = 4000, replyingTo, onCancelReply, onSend, onTypingStart, onTypingStop, onAttachmentAdd, mentionSuggestions = [], onMentionSearch, }) => {
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [showMentions, setShowMentions] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef();
    const recordingIntervalRef = useRef();
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
        }
        else {
            onTypingStart?.();
        }
        typingTimeoutRef.current = setTimeout(() => {
            onTypingStop?.();
            typingTimeoutRef.current = undefined;
        }, 2000);
    }, [onTypingStart, onTypingStop]);
    const handleTextChange = (e) => {
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
                }
                else {
                    setShowMentions(false);
                }
            }
            else {
                setShowMentions(false);
            }
        }
    };
    const handleSend = () => {
        if (!text.trim() && attachments.length === 0)
            return;
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
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        setAttachments((prev) => [...prev, ...files]);
        onAttachmentAdd?.(files);
        e.target.value = '';
    };
    const removeAttachment = (index) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };
    const handleMentionSelect = (user) => {
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
        }
        else {
            setIsRecording(true);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration((d) => d + 1);
            }, 1000);
            // TODO: Handle voice recording start
        }
    };
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    const insertEmoji = (emoji) => {
        setText((prev) => prev + emoji);
        setShowEmoji(false);
        textareaRef.current?.focus();
    };
    return (_jsxs("div", { className: clsx('chatsdk-message-input', disabled && 'chatsdk-message-input-disabled'), children: [replyingTo && (_jsxs("div", { className: "chatsdk-reply-bar", children: [_jsx("div", { className: "chatsdk-reply-indicator" }), _jsxs("div", { className: "chatsdk-reply-content", children: [_jsxs("span", { className: "chatsdk-reply-label", children: ["Replying to ", replyingTo.user.name] }), _jsx("span", { className: "chatsdk-reply-text", children: replyingTo.text })] }), _jsx("button", { className: "chatsdk-reply-close", onClick: onCancelReply, "aria-label": "Cancel reply", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] })), attachments.length > 0 && (_jsx("div", { className: "chatsdk-attachments-preview", children: attachments.map((file, index) => (_jsxs("div", { className: "chatsdk-attachment-item", children: [file.type.startsWith('image/') ? (_jsx("img", { src: URL.createObjectURL(file), alt: file.name, className: "chatsdk-attachment-image" })) : (_jsxs("div", { className: "chatsdk-attachment-file", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), _jsx("polyline", { points: "14 2 14 8 20 8" })] }), _jsx("span", { className: "chatsdk-attachment-name", children: file.name })] })), _jsx("button", { className: "chatsdk-attachment-remove", onClick: () => removeAttachment(index), "aria-label": "Remove attachment", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }, index))) })), isRecording && (_jsxs("div", { className: "chatsdk-recording-bar", children: [_jsxs("div", { className: "chatsdk-recording-indicator", children: [_jsx("span", { className: "chatsdk-recording-dot" }), "Recording"] }), _jsx("span", { className: "chatsdk-recording-duration", children: formatDuration(recordingDuration) }), _jsx("div", { className: "chatsdk-recording-waveform", children: [...Array(20)].map((_, i) => (_jsx("div", { className: "chatsdk-recording-bar-item", style: { animationDelay: `${i * 0.05}s` } }, i))) }), _jsx("button", { className: "chatsdk-recording-cancel", onClick: toggleRecording, children: "Cancel" }), _jsx("button", { className: "chatsdk-recording-send", onClick: toggleRecording, children: _jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" }) }) })] })), !isRecording && (_jsxs("div", { className: clsx('chatsdk-input-container', isFocused && 'chatsdk-input-focused'), children: [_jsxs("div", { className: "chatsdk-input-actions-left", children: [_jsx("button", { className: "chatsdk-input-action", onClick: () => fileInputRef.current?.click(), disabled: disabled, "aria-label": "Attach file", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" }) }) }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, onChange: handleFileSelect, style: { display: 'none' }, accept: "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" })] }), _jsxs("div", { className: "chatsdk-textarea-wrapper", children: [_jsx("textarea", { ref: textareaRef, value: text, onChange: handleTextChange, onKeyDown: handleKeyDown, onFocus: () => setIsFocused(true), onBlur: () => setIsFocused(false), placeholder: placeholder, disabled: disabled, rows: 1, className: "chatsdk-textarea" }), showMentions && mentionSuggestions.length > 0 && (_jsx("div", { className: "chatsdk-mention-popup", children: mentionSuggestions.map((user) => (_jsxs("button", { className: "chatsdk-mention-item", onClick: () => handleMentionSelect(user), children: [_jsx(Avatar, { src: user.image, name: user.name, size: "sm" }), _jsx("span", { className: "chatsdk-mention-name", children: user.name })] }, user.id))) }))] }), _jsxs("div", { className: "chatsdk-input-actions-right", children: [_jsxs("div", { className: "chatsdk-emoji-container", children: [_jsx("button", { className: clsx('chatsdk-input-action', showEmoji && 'chatsdk-input-action-active'), onClick: () => setShowEmoji(!showEmoji), disabled: disabled, "aria-label": "Add emoji", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }), _jsx("line", { x1: "9", y1: "9", x2: "9.01", y2: "9" }), _jsx("line", { x1: "15", y1: "9", x2: "15.01", y2: "9" })] }) }), showEmoji && (_jsx("div", { className: "chatsdk-emoji-quick-picker", children: quickEmojis.map((emoji) => (_jsx("button", { className: "chatsdk-emoji-quick-btn", onClick: () => insertEmoji(emoji), children: emoji }, emoji))) }))] }), text.trim() || attachments.length > 0 ? (_jsx("button", { className: "chatsdk-send-btn", onClick: handleSend, disabled: disabled, "aria-label": "Send message", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" }) }) })) : (_jsx("button", { className: "chatsdk-input-action chatsdk-voice-btn", onClick: toggleRecording, disabled: disabled, "aria-label": "Record voice message", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" }), _jsx("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }), _jsx("line", { x1: "12", y1: "19", x2: "12", y2: "23" }), _jsx("line", { x1: "8", y1: "23", x2: "16", y2: "23" })] }) }))] })] })), text.length > maxLength * 0.8 && (_jsxs("div", { className: clsx('chatsdk-char-count', text.length >= maxLength && 'chatsdk-char-limit'), children: [text.length, " / ", maxLength] })), _jsx("style", { children: `
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
      ` })] }));
};
export default MessageInput;
