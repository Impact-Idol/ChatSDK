// ChatSDK DevTools Popup Script

// Check if debug mode is enabled on current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    const url = new URL(tabs[0].url);
    const hasDebugParam = url.searchParams.get('chatsdk_debug') === 'true';

    // Execute script to check localStorage
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: () => localStorage.getItem('chatsdk_debug') === 'true',
      },
      (results) => {
        const hasDebugStorage = results && results[0] && results[0].result;
        const isDebugMode = hasDebugParam || hasDebugStorage;

        const debugStatus = document.getElementById('debug-status');
        if (isDebugMode) {
          debugStatus.textContent = 'Enabled';
          debugStatus.classList.add('active');
          debugStatus.classList.remove('inactive');
        } else {
          debugStatus.textContent = 'Disabled';
          debugStatus.classList.add('inactive');
          debugStatus.classList.remove('active');
        }
      }
    );
  }
});
