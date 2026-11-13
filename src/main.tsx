import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { startAutosave } from './io/autosave'
import { loadStartup } from './io/storage'
import { useEditor } from './store'
import './styles.css'

async function start() {
  // Open the figure that was open last time, then keep saving it as it changes.
  const { id, doc } = await loadStartup()
  useEditor.getState().set({ figureId: id })
  if (doc) useEditor.getState().loadDoc(doc)
  startAutosave()

  // In development, expose the editor state for debugging from the browser console.
  if (import.meta.env.DEV) (window as unknown as { __editor: typeof useEditor }).__editor = useEditor

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  // Offline support. Only in the built app: in development it would serve stale files.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(async () => {
        // The scripts and styles of this first visit loaded before the service worker took over,
        // so save them now; otherwise the app would only work offline from the second visit.
        const own = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(location.origin) && /\.(js|css|svg|png|webmanifest)$/.test(new URL(url).pathname))
        const cache = await caches.open('biosketch-v2')
        await Promise.all(own.map((url) => cache.add(url).catch(() => undefined)))
      })
      .catch(() => undefined)
  }
}

void start()
