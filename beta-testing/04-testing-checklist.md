# ChatSDK 2.0 Beta Testing Checklist

**Print this out or keep it open in a separate window while testing!**

---

## Pre-Testing Setup

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] Chrome/Safari/Firefox browser ready
- [ ] 45 minutes of uninterrupted time blocked out
- [ ] Timer ready to track total time
- [ ] Screenshot tool ready (for bugs)
- [ ] Discord joined (#beta-testing channel)

---

## Part 1: Integration Test (30 min)

### Installation & Setup

- [ ] ⏱️ **START TIMER**
- [ ] Run `npx create-chatsdk-app@beta my-test-app`
- [ ] Choose: Next.js template, TypeScript: Yes
- [ ] Wait for installation to complete
- [ ] `cd my-test-app`
- [ ] Run `npm run dev`
- [ ] Server starts successfully
- [ ] Note any errors or warnings

**Time check:** Should be <5 minutes to here

---

### Basic Functionality

- [ ] Open http://localhost:3000?user=alice
- [ ] Open http://localhost:3000?user=bob (new tab)
- [ ] Both windows show chat interface
- [ ] Users are different (Alice vs Bob)

---

### Test 1: Send Messages

- [ ] Send "Hi Bob!" from Alice
- [ ] Message appears in Bob's window
- [ ] Reply "Hey Alice!" from Bob
- [ ] Message appears in Alice's window
- [ ] Send 5 messages rapidly from Alice
- [ ] All 5 appear in correct order
- [ ] Timestamps are correct

**Expected:** <1 second latency per message

---

### Test 2: File Upload

- [ ] Click 📎 button in Alice's window
- [ ] Upload small image (<1 MB)
- [ ] Image displays in both windows
- [ ] Try larger image (1-5 MB)
- [ ] Try PDF file
- [ ] Confirm file URLs are accessible

**Expected:** Upload completes in <5 seconds

---

### Test 3: Reactions

- [ ] Hover over a message in Bob's window
- [ ] Click 😊 reaction button
- [ ] Add 👍 reaction
- [ ] Reaction appears in Alice's window
- [ ] Click 👍 again to remove it
- [ ] Reaction disappears in both windows
- [ ] Add multiple different reactions

**Expected:** Instant reaction sync

---

### Test 4: Threads

- [ ] Hover over message in Alice's window
- [ ] Click "💬 Reply in thread"
- [ ] Thread view opens
- [ ] Type reply and send
- [ ] Reply appears in thread
- [ ] Open same thread from Bob's window
- [ ] Both threads show same replies
- [ ] Add reply from Bob
- [ ] Reply syncs to Alice

**Expected:** Thread UI is clear and intuitive

---

### Test 5: Channels

- [ ] Click "+ New Channel"
- [ ] Name: "general"
- [ ] Description: "General discussion"
- [ ] Click "Create"
- [ ] Channel appears in sidebar (both windows)
- [ ] Switch to new channel
- [ ] Send message in new channel
- [ ] Message only in this channel
- [ ] Switch back to original channel
- [ ] Previous messages still there

**Expected:** Clean channel switching

---

### Test 6: Offline Mode

- [ ] Send message from Alice (should work)
- [ ] Open DevTools (F12) → Network tab
- [ ] Check "Offline" checkbox
- [ ] Try to send message
- [ ] See "Offline" indicator
- [ ] Uncheck "Offline"
- [ ] Message sends automatically
- [ ] Message appears in Bob's window

**Expected:** Graceful offline handling

---

### Test 7: Network Resilience

- [ ] Toggle offline/online 5 times rapidly
- [ ] Send messages during toggles
- [ ] All messages eventually deliver
- [ ] No duplicate messages
- [ ] No lost messages

**Expected:** 100% message delivery

---

### Test 8: Server Restart

- [ ] Go to terminal
- [ ] Press Ctrl+C to stop server
- [ ] Run `npm run dev` again
- [ ] Refresh browser (both windows)
- [ ] Previous messages still visible
- [ ] Can send new messages
- [ ] WebSocket reconnects automatically

**Expected:** <2 second reconnection

---

### Test 9: DevTools Extension

- [ ] Add `?chatsdk_debug=true` to URL
- [ ] Refresh browser
- [ ] Open DevTools (F12)
- [ ] Click "ChatSDK" tab
- [ ] See DevTools panel

**Logs Tab:**
- [ ] Real-time logs appear
- [ ] Color-coded by level
- [ ] Expandable metadata
- [ ] Auto-scroll works

**Messages Tab:**
- [ ] All messages listed
- [ ] Expandable JSON view
- [ ] User info displayed
- [ ] Timestamps accurate

**State Tab:**
- [ ] Connection state shown
- [ ] User info visible
- [ ] Auto-refreshes

**Performance Tab:**
- [ ] Metrics table populated
- [ ] Min/Max/Avg shown
- [ ] Percentiles (p50, p95, p99)
- [ ] Auto-refreshes every 2s

**Toolbar:**
- [ ] Refresh button works
- [ ] Clear button clears logs
- [ ] Export downloads JSON
- [ ] Auto-scroll toggle works

**Expected:** DevTools is helpful for debugging

---

### Test 10: Error Handling

- [ ] Try to send empty message
- [ ] Error message is clear
- [ ] Try to upload 50 MB file
- [ ] Size limit error shown
- [ ] Try to upload .exe file
- [ ] File type error shown
- [ ] All errors include suggestions

**Expected:** Every error tells you how to fix it

---

### Final Checks

- [ ] ⏱️ **STOP TIMER** - Record total time
- [ ] Check console for errors (F12)
- [ ] Screenshot any bugs/errors
- [ ] Note confusing UI elements
- [ ] Note what you loved

**Time check:** Target is <30 minutes total

---

## Part 2: Feedback Survey (10 min)

- [ ] Go to survey link (in email)
- [ ] Answer all required questions
- [ ] Be honest (negative feedback welcome!)
- [ ] Include error screenshots/details
- [ ] Submit survey

---

## Part 3: Optional Challenges

### Challenge 1: Deploy to Vercel

- [ ] Run `npx vercel deploy`
- [ ] Follow prompts
- [ ] App deploys successfully
- [ ] Visit deployed URL
- [ ] App works in production

**Expected:** <5 minute deploy

---

### Challenge 2: Customize Theme

- [ ] Open `tailwind.config.js`
- [ ] Change primary color
- [ ] Save file
- [ ] See color change in browser
- [ ] Try different color schemes

**Expected:** Hot reload works

---

### Challenge 3: React Native Mobile

- [ ] Run `npx create-chatsdk-app@beta mobile-app`
- [ ] Choose "React Native (Expo)"
- [ ] `cd mobile-app`
- [ ] Run `npm run ios` or `npm run android`
- [ ] App opens in simulator
- [ ] Send messages from mobile
- [ ] Sync with desktop app

**Expected:** Mobile app works

---

### Challenge 4: HIPAA Mode

- [ ] Add to `.env`: `ENABLE_HIPAA_MODE=true`
- [ ] Add: `ENCRYPTION_KEY=32-char-key-here`
- [ ] Restart server
- [ ] Send messages
- [ ] Check database (messages encrypted)

**Expected:** Encryption works

---

## Bug Reporting Template

**If you find a bug, report it like this:**

```markdown
**Title:** [Short description]

**Priority:** P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- OS: macOS 14.2 / Windows 11 / Ubuntu 22.04
- Node: 20.10.0
- Browser: Chrome 120
- ChatSDK: 2.0.0-beta.1

**Screenshot:**
[Upload to Imgur and paste link]

**Console Errors:**
```
[Paste any console errors here]
```

**Additional Context:**
[Any other relevant info]
```

---

## After Testing

- [ ] Redeem ChatSDK Pro code (in email)
- [ ] Join Discord #beta-testing
- [ ] Share your experience
- [ ] Wait for launch announcement
- [ ] Get your swag! 🎁

---

## Quick Reference

**Keyboard Shortcuts:**
- F12: Open DevTools
- Ctrl+C: Stop server
- Cmd/Ctrl + Shift + R: Hard refresh

**Useful URLs:**
- App: http://localhost:3000
- Debug: http://localhost:3000?chatsdk_debug=true
- API: http://localhost:3001
- Docs: https://docs.chatsdk.dev

**Support:**
- Discord: #beta-testing
- Email: beta@chatsdk.dev
- Emergency: +1 (555) 123-4567

---

## Success Criteria

You've completed beta testing when:
- ✅ Finished all Part 1 tests
- ✅ Recorded total time
- ✅ Submitted feedback survey
- ✅ (Optional) Tried at least 1 challenge

**Thank you for being a beta tester!** 🙏
