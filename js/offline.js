// 오프라인 준비: 서비스 워커(sw.js)를 등록하고, 처음 열 때 이미 받은 파일들(글꼴·그림·코드)을 저장소에 넣어 둔다.
// (서비스 워커는 등록된 다음 요청부터 저장하므로, 첫 방문에 받은 파일은 여기서 한 번 더 담아야 다음에 인터넷 없이 열린다)
// 준비가 끝나면 <html data-offline="ready"> (e2e가 본다)
const CACHE = 'hangul-typing-v1'; // sw.js와 같은 이름

export async function setupOffline() {
  if (!('serviceWorker' in navigator) || !window.caches) return;
  try {
    await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    const cache = await caches.open(CACHE);
    const here = new URL(location.href);
    const page = `${here.origin}${here.pathname.endsWith('/') ? `${here.pathname}index.html` : here.pathname}`;
    const files = performance.getEntriesByType('resource').map((e) => e.name)
      .filter((u) => u.startsWith(here.origin) && !u.includes('version.json'));
    for (const u of new Set(files)) if (!(await cache.match(u))) await cache.add(u).catch(() => {});
    if (!(await cache.match(page))) await cache.add(page).catch(() => {});
    // 같은 파일의 옛 빌드(?v=)는 지운다
    const now = new Map(files.map((u) => [new URL(u).pathname, u]));
    for (const req of await cache.keys()) {
      const cur = now.get(new URL(req.url).pathname);
      if (cur && cur !== req.url && new URL(req.url).searchParams.has('v')) await cache.delete(req);
    }
    document.documentElement.dataset.offline = 'ready';
  } catch {
    // 사파리 개인 정보 보호 모드 등: 오프라인 없이 그냥 쓴다
  }
}
