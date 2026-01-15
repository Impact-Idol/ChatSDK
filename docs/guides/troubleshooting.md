# Troubleshooting Guide

Common issues and solutions for ChatSDK 2.0. Find answers in <5 minutes.

---

## Connection Issues

### Issue 1: "Cannot connect to database"

**Error:**
```
Error: Connection refused to localhost:5432
Connection terminated unexpectedly
```

**Cause:** PostgreSQL Docker container not running

**Solutions:**

1. **Check Docker is running:**
   ```bash
   docker ps
   ```

2. **Start services:**
   ```bash
   docker compose up -d
   ```

3. **Check PostgreSQL logs:**
   ```bash
   docker logs chatsdk-postgres
   ```

4. **Verify connection manually:**
   ```bash
   psql postgresql://chatsdk:YOUR_PASSWORD@localhost:5432/chatsdk
   ```

5. **Reset database (if corrupted):**
   ```bash
   docker compose down -v  # ⚠️ Deletes all data!
   docker compose up -d
   ```

---

### Issue 2: "WebSocket connection failed"

**Error:**
```
WebSocket connection to 'ws://localhost:8001' failed
Error during WebSocket handshake
```

**Cause:** Centrifugo not running or CORS issue

**Solutions:**

1. **Check Centrifugo is running:**
   ```bash
   docker compose ps centrifugo
   curl http://localhost:8001/health
   ```

2. **Check logs:**
   ```bash
   docker logs chatsdk-centrifugo
   ```

3. **Verify configuration:**
   ```bash
   cat docker/centrifugo.json
   ```

4. **Check firewall:**
   ```bash
   # macOS
   sudo lsof -i :8001

   # Linux
   sudo netstat -tlnp | grep 8001
   ```

5. **CORS issue (browser console shows):**
   ```typescript
   // Add to centrifugo.json
   {
     "allowed_origins": ["http://localhost:3000"]
   }
   ```

---

### Issue 3: "Token expired" / "401 Unauthorized"

**Error:**
```
Error: JWT token expired
Error: 401 Unauthorized
```

**Cause:** Token expired and auto-refresh failed

**Solutions:**

1. **Token refresh should be automatic in ChatSDK 2.0:**
   ```typescript
   // Check onTokenRefresh callback is defined
   const sdk = new ChatSDK({
     onTokenRefresh: (tokens) => {
       console.log('Tokens refreshed!'); // Should see this every ~55 min
     },
   });
   ```

2. **Check refresh token is valid:**
   ```typescript
   const tokens = JSON.parse(localStorage.getItem('chatTokens'));
   console.log('Expires at:', new Date(tokens.expiresAt));
   ```

3. **Clear tokens and re-authenticate:**
   ```typescript
   localStorage.removeItem('chatTokens');
   // Redirect to login
   ```

4. **Enable debug mode:**
   ```typescript
   const sdk = new ChatSDK({
     debug: true, // See token refresh logs
   });
   ```

---

## Message Issues

### Issue 4: "Messages not sending"

**Error:**
```
Message fails with no error
Message stuck in "sending" status
```

**Cause:** Offline, circuit breaker open, or permission issue

**Solutions:**

1. **Check connection state:**
   ```typescript
   console.log(sdk.getConnectionState());
   // Should be: 'CONNECTED'
   ```

2. **Check network tab in DevTools:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Filter by WS (WebSocket)
   - Send message and watch for errors

3. **Enable debug mode:**
   ```typescript
   const sdk = new ChatSDK({
     debug: true, // See retry attempts
   });
   ```

4. **Check circuit breaker status:**
   ```typescript
   const state = sdk.getCircuitBreakerState();
   console.log(state); // 'CLOSED', 'OPEN', or 'HALF_OPEN'
   ```

5. **Verify permissions:**
   ```typescript
   const canSend = await sdk.checkPermission({
     channelId: 'ch-abc123',
     permission: 'messages.send',
   });
   ```

---

### Issue 5: "Messages not appearing in real-time"

**Error:**
```
Messages don't appear live
Have to refresh to see new messages
```

**Cause:** WebSocket not connected or not subscribed to channel

**Solutions:**

1. **Check WebSocket connection:**
   ```typescript
   sdk.on('connection.state', (state) => {
     console.log('Connection:', state);
   });
   ```

2. **Subscribe to channel:**
   ```typescript
   sdk.subscribeToChannel({ channelId: 'ch-abc123' });
   ```

3. **Check event listeners:**
   ```typescript
   sdk.on('message.new', (message) => {
     console.log('New message received:', message);
   });
   ```

4. **Test with two browser windows:**
   - Open localhost:3000?user=alice
   - Open localhost:3000?user=bob in incognito
   - Send message as Alice
   - Should appear in Bob's window instantly

5. **Check Centrifugo logs:**
   ```bash
   docker logs -f chatsdk-centrifugo
   ```

---

## File Upload Issues

### Issue 6: "File upload fails"

**Error:**
```
413 Payload Too Large
Error uploading file
Upload progress stuck at 0%
```

**Cause:** File too large, MinIO not running, or network issue

**Solutions:**

1. **Check file size:**
   ```typescript
   const maxSize = 10 * 1024 * 1024; // 10MB default

   if (file.size > maxSize) {
     alert('File too large. Max 10MB.');
     return;
   }
   ```

2. **Check MinIO is running:**
   ```bash
   docker compose ps minio
   curl http://localhost:9000/minio/health/live
   ```

3. **Verify MinIO credentials:**
   ```bash
   # .env.local
   S3_ACCESS_KEY_ID=chatsdk
   S3_SECRET_ACCESS_KEY=YOUR_MINIO_PASSWORD
   ```

