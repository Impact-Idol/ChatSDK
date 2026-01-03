/**
 * Authentication Hooks
 */

import { useCallback } from 'react';
import { generateChatTokens, storeTokens, clearTokens, getStoredTokens, type DemoUser, type ChatTokens } from '../lib/auth';

export function useAuth() {
  const login = useCallback(async (user: DemoUser): Promise<ChatTokens> => {
    // Generate tokens via API
    const tokens = await generateChatTokens(user);

    // Store in localStorage
    storeTokens(tokens);

    return tokens;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
  }, []);

  const getTokens = useCallback(() => {
    return getStoredTokens();
  }, []);

  return {
    login,
    logout,
    getTokens,
  };
}
