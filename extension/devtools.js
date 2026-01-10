// Create ChatSDK panel in DevTools
chrome.devtools.panels.create(
  'ChatSDK',
  'icons/icon16.png',
  'panel.html',
  (panel) => {
    console.log('ChatSDK DevTools panel created');
  }
);
