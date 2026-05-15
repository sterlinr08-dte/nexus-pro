// NEXUS PRO v7 — Service Worker
// Permite uso offline y mejora velocidad de carga

const CACHE_NAME = 'nexus-pro-v7';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-apple-180.png',
];

// Instalar: cachear recursos esenciales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
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
  // Solo manejar requests GET del mismo origen
  if(e.request.method !== 'GET') return;
  
  // Para Supabase API: solo network (datos siempre frescos)
  if(e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        // Si la respuesta es válida, actualizamos el cache
        if(resp && resp.status === 200 && resp.type === 'basic') {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, respClone));
        }
        return resp;
      })
      .catch(() => {
        // Sin red: usar cache
        return caches.match(e.request)
          .then(cached => cached || caches.match('/index.html'));
      })
  );
});

// Mensaje de versión
self.addEventListener('message', e => {
  if(e.data === 'version') e.ports[0].postMessage(CACHE_NAME);
});
