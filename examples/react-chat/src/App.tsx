import { useState, useEffect } from 'react';
import { ChatClient } from '@chatsdk/core';
import { ChatProvider } from '@chatsdk/react';
import { ChannelList } from './components/ChannelList';
import { ChatRoom } from './components/ChatRoom';
import type { Channel } from '@chatsdk/core';

// Initialize client - in production, get apiKey from environment
const client = new ChatClient({
  apiKey: 'your-api-key',
  apiUrl: 'http://localhost:5500',
  debug: true,
});

function App() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    // Connect user on mount
    const connect = async () => {
      try {
        await client.connectUser(
          { id: 'demo-user', name: 'Demo User' },
          'demo-token' // In production, get from your auth system
        );
        setConnected(true);
      } catch (error) {
        console.error('Failed to connect:', error);
      } finally {
        setConnecting(false);
      }
    };

    connect();

    return () => {
      client.disconnect();
    };
  }, []);

  if (connecting) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="empty-state" style={{ height: '100vh' }}>
        <h3>Failed to connect</h3>
        <p>Please check your API key and try again</p>
      </div>
    );
  }

  return (
    <ChatProvider client={client}>
      <div className="app">
        <ChannelList
          selectedId={selectedChannel?.id}
          onSelect={setSelectedChannel}
        />
        {selectedChannel ? (
          <ChatRoom channel={selectedChannel} />
        ) : (
          <div className="chat-area">
            <div className="empty-state">
              <h3>Select a channel</h3>
              <p>Choose a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </ChatProvider>
  );
}

export default App;
