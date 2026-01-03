/**
 * User Hooks
 * React Query hooks for user operations
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

/**
 * Fetch all users
 */
export function useUsers(enabled: boolean = true) {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
    staleTime: 1000 * 60 * 5, // 5 minutes - users don't change often
    enabled,
  });
}

/**
 * Fetch single user
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => api.users.get(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
