// 화면 아래 가상 키보드. 배열은 고를 수 있다 (표준 텐키리스 · 75% · 65%, layout.js LAYOUTS)

import { getLayout, fingerTone } from './layout.js?v=202610030913';

export class KeyboardView {
  constructor(container, layoutId) {
    this.el = container;
    this.el.classList.add('kbd');
    this.focusSet = null;
    this.next = { codes: [], tone: 'finger' };
    this.setLayout(layoutId);
  }

  // 배열 바꾸기: 키를 새로 그리고, 흐리게·강조 상태는 그대로 다시 입힌다
  setLayout(layoutId) {
    const layout = getLayout(layoutId);
    this.layout = layout;
    this.keys = new Map();
    this.el.innerHTML = '';
    this.el.dataset.layout = layout.id;
    this.el.style.setProperty('--units', layout.units);
    for (const row of layout.rows) {
      const rowEl = document.createElement('div');
      rowEl.className = row.fn ? 'kbd-row fn-row' : 'kbd-row';
      for (const key of row) rowEl.appendChild(key.gap ? this.#makeGap(key) : key.stack ? this.#makeStack(key) : this.#makeKey(key));
      this.el.appendChild(rowEl);
    }
    this.setFocusSet(this.focusSet);
    this.setNext(this.next.codes, this.next.tone);
    this.onLayout?.(layout);
  }

  #makeGap(key) {
    const el = document.createElement('div');
    el.className = 'key-gap';
    el.style.setProperty('--w', key.w);
    return el;
  }

  // 한 칸에 위아래 반 칸짜리 키 두 개 (K380의 ↑ ↓)
  #makeStack(key) {
    const el = document.createElement('div');
    el.className = 'key-stack';
    el.style.setProperty('--w', key.w);
    for (const half of key.stack) el.appendChild(this.#makeKey(half));
    return el;
  }

  #makeKey(key) {
    const el = document.createElement('div');
    el.className = `key tone-${fingerTone(key.finger)}`;
    el.dataset.code = key.code;
    el.style.setProperty('--w', key.w);
    if (key.nav) el.classList.add('nav');
    if (key.bump) el.classList.add('bump');

    if (key.jamo) {
      el.classList.add('char');
      el.innerHTML = `
        <span class="k-latin">${key.label}</span>
        ${key.jamo[1] ? `<span class="k-shift">${key.jamo[1]}</span>` : ''}
        <span class="k-main">${key.jamo[0]}</span>`;
    } else if (key.symbol) {
      el.classList.add('char', 'sym');
      el.innerHTML = `
        <span class="k-shift">${escapeHtml(key.symbol[1])}</span>
        <span class="k-main">${escapeHtml(key.symbol[0])}</span>`;
    } else {
      el.classList.add('mod');
      el.innerHTML = `
        ${key.icon ? `<span class="k-icon">${key.icon}</span>` : ''}
        ${key.label ? `<span class="k-label">${key.label}</span>` : ''}
        ${key.hint ? `<span class="k-hint">${key.hint}</span>` : ''}`;
    }
    this.keys.set(key.code, el);
    return el;
  }

  // 이번 단계에서 쓰는 키만 또렷하게, 나머지는 흐리게
  setFocusSet(codes) {
    this.focusSet = codes;
    const set = codes ? new Set(codes) : null;
    for (const [code, el] of this.keys) el.classList.toggle('dim', !!set && !set.has(code));
  }

  // 다음에 칠 키 강조 (여러 개 가능: Shift+ㅃ)
  setNext(codes = [], tone = 'finger') {
    this.next = { codes, tone };
    for (const el of this.keys.values()) el.classList.remove('next', 'next-warn');
    for (const code of codes) {
      const el = this.keys.get(code);
      if (el) el.classList.add(tone === 'warn' ? 'next-warn' : 'next');
    }
  }

  // 누른 키 움직임: kind = 'ok' | 'bad' | 'press'
  // 키가 쑥 눌렸다 돌아온다 (맞으면 초록, 틀리면 빨강이 잠깐 비치고 좌우로 흔들림).
  // Web Animations로 해서 화면 배치를 다시 계산하지 않는다 (예전엔 class를 뗐다 붙이며 매번 강제 재계산)
  flash(code, kind = 'press') {
    const el = this.keys.get(code);
    if (!el || !el.animate || REDUCED_MOTION()) return;
    el._flash?.cancel();
    try {
      // 첫 장면만 주면 끝은 지금 CSS 모양(다음 키면 떠 있는 모양)으로 자연스럽게 돌아간다
      el._flash = el.animate(FLASH[kind] ?? FLASH.press, { duration: kind === 'bad' ? 420 : 280, easing: 'cubic-bezier(.22,.8,.24,1)' });
    } catch {
      // 오래된 브라우저: 움직임 없이
    }
  }
}

const REDUCED_MOTION = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const PRESSED = 'translateY(2px) scale(.97)';
const FLAT = '0 0 0 rgba(0, 0, 0, 0), 0 1px 2px rgba(20, 24, 40, .08)'; // 눌려서 아래 두께가 사라진 모양
const FLASH = {
  press: [{ offset: 0, transform: PRESSED, boxShadow: `inset 0 1px 0 rgba(255, 255, 255, .5), ${FLAT}` }],
  ok: [{ offset: 0, transform: PRESSED, boxShadow: `inset 0 0 0 40px rgba(31, 157, 99, .8), ${FLAT}`, color: '#fff' }],
  bad: [
    { offset: 0, transform: 'translateX(0)', boxShadow: `inset 0 0 0 40px rgba(229, 72, 77, .85), ${FLAT}`, color: '#fff' },
    { offset: .25, transform: 'translateX(-4px)' },
    { offset: .5, transform: 'translateX(4px)' },
    { offset: .75, transform: 'translateX(-2px)' },
  ],
};

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
