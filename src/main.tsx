import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { openLastFigure } from './startup'
import { useEditor } from './store'
import { Crash } from './ui/Crash'
import { preloadDialogs } from './ui/lazyDialogs'
import { applyTheme } from './ui/theme'
import { VERSION } from './version'
import './styles.css'

function start() {
  // In development, expose the editor state for debugging from the browser console.
  if (import.meta.env.DEV) (window as unknown as { __editor: typeof useEditor }).__editor = useEditor

  applyTheme(useEditor.getState().theme)

  // The editor is drawn first, so that a browser whose storage is slow or broken never shows a white page.
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Crash>
        <App />
      </Crash>
    </StrictMode>,
  )
  void openLastFigure()

  // The dialogs are separate files, fetched when first opened. Fetch them all now, in the
  // background, so that nothing waits for them later and the whole app is there offline.
  const dialogs = new Promise<void>((resolve) => setTimeout(() => void preloadDialogs().then(() => resolve()), 300))

  // Offline support. Only in the built app: in development it would serve stale files.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(async () => {
        // The scripts and styles of this first visit loaded before the service worker took over,
        // so save them now, the dialogs included; otherwise the app would only work offline from
        // the second visit.
        await dialogs
        const own = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(location.origin) && /\.(js|css|svg|png|webmanifest)$/.test(new URL(url).pathname))
        const cache = await caches.open('biosketch-v8')
        await Promise.all(own.map((url) => cache.add(url).catch(() => undefined)))
      })
      .catch(() => undefined)
  }
}

try {
  start()
} catch (error) {
  // index.html shows its own message when the editor never appears; say why as well.
  const boot = document.getElementById('boot-status')
  if (boot) {
    boot.setAttribute('data-told', '1')
    boot.textContent = `BioSketch could not start (version ${VERSION}): ${error instanceof Error ? error.message : String(error)}. Reload the page; if that does not help, try another browser.`
  }
}
