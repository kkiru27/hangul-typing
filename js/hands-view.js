// 가상 키보드 위에 반투명한 두 손을 올려 놓는다 (한컴타자처럼).
// - 손가락 끝은 기본자리(ㅁㄴㅇㄹ / ㅓㅏㅣ;), 엄지는 스페이스바 위에 있다.
// - 쳐야 할 키가 있으면 그 손가락이 손가락 색으로 바뀌고 그 키까지 뻗는다. 멀리 있는 키면 손 전체가 그쪽으로 조금 옮겨 간다.
// - 모양은 화면에 그려진 키의 실제 자리에서 계산한다 → 배열(표준·75%·65%)과 화면 크기가 바뀌어도 맞는다.

import { FINGER_BY_CODE, fingerTone } from './layout.js';

// 손가락: 기본자리 키, 굵기(키 한 칸 기준), 보이는 길이(줄 간격 기준)
const FINGERS = {
  L5: { home: 'KeyA', w: 0.54, len: 1.15 }, L4: { home: 'KeyS', w: 0.6, len: 1.55 },
  L3: { home: 'KeyD', w: 0.64, len: 1.7 }, L2: { home: 'KeyF', w: 0.64, len: 1.5 },
  R2: { home: 'KeyJ', w: 0.64, len: 1.5 }, R3: { home: 'KeyK', w: 0.64, len: 1.7 },
  R4: { home: 'KeyL', w: 0.6, len: 1.55 }, R5: { home: 'Semicolon', w: 0.54, len: 1.15 },
};
const HANDS = { L: ['L5', 'L4', 'L3', 'L2'], R: ['R5', 'R4', 'R3', 'R2'] }; // 새끼 → 검지
const THUMB_W = 0.7;
const REACH = 1.25; // 이보다 먼 키(키 칸 기준)면 손 전체가 옮겨 간다
const SHIFT = 0.45; // 옮겨 가는 정도 (나머지는 손가락이 뻗어서)

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });

// 손 모양 계산 (DOM 없이: 시험하기 쉽게)
//   keys: 코드 → {x, y} 키 가운데, u: 키 한 칸 너비, row: 줄 간격, kh: 키 높이
//   targets: 눌러야 할 키 코드들 → 손가락마다 { tip, active }
export function handShapes({ keys, u, row, kh }, targets = []) {
  const want = {};
  for (const code of targets) {
    const f = FINGER_BY_CODE[code];
    if (f && keys[code]) want[f] = keys[code];
  }
  const tipOf = (code) => ({ x: keys[code].x, y: keys[code].y + kh * 0.18 }); // 키 아래쪽 (글자가 보이게)
  const hands = [];
  for (const side of ['L', 'R']) {
    const dir = side === 'L' ? 1 : -1; // 새끼 → 검지 방향
    const ids = HANDS[side];
    if (!ids.every((id) => keys[FINGERS[id].home])) continue;
    // 멀리 뻗어야 하는 손가락이 있으면 손 전체를 그쪽으로 조금 옮긴다
    let shift = { x: 0, y: 0 };
    for (const id of ids) {
      if (!want[id]) continue;
      const rest = tipOf(FINGERS[id].home);
      const d = { x: want[id].x - rest.x, y: want[id].y + kh * 0.18 - rest.y };
      if (Math.hypot(d.x / u, d.y / row) > REACH) shift = { x: d.x * SHIFT, y: d.y * SHIFT };
    }
    const rests = ids.map((id) => add(tipOf(FINGERS[id].home), shift));
    const cx = rests.reduce((s, p) => s + p.x, 0) / rests.length;
    const fingers = ids.map((id, i) => {
      const f = FINGERS[id];
      const knuckle = { x: rests[i].x + (cx - rests[i].x) * 0.12, y: rests[i].y + f.len * row };
      const tip = want[id] ? { x: want[id].x, y: want[id].y + kh * 0.18 } : rests[i];
      return { id, w: f.w * u, knuckle, tip, active: !!want[id] };
    });
    const [k5, , , k2] = fingers.map((f) => f.knuckle);
    const w5 = fingers[0].w;
    const w2 = fingers[3].w;
    const bottom = Math.max(...fingers.map((f) => f.knuckle.y)) + 2.2 * row;
    const palm = [
      { x: k5.x - dir * (w5 / 2 + 0.06 * u), y: k5.y + 0.1 * row },        // 새끼 쪽 위
      { x: k5.x - dir * 0.02 * u, y: bottom },                               // 손목 바깥
      { x: k2.x + dir * 0.15 * u, y: bottom + 0.1 * row },                   // 손목 안쪽
      { x: k2.x + dir * (w2 / 2 + 0.38 * u), y: k2.y + 1.05 * row },         // 엄지 두덩
      { x: k2.x + dir * (w2 / 2 + 0.02 * u), y: k2.y + 0.05 * row },         // 검지 쪽 위
    ];
    // 엄지: 손바닥 안쪽에서 스페이스바로 (검지와 가운데 손가락 사이 아래쯤)
    const space = keys.Space;
    const thumbBase = { x: k2.x + dir * (w2 / 2 + 0.12 * u), y: k2.y + 1.25 * row };
    const thumbTip = space
      ? { x: k2.x + dir * 0.55 * u, y: space.y + kh * 0.1 }
      : { x: thumbBase.x + dir * 0.4 * u, y: thumbBase.y + 0.6 * row };
    const thumb = { id: 'T', w: THUMB_W * u, knuckle: thumbBase, tip: thumbTip, active: !!want.T };
    hands.push({ side, dir, fingers, thumb, palm });
  }
  return hands;
}

