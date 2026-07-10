/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/admin',
  server: {
    port: 4203,
    host: 'localhost',
    // Dev proxies the platform API to the live environment (same-origin in prod via nginx)
    proxy: {
      '/api': {
        target: 'https://otorder.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    port: 4203,
    host: 'localhost',
  },
  plugins: [react()],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
