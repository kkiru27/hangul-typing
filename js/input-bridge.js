// 숨은 입력칸과 판정기 사이의 다리.
// 아이패드 사파리의 한글 입력기는 조합 중인 글자('ㅎ'→'하'→'한')를 입력칸 값에 바로 반영한다.
// 여기서는 이벤트 순서(composition / input / keyup)가 기기마다 달라도 되도록,
// 어떤 이벤트가 오든 "입력칸 값 전체"를 다시 읽어 키 순서로 바꿔 넘긴다. (같은 값이면 무시)
//
// 조합 중에 입력칸 값을 코드로 고치면 iOS에서 글자가 겹쳐 들어가는 문제가 있어서,
// 값을 비우는 일은 조합 중이 아닐 때만 한다. 조합 중이면 "여기서부터 새 판" 위치(base)만 옮긴다.

import { toKeys } from './hangul.js?v=202610021304';

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
    this.pendingClear = false; // 조합 중이라 못 비운 입력칸을 조합이 끝나면 비운다
    this.held = null;          // 일시정지 중: 멈춘 때의 입력칸 값 (그동안 들어온 글자는 판정에 넘기지 않는다)
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
    if (this.held != null) return;
    let raw = this.el.value;
    if (this.pendingClear && !this.composing) {
      // 새 판(낱말) 시작 뒤로 아직 아무것도 안 쳤으면 비운다. 이미 쳤으면 base로 충분하니 그대로 둔다.
      this.pendingClear = false;
      if (toKeys(raw).length <= this.base) {
        this.el.value = raw = '';
        this.base = 0;
        this.lastRaw = '';
      }
    }
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

  // 일시정지: 멈추기 전에 친 것까지는 판정에 넘기고, 그 뒤로 들어오는 글자는 넘기지 않는다
  hold() {
    this.sync();
    this.held = this.lastRaw;
  }

  // 다시 시작: 멈춘 동안 들어온 글자를 지우고 멈춘 때의 값으로 되돌린다.
  // 조합 중이면 값을 건드리지 않는다(iOS 글자 겹침) → 그때는 들어온 글자를 그대로 판정에 넘겨 Backspace로 지우게 한다.
  release() {
    const held = this.held;
    if (held == null) return;
    this.held = null;
    if (!this.composing && this.el.value !== held) {
      this.el.value = held;
      this.lastRaw = held;
      // 판정기는 이미 이 값까지 봤다. 화면(친 글자 막대)만 조합이 끝난 상태로 다시 그리게 알린다
      this.onChange?.({ raw: held, base: this.base, keys: toKeys(held).slice(this.base), composing: false });
      return;
    }
    this.sync();
  }

  // 새 판 시작: 지금까지 입력된 것은 무시한다.
  // 입력기에 따라 스페이스·Enter를 친 순간(input)에는 아직 조합 중이고 compositionend가 뒤에 오기도 한다.
  rebase() {
    this.held = null;
    if (!this.composing) {
      this.el.value = '';
      this.lastRaw = '';
      this.base = 0;
      this.pendingClear = false;
    } else {
      this.lastRaw = this.el.value;
      this.base = toKeys(this.el.value).length;
      this.pendingClear = true;
    }
  }
}
