import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    alias: {
      '@stellar/freighter-api': path.resolve(__dirname, './src/test/freighterMock.ts'),
    },
    server: {
      deps: {
        inline: [
          '@creit.tech/stellar-wallets-kit',
          '@stellar/freighter-api'
        ]
      }
    }
  },
});
