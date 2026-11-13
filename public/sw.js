// Offline support: keeps the app's own files so BioSketch opens without a connection.
// Figures are stored separately (IndexedDB) and are never touched here.
const CACHE = 'biosketch-v2'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Hosts often add "Vary" headers (Origin, Accept-Encoding). A page's <script> tag and a plain fetch
// send different headers, so without ignoreVary a saved file would not be found when offline.
const saved = (request) => caches.match(request, { ignoreVary: true })

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  // Only the app's own files. Requests to other sites (the AI service) always go to the network.
  if (new URL(request.url).origin !== self.location.origin) return

  const store = (response) => {
    if (response.ok) {
      const copy = response.clone()
      caches.open(CACHE).then((cache) => cache.put(request, copy))
    }
    return response
  }

  // The page itself and the icon-pack files can change on the server: ask the network first.
  const fresh = request.mode === 'navigate' || new URL(request.url).pathname.includes('/icon-packs/')
  if (fresh) {
    // Prefer the network so updates arrive, fall back to the saved copy offline.
    event.respondWith(
      fetch(request)
        .then(store)
        .catch(() => saved(request).then((hit) => hit || (request.mode === 'navigate' ? saved('./index.html') : Response.error()))),
    )
    return
  }
  // Scripts and styles have content-hashed names, so a saved copy is always the right one.
  event.respondWith(saved(request).then((hit) => hit || fetch(request).then(store)))
})
