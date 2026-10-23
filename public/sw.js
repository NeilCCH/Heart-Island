// 小貓能量站離線快取：不追蹤、不上傳，只快取本站檔案。
// 版本號變更時清除舊快取；部署新版時 index.html 走網路優先，打包檔名含雜湊可放心快取。
const CACHE = 'kitten-energy-v2';
const SHELL = ['./', 'manifest.webmanifest', 'assets/cat/cutout.png', 'assets/dog/cutout.webp', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // 一併快取首頁引用的打包檔，第一次安裝後就能離線開啟。
    const html = await (await cache.match('./')).text();
    const bundles = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]);
    await cache.addAll(bundles);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // 網路優先：有新版就用新版；離線時回到快取的首頁。
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      if (response.ok) caches.open(CACHE).then(cache => cache.put('./', copy));
      return response;
    }).catch(() => caches.match('./', { ignoreVary: true })));
    return;
  }
  // ignoreVary：打包檔以 crossorigin 載入會帶 Origin，伺服器的 Vary 標頭不應讓快取失效。
  event.respondWith(caches.match(request, { ignoreVary: true }).then(hit => hit ?? fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
    return response;
  })));
});
