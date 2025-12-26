import React, { useState } from 'react';
import clsx from 'clsx';

// =============================================================================
// TYPES
// =============================================================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  imageUrl?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  mentionsOnly: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  digestFrequency: 'never' | 'daily' | 'weekly';
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  animationsEnabled: boolean;
  highContrastMode: boolean;
}

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showReadReceipts: boolean;
  showTypingIndicator: boolean;
  allowDirectMessages: boolean;
  allowChannelInvites: boolean;
  twoFactorEnabled: boolean;
}

export interface SettingsPageProps {
  profile: UserProfile;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  onProfileUpdate?: (profile: Partial<UserProfile>) => void;
  onNotificationsUpdate?: (settings: Partial<NotificationSettings>) => void;
  onAppearanceUpdate?: (settings: Partial<AppearanceSettings>) => void;
  onPrivacyUpdate?: (settings: Partial<PrivacySettings>) => void;
  onPasswordChange?: () => void;
  onDeleteAccount?: () => void;
  onExportData?: () => void;
  onLogout?: () => void;
  className?: string;
}

export type SettingsSection = 'profile' | 'notifications' | 'appearance' | 'privacy' | 'security';

// =============================================================================
// ICONS
// =============================================================================

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const PaletteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" />
    <circle cx="17.5" cy="10.5" r=".5" />
    <circle cx="8.5" cy="7.5" r=".5" />
    <circle cx="6.5" cy="12.5" r=".5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const MonitorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

const LogOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SmartphoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </svg>
);

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    height: '100%',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
  },

  sidebar: {
    width: '240px',
    backgroundColor: 'var(--chatsdk-bg-primary)',
    borderRight: '1px solid var(--chatsdk-border-light)',
    display: 'flex',
    flexDirection: 'column' as const,
    flexShrink: 0,
  },

  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
  },

  sidebarTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
    margin: 0,
  },

  nav: {
    flex: 1,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },

  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left' as const,
    width: '100%',
  },

  navItemActive: {
    backgroundColor: 'var(--chatsdk-primary-light)',
    color: 'var(--chatsdk-primary)',
  },

  navIcon: {
    flexShrink: 0,
  },

  sidebarFooter: {
    padding: '12px',
    borderTop: '1px solid var(--chatsdk-border-light)',
  },

  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-error)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left' as const,
  },

  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '32px 48px',
  },

  contentHeader: {
    marginBottom: '32px',
  },

  contentTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
    margin: 0,
    marginBottom: '8px',
  },

  contentDescription: {
    fontSize: '14px',
    color: 'var(--chatsdk-text-tertiary)',
    margin: 0,
  },

  section: {
    backgroundColor: 'var(--chatsdk-bg-primary)',
    borderRadius: '12px',
    border: '1px solid var(--chatsdk-border-light)',
    marginBottom: '24px',
    overflow: 'hidden',
  },

  sectionHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--chatsdk-border-light)',
  },

  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
    margin: 0,
  },

  sectionDescription: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-tertiary)',
    margin: 0,
    marginTop: '4px',
  },

  sectionContent: {
    padding: '20px',
  },

  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px',
  },

  avatarContainer: {
    position: 'relative' as const,
  },

  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
  },

  avatarFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    fontSize: '32px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-secondary)',
  },

  avatarEditButton: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: 'var(--chatsdk-primary)',
    border: '2px solid var(--chatsdk-bg-primary)',
    borderRadius: '50%',
    color: 'white',
    cursor: 'pointer',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--chatsdk-text-primary)',
    margin: 0,
  },

  profileEmail: {
    fontSize: '14px',
    color: 'var(--chatsdk-text-tertiary)',
    margin: 0,
    marginTop: '4px',
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },

  formGroupFullWidth: {
    gridColumn: '1 / -1',
  },

  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
  },

  input: {
    padding: '10px 12px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    border: '1px solid var(--chatsdk-border-light)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--chatsdk-text-primary)',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },

  textarea: {
    padding: '10px 12px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    border: '1px solid var(--chatsdk-border-light)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--chatsdk-text-primary)',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '80px',
    fontFamily: 'inherit',
  },

  select: {
    padding: '10px 12px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    border: '1px solid var(--chatsdk-border-light)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--chatsdk-text-primary)',
    outline: 'none',
    cursor: 'pointer',
  },

  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
    borderBottom: '1px solid var(--chatsdk-border-light)',
  },

  settingRowLast: {
    borderBottom: 'none',
  },

  settingInfo: {
    flex: 1,
  },

  settingLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-primary)',
  },

  settingDescription: {
    fontSize: '13px',
    color: 'var(--chatsdk-text-tertiary)',
    marginTop: '2px',
  },

  toggle: {
    position: 'relative' as const,
    width: '44px',
    height: '24px',
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },

  toggleActive: {
    backgroundColor: 'var(--chatsdk-primary)',
  },

  toggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: 'white',
    borderRadius: '50%',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.2s ease',
  },

  toggleKnobActive: {
    transform: 'translateX(20px)',
  },

  themeOptions: {
    display: 'flex',
    gap: '12px',
  },

  themeOption: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '16px 24px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    border: '2px solid var(--chatsdk-border-light)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minWidth: '100px',
  },

  themeOptionActive: {
    borderColor: 'var(--chatsdk-primary)',
    backgroundColor: 'var(--chatsdk-primary-light)',
  },

  themeIcon: {
    color: 'var(--chatsdk-text-secondary)',
  },

  themeLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-primary)',
  },

  checkBadge: {
    position: 'absolute' as const,
    top: '-6px',
    right: '-6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    backgroundColor: 'var(--chatsdk-primary)',
    borderRadius: '50%',
    color: 'white',
  },

  dangerZone: {
    border: '1px solid var(--chatsdk-error)',
  },

  dangerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--chatsdk-error)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-error)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: 'var(--chatsdk-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    border: '1px solid var(--chatsdk-border-light)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--chatsdk-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid var(--chatsdk-border-light)',
  },

  twoFactorRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: 'var(--chatsdk-bg-secondary)',
    borderRadius: '8px',
    marginBottom: '16px',
  },

  twoFactorStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  },

  statusBadgeEnabled: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: 'var(--chatsdk-success)',
  },

  statusBadgeDisabled: {
    backgroundColor: 'var(--chatsdk-bg-tertiary)',
    color: 'var(--chatsdk-text-tertiary)',
  },
};

