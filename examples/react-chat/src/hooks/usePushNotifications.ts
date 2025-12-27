/**
 * Push Notifications Hook
 * Handles Web Push subscription and permission management
 */

import { useState, useEffect, useCallback } from 'react';

interface PushNotificationState {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  loading: boolean;
  error: string | null;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5500';

export function usePushNotifications(token: string | null) {
  const [state, setState] = useState<PushNotificationState>({
    supported: false,
    permission: 'unsupported',
    subscribed: false,
    loading: false,
    error: null,
  });

  // Check support and current permission on mount
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    const permission = supported ? Notification.permission : 'unsupported';

    setState((prev) => ({
      ...prev,
      supported,
      permission,
    }));

    // Register service worker
    if (supported) {
      registerServiceWorker();
    }
  }, []);

  // Check if already subscribed
  useEffect(() => {
    if (state.supported && state.permission === 'granted') {
      checkSubscription();
    }
  }, [state.supported, state.permission]);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered:', registration);
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  };

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState((prev) => ({ ...prev, subscribed: !!subscription }));
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.supported) return false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({
        ...prev,
        permission,
        loading: false,
      }));
      return permission === 'granted';
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to request notification permission',
      }));
      return false;
    }
  }, [state.supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.supported || !token) return false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Request permission if not already granted
      if (state.permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'Notification permission denied',
          }));
          return false;
        }
      }

      // Get VAPID public key from server
      const vapidResponse = await fetch(`${API_BASE}/api/webpush/vapid-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!vapidResponse.ok) {
        throw new Error('Web Push not available on server');
      }

      const { publicKey } = await vapidResponse.json();

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const subscribeResponse = await fetch(`${API_BASE}/api/webpush/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!subscribeResponse.ok) {
        throw new Error('Failed to register subscription with server');
      }

      setState((prev) => ({
        ...prev,
        subscribed: true,
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error('Push subscription error:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Subscription failed',
      }));
      return false;
    }
  }, [state.supported, state.permission, token, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!token) return false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push
        await subscription.unsubscribe();

        // Tell server to remove subscription
        await fetch(`${API_BASE}/api/webpush/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setState((prev) => ({
        ...prev,
        subscribed: false,
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error('Push unsubscription error:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unsubscription failed',
      }));
      return false;
    }
  }, [token]);

  const testNotification = useCallback(async (): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE}/api/webpush/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Test notification error:', error);
      return false;
    }
  }, [token]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
