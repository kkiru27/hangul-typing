// 아이콘: 이모지 대신 직접 그린 SVG (기기마다 모양이 같고, 선 굵기·둥글기가 통일된다)
// - icon(name): 글자색을 따르는 선 아이콘 (.ic)
// - ART.*: 은은한 입체 그림 (위는 밝고 아래는 진한 그라데이션 + 바닥 그림자)
// 그라데이션은 문서에 한 번만 둔다(DEFS). 같은 id를 그림마다 두면 숨은 화면의 것을 가리켜 안 보일 수 있다.

const LINE = {
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="3"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8"/>',
  gamepad: '<path d="M7.5 8h9a4.5 4.5 0 0 1 4.4 5.5l-.8 3.4a2.4 2.4 0 0 1-4.1 1.1L14 16h-4l-2 2a2.4 2.4 0 0 1-4.1-1.1l-.8-3.4A4.5 4.5 0 0 1 7.5 8z"/><path d="M8 11v3M6.5 12.5h3M15.5 12h.01M17.5 13.5h.01"/>',
  sound: '<path d="M4 9.5h3l4.5-3.5v12L7 14.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3l4.5-3.5v12L7 14.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1.2"/><rect x="14" y="5" width="3.5" height="14" rx="1.2"/>',
  play: '<path d="M7.5 5.5v13a1 1 0 0 0 1.5.9l10.2-6.5a1 1 0 0 0 0-1.7L9 4.6a1 1 0 0 0-1.5.9z"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  enter: '<path d="M19 6v5a3 3 0 0 1-3 3H6M10 10l-4 4 4 4"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="9.5" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.7-1.5"/>',
  restart: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4.5h4.5"/>',
  home: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V19h12V9.5"/><path d="M10 19v-5h4v5"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  drop: '<path d="M12 3.5c3.5 4.2 6 7.6 6 10.5a6 6 0 0 1-12 0c0-2.9 2.5-6.3 6-10.5z"/>',
  flag: '<path d="M5.5 21V4"/><path d="M5.5 4.5h11l-2 4 2 4h-11"/>',
  sprout: '<path d="M12 20v-8"/><path d="M12 12c0-4 2.5-6.5 7-6.5 0 4-2.5 6.5-7 6.5zM12 14c0-3-2-5-5.5-5 0 3 2 5 5.5 5z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  star: '<path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  flame: '<path d="M12 21c3.6 0 6-2.5 6-5.8 0-3.5-2.6-5.4-3.7-8.7-.3 2-1.3 3.2-2.4 3.7C11.9 7 10.6 4.6 8.6 3c.3 3-1.6 5-2.8 7.1A6.3 6.3 0 0 0 6 15.2C6 18.5 8.4 21 12 21z"/>',
  tap: '<path d="M9 12V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 10.5a1.5 1.5 0 0 1 3 0V12"/><path d="M15 11.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a5 5 0 0 1-4.1-2.2L4.6 15a1.5 1.5 0 0 1 2.3-1.9L9 15"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${LINE[name] ?? ''}</svg>`;
}

// 문서에 한 번만 넣는 그라데이션·흐림 (app.js가 시작할 때 body에 붙인다)
export const DEFS = `<svg class="svg-defs" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="g-goguma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d66aa3"/><stop offset="1" stop-color="#9e386d"/></linearGradient>
  <linearGradient id="g-leaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd672"/><stop offset="1" stop-color="#4ea43a"/></linearGradient>
  <linearGradient id="g-kb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6a1ff"/><stop offset="1" stop-color="#7650f0"/></linearGradient>
  <linearGradient id="g-pad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc79e"/><stop offset="1" stop-color="#ff8248"/></linearGradient>
  <linearGradient id="g-logo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a68dff"/><stop offset="1" stop-color="#6a3de0"/></linearGradient>
  <filter id="f-soft" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="1.8"/></filter>
</defs></svg>`;

