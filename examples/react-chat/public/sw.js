/**
 * ChatSDK Service Worker
 * Handles push notifications and caching for the React example app
 */

// Cache name for offline support
const CACHE_NAME = 'chatsdk-v1';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);

    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/icons/chat-icon-192.png',
      badge: data.badge || '/icons/chat-badge-72.png',
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
      vibrate: [100, 50, 100],
      requireInteraction: true,
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'ChatSDK', options)
    );
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);

  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Handle different actions
  if (action === 'reply') {
    // Open the channel and focus on input
    const url = data.url ? `${data.url}?focus=input` : '/';
    event.waitUntil(openOrFocusWindow(url));
  } else if (action === 'view' || action === 'join') {
    // Open the channel
    const url = data.url || '/';
    event.waitUntil(openOrFocusWindow(url));
  } else if (action === 'dismiss') {
    // Just close the notification (already done above)
    return;
  } else {
    // Default: open the relevant page
    const url = data.url || '/';
    event.waitUntil(openOrFocusWindow(url));
  }
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

// Helper function to open or focus window
async function openOrFocusWindow(url) {
  const fullUrl = new URL(url, self.location.origin).href;

  // Check if there's already a window/tab open
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Try to find an existing window
  for (const client of windowClients) {
    if (client.url === fullUrl) {
      // Found matching window - focus it
      return client.focus();
    }
  }

  // Try to find any open window for our origin
  for (const client of windowClients) {
    if (new URL(client.url).origin === self.location.origin) {
      // Navigate existing window and focus
      await client.navigate(fullUrl);
      return client.focus();
    }
  }

  // No existing window - open new one
  return clients.openWindow(fullUrl);
}

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync event (for offline message queue)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'send-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

// Sync pending messages when back online
async function syncPendingMessages() {
  // In a full implementation, this would:
  // 1. Open IndexedDB
  // 2. Get pending messages from offline queue
  // 3. Send them to the server
  // 4. Update message status
  console.log('[SW] Syncing pending messages...');
}

// Push subscription change event
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed:', event);

  event.waitUntil(
    (async () => {
      try {
        // Re-subscribe with the same options
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: event.oldSubscription.options.applicationServerKey,
        });

        // Notify the server about the new subscription
        // This would typically call your API to update the subscription
        console.log('[SW] Re-subscribed:', subscription);
      } catch (error) {
        console.error('[SW] Failed to re-subscribe:', error);
      }
    })()
  );
});
