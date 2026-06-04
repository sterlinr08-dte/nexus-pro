// NEXUS PRO v8 — Service Worker
// Permite uso offline y mejora velocidad de carga

const CACHE_NAME = 'nexus-pro-v8';
const ASSETS = [
  '/',
  '/index.html',
];
// Opcionales: se cachean si existen, no rompen si faltan
const ASSETS_OPCIONALES = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-apple-180.png',
];

// Instalar: cachear recursos esenciales (tolerante a fallos)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Esenciales: si fallan, igual continuamos
      try { await cache.addAll(ASSETS); } catch(err) { console.log('SW: algunos esenciales fallaron', err); }
      // Opcionales: uno por uno, ignorando los que no existen
      await Promise.all(ASSETS_OPCIONALES.map(url =>
        cache.add(url).catch(() => console.log('SW: opcional no encontrado:', url))
      ));
      return self.skipWaiting();
    })
  );
});

// Activar: limpiar caches antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network first, cache fallback
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;

  // Supabase API: solo network (datos siempre frescos)
  if(e.request.url.includes('supabase.co')) return;

  // parches.js: siempre network (nunca cachear, para que cargue lo último)
  if(e.request.url.includes('parches.js')) return;

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if(resp && resp.status === 200 && resp.type === 'basic') {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, respClone));
        }
        return resp;
      })
      .catch(() => {
        return caches.match(e.request)
          .then(cached => cached || caches.match('/index.html'));
      })
  );
});

// Mensaje de versión
self.addEventListener('message', e => {
  if(e.data === 'version') e.ports[0].postMessage(CACHE_NAME);
});
