import { useState } from 'react';
import { useChatClient, useCurrentUser } from '@chatsdk/react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface SettingsPanelProps {
  onClose: () => void;
  token?: string | null;
}

export function SettingsPanel({ onClose, token }: SettingsPanelProps) {
  const client = useChatClient();
  const user = useCurrentUser();
  const [sounds, setSounds] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  const push = usePushNotifications(token || null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Profile Section */}
          <section className="settings-section">
            <h3>Profile</h3>
            <div className="profile-card">
              <div className="avatar large">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="profile-info">
                <h4>{user?.name || 'Unknown User'}</h4>
                <p className="user-id">ID: {user?.id}</p>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="settings-section">
            <h3>Notifications</h3>
            {!push.supported ? (
              <div className="setting-notice">
                Push notifications are not supported in this browser.
              </div>
            ) : (
              <>
                <div className="setting-row">
                  <div className="setting-info">
                    <span className="setting-label">Push Notifications</span>
                    <span className="setting-desc">
                      {push.permission === 'denied'
                        ? 'Notifications blocked - enable in browser settings'
                        : push.subscribed
                          ? 'Enabled - you will receive notifications'
                          : 'Get notified of new messages'}
                    </span>
                  </div>
                  {push.subscribed ? (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => push.unsubscribe()}
                      disabled={push.loading}
                    >
                      {push.loading ? 'Disabling...' : 'Disable'}
                    </button>
                  ) : (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => push.subscribe()}
                      disabled={push.loading || push.permission === 'denied'}
                    >
                      {push.loading ? 'Enabling...' : 'Enable'}
                    </button>
                  )}
                </div>
                {push.subscribed && (
                  <div className="setting-row">
                    <div className="setting-info">
                      <span className="setting-label">Test Notification</span>
                      <span className="setting-desc">Send a test push notification</span>
                    </div>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => push.testNotification()}
                    >
                      Send Test
                    </button>
                  </div>
                )}
                {push.error && (
                  <div className="setting-error">{push.error}</div>
                )}
              </>
            )}
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Sound Effects</span>
                <span className="setting-desc">Play sounds for messages</span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={sounds}
                  onChange={(e) => setSounds(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </section>

          {/* Appearance */}
          <section className="settings-section">
            <h3>Appearance</h3>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Theme</span>
                <span className="setting-desc">Choose your preferred theme</span>
              </div>
              <select
                className="theme-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
          </section>

          {/* About */}
          <section className="settings-section">
            <h3>About</h3>
            <div className="about-info">
              <p><strong>ChatSDK Demo</strong></p>
              <p className="version">Version 1.0.0</p>
              <p className="links">
                <a href="https://github.com/chatsdk" target="_blank" rel="noopener noreferrer">GitHub</a>
                <span> • </span>
                <a href="https://docs.chatsdk.io" target="_blank" rel="noopener noreferrer">Documentation</a>
              </p>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
