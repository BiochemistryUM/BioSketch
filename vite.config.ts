import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, host: true },
  // The editor is one file; the dialogs are fetched when first opened and, in the background, right
  // after the editor is on screen (src/ui/lazyDialogs.tsx), so the app is fully available offline
  // after the first visit.
  // Two pages are built: the figure editor (index.html) and the lab notebook (labbook/index.html),
  // which uses the editor's own code for charts and their drawing.
  build: { chunkSizeWarningLimit: 800, rollupOptions: { input: { main: 'index.html', labbook: 'labbook/index.html' } } },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'packages/*/tests/**/*.test.ts'] },
})
