'use client';

import { ChatProvider } from '@chatsdk/react';

export function ChatSDKProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider
      apiUrl={process.env.NEXT_PUBLIC_CHATSDK_API_URL}
      tokenProvider={() => fetch('/api/chatsdk-token').then((res) => res.json())}
    >
      {children}
    </ChatProvider>
  );
}
