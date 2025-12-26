/**
 * Contacts Tab
 * Shows channel members and their online status
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useChatClient,
  useUserPresence,
  formatLastSeen,
} from '@chatsdk/react-native';

interface Contact {
  id: string;
  name: string;
  image: string | null;
}

export default function ContactsScreen() {
  const client = useChatClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      // In a real app, you'd have a contacts/users endpoint
      // For demo, we'll show current user
      if (client.user) {
        setContacts([
          {
            id: client.user.id,
            name: client.user.name,
            image: client.user.image,
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [client.user]);

  const renderContact = ({ item }: { item: Contact }) => (
    <ContactRow contact={item} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchContacts}
            tintColor="#fff"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>No contacts yet</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  const { online, lastSeen, loading } = useUserPresence(contact.id);

  return (
    <TouchableOpacity style={styles.contactRow}>
      <View style={styles.avatarContainer}>
        {contact.image ? (
          <Image source={{ uri: contact.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {contact.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.presenceIndicator,
            online ? styles.online : styles.offline,
          ]}
        />
      </View>

      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.statusText}>
          {loading
            ? 'Loading...'
            : online
            ? 'Online'
            : `Last seen ${formatLastSeen(lastSeen)}`}
        </Text>
      </View>

      <Ionicons name="chatbubble-outline" size={24} color="#666" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  list: {
    flexGrow: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  presenceIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000',
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#666',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 13,
    color: '#666',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
});
