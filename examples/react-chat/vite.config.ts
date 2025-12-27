import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5500,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@chatsdk/core': path.resolve(__dirname, '../../packages/core/src'),
      '@chatsdk/react': path.resolve(__dirname, '../../packages/react/src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@chatsdk/core', '@chatsdk/react'],
  },
});