4. **Create bucket manually:**
   - Open http://localhost:9001
   - Login: `chatsdk` / `YOUR_MINIO_PASSWORD`
   - Create bucket: `chatsdk-uploads`

5. **Increase max file size (self-hosted):**
   ```nginx
   # nginx.conf
   client_max_body_size 50M;
   ```

---

## Development Issues

### Issue 7: "Port already in use"

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
Port 3000 is already allocated
```

**Cause:** Another process using the port

**Solutions:**

1. **Find what's using the port:**
   ```bash
   # macOS/Linux
   lsof -i :3000

   # Windows
   netstat -ano | findstr :3000
   ```

2. **Kill the process:**
   ```bash
   # macOS/Linux
   kill -9 <PID>

   # Windows
   taskkill /PID <PID> /F
   ```

3. **Change port:**
   ```json
   // package.json
   {
     "scripts": {
       "dev": "next dev -p 3001"
     }
   }
   ```

4. **Or in .env.local:**
   ```bash
   PORT=3001
   ```

---

### Issue 8: "npm install fails"

**Error:**
```
EACCES: permission denied
gyp ERR! stack Error: EACCES: permission denied
```

**Cause:** Permission issues with npm

**Solutions:**

1. **Don't use sudo with npm:**
   ```bash
   # ❌ Bad
   sudo npm install

   # ✅ Good
   npm install
   ```

2. **Fix npm permissions:**
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
   source ~/.profile
   ```

3. **Use nvm (recommended):**
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

4. **Clear npm cache:**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

---

### Issue 9: "TypeScript errors after update"

**Error:**
```
Property 'xyz' does not exist on type 'Message'
Type 'string' is not assignable to type 'MessageType'
```

**Cause:** Breaking changes in SDK update

**Solutions:**

1. **Update ChatSDK to latest:**
   ```bash
   npm install @chatsdk/core@latest @chatsdk/react@latest
   ```

2. **Clear node_modules:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check migration guide:**
   ```
   https://docs.chatsdk.dev/migration/v1-to-v2
   ```

4. **Restart TypeScript server (VS Code):**
   - Cmd+Shift+P → "TypeScript: Restart TS Server"

---

## Docker Issues

### Issue 10: "Docker containers won't start"

**Error:**
```
docker compose up fails
Error response from daemon
Cannot connect to Docker daemon
```

**Cause:** Docker not running, disk space, or config issue

**Solutions:**

1. **Check Docker is running:**
   ```bash
   docker ps
   # If error: "Cannot connect to Docker daemon"
   # → Start Docker Desktop
   ```

2. **Check disk space:**
   ```bash
   docker system df
   docker system prune  # Free up space
   ```

3. **Reset Docker Desktop:**
   - Docker Desktop → Settings → Reset
   - Choose "Reset to factory defaults"

4. **Check docker-compose.yml syntax:**
   ```bash
   docker compose config  # Validate syntax
   ```

5. **View logs for specific service:**
   ```bash
   docker logs chatsdk-postgres
   docker logs chatsdk-centrifugo
   docker logs chatsdk-redis
   ```

---

## Debug Mode

Enable verbose logging to diagnose issues:

```typescript
const sdk = new ChatSDK({
  apiUrl: '...',
  userId: '...',

  // Enable debug mode
  debug: true,
});

// Check connection state
console.log('Connection:', sdk.getConnectionState());

// Check circuit breaker
console.log('Circuit breaker:', sdk.getCircuitBreakerState());

// Check queued messages (offline)
const queued = await sdk.getQueuedMessages();
console.log(`${queued.length} messages queued`);

// Check token expiration
const expiration = sdk.getTokenExpiration();
console.log('Token expires in:', expiration.expiresIn, 'seconds');
```

---

## Getting Help

### 1. Check Documentation
- **Guides:** https://docs.chatsdk.dev/guides
- **API Reference:** https://docs.chatsdk.dev/api
- **Examples:** https://github.com/chatsdk/examples

### 2. Search Issues
- **GitHub Issues:** https://github.com/chatsdk/chatsdk/issues
- Search before creating new issue

### 3. Community
- **Discord:** https://discord.gg/chatsdk
- **Stack Overflow:** Tag `chatsdk`

### 4. Support
- **Email:** support@chatsdk.dev
- **Response time:** <24 hours

---

## FAQ

**Q: Do I need to configure anything for ChatSDK to work?**
A: No! ChatSDK 2.0 uses smart defaults. Zero config needed for development.

**Q: How do I enable offline mode?**
A: It's enabled by default! Messages automatically queue when offline.

**Q: Why are my tokens expiring?**
A: Tokens auto-refresh 5 min before expiration. Make sure `onTokenRefresh` callback is defined.

**Q: Can I use ChatSDK with Next.js 14 App Router?**
A: Yes! ChatSDK 2.0 fully supports App Router, Pages Router, and Server Components.

**Q: How do I deploy to production?**
A: See [Production Deployment Guide](./advanced/deployment.md). Set 3 environment variables minimum.

**Q: Is ChatSDK HIPAA compliant?**
A: Yes, with proper configuration. See [HIPAA Compliance Guide](./advanced/hipaa-compliance.md).

**Q: How do I migrate from v1 to v2?**
A: See [Migration Guide](./migration/v1-to-v2.md). Most APIs are backwards compatible.

**Q: Can I self-host ChatSDK?**
A: Yes! Docker Compose included. See [Self-Hosting Guide](./advanced/self-hosting.md).

---

## Still Stuck?

If you're still experiencing issues:

1. **Enable debug mode** and check browser console
2. **Search GitHub issues** for similar problems
3. **Ask in Discord** - community usually responds <1 hour
4. **Create GitHub issue** with:
   - Error message (full stack trace)
   - ChatSDK version
   - Browser/Node version
   - Minimal reproduction steps

We're here to help! 🚀
