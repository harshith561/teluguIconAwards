import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Without this Vite silently moves to 5174 when 5173 is taken. The site then
    // works but every bookmark, QR code and printed link pointing at
    // http://localhost:5173 hits nothing - and the API proxy in this config is
    // only wired for the expected origin, so it is very hard to spot.
    // Failing loudly is much better than drifting.
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});