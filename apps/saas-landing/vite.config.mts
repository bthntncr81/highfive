/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/saas-landing',
  server: {
    port: 4300,
    host: 'localhost',
    // Dev'de platform API'si canlı ortama proxy'lenir (plan listesi gerçek veri)
    proxy: {
      '/api': {
        target: 'https://otorder.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    port: 4300,
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
