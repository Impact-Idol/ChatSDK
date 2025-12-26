/**
 * Settings Tab
 * User profile and app settings
 */

import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import {
  useCurrentUser,
  usePresence,
  useConnectionState,
} from '@chatsdk/react-native';

export default function SettingsScreen() {
  const user = useCurrentUser();
  const connectionState = useConnectionState();
  const { isOnline, setOnline, setOffline } = usePresence();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await setOffline();
          await SecureStore.deleteItemAsync('chat_token');
          router.replace('/login');
        },
      },
    ]);
  };

  const togglePresence = async () => {
    if (isOnline) {
      await setOffline();
    } else {
      await setOnline();
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {user?.image ? (
            <Image source={{ uri: user.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={40} color="#666" />
            </View>
          )}
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{user?.name || 'Unknown User'}</Text>
        <Text style={styles.userId}>ID: {user?.id}</Text>

        <View style={styles.connectionBadge}>
          <View
            style={[
              styles.connectionDot,
              connectionState === 'connected'
                ? styles.connected
                : connectionState === 'connecting'
                ? styles.connecting
                : styles.disconnected,
            ]}
          />
          <Text style={styles.connectionText}>
            {connectionState === 'connected'
              ? 'Connected'
              : connectionState === 'connecting'
              ? 'Connecting...'
              : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Settings Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>

        <TouchableOpacity style={styles.settingRow} onPress={togglePresence}>
          <View style={styles.settingLeft}>
            <Ionicons
              name={isOnline ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={isOnline ? '#4CAF50' : '#666'}
            />
            <Text style={styles.settingText}>Online Status</Text>
          </View>
          <Text style={styles.settingValue}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <Text style={styles.settingText}>Push Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="volume-high-outline" size={24} color="#fff" />
            <Text style={styles.settingText}>Sound</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="moon-outline" size={24} color="#fff" />
            <Text style={styles.settingText}>Dark Mode</Text>
          </View>
          <Text style={styles.settingValue}>On</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="text-outline" size={24} color="#fff" />
            <Text style={styles.settingText}>Font Size</Text>
          </View>
          <Text style={styles.settingValue}>Default</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="information-circle-outline" size={24} color="#fff" />
            <Text style={styles.settingText}>Version</Text>
          </View>
          <Text style={styles.settingValue}>1.0.0</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="document-text-outline" size={24} color="#fff" />
            <Text style={styles.settingText}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="shield-outline" size={24} color="#fff" />
            <Text style={styles.settingText}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#ff4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>ChatSDK Demo</Text>
        <Text style={styles.footerText}>Built with @chatsdk/react-native</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  connecting: {
    backgroundColor: '#FFC107',
  },
  disconnected: {
    backgroundColor: '#ff4444',
  },
  connectionText: {
    fontSize: 13,
    color: '#888',
  },
  section: {
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#fff',
  },
  settingValue: {
    fontSize: 16,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#444',
  },
});
