import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, host: true },
  // The editor is one file; the dialogs are fetched when first opened and, in the background, right
  // after the editor is on screen (src/ui/lazyDialogs.tsx), so the app is fully available offline
  // after the first visit.
  build: { chunkSizeWarningLimit: 800 },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'] },
})
