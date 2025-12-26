/**
 * Search Screen
 * Full-text search across messages
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearch, useChatClient } from '@chatsdk/react-native';
import type { SearchResult } from '@chatsdk/react-native';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const client = useChatClient();

  const {
    results,
    loading,
    hasMore,
    loadMore,
    search,
    clear,
  } = useSearch();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        search(query.trim());
      } else {
        clear();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search, clear]);

  const handleResultPress = (result: SearchResult) => {
    router.push(`/channel/${result.channelId}`);
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultRow}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.avatarContainer}>
        {item.user?.image ? (
          <Image
            source={{ uri: item.user.image }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {(item.user?.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={styles.userName}>{item.user?.name || 'Unknown'}</Text>
          <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
        </View>

        <Text style={styles.channelName} numberOfLines={1}>
          in #{item.channelName || item.channelId}
        </Text>

        <Text style={styles.messageText} numberOfLines={2}>
          {highlightQuery(item.text, query)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.searchHeader}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search messages..."
                placeholderTextColor="#666"
                autoFocus
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />

      {loading && results.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#666" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyContainer}>
          {query.length >= 2 ? (
            <>
              <Ionicons name="search-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptyHint}>
                Try different keywords
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="search" size={64} color="#333" />
              <Text style={styles.emptyText}>Search messages</Text>
              <Text style={styles.emptyHint}>
                Type at least 2 characters to search
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          contentContainerStyle={styles.list}
          onEndReached={() => hasMore && loadMore()}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </Text>
          }
          ListFooterComponent={
            loading ? (
              <ActivityIndicator style={styles.loader} color="#666" />
            ) : null
          }
        />
      )}
    </View>
  );
}

function highlightQuery(text: string, query: string): string {
  // For React Native, we just return the text
  // In a real app, you might use a custom Text component with highlights
  return text;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyHint: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  list: {
    paddingTop: 8,
  },
  resultCount: {
    color: '#666',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  userName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  channelName: {
    color: '#007AFF',
    fontSize: 13,
    marginBottom: 6,
  },
  messageText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
  },
  loader: {
    padding: 20,
  },
});
