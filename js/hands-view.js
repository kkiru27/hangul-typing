// 두 손 그림: 써야 할 손가락을 밝게 표시한다.

import { fingerTone } from './layout.js';

// 왼손 기준 모양 (오른손은 좌우 반전). 손가락 번호 5=새끼 … 2=검지, 1=엄지
const FINGERS = [
  { n: 5, x: 14, y: 40, h: 52 },
  { n: 4, x: 41, y: 20, h: 70 },
  { n: 3, x: 69, y: 10, h: 80 },
  { n: 2, x: 97, y: 22, h: 68 },
];

function handSvg(side) {
  const fingers = FINGERS.map(
    (f) => `<rect class="finger tone-${fingerTone('L' + f.n)}" data-finger="${side}${f.n}"
      x="${f.x}" y="${f.y}" width="25" height="${f.h}" rx="12.5"/>`
  ).join('');
  const thumb = `<rect class="finger tone-thumb" data-finger="T" x="106" y="76" width="24" height="54" rx="12"
      transform="rotate(-48 118 103)"/>`;
  const palm = `<rect class="palm" x="12" y="66" width="114" height="66" rx="30"/>`;
  const flip = side === 'R' ? 'transform="translate(320,0) scale(-1,1)"' : '';
  return `<g ${flip}>${palm}${fingers}${thumb}</g>`;
}

export class HandsView {
  constructor(container) {
    this.el = container;
    this.el.innerHTML = `
      <svg viewBox="0 0 320 150" class="hands-svg" aria-hidden="true">
        ${handSvg('L')}${handSvg('R')}
        <text x="70" y="148" class="hand-label">왼손</text>
        <text x="250" y="148" class="hand-label">오른손</text>
      </svg>`;
  }

  // fingers: ['L5'] / ['T'] / ['R5','L2'] …  (빈 배열이면 모두 보통 상태)
  setActive(fingers = []) {
    const set = new Set(fingers);
    for (const el of this.el.querySelectorAll('.finger')) {
      el.classList.toggle('active', set.has(el.dataset.finger));
    }
    this.el.classList.toggle('has-active', set.size > 0);
  }
}
