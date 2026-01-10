# Custom UI Components

Customize ChatSDK's appearance with themes, custom renderers, and component overrides.

## Theming

```typescript
import { ChatProvider, defaultTheme } from '@chatsdk/react';

const customTheme = {
  ...defaultTheme,
  colors: {
    primary: '#007aff',
    secondary: '#5856d6',
    background: '#ffffff',
    text: '#000000',
    border: '#e0e0e0',
  },
  fonts: {
    body: 'Inter, sans-serif',
    heading: 'SF Pro Display, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px',
  },
};

<ChatProvider theme={customTheme}>
  <App />
</ChatProvider>
```

## Custom Message Renderer

```typescript
function CustomMessage({ message }) {
  return (
    <div className="custom-message">
      <img src={message.sender.avatar} alt={message.sender.name} />
      <div>
        <strong>{message.sender.name}</strong>
        <p>{message.text}</p>
        <span>{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
}

<MessageList renderMessage={CustomMessage} />
```

## Dark Mode

```typescript
const darkTheme = {
  ...defaultTheme,
  colors: {
    background: '#1a1a1a',
    surface: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    border: '#3a3a3a',
    primary: '#0a84ff',
  },
};

function App() {
  const [isDark, setIsDark] = useState(false);
  
  return (
    <ChatProvider theme={isDark ? darkTheme : defaultTheme}>
      <button onClick={() => setIsDark(!isDark)}>
        Toggle Dark Mode
      </button>
      <Chat />
    </ChatProvider>
  );
}
```

---

## Next Steps

- **[React Guide →](../getting-started/react-first-steps.md)**
- **[Performance →](./performance.md)**
