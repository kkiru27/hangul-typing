// 오프라인용 서비스 워커: 한 번 받은 파일을 아이패드에 저장해 두고, 인터넷이 없어도 앱이 열리게 한다.
// - 주소에 빌드번호(?v=)가 붙은 파일: 저장해 둔 것 먼저 (빌드가 바뀌면 주소가 바뀌어 새로 받는다). 같은 파일의 옛 빌드는 지운다.
// - 페이지(index.html 등): 인터넷 먼저, 안 되면 저장해 둔 것 → 새 버전이 올라오면 바로 보인다.
// - version.json: 늘 인터넷으로 (새 버전 확인용, update-check.js)
// 저장 방식을 바꾸면 CACHE 이름을 바꾼다 (옛 저장소는 activate에서 지운다). js/offline.js의 이름과 같아야 한다.
const CACHE = 'hangul-typing-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

// 페이지 주소는 ?b= 같은 것을 떼고, 폴더 주소(…/)는 index.html로 맞춘다
function pageKey(url) {
  const path = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
  return `${url.origin}${path}`;
}

async function putVersioned(cache, req, res) {
  const url = new URL(req.url);
  for (const old of await cache.keys()) {
    const o = new URL(old.url);
    if (o.pathname === url.pathname && o.search !== url.search) await cache.delete(old);
  }
  await cache.put(req, res);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // 늘 인터넷으로

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) await cache.put(pageKey(url), res.clone());
        return res;
      } catch {
        return (await cache.match(pageKey(url))) || (await cache.match(pageKey(new URL('./', self.location)))) || Response.error();
      }
    })());
    return;
  }

  if (url.searchParams.has('v')) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') await putVersioned(cache, req, res.clone());
      return res;
    })());
    return;
  }

  // 빌드번호 없는 파일(고치는 중 등): 인터넷 먼저, 안 되면 저장해 둔 것
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') await cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req)) || Response.error();
    }
  })());
});