// =============================================================================
// TOGGLE COMPONENT
// =============================================================================

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => (
  <div
    style={{
      ...styles.toggle,
      ...(checked ? styles.toggleActive : {}),
    }}
    onClick={() => onChange(!checked)}
    role="switch"
    aria-checked={checked}
  >
    <div
      style={{
        ...styles.toggleKnob,
        ...(checked ? styles.toggleKnobActive : {}),
      }}
    />
  </div>
);

// =============================================================================
// COMPONENT
// =============================================================================

export const SettingsPage: React.FC<SettingsPageProps> = ({
  profile,
  notifications,
  appearance,
  privacy,
  onProfileUpdate,
  onNotificationsUpdate,
  onAppearanceUpdate,
  onPrivacyUpdate,
  onPasswordChange,
  onDeleteAccount,
  onExportData,
  onLogout,
  className,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [localProfile, setLocalProfile] = useState(profile);

  const navItems: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <UserIcon /> },
    { id: 'notifications', label: 'Notifications', icon: <BellIcon /> },
    { id: 'appearance', label: 'Appearance', icon: <PaletteIcon /> },
    { id: 'privacy', label: 'Privacy', icon: <ShieldIcon /> },
    { id: 'security', label: 'Security', icon: <LockIcon /> },
  ];

  const sectionInfo: Record<SettingsSection, { title: string; description: string }> = {
    profile: { title: 'Profile', description: 'Manage your personal information and how others see you' },
    notifications: { title: 'Notifications', description: 'Control how and when you receive notifications' },
    appearance: { title: 'Appearance', description: 'Customize the look and feel of the app' },
    privacy: { title: 'Privacy', description: 'Control your privacy settings and data' },
    security: { title: 'Security', description: 'Manage your account security and authentication' },
  };

  const renderProfileSection = () => (
    <>
      <div style={styles.section}>
        <div style={styles.sectionContent}>
          <div style={styles.profileHeader}>
            <div style={styles.avatarContainer}>
              {profile.imageUrl ? (
                <img src={profile.imageUrl} alt="" style={styles.avatar} />
              ) : (
                <div style={styles.avatarFallback}>
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <button style={styles.avatarEditButton}>
                <CameraIcon />
              </button>
            </div>
            <div style={styles.profileInfo}>
              <h3 style={styles.profileName}>{profile.name}</h3>
              <p style={styles.profileEmail}>{profile.email}</p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Display Name</label>
              <input
                type="text"
                value={localProfile.name}
                onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={localProfile.email}
                onChange={(e) => setLocalProfile({ ...localProfile, email: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="tel"
                value={localProfile.phone || ''}
                onChange={(e) => setLocalProfile({ ...localProfile, phone: e.target.value })}
                style={styles.input}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Timezone</label>
              <select
                value={localProfile.timezone || ''}
                onChange={(e) => setLocalProfile({ ...localProfile, timezone: e.target.value })}
                style={styles.select}
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>
            <div style={{ ...styles.formGroup, ...styles.formGroupFullWidth }}>
              <label style={styles.label}>Bio</label>
              <textarea
                value={localProfile.bio || ''}
                onChange={(e) => setLocalProfile({ ...localProfile, bio: e.target.value })}
                style={styles.textarea}
                placeholder="Tell others a bit about yourself..."
              />
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button
              style={styles.primaryButton}
              onClick={() => onProfileUpdate?.(localProfile)}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const renderNotificationsSection = () => (
    <>
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Push Notifications</h4>
          <p style={styles.sectionDescription}>Receive notifications on your devices</p>
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Enable push notifications</div>
              <div style={styles.settingDescription}>Get notified about new messages and activity</div>
            </div>
            <Toggle
              checked={notifications.pushEnabled}
              onChange={(checked) => onNotificationsUpdate?.({ pushEnabled: checked })}
            />
          </div>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Desktop notifications</div>
              <div style={styles.settingDescription}>Show notifications on your desktop</div>
            </div>
            <Toggle
              checked={notifications.desktopEnabled}
              onChange={(checked) => onNotificationsUpdate?.({ desktopEnabled: checked })}
            />
          </div>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Sound</div>
              <div style={styles.settingDescription}>Play a sound when receiving notifications</div>
            </div>
            <Toggle
              checked={notifications.soundEnabled}
              onChange={(checked) => onNotificationsUpdate?.({ soundEnabled: checked })}
            />
          </div>
          <div style={{ ...styles.settingRow, ...styles.settingRowLast }}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Mentions only</div>
              <div style={styles.settingDescription}>Only notify when you're directly mentioned</div>
            </div>
            <Toggle
              checked={notifications.mentionsOnly}
              onChange={(checked) => onNotificationsUpdate?.({ mentionsOnly: checked })}
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Email Notifications</h4>
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Email notifications</div>
              <div style={styles.settingDescription}>Receive updates via email</div>
            </div>
            <Toggle
              checked={notifications.emailEnabled}
              onChange={(checked) => onNotificationsUpdate?.({ emailEnabled: checked })}
            />
          </div>
          <div style={{ ...styles.settingRow, ...styles.settingRowLast }}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Digest frequency</div>
              <div style={styles.settingDescription}>How often to send email digests</div>
            </div>
            <select
              value={notifications.digestFrequency}
              onChange={(e) => onNotificationsUpdate?.({ digestFrequency: e.target.value as 'never' | 'daily' | 'weekly' })}
              style={{ ...styles.select, width: '120px' }}
            >
              <option value="never">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );

  const renderAppearanceSection = () => (
    <>
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Theme</h4>
          <p style={styles.sectionDescription}>Choose your preferred color scheme</p>
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.themeOptions}>
            {[
              { id: 'light', label: 'Light', icon: <SunIcon /> },
              { id: 'dark', label: 'Dark', icon: <MoonIcon /> },
              { id: 'system', label: 'System', icon: <MonitorIcon /> },
            ].map((theme) => (
              <div
                key={theme.id}
                style={{
                  ...styles.themeOption,
                  ...(appearance.theme === theme.id ? styles.themeOptionActive : {}),
                  position: 'relative' as const,
                }}
                onClick={() => onAppearanceUpdate?.({ theme: theme.id as 'light' | 'dark' | 'system' })}
              >
                <div style={styles.themeIcon}>{theme.icon}</div>
                <span style={styles.themeLabel}>{theme.label}</span>
                {appearance.theme === theme.id && (
                  <div style={styles.checkBadge}>
                    <CheckIcon />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Display</h4>
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Font size</div>
              <div style={styles.settingDescription}>Adjust the text size throughout the app</div>
            </div>
            <select
              value={appearance.fontSize}
              onChange={(e) => onAppearanceUpdate?.({ fontSize: e.target.value as 'small' | 'medium' | 'large' })}
              style={{ ...styles.select, width: '120px' }}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Compact mode</div>
              <div style={styles.settingDescription}>Reduce spacing for a more compact view</div>
            </div>
            <Toggle
              checked={appearance.compactMode}
              onChange={(checked) => onAppearanceUpdate?.({ compactMode: checked })}
            />
          </div>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Animations</div>
              <div style={styles.settingDescription}>Enable motion and transitions</div>
            </div>
            <Toggle
              checked={appearance.animationsEnabled}
              onChange={(checked) => onAppearanceUpdate?.({ animationsEnabled: checked })}
            />
          </div>
          <div style={{ ...styles.settingRow, ...styles.settingRowLast }}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>High contrast</div>
              <div style={styles.settingDescription}>Increase contrast for better visibility</div>
            </div>
            <Toggle
              checked={appearance.highContrastMode}
              onChange={(checked) => onAppearanceUpdate?.({ highContrastMode: checked })}
            />
          </div>
        </div>
      </div>
    </>
  );

  const renderPrivacySection = () => (
    <>
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Activity Status</h4>
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Show online status</div>
              <div style={styles.settingDescription}>Let others see when you're online</div>
            </div>
            <Toggle
              checked={privacy.showOnlineStatus}
              onChange={(checked) => onPrivacyUpdate?.({ showOnlineStatus: checked })}
            />
          </div>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Read receipts</div>
              <div style={styles.settingDescription}>Show when you've read messages</div>
            </div>
            <Toggle
              checked={privacy.showReadReceipts}
              onChange={(checked) => onPrivacyUpdate?.({ showReadReceipts: checked })}
            />
          </div>
          <div style={{ ...styles.settingRow, ...styles.settingRowLast }}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Typing indicator</div>
              <div style={styles.settingDescription}>Show when you're typing a message</div>
            </div>
            <Toggle
              checked={privacy.showTypingIndicator}
              onChange={(checked) => onPrivacyUpdate?.({ showTypingIndicator: checked })}
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Messaging</h4>
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Allow direct messages</div>
              <div style={styles.settingDescription}>Let anyone start a conversation with you</div>
            </div>
            <Toggle
              checked={privacy.allowDirectMessages}
              onChange={(checked) => onPrivacyUpdate?.({ allowDirectMessages: checked })}
            />
          </div>
          <div style={{ ...styles.settingRow, ...styles.settingRowLast }}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Allow channel invites</div>
              <div style={styles.settingDescription}>Let others add you to channels</div>
            </div>
            <Toggle
              checked={privacy.allowChannelInvites}
              onChange={(checked) => onPrivacyUpdate?.({ allowChannelInvites: checked })}
            />
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Data</h4>
        </div>
        <div style={styles.sectionContent}>
          <button style={styles.secondaryButton} onClick={onExportData}>
            <DownloadIcon />
            Export my data
          </button>
        </div>
      </div>
    </>
  );

  const renderSecuritySection = () => (
    <>
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Two-Factor Authentication</h4>
          <p style={styles.sectionDescription}>Add an extra layer of security to your account</p>
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.twoFactorRow}>
            <div style={styles.twoFactorStatus}>
              <SmartphoneIcon />
              <span style={styles.settingLabel}>Authenticator app</span>
              <span style={{
                ...styles.statusBadge,
                ...(privacy.twoFactorEnabled ? styles.statusBadgeEnabled : styles.statusBadgeDisabled),
              }}>
                {privacy.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <button style={styles.secondaryButton}>
              {privacy.twoFactorEnabled ? 'Manage' : 'Enable'}
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Password</h4>
        </div>
        <div style={styles.sectionContent}>
          <button style={styles.secondaryButton} onClick={onPasswordChange}>
            Change password
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div style={{ ...styles.section, ...styles.dangerZone }}>
        <div style={styles.sectionHeader}>
          <h4 style={{ ...styles.sectionTitle, color: 'var(--chatsdk-error)' }}>Danger Zone</h4>
          <p style={styles.sectionDescription}>Irreversible and destructive actions</p>
        </div>
        <div style={styles.sectionContent}>
          <button style={styles.dangerButton} onClick={onDeleteAccount}>
            <TrashIcon />
            Delete my account
          </button>
        </div>
      </div>
    </>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile': return renderProfileSection();
      case 'notifications': return renderNotificationsSection();
      case 'appearance': return renderAppearanceSection();
      case 'privacy': return renderPrivacySection();
      case 'security': return renderSecuritySection();
      default: return null;
    }
  };

  return (
    <div style={styles.container} className={clsx('chatsdk-settings-page', className)}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Settings</h2>
        </div>
        <nav style={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.id}
              style={{
                ...styles.navItem,
                ...(activeSection === item.id ? styles.navItemActive : {}),
              }}
              onClick={() => setActiveSection(item.id)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <button style={styles.logoutButton} onClick={onLogout}>
            <LogOutIcon />
            Log out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.contentHeader}>
          <h1 style={styles.contentTitle}>{sectionInfo[activeSection].title}</h1>
          <p style={styles.contentDescription}>{sectionInfo[activeSection].description}</p>
        </div>
        {renderSectionContent()}
      </div>
    </div>
  );
};

export default SettingsPage;
