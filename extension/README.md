# ChatSDK DevTools Chrome Extension

A powerful Chrome DevTools extension for debugging and inspecting ChatSDK applications in real-time.

## Features

### 📝 Real-time Logging
- Color-coded log levels (DEBUG, INFO, WARN, ERROR)
- Structured logging with module and action context
- Metadata and error stack trace inspection
- Auto-scroll and export capabilities

### 💬 Message Inspection
- View all sent and received messages
- Inspect full message JSON payloads
- See sender info and timestamps
- Filter and search messages

### 🌐 Network Monitoring
- Track WebSocket connections
- Monitor API requests/responses
- View request/response payloads
- Measure request duration

### 🔧 State Inspector
- Real-time SDK state visualization
- Connection status monitoring
- User session information
- Configuration viewer

### 📊 Performance Profiling
- Detailed performance metrics
- Min/Max/Avg duration tracking
- Percentile analysis (p50, p95, p99)
- Operation count and total time

## Installation

### For Development (Local Testing)

1. **Clone/Download the extension:**
   ```bash
   cd /path/to/ChatSDK/extension
   ```

2. **Generate icon files (if not present):**
   ```bash
   cd icons
   ./create_placeholders.sh
   ```

3. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension/` directory
   - The ChatSDK DevTools extension should now appear

4. **Verify installation:**
   - Look for the ChatSDK icon in the toolbar
   - Open DevTools (F12) on any page
   - You should see a "ChatSDK" tab

### For Production (Chrome Web Store)

*Coming soon - extension will be published to Chrome Web Store*

## Usage

### Quick Start

1. **Enable Debug Mode:**

   Add query parameter to your application URL:
   ```
   http://localhost:3000?chatsdk_debug=true
   ```

   Or set in localStorage:
   ```javascript
   localStorage.setItem('chatsdk_debug', 'true');
   ```

2. **Open DevTools:**
   - Press F12 (Windows/Linux) or Cmd+Option+I (Mac)
   - Click the "ChatSDK" tab

3. **Inspect Your Application:**
   - View real-time logs
   - Inspect messages
   - Monitor network activity
   - Check performance metrics

### Toolbar Actions

- **🔄 Refresh** - Reload current tab data
- **🗑️ Clear** - Clear all logs (with confirmation)
- **💾 Export** - Download logs as JSON file
- **Auto-scroll** - Toggle automatic scrolling for new logs

### Tab Navigation

- **📝 Logs** - Real-time log streaming with context
- **💬 Messages** - Message history with JSON inspection
- **🌐 Network** - Network requests and WebSocket activity
- **🔧 State** - Current SDK state as JSON tree
- **📊 Performance** - Performance metrics table

### Performance Tab

View detailed metrics for all tracked operations:
| Metric | Description |
|--------|-------------|
| Count | Number of times operation executed |
| Min | Fastest execution time |
| Max | Slowest execution time |
| Avg | Average execution time |
| P50 | 50th percentile (median) |
| P95 | 95th percentile |
| P99 | 99th percentile |

## Integration with ChatSDK

The extension automatically detects ChatSDK instances when debug mode is enabled. It looks for:

```javascript
window.__CHATSDK__           // Main SDK instance
window.__CHATSDK_LOGGER__    // Logger instance
window.__CHATSDK_PROFILER__  // Profiler instance
window.__CHATSDK_DEVTOOLS__  // DevTools bridge
```

### Enabling Debug Mode in Your App

**Via Query Parameter:**
```javascript
// Check if debug mode should be enabled
const params = new URLSearchParams(window.location.search);
if (params.get('chatsdk_debug') === 'true') {
  logger.setLevel(LogLevel.DEBUG);
}
```

**Via localStorage:**
```javascript
// Enable persistent debug mode
localStorage.setItem('chatsdk_debug', 'true');
```

**Programmatically:**
```javascript
import { logger, LogLevel } from '@chatsdk/core';

