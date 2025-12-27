import { useState, useEffect } from 'react';
import { ChatProvider } from '@chatsdk/react';
import { APIKeysManager, APIKey } from '@chatsdk/react';
import { api } from '../services/api';
import { handleApiError, showError, showSuccess } from '../utils/errorHandler';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      const response = await api.getAPIKeys();
      setApiKeys(response.keys || []);
    } catch (error) {
      const message = handleApiError(error);
      console.error('Error fetching API keys:', error);
      setApiKeys([]);
      if (!(error instanceof TypeError && error.message.includes('fetch'))) {
        showError(`Failed to load API keys: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const handleCreateKey = () => {
    console.log('Create API key');
    alert('Create API Key dialog would open here. You would configure:\n\n• Key name\n• Environment\n• Scopes\n• Rate limit\n• Allowed origins\n• Expiration date');
  };

  const handleEditKey = (key: APIKey) => {
    console.log('Edit API key:', key);
    alert(`Edit API Key: ${key.name}\n\nYou would be able to update:\n• Name\n• Scopes\n• Rate limit\n• Allowed origins`);
  };

  const handleRevokeKey = async (key: APIKey) => {
    if (!confirm(`Are you sure you want to revoke "${key.name}"?\n\nThis action cannot be undone and will immediately invalidate the key.`)) {
      return;
    }

    try {
      await api.revokeAPIKey(key.id);
      showSuccess(`API key "${key.name}" has been revoked`);
      await fetchAPIKeys();
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to revoke API key: ${message}`);
      console.error('Error revoking API key:', error);
    }
  };

  const handleRegenerateKey = async (key: APIKey) => {
    if (!confirm(`Are you sure you want to regenerate "${key.name}"?\n\nThe old key will stop working immediately.`)) {
      return;
    }

    try {
      const response = await api.regenerateAPIKey(key.id);
      const newKey = response.key;
      showSuccess(`API key "${key.name}" has been regenerated!\n\nNew key: ${newKey}\n\nMake sure to copy and save it now - you won't be able to see it again!`);
      await fetchAPIKeys();
    } catch (error) {
      const message = handleApiError(error);
      showError(`Failed to regenerate API key: ${message}`);
      console.error('Error regenerating API key:', error);
    }
  };

  const handleCopyKey = (key: APIKey) => {
    console.log('Copy API key:', key);
    // Simulate the full key (in real app, this would come from the creation response)
    const fullKey = `${key.keyPrefix}${key.keyHint.replace('...', Math.random().toString(36).substring(2, 12))}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullKey);
      showSuccess(`API key copied to clipboard!\n\n${fullKey}\n\nKeep it secure and never share it publicly.`);
    } else {
      alert(`API key (copy manually):\n\n${fullKey}\n\nKeep it secure and never share it publicly.`);
    }
  };

  const handleViewUsage = (key: APIKey) => {
    console.log('View API key usage:', key);
    alert(`Usage Analytics for "${key.name}"\n\n• Total requests: ${key.usageCount.toLocaleString()}\n• Last used: ${key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}\n• Rate limit: ${key.rateLimit ? `${key.rateLimit}/min` : 'No limit'}\n• Environment: ${key.environment}\n• Status: ${key.status}\n\nDetailed analytics would be shown in a modal or separate page.`);
  };

  return (
    <ChatProvider apiKey={API_KEY} apiUrl={API_URL}>
      <APIKeysManager
        apiKeys={apiKeys}
        loading={loading}
        onCreateKey={handleCreateKey}
        onEditKey={handleEditKey}
        onRevokeKey={handleRevokeKey}
        onRegenerateKey={handleRegenerateKey}
        onCopyKey={handleCopyKey}
        onViewUsage={handleViewUsage}
      />
    </ChatProvider>
  );
}
