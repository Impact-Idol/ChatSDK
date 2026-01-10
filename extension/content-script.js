// Content script to inject into the page and communicate with ChatSDK

// Listen for ChatSDK events from page
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHATSDK_LOG') {
    // Forward to DevTools panel
    chrome.runtime.sendMessage({
      type: 'CHATSDK_LOG',
      payload: event.data.payload,
    });
  }
});

// Inject bridge script to access ChatSDK instance
const script = document.createElement('script');
script.textContent = `
  // Expose ChatSDK methods to DevTools
  window.__CHATSDK_DEVTOOLS__ = {
    getState: () => {
      if (window.__CHATSDK__) {
        return {
          connectionState: window.__CHATSDK__.getConnectionState?.(),
          isConnected: window.__CHATSDK__.isConnected?.(),
          userInfo: window.__CHATSDK__.getCurrentUser?.(),
        };
      }
      return null;
    },
    getLogs: () => {
      return window.__CHATSDK_LOGGER__?.getLogs?.() || [];
    },
    getMessages: () => {
      return window.__CHATSDK__?.messages?.getAll?.() || [];
    },
    getMetrics: () => {
      return window.__CHATSDK_PROFILER__?.getAllStats?.() || new Map();
    },
    clearLogs: () => {
      window.__CHATSDK_LOGGER__?.clearLogs?.();
    },
    exportLogs: () => {
      return window.__CHATSDK_LOGGER__?.exportLogs?.() || '[]';
    },
  };
`;
document.documentElement.appendChild(script);
script.remove();

console.log('ChatSDK DevTools bridge injected');
