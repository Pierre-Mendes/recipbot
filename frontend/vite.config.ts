import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // The forks pool crashes jsdom/undici ("webidl.util.markAsUncloneable is
    // not a function") on the Node version the CI runner installs; threads
    // avoids the incompatibility.
    pool: 'threads',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // e2e/*.spec.ts are Playwright specs, not vitest ones - keep them out of
    // the unit run (they import @playwright/test, which vitest can't resolve).
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      exclude: ['src/main.ts', 'src/test/**', '**/*.d.ts', 'src/vite-env.d.ts', 'e2e/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
