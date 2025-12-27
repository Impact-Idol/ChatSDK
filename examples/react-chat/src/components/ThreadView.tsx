import { useState, useRef, useEffect } from 'react';
import { useThread, useChatClient, QUICK_REACTIONS } from '@chatsdk/react';
import type { Message } from '@chatsdk/core';

interface ThreadViewProps {
  channelId: string;
  parentMessage: Message;
  onClose: () => void;
}

export function ThreadView({ channelId, parentMessage, onClose }: ThreadViewProps) {
  const client = useChatClient();
  const { parent, replies, loading, hasMore, loadMore, sendReply } = useThread(channelId, parentMessage.id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      await sendReply(text.trim());
      setText('');
    } catch (error) {
      console.error('Failed to send reply:', error);
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="thread-view">
      <div className="thread-header">
        <h3>Thread</h3>
        <button className="icon-btn" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="thread-content">
        {/* Parent message */}
        <div className="thread-parent">
          <div className="avatar">
            {parentMessage.user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="message-content">
            <div className="message-header">
              <span className="sender">{parentMessage.user?.name}</span>
              <span className="time">{formatTime(parentMessage.created_at)}</span>
            </div>
            <p className="text">{parentMessage.text}</p>
          </div>
        </div>

        <div className="thread-divider">
          <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
        </div>

        {/* Replies */}
        <div className="thread-replies">
          {hasMore && (
            <button className="load-more-btn" onClick={loadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load more replies'}
            </button>
          )}

          {loading && replies.length === 0 && (
            <div className="loading">
              <div className="spinner" />
            </div>
          )}

          {replies.map((reply) => (
            <div
              key={reply.id}
              className={`thread-reply ${reply.user?.id === client.user?.id ? 'own' : ''}`}
            >
              <div className="avatar small">
                {reply.user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="reply-content">
                <div className="reply-header">
                  <span className="sender">{reply.user?.name}</span>
                  <span className="time">{formatTime(reply.createdAt)}</span>
                </div>
                <p className="text">{reply.text}</p>
                {reply.status === 'sending' && (
                  <span className="status sending">Sending...</span>
                )}
                {reply.status === 'failed' && (
                  <span className="status failed">Failed to send</span>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply composer */}
      <div className="thread-composer">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply to thread..."
          disabled={sending}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
