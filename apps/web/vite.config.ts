import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Set base URL for GitHub Pages deployment
  base: process.env.GITHUB_PAGES === 'true' ? '/dev-flow-ai/' : '/',
  build: {
    outDir: process.env.GITHUB_PAGES === 'true' ? 'dist' : '../server/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // Proxy API requests to the backend server during development
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Handle direct routes for GitHub auth
      '/auth/github/login': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});