logger.setLevel(LogLevel.DEBUG);
```

## Development

### File Structure

```
extension/
├── manifest.json          # Extension configuration
├── devtools.html          # DevTools entry point
├── devtools.js            # DevTools panel registration
├── background.js          # Service worker for message relay
├── content-script.js      # Injected bridge to page context
├── panel.html             # Main panel UI
├── panel.js               # Panel logic and rendering
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── icons/                 # Extension icons
│   ├── icon16.png         # 16×16 toolbar icon
│   ├── icon48.png         # 48×48 management icon
│   ├── icon128.png        # 128×128 store icon
│   ├── icon.svg           # Source SVG
│   └── README.md          # Icon generation guide
└── README.md              # This file
```

### Message Flow

```
┌─────────────────┐
│   Web Page      │
│  (ChatSDK App)  │
└────────┬────────┘
         │ window.postMessage()
         ↓
┌─────────────────┐
│ Content Script  │
│  (Injected)     │
└────────┬────────┘
         │ chrome.runtime.sendMessage()
         ↓
┌─────────────────┐
│ Background      │
│ Service Worker  │
└────────┬────────┘
         │ port.postMessage()
         ↓
┌─────────────────┐
│  DevTools Panel │
│   (panel.js)    │
└─────────────────┘
```

### Building for Production

1. **Update version in manifest.json:**
   ```json
   "version": "2.0.1"
   ```

2. **Generate production icons:**
   ```bash
   cd icons
   # Use ImageMagick or design tool to create high-quality PNGs
   convert icon.svg -resize 16x16 icon16.png
   convert icon.svg -resize 48x48 icon48.png
   convert icon.svg -resize 128x128 icon128.png
   ```

3. **Create ZIP archive:**
   ```bash
   cd extension
   zip -r chatsdk-devtools.zip . -x "*.git*" -x "*node_modules*" -x "*.DS_Store"
   ```

4. **Upload to Chrome Web Store:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Create new item or update existing
   - Upload `chatsdk-devtools.zip`
   - Fill in store listing details
   - Submit for review

## Troubleshooting

### Extension Not Showing Up

- Check that "Developer mode" is enabled in `chrome://extensions/`
- Verify extension is enabled (toggle should be blue)
- Try reloading the extension (click reload icon)

### "ChatSDK not detected" Message

- Ensure debug mode is enabled (`?chatsdk_debug=true`)
- Check that ChatSDK is properly initialized
- Verify `window.__CHATSDK__` exists in console
- Refresh the page after enabling debug mode

### Logs Not Appearing

- Check that logger level is set to DEBUG
- Verify content script is injected (check Sources tab)
- Look for errors in extension service worker (click "service worker" link in extensions page)
- Check browser console for postMessage errors

### Performance Metrics Empty

- Ensure profiler is enabled in debug mode
- Check that operations are being tracked
- Verify `window.__CHATSDK_PROFILER__` exists
- Try performing some SDK operations first

### Export Not Working

- Check browser download settings
- Verify popup blocker isn't blocking download
- Look for download in browser's download manager
- Check console for blob/download errors

## Privacy & Permissions

This extension requires the following permissions:

- **storage** - Save user preferences (e.g., auto-scroll setting)
- **scripting** - Execute scripts to check debug mode status
- **activeTab** - Access current tab URL for debug mode detection
- **devtools** - Create the ChatSDK panel in Chrome DevTools

**Data Privacy:**
- All data stays local - nothing is sent to external servers
- Logs are stored in memory only (cleared on page refresh)
- No user data is collected or transmitted
- No analytics or tracking

## Support

- **Documentation:** https://docs.chatsdk.dev
- **GitHub Issues:** https://github.com/chatsdk/chatsdk/issues
- **Discord Community:** https://discord.gg/chatsdk

## License

MIT License - Same as ChatSDK core library

## Version History

### v2.0.0 (2025-01-09)
- Initial release
- Real-time logging with structured context
- Message inspection with JSON viewer
- Network monitoring (planned)
- State inspector with auto-refresh
- Performance profiling with percentile metrics
- Export logs to JSON
- Auto-scroll toggle
- Clean, modern UI
