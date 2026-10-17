import path from 'path'
import { defineConfig } from 'vitest/config'

// Nur für `npm run email:preview` – siehe scripts/email-preview.test.ts
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/email-preview.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
