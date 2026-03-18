import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/validations/**',
        'src/lib/utils/timezone.ts',
        'src/lib/errors/messages.ts',
        'src/lib/constants/labels.ts',
        'src/lib/config/branding.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: { lines: 90, functions: 90, branches: 85 },
    },
  },
})
