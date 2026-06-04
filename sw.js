// NEXUS PRO v9 — Service Worker
// Cachea SOLO archivos estáticos. No toca datos ni peticiones dinámicas.

const CACHE_NAME = 'nexus-pro-v9';
const ASSETS_OPCIONALES = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-apple-180.png',
];

// Instalar: cachear opcionales uno por uno (tolerante a fallos)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(ASSETS_OPCIONALES.map(url =>
        cache.add(url).catch(() => {})
      ));
      return self.skipWaiting();
    })
  );
});

// Activar: limpiar caches antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: SOLO interceptar imágenes/iconos estáticos.
// TODO lo demás (HTML, JS, Supabase, APIs) pasa directo sin tocar.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // NUNCA interceptar: Supabase, parches.js, index.html, ni JS dinámico
  if (url.includes('supabase.co')) return;
  if (url.includes('parches.js')) return;
  if (url.includes('.html')) return;
  if (url.includes('?')) return; // peticiones con query (datos) pasan directo

  // Solo cachear imágenes/iconos estáticos
  const esImagen = /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(url);
  if (!esImagen) return; // todo lo demás pasa directo

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'version') e.ports[0].postMessage(CACHE_NAME);
});
