/**
 * Crypto Utilities
 * Generate secure random keys and tokens
 */

import { randomBytes } from 'crypto';

/**
 * Generate a secure API key
 * Format: chatsdk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (prefix + 40 hex chars)
 */
export function generateApiKey(): string {
  const bytes = randomBytes(20); // 20 bytes = 40 hex characters
  return `chatsdk_${bytes.toString('hex')}`;
}

/**
 * Generate a secure secret key
 * Format: 64 hex characters
 */
export function generateSecretKey(): string {
  const bytes = randomBytes(32); // 32 bytes = 64 hex characters
  return bytes.toString('hex');
}

/**
 * Generate a secure random token
 * @param length - Number of bytes (default: 32)
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}
