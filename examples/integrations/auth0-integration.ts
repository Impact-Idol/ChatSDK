/**
 * ChatSDK + Auth0 Integration
 * 
 * Copy this file to your React project: src/lib/chatsdk-auth0.ts
 * 
 * Installation:
 *   npm install @auth0/auth0-react @chatsdk/core @chatsdk/react
 */

import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect, ReactNode } from 'react';
import { ChatProvider } from '@chatsdk/react';

const CHATSDK_API_URL = process.env.REACT_APP_CHATSDK_API_URL || 'http://localhost:5500';

interface ChatSDKTokens {
  token: string;
  wsToken: string;
  expiresAt: number;
}

// Hook to get ChatSDK tokens
export function useChatSDKWithAuth0() {
  const { isAuthenticated, isLoading: auth0Loading, getAccessTokenSilently } = useAuth0();
  const [tokens, setTokens] = useState<ChatSDKTokens | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchTokens() {
      if (auth0Loading || !isAuthenticated) {
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
        const accessToken = await getAccessTokenSilently();

        const response = await fetch('/api/chatsdk/token', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
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
  }, [isAuthenticated, auth0Loading, getAccessTokenSilently]);

  return { tokens, isLoading, isAuthenticated: isAuthenticated && !!tokens };
}

// Token caching
const STORAGE_KEY = 'chatsdk_tokens_auth0';

function getCachedTokens(): ChatSDKTokens | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function cacheTokens(tokens: ChatSDKTokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

// Provider component
export function ChatSDKWithAuth0Provider({
  children,
  auth0Domain,
  auth0ClientId,
  auth0Audience,
  chatsdkApiUrl = CHATSDK_API_URL,
}: {
  children: ReactNode;
  auth0Domain: string;
  auth0ClientId: string;
  auth0Audience?: string;
  chatsdkApiUrl?: string;
}) {
  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: auth0Audience,
      }}
    >
      <ChatSDKProviderInner chatsdkApiUrl={chatsdkApiUrl}>
        {children}
      </ChatSDKProviderInner>
    </Auth0Provider>
  );
}

function ChatSDKProviderInner({
  children,
  chatsdkApiUrl,
}: {
  children: ReactNode;
  chatsdkApiUrl: string;
}) {
  const { tokens, isLoading } = useChatSDKWithAuth0();

  if (isLoading || !tokens) {
    return <>{children}</>;
  }

  return (
    <ChatProvider 
      token={tokens.token} 
      wsToken={tokens.wsToken} 
      apiUrl={chatsdkApiUrl}
    >
      {children}
    </ChatProvider>
  );
}
