import type { ConnectionState } from '@chatsdk/core';

interface ConnectionStatusProps {
  state: ConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const statusConfig: Record<ConnectionState, { color: string; text: string; icon: JSX.Element }> = {
    connecting: {
      color: '#f59e0b',
      text: 'Connecting...',
      icon: (
        <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      ),
    },
    reconnecting: {
      color: '#f59e0b',
      text: 'Reconnecting...',
      icon: (
        <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      ),
    },
    connected: {
      color: '#22c55e',
      text: 'Connected',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      ),
    },
    disconnected: {
      color: '#ef4444',
      text: 'Disconnected',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      ),
    },
  };

  const config = statusConfig[state] || statusConfig.disconnected;

  return (
    <div className="connection-status" style={{ color: config.color }}>
      <span className="status-icon">{config.icon}</span>
      <span className="status-text">{config.text}</span>
    </div>
  );
}
