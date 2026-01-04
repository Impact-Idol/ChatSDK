/**
 * ChatSDK + NextAuth Integration
 * 
 * Copy this file to your Next.js project: lib/chatsdk-nextauth.ts
 * 
 * Installation:
 *   npm install next-auth @chatsdk/core @chatsdk/react
 */

import { SessionProvider, useSession } from 'next-auth/react';
import { useState, useEffect, ReactNode } from 'react';
import { ChatProvider } from '@chatsdk/react';

const CHATSDK_API_URL = process.env.NEXT_PUBLIC_CHATSDK_API_URL || 'http://localhost:5500';

interface ChatSDKTokens {
  token: string;
  wsToken: string;
  expiresAt: number;
}

// Hook to get ChatSDK tokens
export function useChatSDK() {
  const { data: session, status } = useSession();
  const [tokens, setTokens] = useState<ChatSDKTokens | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchTokens() {
      if (status === 'loading' || !session?.user) {
        setTokens(null);
        return;
      }

      // Check cache
      const cached = getCachedTokens();
      if (cached && cached.expiresAt > Date.now()) {
        setTokens(cached);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/chatsdk/token', {
          method: 'POST',
        });

        if (!response.ok) throw new Error('Failed to fetch tokens');

        const data = await response.json();
        const chatTokens = {
          token: data.token,
          wsToken: data.wsToken,
          expiresAt: Date.now() + (data.expiresIn * 1000),
        };

        setTokens(chatTokens);
        cacheTokens(chatTokens);
      } catch (error) {
        console.error('ChatSDK token error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTokens();
  }, [session, status]);

  return { tokens, isLoading, isAuthenticated: !!tokens };
}

// Token caching
const STORAGE_KEY = 'chatsdk_tokens';

function getCachedTokens(): ChatSDKTokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function cacheTokens(tokens: ChatSDKTokens) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

// Provider component
export function ChatSDKProvider({ children }: { children: ReactNode }) {
  const { tokens, isLoading } = useChatSDK();

  if (isLoading || !tokens) {
    return <>{children}</>;
  }

  return (
    <ChatProvider 
      token={tokens.token} 
      wsToken={tokens.wsToken} 
      apiUrl={CHATSDK_API_URL}
    >
      {children}
    </ChatProvider>
  );
}
