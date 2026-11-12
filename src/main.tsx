import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { loadCurrent, saveCurrent } from './io/storage'
import { toast, useEditor } from './store'
import './styles.css'

async function start() {
  const saved = await loadCurrent()
  if (saved) useEditor.getState().loadDoc(saved)

  // Autosave shortly after each change, and immediately when the page is hidden or closed.
  let lastSaved = useEditor.getState().doc
  let pending = lastSaved
  let timer: ReturnType<typeof setTimeout> | undefined
  let warned = false
  const flush = async () => {
    clearTimeout(timer)
    if (pending === lastSaved) return
    const doc = pending
    const ok = await saveCurrent(doc)
    if (ok) lastSaved = doc
    else if (!warned) {
      warned = true
      toast('Autosave is not available in this browser window. Use File › Save to keep your work.')
    }
  }
  useEditor.subscribe((s) => {
    if (s.gestureStart || s.doc === pending) return
    pending = s.doc
    clearTimeout(timer)
    timer = setTimeout(flush, 500)
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
  })
  window.addEventListener('pagehide', () => void flush())

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
        const cache = await caches.open('biosketch-v1')
        await Promise.all(own.map((url) => cache.add(url).catch(() => undefined)))
      })
      .catch(() => undefined)
  }
}

void start()
