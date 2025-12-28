# React App Testing Guide

## 🎉 Your React Chat App is Running!

**URL**: http://localhost:3000

The app should now be open in your browser.

## 🧪 What to Test

### 1. **Basic Chat Features**
- ✅ Send messages
- ✅ View message history
- ✅ Real-time message updates
- ✅ Channel switching
- ✅ User presence

### 2. **New Features (Phase 2)**
- ✅ **Polls** - Create and vote on polls
- ✅ **Workspaces** - Switch between workspaces
- ✅ **File Uploads** - Upload images with blurhash progressive loading

### 3. **Real-time Features**
- ✅ Typing indicators
- ✅ Message reactions
- ✅ Read receipts
- ✅ Live presence updates

### 4. **Impact Idol Theme**
The app uses the custom Impact Idol theme:
- Purple (#8b5cf6) - Primary
- Orange (#f97316) - Secondary
- Green (#10b981) - Success

## 🔧 Configuration

The React app connects to:
- **API**: http://localhost:5501
- **WebSocket**: ws://localhost:8001

All services are running and healthy!

## 📊 Monitor Performance

While testing, you can monitor:

1. **API Metrics**: http://localhost:5501/metrics
2. **Grafana Dashboard**: http://localhost:3001 (admin/admin)
3. **Prometheus**: http://localhost:9091

## 🎯 Quick Test Scenarios

### Scenario 1: Complete Chat Flow
1. Open the app (should be open now)
2. Create a new channel
3. Send some messages
4. Try @mentions
5. Add reactions to messages
6. Upload an image (notice blurhash loading)

### Scenario 2: Polls
1. Click "Create Poll" or similar button
2. Add poll question and options
3. Submit the poll
4. Vote on the poll
5. See results update in real-time

### Scenario 3: Workspaces
1. Click workspace switcher
2. Create a new workspace
3. Switch between workspaces
4. Notice channels update

### Scenario 4: Real-time Collaboration
1. Open the app in two browser tabs
2. Send message in one tab
3. See it appear instantly in the other
4. Try typing indicators
5. Test presence (online/offline)

## 🐛 Troubleshooting

### App Not Loading?
```bash
# Check if dev server is running
curl http://localhost:3000
```

### API Not Responding?
```bash
# Check API health
curl http://localhost:5501/health
```

### WebSocket Not Connecting?
```bash
# Check Centrifugo
curl http://localhost:8001/health
```

## 🔄 Restart the App

If you need to restart:
```bash
# Stop the dev server
# (Find the process with port 3000)
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill

# Start again
cd examples/react-chat
npm run dev -- --port 3000
```

## 📝 View Logs

To see what's happening:
```bash
# API logs
docker logs -f chatsdk-test-api

# All service logs
docker-compose -f docker-compose.test.yml logs -f

# Dev server logs (in the terminal where it's running)
```

## 🎨 Customization

Try editing the app while it's running (hot reload enabled):

**Change theme:**
```tsx
// examples/react-chat/src/App.tsx
import { impactIdolTheme, darkTheme } from '@chatsdk/react';

// Switch to dark theme
<ChatProvider theme={darkTheme} ... >
```

**Add custom components:**
```tsx
// Your custom components will hot-reload automatically
```

## 📱 Mobile Testing

The app is mobile-responsive! Try:
1. Open DevTools (F12 / Cmd+Option+I)
2. Toggle device toolbar (Cmd+Shift+M)
3. Select iPhone or Android device
4. Test mobile UI

## 🚀 Features to Test

| Feature | Location | Status |
|---------|----------|--------|
| Send Messages | Message input at bottom | ✅ |
| View Channels | Left sidebar | ✅ |
| User Presence | User avatars | ✅ |
| Typing Indicators | Above message input | ✅ |
| Message Reactions | Hover over message | ✅ |
| File Upload | Attach button | ✅ |
| Create Polls | Message actions | ✅ |
| Workspace Switcher | Top navigation | ✅ |
| Search | Search bar | ✅ |
| Settings | User menu | ✅ |

## 💡 Tips

1. **Open DevTools** to see React state and API calls
2. **Network tab** shows WebSocket messages in real-time
3. **Console** shows any errors or warnings
4. **React DevTools** extension recommended for debugging

## 🎯 Success Criteria

You should be able to:
- ✅ See the chat interface load
- ✅ Send and receive messages
- ✅ Create and vote on polls
- ✅ Switch workspaces
- ✅ Upload files with blurhash
- ✅ See real-time updates
- ✅ View metrics in Grafana

## 📞 Need Help?

Check these resources:
- **API Documentation**: DEPLOYMENT_INFO.md
- **React Client Guide**: REACT_CLIENT_STATUS.md
- **Integration Guide**: examples/impact-idol/README.md
- **Production Deployment**: docs/production/

---

**Happy Testing!** 🎉

The React app is now ready for you to explore all features.