// 고구마 (직접 그린 그림): 위가 밝은 껍질 + 하이라이트, 잎은 연두
export const GOGUMA_SVG = `<svg viewBox="0 0 64 44" class="goguma" aria-label="고구마">
  <path d="M14 30 C8 22 16 10 32 9 C47 8 58 16 56 25 C54 34 42 38 29 37 C22 36 17 34 14 30 Z" fill="url(#g-goguma)" stroke="#7a2c52" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M23 15.5 C29 12 37 11.5 43 13" stroke="rgba(255,255,255,.55)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M36 28 q3 1 5 -1 M45 18 q2 1 3 3" stroke="#e993bb" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M56 24 q6 -1 7 -5" stroke="#7a2c52" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M14 29 C8 28 4 22 6 16 C10 19 13 22 14 29 Z" fill="url(#g-leaf)" stroke="#2f6b22" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M15 28 C12 21 13 14 18 10 C19 16 18 22 15 28 Z" fill="url(#g-leaf)" stroke="#2f6b22" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;

const KEYCAPS = (dy, fill) => `<g fill="${fill}">
    <rect x="9.5" y="${21 + dy}" width="7" height="6" rx="2"/><rect x="19" y="${21 + dy}" width="7" height="6" rx="2"/><rect x="28.5" y="${21 + dy}" width="7" height="6" rx="2"/><rect x="38" y="${21 + dy}" width="7" height="6" rx="2"/><rect x="47.5" y="${21 + dy}" width="7" height="6" rx="2"/>
    <rect x="14.25" y="${29 + dy}" width="7" height="6" rx="2"/><rect x="23.75" y="${29 + dy}" width="7" height="6" rx="2"/><rect x="33.25" y="${29 + dy}" width="7" height="6" rx="2"/><rect x="42.75" y="${29 + dy}" width="7" height="6" rx="2"/>
    <rect x="19" y="${37.5 + dy}" width="26" height="5" rx="2.5"/></g>`;

export const ART = {
  // 키보드: 보라 몸통 + 흰 키
  keyboard: `<svg class="art" viewBox="0 0 64 64" aria-hidden="true">
  <ellipse cx="32" cy="56" rx="23" ry="3.2" fill="rgba(70,40,160,.22)" filter="url(#f-soft)"/>
  <rect x="6" y="19" width="52" height="33" rx="10" fill="#5a38cc"/>
  <rect x="6" y="15" width="52" height="33" rx="10" fill="url(#g-kb)"/>
  <rect x="9" y="16.5" width="46" height="9" rx="4.5" fill="rgba(255,255,255,.14)"/>
  ${KEYCAPS(1, 'rgba(40,16,130,.28)')}
  ${KEYCAPS(0, '#fff')}
</svg>`,
  // 게임기: 주황 몸통 + 흰 십자 단추
  gamepad: `<svg class="art" viewBox="0 0 64 64" aria-hidden="true">
  <ellipse cx="32" cy="56" rx="23" ry="3.2" fill="rgba(170,70,20,.22)" filter="url(#f-soft)"/>
  <path d="M20 21h24c8 0 14 6 15 14l1.6 9.5c.8 5-4.6 8.6-8.8 5.6L45 45H19l-6.8 5.1c-4.2 3-9.6-.6-8.8-5.6L5 35c1-8 7-14 15-14z" fill="#e2672c"/>
  <path d="M20 17h24c8 0 14 6 15 14l1.6 9.5c.8 5-4.6 8.6-8.8 5.6L45 41H19l-6.8 5.1c-4.2 3-9.6-.6-8.8-5.6L5 31c1-8 7-14 15-14z" fill="url(#g-pad)"/>
  <path d="M16 22c5-3 27-3 32 0" stroke="rgba(255,255,255,.45)" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="13" y="28.2" width="11" height="4" rx="2" fill="#fff"/><rect x="16.5" y="24.7" width="4" height="11" rx="2" fill="#fff"/>
  <circle cx="44" cy="27.5" r="2.8" fill="#fff"/><circle cx="49.5" cy="32.5" r="2.8" fill="#ffe07a"/>
  <circle cx="38.5" cy="32.5" r="2.8" fill="#ffe07a"/><circle cx="44" cy="37.5" r="2.8" fill="#fff"/>
</svg>`,
  // 앱 표시: 보라 네모 위에 '가'
  logo: `<svg class="art logo" viewBox="0 0 40 40" aria-hidden="true">
  <rect x="2" y="4.5" width="36" height="33.5" rx="11" fill="#4f2bb8"/>
  <rect x="2" y="2" width="36" height="33" rx="11" fill="url(#g-logo)"/>
  <rect x="6" y="4" width="28" height="11" rx="5.5" fill="rgba(255,255,255,.16)"/>
  <text x="20" y="25.5" text-anchor="middle" font-size="17" font-weight="800" fill="#fff" font-family="AppSans, -apple-system, sans-serif">가</text>
</svg>`,
};

// 춘식이 옆 효과: 틀렸을 때 땀방울, 끝났을 때 반짝이
export const FX = {
  oops: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c3.4 4.3 5.5 7.4 5.5 10.2a5.5 5.5 0 0 1-11 0C6.5 10.4 8.6 7.3 12 3z" fill="#8ccaff" stroke="#3f8fd8" stroke-width="1.4"/><path d="M9.6 13.5a2.6 2.6 0 0 0 2.2 2.6" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`,
  cheer: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.8 4.6 2.9 6.7 7.5 7.5-4.6.8-6.7 2.9-7.5 7.5-.8-4.6-2.9-6.7-7.5-7.5 4.6-.8 6.7-2.9 7.5-7.5z" fill="#ffd34d" stroke="#e8a600" stroke-width="1.2" stroke-linejoin="round"/><circle cx="19" cy="18" r="1.8" fill="#ffd34d"/><circle cx="5" cy="4.5" r="1.3" fill="#ffd34d"/></svg>`,
};
