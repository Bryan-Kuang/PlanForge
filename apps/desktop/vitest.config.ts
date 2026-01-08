import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setup.ts',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Exclude node_modules and dist
    exclude: ['node_modules', 'dist', 'dist-electron', '.idea', '.git', '.cache'],
  },
});
