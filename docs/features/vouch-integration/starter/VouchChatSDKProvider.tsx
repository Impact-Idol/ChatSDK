'use client';

import { ChatProvider, useChatContext } from '@chatsdk/react';
import { useEffect, type ReactNode } from 'react';

type VouchAuthState = {
  isPending: boolean;
  isLoggedIn: boolean;
  user: { id?: string; name?: string; image?: string | null } | null;
  displayName: string | null;
  username: string | null;
  isMinor: boolean;
  accountStatus: string | null;
};

const apiUrl = process.env.NEXT_PUBLIC_CHATSDK_API_URL;
const wsUrl = process.env.NEXT_PUBLIC_CHATSDK_WS_URL;

export function VouchChatSDKProvider({ children }: { children: ReactNode }) {
  const auth = useVouchAuthForChat();

  if (!apiUrl || !wsUrl) {
    return <>{children}</>;
  }

  return (
    <ChatProvider
      apiUrl={apiUrl}
      wsUrl={wsUrl}
      tokenProvider={async () => {
        const response = await fetch('/api/chatsdk-token', {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to get ChatSDK token');
        }
        return response.json();
      }}
    >
      <VouchChatConnection auth={auth}>{children}</VouchChatConnection>
    </ChatProvider>
  );
}

function VouchChatConnection({
  auth,
  children,
}: {
  auth: VouchAuthState;
  children: ReactNode;
}) {
  const { connectUser, disconnect, user } = useChatContext();
  const canConnect =
    !auth.isPending &&
    auth.isLoggedIn &&
    Boolean(auth.user?.id) &&
    !auth.isMinor &&
    auth.accountStatus === 'ACTIVE';

  useEffect(() => {
    if (!canConnect || !auth.user?.id) {
      if (user) void disconnect();
      return;
    }

    if (user?.id === auth.user.id) return;

    void connectUser({
      id: auth.user.id,
      name: auth.displayName || auth.username || auth.user.name || auth.user.id,
      image: auth.user.image || undefined,
    });
  }, [
    auth.accountStatus,
    auth.displayName,
    auth.isLoggedIn,
    auth.isMinor,
    auth.isPending,
    auth.user?.id,
    auth.user?.image,
    auth.user?.name,
    auth.username,
    canConnect,
    connectUser,
    disconnect,
    user,
  ]);

  return <>{children}</>;
}

function useVouchAuthForChat(): VouchAuthState {
  /*
   * Replace this adapter with Vouch's real useAuth() hook.
   *
   * Expected mapping from current Vouch context:
   * const { isPending, isLoggedIn, user, displayName, username, isMinor, accountStatus } = useAuth();
   */
  return {
    isPending: true,
    isLoggedIn: false,
    user: null,
    displayName: null,
    username: null,
    isMinor: false,
    accountStatus: null,
  };
}
