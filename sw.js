// 缓存策略：HTML 永远走网络优先（避免装到主屏后拿到旧版），静态资源缓存优先
const CACHE = 'jieyu-v3';
const STATIC = ['./icon.svg', './manifest-app.json', './manifest-staging.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isHTML) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const c = await caches.open(CACHE);
        c.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || new Response('离线，且没有缓存到这一页', { status: 503 });
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const fresh = await fetch(req);
    try { const c = await caches.open(CACHE); c.put(req, fresh.clone()); } catch (e) {}
    return fresh;
  })());
});
