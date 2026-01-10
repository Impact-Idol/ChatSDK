# Security Best Practices

Secure your ChatSDK implementation with proper authentication, sanitization, and access control.

## Token Security

### Never Expose API Keys

```typescript
// ❌ BAD: API key in frontend code
const sdk = await ChatSDK.connect({
  apiKey: 'chatsdk_secret_key', // ⚠️ EXPOSED!
});

// ✅ GOOD: Generate token from your backend
const response = await fetch('/api/chat/token', {
  headers: { Authorization: `Bearer ${yourAuthToken}` },
});
const { token } = await response.json();

const sdk = await ChatSDK.connect({
  apiUrl: '...',
  token: token, // ✓ Secure!
});
```

### Secure Token Storage

```typescript
// Web: Use httpOnly cookies for refresh tokens
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// React Native: Use SecureStore
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('chatToken', token);
```

## Content Sanitization

```typescript
import DOMPurify from 'dompurify';

function SafeMessage({ message }) {
  const clean = DOMPurify.sanitize(message.text);
  
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

## XSS Prevention

```typescript
// ❌ BAD: Direct HTML rendering
<div dangerouslySetInnerHTML={{ __html: message.text }} />

// ✅ GOOD: Escape HTML
import escape from 'lodash/escape';

<div>{escape(message.text)}</div>
```

## CSRF Protection

```typescript
// Add CSRF token to requests
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

await fetch('/api/chat/send', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ text: 'Hello' }),
});
```

## Rate Limiting

```typescript
// Backend: Limit requests per user
const rateLimit = require('express-rate-limit');

app.use('/api/chat', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please slow down',
}));
```

## HTTPS Only

```typescript
// Production: Always use HTTPS
const sdk = await ChatSDK.connect({
  apiUrl: 'https://api.yourdomain.com', // ✓ HTTPS
  wsUrl: 'wss://api.yourdomain.com/ws', // ✓ WSS
});
```

---

## Next Steps

- **[Authentication →](../getting-started/authentication.md)**
- **[Production Deployment →](./deployment.md)**
- **[HIPAA Compliance →](./hipaa-compliance.md)**