const f1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${f1(p.x)},${f1(p.y)}`;

// 손바닥: 점들을 둥글게 잇는다 (모서리마다 중간점까지 곡선)
function palmPath(points) {
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const n = points.length;
  let d = `M${pt(mid(points[n - 1], points[0]))}`;
  for (let i = 0; i < n; i++) d += ` Q${pt(points[i])} ${pt(mid(points[i], points[(i + 1) % n]))}`;
  return `${d} Z`;
}

const line = (f, w, cls, extra = '') =>
  `<line class="${cls}" x1="${f1(f.knuckle.x)}" y1="${f1(f.knuckle.y)}" x2="${f1(f.tip.x)}" y2="${f1(f.tip.y)}" stroke-width="${f1(w)}" ${extra}/>`;

// 손톱: 손가락 끝에 손가락 방향으로 놓인 작은 타원
function nail(f) {
  const ang = Math.atan2(f.tip.y - f.knuckle.y, f.tip.x - f.knuckle.x);
  const back = f.w * 0.12;
  const x = f.tip.x - Math.cos(ang) * back;
  const y = f.tip.y - Math.sin(ang) * back;
  return `<ellipse class="h-nail" cx="${f1(x)}" cy="${f1(y)}" rx="${f1(f.w * 0.36)}" ry="${f1(f.w * 0.29)}" transform="rotate(${f1((ang * 180) / Math.PI)} ${f1(x)} ${f1(y)})"/>`;
}

// 손가락 마디 주름: 손가락 끝에서 1/3, 2/3 쯤에 손가락을 가로지르는 짧은 선
function creases(f) {
  const dx = f.tip.x - f.knuckle.x;
  const dy = f.tip.y - f.knuckle.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const half = f.w * 0.3;
  return [0.36, 0.62].map((t) => {
    const x = f.tip.x - dx * t;
    const y = f.tip.y - dy * t;
    return `<line class="h-crease" x1="${f1(x - nx * half)}" y1="${f1(y - ny * half)}" x2="${f1(x + nx * half)}" y2="${f1(y + ny * half)}"/>`;
  }).join('');
}

function handSvg(hand) {
  const all = [...hand.fingers, hand.thumb];
  const rest = all.filter((f) => !f.active);
  const active = all.filter((f) => f.active);
  const palm = palmPath(hand.palm);
  // 바깥선 → 살색 순서로 겹쳐 그리면 손 전체가 한 덩어리로 보인다. 묶음째 반투명
  return `<g class="hand" data-side="${hand.side}">
    <g class="h-body">
      <path class="h-line" d="${palm}"/>
      ${all.map((f) => line(f, f.w + 3, 'h-line')).join('')}
      <path class="h-skin" d="${palm}"/>
      ${all.map((f) => line(f, f.w, 'h-skin')).join('')}
      ${rest.map((f) => creases(f) + nail(f)).join('')}
    </g>
    ${active.map((f) => `<g class="h-active tone-${fingerTone(f.id)}" data-finger="${f.id === 'T' ? 'T' : f.id}">
      ${line(f, f.w + 4, 'h-active-line')}${line(f, f.w, 'h-active-fill')}${nail(f)}</g>`).join('')}
  </g>`;
}

export class HandsView {
  // keyboard: KeyboardView (키 자리를 읽어 오고, 배열이 바뀌면 다시 그린다)
  constructor(keyboard) {
    this.keyboard = keyboard;
    this.targets = [];
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'hands-overlay');
    this.svg.setAttribute('aria-hidden', 'true');
    keyboard.el.appendChild(this.svg);
    keyboard.onLayout = () => {
      keyboard.el.appendChild(this.svg); // 키를 새로 그린 뒤에도 맨 위에
      this.measure();
    };
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.measure()).observe(keyboard.el);
    this.measure();
  }

  // 키 가운데 자리 읽기 (offsetLeft/Top: 눌림 효과 transform에 흔들리지 않는다)
  measure() {
    const keys = {};
    for (const [code, el] of this.keyboard.keys) {
      if (!el.offsetWidth) continue;
      keys[code] = { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
    }
    const a = keys.KeyA;
    const s = keys.KeyS;
    const q = keys.KeyQ;
    if (!a || !s || !q) return;
    const kh = this.keyboard.keys.get('KeyA').offsetHeight;
    this.geo = { keys, u: s.x - a.x, row: a.y - q.y, kh };
    this.render();
  }

  // codes: 지금 눌러야 할 키들 (['KeyA'], ['ShiftRight', 'KeyQ'], ['Space'] …). 빈 배열이면 기본자리에 쉬는 손
  setTargets(codes = []) {
    this.targets = codes;
    this.render();
  }

  render() {
    if (!this.geo) return;
    this.svg.innerHTML = handShapes(this.geo, this.targets).map(handSvg).join('');
    this.svg.dataset.active = this.targets.map((c) => FINGER_BY_CODE[c]).filter(Boolean).join(' ');
  }
}
