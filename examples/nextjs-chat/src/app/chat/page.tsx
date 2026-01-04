'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkspaces,
  getChannels,
  getMessages,
  sendMessage,
  getWsToken,
  type Workspace,
  type Channel,
  type Message,
} from '@/lib/api-client';
import { wsClient } from '@/lib/websocket-client';
import { getChatConfig } from '@/lib/chat-config';
import { getInitials, getAvatarColor, formatMessageTime } from '@/lib/utils';

// Demo user - in a real app, this would come from authentication
const DEMO_USER = {
  id: 'demo-user-1',
  name: 'Demo User',
};

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set up WebSocket client with QueryClient
  useEffect(() => {
    wsClient.setQueryClient(queryClient);
  }, [queryClient]);

  // Connect to WebSocket
  useEffect(() => {
    const connectWs = async () => {
      try {
        const config = getChatConfig();
        const token = await getWsToken(DEMO_USER.id);
        wsClient.connect(token, config.appId);
        setWsConnected(true);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWs();

    return () => {
      wsClient.disconnect();
      setWsConnected(false);
    };
  }, []);

  // Subscribe to channel when selected
  useEffect(() => {
    if (!selectedChannel || !wsConnected) return;

    const config = getChatConfig();
    wsClient.subscribeToChannel(config.appId, selectedChannel.id);

    return () => {
      wsClient.unsubscribeFromChannel(config.appId, selectedChannel.id);
    };
  }, [selectedChannel, wsConnected]);

  // Fetch workspaces
  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
  });

  // Auto-select first workspace
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0]);
    }
  }, [workspaces, selectedWorkspace]);

  // Fetch channels for selected workspace
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['channels', selectedWorkspace?.id],
    queryFn: () => getChannels(selectedWorkspace!.id),
    enabled: !!selectedWorkspace,
  });

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  // Fetch messages for selected channel
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedChannel?.id],
    queryFn: () => getMessages(selectedChannel!.id),
    enabled: !!selectedChannel,
  });

  const messages = messagesData?.messages ?? [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      sendMessage(selectedChannel!.id, content, DEMO_USER.id),
    onSuccess: (message) => {
      // Optimistically add the message
      queryClient.setQueryData(
        ['messages', selectedChannel?.id],
        (old: { messages: Message[]; hasMore: boolean } | undefined) => {
          if (!old) return { messages: [message], hasMore: false };
          return {
            ...old,
            messages: [...old.messages, message],
          };
        }
      );
    },
  });

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !selectedChannel) return;

      sendMessageMutation.mutate(newMessage.trim());
      setNewMessage('');
    },
    [newMessage, selectedChannel, sendMessageMutation]
  );

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '280px',
          backgroundColor: '#1e293b',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Workspace selector */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>
          <select
            value={selectedWorkspace?.id || ''}
            onChange={(e) => {
              const ws = workspaces.find((w) => w.id === e.target.value);
              setSelectedWorkspace(ws || null);
              setSelectedChannel(null);
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '6px',
              backgroundColor: '#334155',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {workspacesLoading && <option>Loading...</option>}
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        {/* Channels list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          <div
            style={{
              padding: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#94a3b8',
              textTransform: 'uppercase',
            }}
          >
            Channels
          </div>
          {channelsLoading && (
            <div style={{ padding: '0.5rem', color: '#94a3b8' }}>Loading...</div>
          )}
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor:
                  selectedChannel?.id === channel.id ? '#3b82f6' : 'transparent',
                color: selectedChannel?.id === channel.id ? 'white' : '#cbd5e1',
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: '2px',
              }}
            >
              # {channel.name}
            </button>
          ))}
        </div>

        {/* User info */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: getAvatarColor(DEMO_USER.id),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: '600',
            }}
          >
            {getInitials(DEMO_USER.name)}
          </div>
          <div>
            <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
              {DEMO_USER.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Channel header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '1.25rem', color: '#64748b' }}>#</span>
          <span style={{ fontWeight: '600', fontSize: '1.125rem' }}>
            {selectedChannel?.name || 'Select a channel'}
          </span>
          {selectedChannel?.description && (
            <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>
              | {selectedChannel.description}
            </span>
          )}
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 1.5rem',
          }}
        >
          {messagesLoading && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
              Loading messages...
            </div>
          )}
          {!selectedChannel && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
              Select a channel to start chatting
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: getAvatarColor(message.userId),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  flexShrink: 0,
                }}
              >
                {getInitials(message.user?.name || 'Unknown')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '600' }}>
                    {message.user?.name || 'Unknown User'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {formatMessageTime(message.createdAt)}
                  </span>
                </div>
                <div style={{ marginTop: '0.25rem', lineHeight: '1.5' }}>
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: 'white',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                selectedChannel
                  ? `Message #${selectedChannel.name}`
                  : 'Select a channel'
              }
              disabled={!selectedChannel || sendMessageMutation.isPending}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={
                !selectedChannel ||
                !newMessage.trim() ||
                sendMessageMutation.isPending
              }
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                backgroundColor:
                  !selectedChannel || !newMessage.trim()
                    ? '#e5e7eb'
                    : '#3b82f6',
                color:
                  !selectedChannel || !newMessage.trim() ? '#9ca3af' : 'white',
                border: 'none',
                fontWeight: '500',
                cursor:
                  !selectedChannel || !newMessage.trim()
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
