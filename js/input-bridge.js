// 숨은 입력칸과 판정기 사이의 다리.
// 아이패드 사파리의 한글 입력기는 조합 중인 글자('ㅎ'→'하'→'한')를 입력칸 값에 바로 반영한다.
// 여기서는 이벤트 순서(composition / input / keyup)가 기기마다 달라도 되도록,
// 어떤 이벤트가 오든 "입력칸 값 전체"를 다시 읽어 키 순서로 바꿔 넘긴다. (같은 값이면 무시)
//
// 조합 중에 입력칸 값을 코드로 고치면 iOS에서 글자가 겹쳐 들어가는 문제가 있어서,
// 값을 비우는 일은 조합 중이 아닐 때만 한다. 조합 중이면 "여기서부터 새 판" 위치(base)만 옮긴다.

import { toKeys } from './hangul.js?v=202609270830';

const LATIN_G = /[A-Za-z]/g;

export class InputBridge {
  constructor(el, { onChange, onLatin, onKeyDown, stripLatin = true } = {}) {
    this.el = el;
    this.onChange = onChange;
    this.onLatin = onLatin;
    this.onKeyDown = onKeyDown;
    this.stripLatin = stripLatin;
    this.composing = false;
    this.base = 0;
    this.lastRaw = el.value;

    el.addEventListener('compositionstart', () => { this.composing = true; });
    el.addEventListener('compositionend', () => {
      this.composing = false;
      this.sync();
      setTimeout(() => this.sync(), 0); // 사파리는 compositionend 뒤에 값이 바뀌기도 한다
    });
    el.addEventListener('input', () => this.sync());
    el.addEventListener('keyup', () => setTimeout(() => this.sync(), 0));
    el.addEventListener('blur', () => { this.composing = false; });
    el.addEventListener('keydown', (e) => this.onKeyDown?.(e));
  }

  get focused() {
    return document.activeElement === this.el;
  }

  focus() {
    try { this.el.focus({ preventScroll: true }); } catch { this.el.focus(); }
    return this.focused;
  }

  sync() {
    let raw = this.el.value;
    if (/[A-Za-z]/.test(raw)) {
      // 영어 모드로 친 글자: 오타로 세지 않고 알려만 준다.
      // 영문은 조합이 없으니 조합 중이 아닐 때 바로 지워도 안전하다.
      if (this.stripLatin && !this.composing) {
        raw = raw.replace(LATIN_G, '');
        this.el.value = raw;
      }
      this.onLatin?.();
    }
    if (raw === this.lastRaw) return;
    this.lastRaw = raw;
    const keys = toKeys(raw);
    if (keys.length < this.base) this.base = keys.length; // 이전 판 글자까지 지운 경우
    this.onChange?.({ raw, base: this.base, keys: keys.slice(this.base), composing: this.composing });
  }

  // 새 판 시작: 지금까지 입력된 것은 무시한다.
  rebase() {
    if (!this.composing) {
      this.el.value = '';
      this.lastRaw = '';
      this.base = 0;
    } else {
      this.lastRaw = this.el.value;
      this.base = toKeys(this.el.value).length;
    }
  }
}
