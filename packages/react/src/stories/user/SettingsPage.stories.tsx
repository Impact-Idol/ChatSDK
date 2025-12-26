import type { Meta, StoryObj } from '@storybook/react';
import { SettingsPage, UserProfile, NotificationSettings, AppearanceSettings, PrivacySettings } from '../../components/user/SettingsPage';

const meta: Meta<typeof SettingsPage> = {
  title: 'User/SettingsPage',
  component: SettingsPage,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onProfileUpdate: (profile) => console.log('Profile updated:', profile),
    onNotificationsUpdate: (settings) => console.log('Notifications updated:', settings),
    onAppearanceUpdate: (settings) => console.log('Appearance updated:', settings),
    onPrivacyUpdate: (settings) => console.log('Privacy updated:', settings),
    onPasswordChange: () => console.log('Password change clicked'),
    onDeleteAccount: () => console.log('Delete account clicked'),
    onExportData: () => console.log('Export data clicked'),
    onLogout: () => console.log('Logout clicked'),
  },
};

export default meta;
type Story = StoryObj<typeof SettingsPage>;

const mockProfile: UserProfile = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  imageUrl: 'https://i.pravatar.cc/150?u=john',
  bio: 'Full-stack developer passionate about building great products. Love to learn new technologies and share knowledge with the community.',
  timezone: 'America/New_York',
  language: 'en',
};

const mockNotifications: NotificationSettings = {
  pushEnabled: true,
  emailEnabled: true,
  soundEnabled: true,
  desktopEnabled: true,
  mentionsOnly: false,
  quietHoursEnabled: false,
  digestFrequency: 'daily',
};

const mockAppearance: AppearanceSettings = {
  theme: 'light',
  fontSize: 'medium',
  compactMode: false,
  animationsEnabled: true,
  highContrastMode: false,
};

const mockPrivacy: PrivacySettings = {
  showOnlineStatus: true,
  showReadReceipts: true,
  showTypingIndicator: true,
  allowDirectMessages: true,
  allowChannelInvites: true,
  twoFactorEnabled: false,
};

export const Default: Story = {
  args: {
    profile: mockProfile,
    notifications: mockNotifications,
    appearance: mockAppearance,
    privacy: mockPrivacy,
  },
};

export const DarkTheme: Story = {
  args: {
    profile: mockProfile,
    notifications: mockNotifications,
    appearance: { ...mockAppearance, theme: 'dark' },
    privacy: mockPrivacy,
  },
};

export const TwoFactorEnabled: Story = {
  args: {
    profile: mockProfile,
    notifications: mockNotifications,
    appearance: mockAppearance,
    privacy: { ...mockPrivacy, twoFactorEnabled: true },
  },
};

export const MinimalNotifications: Story = {
  args: {
    profile: mockProfile,
    notifications: {
      ...mockNotifications,
      pushEnabled: true,
      emailEnabled: false,
      soundEnabled: false,
      desktopEnabled: false,
      mentionsOnly: true,
    },
    appearance: mockAppearance,
    privacy: mockPrivacy,
  },
};

export const PrivacyFocused: Story = {
  args: {
    profile: mockProfile,
    notifications: mockNotifications,
    appearance: mockAppearance,
    privacy: {
      showOnlineStatus: false,
      showReadReceipts: false,
      showTypingIndicator: false,
      allowDirectMessages: false,
      allowChannelInvites: false,
      twoFactorEnabled: true,
    },
  },
};

export const NoAvatar: Story = {
  args: {
    profile: { ...mockProfile, imageUrl: undefined },
    notifications: mockNotifications,
    appearance: mockAppearance,
    privacy: mockPrivacy,
  },
};
