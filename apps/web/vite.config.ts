import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // El backend no tiene prefijo /api: el proxy lo elimina antes de reenviar.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (route) => route.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
  },
});
