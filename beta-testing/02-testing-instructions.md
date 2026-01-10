# Beta Testing Instructions

**Subject:** ChatSDK 2.0 Beta Testing - Let's Go! 🚀

---

Hi {{FIRST_NAME}},

Welcome to the ChatSDK 2.0 beta! You're one of 20 developers helping us validate the biggest update in ChatSDK history.

**Your mission:** Build a working chat app from scratch and give us honest feedback.

⏱️ **Target time:** 30-45 minutes (we're tracking this!)

---

## Part 1: Integration Test (30 minutes)

### Step 1: Install Prerequisites ✅

Make sure you have:
```bash
node --version  # Should be v18 or higher
npm --version   # Should be v9 or higher
```

If not, install from [nodejs.org](https://nodejs.org)

---

### Step 2: Create Your Chat App (2 minutes)

Run this single command:

```bash
npx create-chatsdk-app@beta my-test-app
```

**Choose these options:**
- Template: `Next.js (Recommended)`
- TypeScript: `Yes`
- Install dependencies: `Yes`

⏱️ **Start your timer now!** We want to know how long this takes.

---

### Step 3: Start Development Server (1 minute)

```bash
cd my-test-app
npm run dev
```

You should see:
```
✨ ChatSDK Development Server
✅ All services running

App: http://localhost:3000
API: http://localhost:3001
WebSocket: ws://localhost:8000

API Key: dev-12345-67890
Press Ctrl+C to stop
```

If you see errors, **take a screenshot** and continue to Part 2 survey.

---

### Step 4: Open Two Browser Windows (2 minutes)

**Window 1 (Alice):**
```
http://localhost:3000?user=alice
```

**Window 2 (Bob):**
```
http://localhost:3000?user=bob
```

You should see two chat windows with different users.

---

### Step 5: Test Basic Messaging (5 minutes)

**Try these actions:**

1. **Send a message from Alice to Bob**
   - Type "Hi Bob!" in Alice's window
   - Press Enter or click Send
   - ✅ Message should appear in Bob's window within 1 second

2. **Reply from Bob to Alice**
   - Type "Hey Alice!" in Bob's window
   - ✅ Should appear in Alice's window

3. **Send multiple messages quickly**
   - Send 5 messages rapidly from Alice
   - ✅ All should appear in order in Bob's window

**Problems?** Note them for the survey.

---

### Step 6: Test File Upload (3 minutes)

1. Click the **📎 Attach** button in Alice's window
2. Select an image file (PNG, JPG)
3. ✅ Image should upload and display in both windows

**Try:**
- Small image (<1 MB)
- Larger image (1-5 MB)
- PDF file

**Note:** If upload fails, check console for errors (F12).

---

### Step 7: Test Reactions (2 minutes)

1. Hover over a message in Bob's window
2. Click the **😊** reaction button
3. Select a reaction (👍, ❤️, 😂, etc.)
4. ✅ Reaction should appear on the message in both windows

**Try:**
- Adding multiple reactions to one message
- Removing a reaction (click it again)

---

### Step 8: Test Threads (3 minutes)

1. Hover over a message in Alice's window
2. Click **💬 Reply in thread**
3. Type a reply
4. ✅ Thread should open with your reply

**Try:**
- Adding multiple replies to a thread
- Opening the thread from Bob's window
- ✅ All replies should sync in real-time

---

### Step 9: Create a New Channel (2 minutes)

1. Click **+ New Channel** button
2. Enter channel name: "general"
3. Enter description: "General discussion"
4. Click **Create**
5. ✅ Channel should appear in both Alice and Bob's sidebar

**Try:**
- Switching between channels
- Sending messages in the new channel
- ✅ Messages should only appear in that channel

---

### Step 10: Test Network Resilience (5 minutes)

This is the fun part - try to break it! 😈

**Test 1: Offline Mode**
1. Send a message from Alice
2. **Open DevTools (F12) → Network tab → Check "Offline"**
3. Try to send a message
4. ✅ Should show "Offline" indicator
5. **Uncheck "Offline"**
6. ✅ Message should send automatically

**Test 2: Rapid Connection Toggle**
1. Toggle offline/online 5 times quickly
2. Send messages between toggles
3. ✅ All messages should eventually send

**Test 3: Server Restart**
1. Go back to your terminal
2. Press **Ctrl+C** to stop the server
3. Run `npm run dev` again
4. ✅ App should reconnect and show all previous messages

---

### Step 11: Test Developer Tools (5 minutes)

**Enable Debug Mode:**

1. Add `?chatsdk_debug=true` to your URL:
   ```
   http://localhost:3000?user=alice&chatsdk_debug=true
   ```

2. **Open DevTools (F12)**
3. Look for a **"ChatSDK"** tab
4. Click it to open the DevTools panel

**Explore the panels:**
- **📝 Logs:** Real-time SDK logs
- **💬 Messages:** All sent/received messages
- **🔧 State:** Current SDK state
- **📊 Performance:** Performance metrics

**Try:**
- Send a message and watch it appear in Logs tab
- Check Performance tab for timing metrics
- Export logs with the **💾 Export** button

---

### Step 12: Stop Timer! ⏱️

**How long did it take?**

Remember this number for the survey.

Target: <30 minutes from Step 2 to Step 11.

---

## Part 2: Feedback Survey (10 minutes)

**Survey link:** https://forms.gle/chatsdk-beta-v2-feedback

### Survey Questions Preview:

1. How long did the full integration take? (minutes)
2. Did you encounter any errors?
3. If yes, what errors? (open text)
4. Rate the CLI experience (1-5 stars)
5. Rate the documentation (1-5 stars)
6. Rate the error messages (1-5 stars)
7. What was confusing or frustrating? (open text)
8. What did you love? (open text)
9. Would you use ChatSDK 2.0 in production? (Yes/No/Maybe)
10. Why or why not? (open text)
11. How does it compare to competitors? (Much better/Better/Same/Worse)
12. What's your #1 feature request? (open text)
13. Can we interview you? (30 min, $100 gift card)
14. Any other feedback? (open text)

**Please be brutally honest!** We want to know what's broken, confusing, or frustrating. Your candid feedback helps thousands of developers.

---

## Part 3: Optional Challenges (1-2 hours)

### Challenge 1: Deploy to Vercel

```bash
npx vercel deploy
```

Follow the prompts. Your app should be live in ~2 minutes!

### Challenge 2: Customize UI Theme

Edit `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#8B5CF6',  // Purple
        secondary: '#EC4899', // Pink
      },
    },
  },
};
```

See the theme change in real-time!

### Challenge 3: Mobile App (React Native)

```bash
npx create-chatsdk-app@beta my-mobile-app
# Choose "React Native (Expo)" template

cd my-mobile-app
npm run ios  # or npm run android
```

Test the mobile app with your desktop app!

### Challenge 4: Enable HIPAA Compliance

Add to your `.env`:

```bash
ENABLE_HIPAA_MODE=true
ENCRYPTION_KEY=your-32-char-key-here
```

Restart the server. All messages now encrypted!

---

## Getting Help

**Stuck? We're here to help!**

**Discord:** Join #beta-testing channel
- Response time: <30 minutes (Mon-Fri 9am-5pm PT)

**Email:** beta@chatsdk.dev
- Response time: <2 hours

**GitHub Issues:** For bugs, create an issue
- Tag with `beta-2.0` label
- Include error logs and screenshots

---

## Timeline Reminder

- **Today (Mon Jan 13):** Start testing
- **Wednesday (Jan 15):** Mid-week check-in (optional call)
- **Friday (Jan 17):** Final feedback due by 5pm PT
- **Monday (Jan 20):** ChatSDK 2.0 launches! 🎉

---

## Redeem Your ChatSDK Pro Code

**Your exclusive code:** `{{PRO_CODE}}`

**After you complete the survey:**
1. Go to https://dashboard.chatsdk.dev/billing
2. Click "Redeem Code"
3. Enter: `{{PRO_CODE}}`
4. Enjoy 3 months of ChatSDK Pro! 🎉

**Pro includes:**
- Unlimited messages
- Priority support
- Advanced analytics
- Custom branding
- 99.99% SLA

---

## Thank You! 🙏

You're helping shape what thousands of developers will use. We're incredibly grateful for your time and feedback.

**Questions?** Just reply to this email.

**Let's make ChatSDK 2.0 amazing!**

**The ChatSDK Team**

---

P.S. Found a critical bug? **Text us immediately:** +1 (555) 123-4567. We'll fix it ASAP!

---

## Troubleshooting

### App won't start

```bash
# Clear everything and retry
rm -rf node_modules
npm install
npm run dev
```

### Port already in use

```bash
# Kill existing processes
lsof -ti:3000 | xargs kill
lsof -ti:3001 | xargs kill
npm run dev
```

### WebSocket connection fails

Check your firewall settings. Allow ports 3000, 3001, 8000.

### Other issues

Check the logs:
```bash
tail -f logs/chatsdk.log
```

Or enable debug mode and export logs from DevTools.

---

## Beta Testing Tips

1. **Test on your actual machine** (not in a VM if possible)
2. **Use your primary browser** (Chrome, Safari, Firefox)
3. **Take screenshots of errors** - super helpful!
4. **Think out loud** - note your first impressions
5. **Be honest** - we can take it! 💪
6. **Have fun!** - You're building something cool 🚀
