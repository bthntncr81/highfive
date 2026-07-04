import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // İzolasyon testleri gerçek Postgres'e karşı koşar (CI: dockerized).
    // DATABASE_URL test ortamından gelir; smoke testleri DB'siz çalışır.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
