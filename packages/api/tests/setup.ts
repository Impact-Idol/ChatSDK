/**
 * Test Setup
 * Initialize test environment and utilities
 */

import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.API_KEY_SECRET = 'test-api-key-secret';

// Increase timeout for async operations
vi.setConfig({ testTimeout: 30000 });

// Global test utilities
declare global {
  var testHelpers: {
    generateToken: (userId: string, appId: string) => Promise<string>;
    createTestUser: (appId: string, userId: string, name: string) => Promise<void>;
  };
}

import { SignJWT } from 'jose';

// Generate a test JWT token
globalThis.testHelpers = {
  async generateToken(userId: string, appId: string): Promise<string> {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ user_id: userId, app_id: appId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);
    return token;
  },
  async createTestUser(appId: string, userId: string, name: string): Promise<void> {
    // This would insert a test user into the database
    // For now, we rely on the API to create users
  },
};
