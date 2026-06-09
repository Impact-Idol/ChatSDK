import { useState, useEffect } from 'react';
import { ChatProvider, useChatContext, useConnectionState, usePresence, useTotalUnreadCount } from '@chatsdk/react';
import { ChannelList } from './components/ChannelList';
import { ChatRoom } from './components/ChatRoom';
import { ThreadView } from './components/ThreadView';
import { SettingsPanel } from './components/SettingsPanel';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { Channel, Message } from '@chatsdk/core';

// Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/connection/websocket';
const TOKEN_URL = import.meta.env.VITE_CHATSDK_TOKEN_URL || '/api/chatsdk-token';
const DEMO_USERS = [
  { id: 'user-1', name: 'Alice Johnson', aliases: ['alice', 'user-1'] },
  { id: 'user-2', name: 'Bob Smith', aliases: ['bob', 'user-2'] },
  { id: 'user-3', name: 'Carol Williams', aliases: ['carol', 'user-3'] },
];

function getDemoUser() {
  const params = new URLSearchParams(window.location.search);
  const requestedUser = params.get('user') || params.get('userId') || params.get('as');
  const requestedName = params.get('name') || params.get('displayName');

  if (requestedUser) {
    const normalized = requestedUser.toLowerCase();
    const knownUser = DEMO_USERS.find((user) => user.aliases.includes(normalized));

    if (knownUser) {
      return { id: knownUser.id, name: requestedName || knownUser.name };
    }

    return { id: requestedUser, name: requestedName || requestedUser };
  }

  return { id: DEMO_USERS[0].id, name: DEMO_USERS[0].name };
}

const DEMO_USER = getDemoUser();

// Debug logging
console.log('[App] Configuration:', {
  API_URL,
  TOKEN_URL,
  envViteApiUrl: import.meta.env.VITE_API_URL,
});

// Helper to fetch token from API
async function fetchToken(userId: string, name: string): Promise<{
  token: string;
  wsToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, displayName: name, name }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch token: ${response.statusText}. Configure VITE_CHATSDK_TOKEN_URL to a backend endpoint that mints ChatSDK user tokens.`);
  }

  const data = await response.json();
  return {
    token: data.token,
    wsToken: data.wsToken ?? data._internal?.wsToken ?? data.token,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  };
}

const tokenProvider = () => fetchToken(DEMO_USER.id, DEMO_USER.name);

function AppContent() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedThread, setSelectedThread] = useState<{ channelId: string; message: Message } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { state: connectionState } = useConnectionState();
  const { setOnline, setOffline } = usePresence();
  const totalUnread = useTotalUnreadCount();

  // Set presence on mount
  useEffect(() => {
    setOnline();

    const handleVisibility = () => {
      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      setOffline();
    };
  }, [setOnline, setOffline]);

  // Update document title with unread count
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) ChatSDK Demo` : 'ChatSDK Demo';
  }, [totalUnread]);

  const handleOpenThread = (message: Message, channelId: string) => {
    setSelectedThread({ channelId, message });
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>ChatSDK</span>
          </div>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </button>
        </div>

        <ChannelList selectedId={selectedChannel?.id} onSelect={setSelectedChannel} />

        <div className="sidebar-footer">
          <div className="demo-user">
            <div className="demo-user-avatar">{DEMO_USER.name.charAt(0).toUpperCase()}</div>
            <div className="demo-user-meta">
              <span className="demo-user-name">{DEMO_USER.name}</span>
              <span className="demo-user-id">{DEMO_USER.id}</span>
            </div>
          </div>
          <ConnectionStatus state={connectionState} />
        </div>
      </aside>

      <main className="main-content">
        {selectedChannel ? (
          <ChatRoom channel={selectedChannel} onOpenThread={handleOpenThread} />
        ) : (
          <div className="welcome-screen">
            <div className="welcome-content">
              <div className="welcome-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h2>Welcome to ChatSDK</h2>
              <p>Select a channel from the sidebar to start chatting</p>

              <div className="features-grid">
                <FeatureCard icon="message" title="Real-time Chat" desc="Instant messaging with typing indicators" />
                <FeatureCard icon="reply" title="Threads" desc="Organize conversations with replies" />
                <FeatureCard icon="emoji" title="Reactions" desc="Express yourself with emoji reactions" />
                <FeatureCard icon="upload" title="File Sharing" desc="Share images, videos, and documents" />
                <FeatureCard icon="presence" title="Presence" desc="See who's online in real-time" />
                <FeatureCard icon="search" title="Search" desc="Find messages and files quickly" />
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedThread && (
        <aside className="thread-panel">
          <ThreadView
            channelId={selectedThread.channelId}
            parentMessage={selectedThread.message}
            onClose={() => setSelectedThread(null)}
          />
        </aside>
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const icons: Record<string, JSX.Element> = {
    message: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    reply: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>,
    emoji: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
    upload: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    presence: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="19" cy="11" r="3" fill="#22c55e"/></svg>,
    search: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  };

  return (
    <div className="feature-card">
      <div className="feature-icon">{icons[icon]}</div>
      <h4>{title}</h4>
      <p>{desc}</p>
    </div>
  );
}

// Wrapper component to handle user authentication
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { connectUser } = useChatContext();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authenticate = async () => {
      try {
        console.log('[App] Fetching tokens...');
        console.log('[App] Connecting user...');
        await connectUser(DEMO_USER);
        console.log('[App] User connected successfully');

        setReady(true);
      } catch (err) {
        console.error('Failed to authenticate:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    authenticate();
  }, [connectUser]);

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2>Connection Failed</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="spinner large" />
          <p>Connecting to ChatSDK...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ChatProvider apiUrl={API_URL} wsUrl={WS_URL} tokenProvider={tokenProvider} debug={true}>
        <AuthWrapper>
          <AppContent />
        </AuthWrapper>
      </ChatProvider>
    </ErrorBoundary>
  );
}

export default App;
