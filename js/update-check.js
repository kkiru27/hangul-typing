// 새 버전이 올라왔는데 사파리가 옛 페이지(캐시)를 보여 주면, 새 주소로 한 번 다시 연다.
import { BUILD } from './version.js?v=202609270830';

export async function checkForUpdate() {
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    const { build } = await res.json();
    if (!build || build === BUILD) return;
    const url = new URL(location.href);
    if (url.searchParams.get('b') === build) return; // 이미 한 번 시도함 (무한 새로고침 방지)
    url.searchParams.set('b', build);
    location.replace(url.toString());
  } catch {
    // 오프라인 등: 그냥 지금 버전으로 진행
  }
}
