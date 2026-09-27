// 화면 아래 가상 키보드 (AULA F65 배열 그대로)

import { ROWS, fingerTone } from './layout.js';

export class KeyboardView {
  constructor(container) {
    this.el = container;
    this.keys = new Map();
    this.el.classList.add('kbd');
    for (const row of ROWS) {
      const rowEl = document.createElement('div');
      rowEl.className = 'kbd-row';
      for (const key of row) rowEl.appendChild(this.#makeKey(key));
      this.el.appendChild(rowEl);
    }
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
    const set = codes ? new Set(codes) : null;
    for (const [code, el] of this.keys) el.classList.toggle('dim', !!set && !set.has(code));
  }

  // 다음에 칠 키 강조 (여러 개 가능: Shift+ㅃ, Fn+W)
  setNext(codes = [], tone = 'finger') {
    for (const el of this.keys.values()) el.classList.remove('next', 'next-warn');
    for (const code of codes) {
      const el = this.keys.get(code);
      if (el) el.classList.add(tone === 'warn' ? 'next-warn' : 'next');
    }
  }

  // 누른 키 반짝임: kind = 'ok' | 'bad' | 'press'
  flash(code, kind = 'press') {
    const el = this.keys.get(code);
    if (!el) return;
    const cls = `flash-${kind}`;
    el.classList.remove(cls);
    void el.offsetWidth; // 애니메이션 다시 시작
    el.classList.add(cls);
    clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(() => el.classList.remove(cls), 450);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
