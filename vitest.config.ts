import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Logic tests run in node env — no DOM, no React.
    // UI tests override this per-file with @vitest-environment jsdom.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
