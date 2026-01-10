// Background service worker for ChatSDK DevTools
chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatSDK DevTools installed');
});

// Relay messages between content script and devtools panel
const connections = {};

chrome.runtime.onConnect.addListener((port) => {
  const extensionListener = (message, sender, sendResponse) => {
    // Forward message to the appropriate panel
    if (message.tabId && connections[message.tabId]) {
      connections[message.tabId].postMessage(message);
    }
  };

  port.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener(() => {
    port.onMessage.removeListener(extensionListener);
  });
});
