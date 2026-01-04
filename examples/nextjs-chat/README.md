# ChatSDK Next.js Example

A Next.js 15 App Router example demonstrating ChatSDK integration.

## Features

- **Next.js 15** with App Router
- **React 19** for modern React features
- **@chatsdk/react** hooks for chat functionality
- **React Query** for data fetching and caching
- **Centrifugo WebSocket** for real-time updates

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
NEXT_PUBLIC_API_URL=http://localhost:5500
NEXT_PUBLIC_API_KEY=your-api-key-here
NEXT_PUBLIC_WS_URL=ws://localhost:8001/connection/websocket
NEXT_PUBLIC_APP_ID=default
```

### 3. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx      # Root layout with providers
│   ├── page.tsx        # Home page with config validation
│   ├── providers.tsx   # React Query provider
│   ├── globals.css     # Global styles
│   └── chat/
│       └── page.tsx    # Main chat interface
└── lib/
    ├── api-client.ts       # API functions
    ├── chat-config.ts      # Configuration helpers
    ├── utils.ts            # Utility functions
    └── websocket-client.ts # WebSocket client
```

## Key Differences from Vite

### Environment Variables

Next.js uses `NEXT_PUBLIC_*` prefix instead of Vite's `VITE_*`:

```typescript
// Vite
const apiUrl = import.meta.env.VITE_API_URL;

// Next.js
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

### Client Components

Next.js App Router requires explicit `'use client'` directive for components using:
- React hooks (`useState`, `useEffect`, etc.)
- Browser APIs
- Event handlers

### QueryClient in App Router

Create QueryClient inside `useState` to avoid sharing between requests:

```typescript
'use client';

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({...}));
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## Using @chatsdk/react

This example uses local implementations, but you can also import from `@chatsdk/react`:

```typescript
// Import hooks
import { useWorkspaces, useChannels, useMessages } from '@chatsdk/react';

// Import utilities
import { getInitials, getAvatarColor, formatMessageTime } from '@chatsdk/react';
```

## Customization

### Custom API URL

```typescript
// lib/chat-config.ts
export function getChatConfig() {
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500',
    // ...
  };
}
```

### Custom Styling

The example uses inline styles for simplicity. You can replace with:
- Tailwind CSS
- CSS Modules
- Styled Components
- Any CSS-in-JS solution

## Learn More

- [ChatSDK Documentation](../../docs/README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
