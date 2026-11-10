// 缓存策略：HTML 永远走网络优先（避免装到主屏后拿到旧版），静态资源缓存优先
const CACHE = 'jieyu-v5';
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
        return hit || new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
          + '<body style="font:16px/1.8 -apple-system,sans-serif;background:#12100e;color:#ece6de;padding:32px 22px">'
          + '<h1 style="font-size:19px;font-weight:500">这一页还没缓存，网络也没通</h1>'
          + '<p style="color:#a49b90">常见原因：<b>开了代理/加速器但节点不通</b>。先关掉代理再刷新；'
          + '或者直接玩离线版：<a href="./index.html" style="color:#c9a06a">index.html</a>。</p>'
          + '<p style="color:#6f6862;font-size:13px">点这里重试：<a href="" style="color:#c9a06a">刷新</a></p></body>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
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
