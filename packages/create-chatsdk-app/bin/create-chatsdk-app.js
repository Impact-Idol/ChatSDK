#!/usr/bin/env node

// Simple wrapper to run the TypeScript-compiled CLI
import('../dist/index.js').catch((error) => {
  console.error('Failed to load create-chatsdk-app:', error);
  process.exit(1);
});
